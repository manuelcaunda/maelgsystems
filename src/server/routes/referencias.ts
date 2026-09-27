/**
 * Referencias de plano: a subscricao e o upgrade chegam ao produto com um
 * codigo de 9 digitos.
 *
 * Tres grupos, tres听起来 publicos:
 *
 *   `rotasReferenciaProduto`   o produto resgata o codigo que o director
 *     digitou. E' a unica rota em que um segredo escrito por uma pessoa se
 *     transforma em dados de plano, por isso responde igual a qualquer fracasso.
 *
 *   `rotasReferenciaOperador`  a equipa emite, lista e anula. So a equipa emite:
 *     um downgrade nao vem por codigo, porque reduzir receita exige conversa.
 *
 *   `rotasLimitesOperador`     o catalogo e os valores de cada plano. Serve
 *     tambem para a equipa ver que limites existem antes de vender.
 *
 * A divisao de autenticacao e' a mesma da supervisao: o produto entra com a
 * credencial dele, a equipa com sessao de operador.
 */
import { Router, type Request } from 'express';
import { exigir, exigirSessao } from '../middleware';
import { rota, ErroHttp } from '../http';
import { registarAuditoria } from '../repos/auditoria';
import { listarRecursos, lerLimitesPlano, limiteDe } from '../repos/limites';
import {
  anularReferencia,
  emitirReferencia,
  listarReferencias,
  resgatarReferencia,
  type EstadoReferencia,
  type TipoReferencia,
} from '../repos/referencias';
import { listarPlanos, procurarProduto } from '../repos/produtos';
import { procurarTenant } from '../repos/tenants';

// ---------------------------------------------------------------------------
// Produto: resgatar o codigo
// ---------------------------------------------------------------------------

export const rotasReferenciaProduto = Router();

/**
 * `POST /api/v1/plataforma/referencias/:codigo/resgatar`
 *
 * O produto chama isto quando o director introduz o codigo. A resposta e' o
 * retrato do plano, ja tirado: o produto guarda-o e a partir dai e' ele que
 * aplica, sem voltar a perguntar.
 */
rotasReferenciaProduto.post(
  '/referencias/:codigo/resgatar',
  rota(async (req: Request, res) => {
    const codigo = String(req.params.codigo ?? '').trim();
    if (!/^\d{9}$/.test(codigo)) {
      // Nem chega a base. Um codigo com letras nao e' um codigo ouruido de
      // tentativas, e' um erro de digitacao — e dizer isso ajuda o director.
      throw new ErroHttp('O codigo tem de ser 9 digitos.', 422);
    }

    const produtoSlug = req.produtoSlug as string;
    const produto = await procurarProduto(produtoSlug);
    if (!produto) throw new ErroHttp('Produto inexistente.', 404);
    const resgatada = await resgatarReferencia(codigo, produto.id);

    await registarAuditoria({
      actorName: `produto:${produtoSlug}`,
      actorRole: 'produto',
      action: 'REFERENCIA_RESGATADA',
      entityType: 'plano_referencia',
      entityId: String(codigo),
      entityName: resgatada.planoNome,
      ipAddress: req.ip,
      details: `Plano ${resgatada.planoNome} aplicado por referencia.`,
    });

    res.json({
      plano: {
        id: resgatada.planoId,
        nome: resgatada.planoNome,
        produtoEscola: resgatada.produtoEscola,
      },
      limites: resgatada.limites,
    });
  }),
);

// ---------------------------------------------------------------------------
// Equipa: emitir, listar, anular
// ---------------------------------------------------------------------------

export const rotasReferenciaOperador = Router();
// So neste router, e so para os seus proprios metodos. Este router e' montado
// em `/api`, e `/api` e' prefixo de TUDO, incluindo `/api/v1/plataforma`.
// Se o `use(exigirSessao)` fosse posto no router sem restricao de metodo,
// apanhava tambem os pedidos do produto — que nao tem sessao, tem credencial.
rotasReferenciaOperador.post('/referencias', exigirSessao);
rotasReferenciaOperador.get('/referencias', exigirSessao);
rotasReferenciaOperador.delete('/referencias/:id', exigirSessao);

const TOLERANCIA_MESES_PADRAO = 1;

/**
 * `POST /api/referencias`
 *
 * A equipa emite. E' aqui que uma escola passa a ter um plano contracted
 * antes de o director gastar o codigo.
 */
rotasReferenciaOperador.post(
  '/referencias',
  exigir('tenants:escrever'),
  rota(async (req: Request, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const produtoSlug = String(b.produtoSlug ?? '');
    const codigoPlano = String(b.planoCodigo ?? '');
    const produtoEscola = String(b.produtoEscola ?? '').trim();
    const tipo = (b.tipo === 'upgrade' ? 'upgrade' : 'subscricao') as TipoReferencia;

    if (!produtoSlug) throw new ErroHttp('produtoSlug em falta.', 422);
    if (!produtoEscola) throw new ErroHttp('produtoEscola em falta.', 422);
    if (!codigoPlano) throw new ErroHttp('planoCodigo em falta.', 422);

    const produto = await procurarProduto(produtoSlug);
    if (!produto) throw new ErroHttp('Produto inexistente.', 404);

    const planos = await listarPlanos(produtoSlug);
    const plano = planos.find((p) => p.codigo === codigoPlano);
    if (!plano) throw new ErroHttp('Plano inexistente para este produto.', 404);
    if (!plano.isActive) throw new ErroHttp('Este plano esta inactivo e nao se vende.', 422);

    // O tenant e' opcional: uma escola recem-criada ainda nao e' supervisionada,
    // e a subscricao pode chegar antes da decisao sobre ela.
    const tenant = await procurarTenant(produtoEscola);

    const ref = await emitirReferencia({
      produtoId: produto.id,
      planoId: plano.id,
      produtoEscola,
      tenantId: tenant ? tenant.id : null,
      tipo,
      emitidoPor: req.operador!.op.id,
    });

    await registarAuditoria({
      actorName: req.operador!.op.name,
      actorEmail: req.operador!.email,
      actorRole: (req.operador!.papel ?? null) as never,
      action: 'REFERENCIA_EMITIDA',
      entityType: 'plano_referencia',
      entityId: String(ref.id),
      entityName: ref.codigo,
      ipAddress: req.ip,
      details: `${tipo}: ${plano.nome} para ${produtoEscola}. Validade ate ${ref.expiraEm.toISOString().slice(0, 10)}.`,
    });

    res.json({ referencia: ref });
  }),
);

/** `GET /api/referencias` — a equipa ve o que emitiu. */
rotasReferenciaOperador.get(
  '/referencias',
  exigir('tenants:ler'),
  rota(async (req: Request, res) => {
    const q = req.query as Record<string, string>;
    const refs = await listarReferencias({
      produtoEscola: q.produtoEscola,
      estado: q.estado as EstadoReferencia | undefined,
    });
    res.json({ referencias: refs });
  }),
);

/** `DELETE /api/referencias/:id` — a equipa anula. Nao apaga. */
rotasReferenciaOperador.delete(
  '/referencias/:id',
  exigir('tenants:escrever'),
  rota(async (req: Request, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ErroHttp('Referencia inexistente.', 404);
    const anulada = await anularReferencia(id);
    if (!anulada) {
      throw new ErroHttp('Referencia ja usada ou inexistente. Uma referencia gasta nao se anula.', 409);
    }
    await registarAuditoria({
      actorName: req.operador!.op.name,
      actorEmail: req.operador!.email,
      actorRole: (req.operador!.papel ?? null) as never,
      action: 'REFERENCIA_ANULADA',
      entityType: 'plano_referencia',
      entityId: String(id),
      ipAddress: req.ip,
    });
    res.json({ anulada: true });
  }),
);

// ---------------------------------------------------------------------------
// Equipa: o catalogo de limites
// ---------------------------------------------------------------------------

export const rotasLimitesOperador = Router();
rotasLimitesOperador.use(exigirSessao);

/** `GET /api/limites` — que recursos um plano pode restringir. */
rotasLimitesOperador.get(
  '/',
  exigir('tenants:ler'),
  rota(async (req: Request, res) => {
    const q = req.query as Record<string, string>;
    if (!q.produtoSlug) throw new ErroHttp('produtoSlug em falta.', 422);
    const produto = await procurarProduto(q.produtoSlug);
    if (!produto) throw new ErroHttp('Produto inexistente.', 404);
    res.json({ recursos: await listarRecursos(produto.id) });
  }),


);

/**
 * `GET /api/limites/:produtoSlug/:planoCodigo` — os valores de um plano.
 *
 * A equipa precisa de ver isto antes de vender: e' aqui que se descobre que o
 * plano "basico" nao restringe turmas — e que ninguem pode vender essa
 * limitacao como se existisse.
 */
rotasLimitesOperador.get(
  '/:produtoSlug/:planoCodigo',
  exigir('tenants:ler'),
  rota(async (req: Request, res) => {
    const { produtoSlug, planoCodigo } = req.params as { produtoSlug: string; planoCodigo: string };
    const planos = await listarPlanos(produtoSlug);
    const plano = planos.find((p) => p.codigo === planoCodigo);
    if (!plano) throw new ErroHttp('Plano inexistente.', 404);

    const limites = await lerLimitesPlano(plano.id);
    const alunos = await limiteDe(plano.id, 'alunos');
    res.json({
      plano: { id: plano.id, codigo: plano.codigo, nome: plano.nome, precoAoa: plano.priceAoa },
      limites,
      // A tolerancia em MESES, e nao em dias: um mes nao tem sempre 30, e a
      // data que a escola ve tem de ser a data que ela entende.
      toleranciaMeses: TOLERANCIA_MESES_PADRAO,
      // `alunos` separado porque e' o limite de que a supervisao depende, e a
      // supervisao nao deve ter de percorrer o catalogo inteiro.
      limiteAlunos: alunos ? alunos.valor : null,
    });
  }),
);
