/**
 * Tenants, assinaturas, pagamentos, settings e auditoria.
 *
 * Tudo com sessao de operador. Registo de tenant pela app e' proibido: quem
 * cria escolas e' o produto, via `/api/v1/plataforma/escolas` (ver
 * `plataforma.ts`), autenticado com a credencial do proprio produto.
 */
import { Router, type Request } from 'express';
import { exigir, exigirSessao } from '../middleware';
import { rota } from '../http';
import { registarAuditoria, listarAuditoria } from '../repos/auditoria';
import {
  actualizarTenant,
  criarTenant,
  procurarTenant as procurarTenantPorId,
  eliminarPagamento,
  eliminarTenant,
  estenderTrial,
  gravarSettings,
  lerSettings,
  listarPagamentos,
  listarSubscriptions,
  listarTenants,
  metricas,
  mudarPlano,
  registarPagamento,
  type NovoPagamento,
  type NovoTenant,
} from '../repos/tenants';
import { aprovisionar } from '../registo_escola';
import type { Papel } from '../config';

export const rotasGestao = Router();

rotasGestao.use(exigirSessao);

/**
 * Campos de auditoria do operador que fez o pedido. O `req.operador` e' posto
 * pelo `exigirSessao`, que este router aplica a todas as rotas.
 */
function actor(req: Request) {
  return {
    actorName: req.operador?.op.name ?? '',
    actorEmail: req.operador?.email ?? '',
    actorRole: (req.operador?.papel ?? '') as Papel,
    ipAddress: req.ip,
  };
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

rotasGestao.get(
  '/tenants',
  exigir('tenants:ler'),
  rota(async (_req, res) => {
    res.json(await listarTenants());
  }),
);

/**
 * Cria a inscricao e vai cria-la no produto.
 *
 * O tenant nasce primeiro, em MySQL, so depois decommos a API do produto. Se a
 * chamada falhar devolvemos 201 com o tenant em `erro` e o motivo: a
 * inscricao comercial existe, a escola ainda nao. Responder 500 aqui diria
 * "nao foi nada feito" e o operador tentava outra vez, criando um tenant
 * duplicado.
 */
rotasGestao.post(
  '/tenants',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    const dados = req.body as NovoTenant;
    let t = await criarTenant(dados);

    await registarAuditoria({
      ...actor(req),
      action: 'TENANT_CRIADO',
      entityType: 'tenant',
      entityId: String(t.id),
      entityName: t.nome,
    });

    try {
      t = await aprovisionar(t, async (saga) => {
        await registarAuditoria({
          ...actor(req),
          action: 'PROVISIONAMENTO_FALHOU',
          entityType: 'tenant',
          entityId: String(t.id),
          entityName: t.nome,
          details: saga.motivo,
        });
      });
    } catch {
      // o motivo ja ficou no tenant.provisionamentoErro e na auditoria
      const actualizado = await procurarTenantPorId(t.id);
      res.status(201).json(actualizado);
      return;
    }

    await registarAuditoria({
      ...actor(req),
      action: 'ESCOLA_APROVISIONADA',
      entityType: 'tenant',
      entityId: String(t.id),
      entityName: t.nome,
      details: `Escola ${t.escolaCodigo} criada em ${t.produtoSlug}.`,
    });

    res.status(201).json(t);
  }),
);

/**
 * Tenta de novo criar a escola no produto. Para o caso de o produto ter estado
 * em baixo na altura da primeira tentativa.
 */
rotasGestao.post(
  '/tenants/:id/aprovisionar',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    const id = Number(req.params.id);
    const antes = await procurarTenantPorId(id);
    if (!antes) {
      res.status(404).json({ erro: 'Tenant nao encontrado.' });
      return;
    }
    if (antes.provisionamento === 'provisionado') {
      res.status(409).json({ erro: 'A escola ja esta aprovisionada.' });
      return;
    }

    try {
      const t = await aprovisionar(antes, async (saga) => {
        await registarAuditoria({
          ...actor(req),
          action: 'PROVISIONAMENTO_FALHOU',
          entityType: 'tenant',
          entityId: String(id),
          entityName: antes.nome,
          details: saga.motivo,
        });
      });
      await registarAuditoria({
        ...actor(req),
        action: 'ESCOLA_APROVISIONADA',
        entityType: 'tenant',
        entityId: String(id),
        entityName: antes.nome,
      });
      res.json(t);
    } catch (e) {
      res.status(502).json({
        erro: `O produto nao aceitou a criacao da escola: ${(e as Error).message}`,
      });
    }
  }),
);

rotasGestao.put(
  '/tenants/:id',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    const t = await actualizarTenant(req.params.id, req.body ?? {});
    await registarAuditoria({
      ...actor(req),
      action: 'TENANT_ACTUALIZADO',
      entityType: 'tenant',
      entityId: String(t.id),
      entityName: t.nome,
    });
    res.json(t);
  }),
);

rotasGestao.delete(
  '/tenants/:id',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    await eliminarTenant(req.params.id);
    await registarAuditoria({
      ...actor(req),
      action: 'TENANT_REMOVIDO',
      entityType: 'tenant',
      entityId: req.params.id,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Assinaturas
// ---------------------------------------------------------------------------

rotasGestao.get(
  '/subscriptions',
  exigir('tenants:ler'),
  rota(async (_req, res) => {
    res.json(await listarSubscriptions());
  }),
);

rotasGestao.post(
  '/subscriptions/:tenantId/plano',
  exigir('planos:escrever'),
  rota(async (req, res) => {
    const { planoId, effectiveDate } = req.body as { planoId: number; effectiveDate?: string };
    const s = await mudarPlano(Number(req.params.tenantId), Number(planoId), effectiveDate);
    await registarAuditoria({
      ...actor(req),
      action: 'PLANO_ALTERADO',
      entityType: 'subscription',
      entityId: String(s.id),
      details: `Novo plano: ${s.planoNome ?? planoId}`,
    });
    res.json(s);
  }),
);

rotasGestao.post(
  '/subscriptions/:tenantId/trial',
  exigir('tenants:escrever'),
  rota(async (req, res) => {
    const { dias, motivo } = req.body as { dias: number; motivo: string };
    const s = await estenderTrial(Number(req.params.tenantId), Number(dias), motivo);
    await registarAuditoria({
      ...actor(req),
      action: 'TRIAL_ESTENDIDO',
      entityType: 'subscription',
      entityId: String(s.id),
      details: `+${dias} dias. ${motivo}`,
    });
    res.json(s);
  }),
);

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

rotasGestao.get(
  '/payments',
  exigir('financeiro:ler'),
  rota(async (_req, res) => {
    res.json(await listarPagamentos());
  }),
);

rotasGestao.post(
  '/payments',
  exigir('financeiro:escrever'),
  rota(async (req, res) => {
    const p = await registarPagamento(req.body as NovoPagamento);
    await registarAuditoria({
      ...actor(req),
      action: 'PAGAMENTO_REGISTADO',
      entityType: 'pagamento',
      entityId: String(p.id),
      entityName: p.receiptNumber,
      details: `${p.amountAoa} AOA, tenant ${p.tenantNome ?? p.tenantId}.`,
    });
    res.status(201).json(p);
  }),
);

rotasGestao.delete(
  '/payments/:id',
  exigir('financeiro:escrever'),
  rota(async (req, res) => {
    await eliminarPagamento(Number(req.params.id));
    await registarAuditoria({
      ...actor(req),
      action: 'PAGAMENTO_REMOVIDO',
      entityType: 'pagamento',
      entityId: req.params.id,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Plataforma
// ---------------------------------------------------------------------------

rotasGestao.get(
  '/settings',
  exigir('config:ler'),
  rota(async (_req, res) => {
    res.json(await lerSettings());
  }),
);

rotasGestao.put(
  '/settings',
  exigir('config:escrever'),
  rota(async (req, res) => {
    const novo = await gravarSettings(req.body ?? {});
    await registarAuditoria({
      ...actor(req),
      action: 'CONFIG_ACTUALIZADA',
      entityType: 'platform_settings',
      details: Object.keys(req.body ?? {}).join(', '),
    });
    res.json(novo);
  }),
);

rotasGestao.get(
  '/audit_logs',
  exigir('auditoria:ler'),
  rota(async (req, res) => {
    const q = req.query;
    res.json(
      await listarAuditoria({
        limite: q.limite ? Number(q.limite) : 50,
        acao: typeof q.acao === 'string' ? q.acao : undefined,
        entidade: typeof q.entidade === 'string' ? q.entidade : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      }),
    );
  }),
);

/** Metricas contadas na base — nunca somadas a partir de mocks. */
rotasGestao.get(
  '/metricas',
  exigir('config:ler'),
  rota(async (_req, res) => {
    res.json(await metricas());
  }),
);
