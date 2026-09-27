/**
 * Supervisao de escolas: o pedido e a decisao da equipa.
 *
 * Este modulo tem **as duas pontas** do fluxo supervisionado, e sao dois routers
 * porque a autenticacao e' diferente em cada ponta:
 *
 *   `rotasSupervisaoProduto`   — o director cria a escola na app do produto e
 *     submete-a. Autenticado pela credencial do produto (herda `exigirProduto`).
 *     O limiar decide se passa direito ou vai para a fila.
 *
 *   `rotasSupervisaoOperador`  — a fila da equipa. Autenticado por sessao de
 *     operador. E' aqui, no `aprovar`, que o `tenant` nasce: na submissao nao
 *     nasce, porque um pedido ainda nao e' uma escola supervisionada.
 */
import { Router, type Request } from 'express';
import { exigir, exigirSessao } from '../middleware';
import { rota } from '../http';
import { registarAuditoria } from '../repos/auditoria';
import { aprovisionar } from '../registo_escola';
import {
  criarTenant,
  gravarSettings,
  procurarTenant as procurarTenantPorId,
  type NovoTenant,
} from '../repos/tenants';
import { listarPlanos } from '../repos/produtos';
import { bloquearEscolaNoProduto } from '../produto_cliente';
import {
  contarPedidosPendentes,
  decidirLimiar,
  lerLimiar,
  listarPedidos,
  marcarPedidoAprovado,
  marcarPedidoRejeitado,
  procurarPedido,
  procurarPedidoPorEscola,
  reabrirPedido,
  submeterPedido,
  type EstadoPedido,
} from '../repos/pedidos';
import type { Papel } from '../config';
import type { Plan } from '../../types';

function actorOperador(req: Request) {
  return {
    actorName: req.operador?.op.name ?? '',
    actorEmail: req.operador?.email ?? '',
    actorRole: (req.operador?.papel ?? '') as Papel,
    ipAddress: req.ip,
  };
}

// ===========================================================================
// 1. Submissao (produto)
// ===========================================================================

export const rotasSupervisaoProduto = Router();

/**
 * O director cria a escola na app do produto e submete-a para supervisao.
 *
 * O que o produto **nao** decide: se passa. O preco vem sempre do nosso plano
 * (`listarPlanos`), nunca do corpo do pedido, e o numero de alunos que conta
 * e' o menor entre o declarado e o tecto do plano. Sem isso, um produto com
 * credencial valida comprava um plano grande so por declarar 20 alunos.
 */
rotasSupervisaoProduto.post(
  '/candidaturas-escola',
  rota(async (req, res) => {
    const produtoSlug = req.produtoSlug as string;
    const d = req.body as Partial<NovoTenant> & {
      escolaCodigo?: string;
      escolaId?: number;
      alunosPrevistos?: number;
    };

    if (!d.escolaCodigo || !d.escolaId) {
      res.status(400).json({
        erro: 'Indica escolaCodigo e escolaId: a escola tem de existir no produto antes de vir para aqui.',
      });
      return;
    }
    if (!d.nome || !d.nome.trim()) {
      res.status(400).json({ erro: 'O nome da escola e obrigatorio.' });
      return;
    }
    if (
      d.alunosPrevistos !== undefined &&
      d.alunosPrevistos !== null &&
      (!Number.isInteger(d.alunosPrevistos) || d.alunosPrevistos < 0)
    ) {
      res.status(400).json({ erro: 'alunosPrevistos tem de ser um inteiro >= 0.' });
      return;
    }

    // O preco e' o do nosso plano. Se o plano nao existir, nao for deste produto
    // ou o produto nao mandou plano, o pedido vai para a fila sem preco — a
    // equipa decide a mao em vez de recusarmos a submissao.
    let plano: Plan | null = null;
    if (d.planoId) {
      const planos = await listarPlanos(produtoSlug);
      plano = planos.find((p) => p.id === d.planoId) ?? null;
    }

    const decisao = decidirLimiar({
      alunosPrevistos: d.alunosPrevistos ?? null,
      planoPrecoAoa: plano?.priceAoa ?? null,
      planoMaxStudents: plano?.maxStudents ?? null,
      limiar: await lerLimiar(),
    });

    const { pedido, criado } = await submeterPedido({
      produtoSlug,
      escolaCodigo: d.escolaCodigo,
      escolaId: d.escolaId,
      nome: d.nome.trim(),
      nif: d.nif ?? null,
      tipo: d.tipo ?? null,
      designacao: d.designacao ?? null,
      regimeEnsino: d.regimeEnsino ?? null,
      contactEmail: d.contactEmail ?? null,
      contactPhone: d.contactPhone ?? null,
      province: d.province ?? null,
      city: d.city ?? null,
      firstAdminName: d.firstAdminName ?? null,
      firstAdminEmail: d.firstAdminEmail ?? null,
      firstAdminPhone: d.firstAdminPhone ?? null,
      notas: d.notas ?? null,
      alunosPrevistos: d.alunosPrevistos ?? null,
      planoId: d.planoId ?? null,
      trialDias: d.trialDias ?? null,
      exigeAprovacao: decisao.exigeAprovacao,
      motivoLimiar: decisao.motivo,
    });

    // Reenvio de uma escola que ja foi atendida. A escola ja esta supervisionada
    // ou a fila ja a tem: criar outra vez seria uma inscricao duplicada, e o
    // director so precisa de saber em que estado esta.
    if (!criado) {
      if (pedido.estado === 'aprovado' && pedido.tenantId) {
        const jaAprovado = await procurarTenantPorId(pedido.tenantId);
        res.status(200).json({
          estado: 'aprovado',
          tenant: jaAprovado,
          pedido,
          criado: false,
        });
        return;
      }
      res.status(200).json({
        estado: pedido.estado,
        motivoRejeicao: pedido.motivoRejeicao,
        pedido,
        criado: false,
      });
      return;
    }

    if (decisao.exigeAprovacao) {
      await registarAuditoria({
        actorName: pedido.nome,
        actorEmail: d.firstAdminEmail ?? '',
        actorRole: 'produto',
        action: 'ESCOLA_SUBMETIDA',
        entityType: 'escola_pedido',
        entityId: String(pedido.id),
        entityName: pedido.nome,
        ipAddress: req.ip,
        details: decisao.motivo ?? `Escola ${pedido.escolaCodigo} aguarda decisao da equipa.`,
      });
      res.status(202).json({ estado: 'pendente', pedido, motivo: decisao.motivo });
      return;
    }

    // Passou o limiar: a equipa e' avisada, mas a escola nao espera decisao.
    const provisionado = await aprovisionar(
      await criarTenant(dePedidoParaTenant(pedido)),
    );
    await marcarPedidoAprovado(pedido.id, null, provisionado.id);

    await registarAuditoria({
      actorName: pedido.nome,
      actorEmail: d.firstAdminEmail ?? '',
      actorRole: 'produto',
      action: 'ESCOLA_APROVADA_AUTOMATICA',
      entityType: 'tenant',
      entityId: String(provisionado.id),
      entityName: pedido.nome,
      ipAddress: req.ip,
      details:
        `Passou o limiar (${decisao.alunosEficazes ?? 0} alunos, ` +
        `${decisao.valorAnualAoa.toLocaleString('pt-AO')} AOA/ano); entrou sem espera.`,
    });

    res.status(201).json({ estado: 'aprovado', tenant: provisionado, pedido, criado });
  }),
);

/**
 * O produto consulta o estado do seu pedido. E' o que o director ve no produto
 * enquanto a equipa decide — uma leitura, sem webhook e sem polling elegante.
 */
rotasSupervisaoProduto.get(
  '/candidaturas-escola/:codigo',
  rota(async (req, res) => {
    const pedido = await procurarPedidoPorEscola(
      req.produtoSlug as string,
      req.params.codigo,
    );
    if (!pedido) {
      res.status(404).json({ erro: 'Pedido nao encontrado para esta escola.' });
      return;
    }
    res.json({
      estado: pedido.estado,
      motivoRejeicao: pedido.motivoRejeicao,
      exigeAprovacao: pedido.exigeAprovacao,
      motivoLimiar: pedido.motivoLimiar,
      pedido,
    });
  }),
);

// ===========================================================================
// 2. Fila e decisao (operador)
// ===========================================================================

export const rotasSupervisaoOperador = Router();

// Este router e' montado em `/api`, e `/api` e' prefixo de TUDO — incluindo
// `/api/v1/plataforma`, que e' do produto e se autentica com credencial, nao
// com sessao. Um `use(exigirSessao)` sem restricao de metodo e caminho
// apanhava os pedidos do produto e respondia 401 a uma chamada perfeitamente
// valida. Por isso a exigencia e' feita rota a rota, nao no router inteiro.
rotasSupervisaoOperador.get('/pedidos-supervisao', exigirSessao);
rotasSupervisaoOperador.post('/pedidos-supervisao/:id/aprovar', exigirSessao);
rotasSupervisaoOperador.post('/pedidos-supervisao/:id/rejeitar', exigirSessao);
rotasSupervisaoOperador.post('/pedidos-supervisao/:id/reabrir', exigirSessao);
rotasSupervisaoOperador.get('/limiar-supervisao', exigirSessao);
rotasSupervisaoOperador.put('/limiar-supervisao', exigirSessao);

/** O pedido e' a mesma coisa que o tenant, so que ainda nao foi decidido. */
function dePedidoParaTenant(pedido: {
  nome: string;
  produtoSlug: string;
  nif: string | null;
  tipo: string | null;
  designacao: string | null;
  regimeEnsino: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  province: string | null;
  city: string | null;
  firstAdminName: string | null;
  firstAdminEmail: string | null;
  firstAdminPhone: string | null;
  notas: string | null;
  planoId: number | null;
  trialDias: number | null;
  escolaCodigo: string;
  escolaId: number;
}): NovoTenant {
  return {
    nome: pedido.nome,
    produtoSlug: pedido.produtoSlug,
    nif: pedido.nif ?? undefined,
    tipo: pedido.tipo ?? undefined,
    designacao: pedido.designacao ?? undefined,
    regimeEnsino: pedido.regimeEnsino ?? undefined,
    contactEmail: pedido.contactEmail ?? undefined,
    contactPhone: pedido.contactPhone ?? undefined,
    province: pedido.province ?? undefined,
    city: pedido.city ?? undefined,
    firstAdminName: pedido.firstAdminName ?? undefined,
    firstAdminEmail: pedido.firstAdminEmail ?? undefined,
    firstAdminPhone: pedido.firstAdminPhone ?? undefined,
    notas: pedido.notas ?? undefined,
    planoId: pedido.planoId ?? undefined,
    trialDias: pedido.trialDias ?? undefined,
    escolaCodigo: pedido.escolaCodigo,
    escolaId: pedido.escolaId,
  };
}

rotasSupervisaoOperador.get(
  '/pedidos-supervisao',
  exigir('tenants:ler'),
  rota(async (req, res) => {
    const bruto = (req.query.estado as string | undefined) ?? null;
    const estado: EstadoPedido | null =
      bruto === 'pendente' || bruto === 'aprovado' || bruto === 'rejeitado' ? bruto : null;
    res.json({
      pedidos: await listarPedidos(estado),
      pendentes: await contarPedidosPendentes(),
      limiar: await lerLimiar(),
    });
  }),
);

/**
 * Aprova o pedido: e' aqui que o `tenant` nasce.
 *
 * A escola ja existe no produto (o director acabou de a criar la), por isso
 * `aprovisionar` so a confirma — nao volta a cria-la no produto.
 */
rotasSupervisaoOperador.post(
  '/pedidos-supervisao/:id/aprovar',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    const pedido = await procurarPedido(Number(req.params.id));
    if (!pedido) {
      res.status(404).json({ erro: 'Pedido nao encontrado.' });
      return;
    }
    if (pedido.estado !== 'pendente') {
      res.status(409).json({
        erro: `Este pedido ja esta ${pedido.estado}. So pedidos pendentes se aprovam.`,
      });
      return;
    }

    const provisionado = await aprovisionar(
      await criarTenant(dePedidoParaTenant(pedido)),
    );
    await marcarPedidoAprovado(pedido.id, req.operador?.op.id ?? null, provisionado.id);

    await registarAuditoria({
      ...actorOperador(req),
      action: 'ESCOLA_APROVADA',
      entityType: 'tenant',
      entityId: String(provisionado.id),
      entityName: pedido.nome,
      details: `Pedido ${pedido.id} aprovado; escola ${pedido.escolaCodigo} entrou em supervisao.`,
    });

    res.json({ estado: 'aprovado', tenant: provisionado });
  }),
);

/**
 * Rejeita o pedido. Nao ha `tenant` a limpar porque nunca foi criado — e' o
 * ganho de separar as duas coisas.
 *
 * O produto e' avisado para bloquear a conta, porque uma escola rejeitada nao
 * pode ficar a funcionar na app. A conta bloqueada mantem o login, para o
 * director ver o motivo e poder corrigir e reenviar.
 */
rotasSupervisaoOperador.post(
  '/pedidos-supervisao/:id/rejeitar',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    const motivo = String(req.body?.motivo ?? '').trim();
    if (!motivo) {
      res.status(400).json({
        erro: "O motivo da rejeicao e obrigatorio: e' o que o director vai ler no produto.",
      });
      return;
    }
    const pedido = await procurarPedido(Number(req.params.id));
    if (!pedido) {
      res.status(404).json({ erro: 'Pedido nao encontrado.' });
      return;
    }
    if (pedido.estado !== 'pendente') {
      res.status(409).json({
        erro: `Este pedido ja esta ${pedido.estado}. So pedidos pendentes se rejeitam.`,
      });
      return;
    }

    await marcarPedidoRejeitado(pedido.id, req.operador?.op.id ?? null, motivo);

    // O bloqueio e' tentado, nao garantido: a rejeicao ja esta registada e um
    // produto fora do ar nao pode impedir a equipa de rejeitar.
    let produtoAvisado: 'bloqueada' | 'aviso_falhou' = 'aviso_falhou';
    let avisoErro: string | null = null;
    try {
      await bloquearEscolaNoProduto(pedido.produtoSlug, pedido.escolaCodigo, {
        motivo,
        pedidoId: pedido.id,
      });
      produtoAvisado = 'bloqueada';
    } catch (e) {
      avisoErro = (e as Error).message;
    }

    await registarAuditoria({
      ...actorOperador(req),
      action: 'ESCOLA_REJEITADA',
      entityType: 'escola_pedido',
      entityId: String(pedido.id),
      entityName: pedido.nome,
      details: `Pedido ${pedido.id} rejeitado. Produto: ${produtoAvisado}${avisoErro ? ` (${avisoErro})` : ''}.`,
    });

    res.json({ estado: 'rejeitado', produtoAvisado, avisoErro });
  }),
);

/** Reabre um pedido rejeitado, para o director corrigir e reenviar. */
rotasSupervisaoOperador.post(
  '/pedidos-supervisao/:id/reabrir',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    const pedido = await reabrirPedido(Number(req.params.id));
    if (!pedido) {
      res.status(404).json({ erro: 'Pedido nao encontrado ou nao estava rejeitado.' });
      return;
    }
    await registarAuditoria({
      ...actorOperador(req),
      action: 'ESCOLA_PEDIDO_REABERTO',
      entityType: 'escola_pedido',
      entityId: String(pedido.id),
      entityName: pedido.nome,
      details: `Pedido ${pedido.id} reaberto; a equipa volta a ter a decisao.`,
    });
    res.json({ estado: pedido.estado, pedido });
  }),
);

// ===========================================================================
// 3. O limiar: a equipa ve e mexe na regra
// ===========================================================================

/** O limiar que a equipa esta a ver. */
rotasSupervisaoOperador.get(
  '/limiar-supervisao',
  exigir('config:ler'),
  rota(async (_req, res) => {
    res.json({ limiar: await lerLimiar() });
  }),
);

/**
 * Muda o limiar. O valor antigo fica na auditoria: sem isso, "porque e' que esta
 * escola passou" nao tem resposta um mes depois.
 */
rotasSupervisaoOperador.put(
  '/limiar-supervisao',
  exigir('config:escrever'),
  rota(async (req, res) => {
    const anterior = await lerLimiar();
    const novo = {
      alunos: Number(req.body?.alunos),
      valorAnualAoa: Number(req.body?.valorAnualAoa),
      exigirSempre: req.body?.exigirSempre === true,
    };
    if (!Number.isFinite(novo.alunos) || novo.alunos < 0) {
      res.status(400).json({ erro: 'alunos tem de ser um numero >= 0.' });
      return;
    }
    if (!Number.isFinite(novo.valorAnualAoa) || novo.valorAnualAoa < 0) {
      res.status(400).json({ erro: 'valorAnualAoa tem de ser um numero >= 0.' });
      return;
    }
    await gravarSettings({ limiarSupervisao: novo });
    await registarAuditoria({
      ...actorOperador(req),
      action: 'LIMIAR_SUPERVISAO_ALTERADO',
      entityType: 'config',
      entityId: 'limiarSupervisao',
      entityName: 'Limiar de supervisao',
      details:
        `de ${JSON.stringify(anterior)} para ${JSON.stringify(novo)}. ` +
        'Afecta apenas pedidos futuros; os que ja estao na fila ficam como estao.',
    });
    res.json({ limiar: novo, anterior });
  }),
);
