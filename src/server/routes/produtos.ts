/**
 * Produtos e planos.
 *
 * Nao ha `POST /api/products` que crie so o produto: ou cria o produto
 * inteiro com pelo menos um plano (transaccao), ou nao cria nada. Um produto
 * sem planos nao serve para nada e ia obrigar a um segundo pedido.
 */
import { Router } from 'express';
import { exigirSessao } from '../middleware';
import { exigir } from '../middleware';
import { erroDoServidor, rota } from '../http';
import { registarAuditoria } from '../repos/auditoria';
import {
  actualizarPlano,
  actualizarProduto,
  criarPlano,
  criarProdutoComEsqueleto,
  eliminarPlano,
  eliminarProduto,
  listarPlanos,
  listarProdutos,
  procurarProduto,
  type NovoPlano,
  type NovoProduto,
} from '../repos/produtos';
import type { Papel } from '../config';

export const rotasProdutos = Router();

rotasProdutos.use(exigirSessao);

rotasProdutos.get(
  '/products',
  rota(async (_req, res) => {
    res.json(await listarProdutos());
  }),
);

rotasProdutos.post(
  '/products',
  exigir('produtos:escrever'),
  rota(async (req, res) => {
    const d = req.body as Partial<NovoProduto>;
    const produto = await criarProdutoComEsqueleto({
      slug: d.slug ?? '',
      nome: d.nome ?? '',
      descricao: d.descricao,
      versao: d.versao,
      apiUrl: d.apiUrl ?? '',
      produtoChave: d.produtoChave ?? '',
      produtoSegredo: d.produtoSegredo ?? '',
      caminhoEscolas: d.caminhoEscolas,
      caminhoDados: d.caminhoDados,
      planos: (d.planos ?? []) as NovoPlano[],
    });

    await registarAuditoria({
      actorName: req.operador?.op.name ?? '',
      actorEmail: req.operador?.email ?? '',
      actorRole: (req.operador?.papel ?? '') as Papel,
      action: 'PRODUTO_CRIADO',
      entityType: 'produto',
      entityId: String(produto.id),
      entityName: produto.name,
      ipAddress: req.ip,
      details: `${(d.planos ?? []).length} plano(s) criado(s) na mesma transaccao.`,
    });

    res.status(201).json(produto);
  }),
);

rotasProdutos.put(
  '/products/:slug',
  exigir('produtos:escrever'),
  rota(async (req, res) => {
    const produto = await actualizarProduto(req.params.slug, req.body ?? {});
    await registarAuditoria({
      actorName: req.operador?.op.name ?? '',
      actorEmail: req.operador?.email ?? '',
      actorRole: (req.operador?.papel ?? '') as Papel,
      action: 'PRODUTO_ACTUALIZADO',
      entityType: 'produto',
      entityId: String(produto.id),
      entityName: produto.name,
      ipAddress: req.ip,
    });
    res.json(produto);
  }),
);

rotasProdutos.delete(
  '/products/:slug',
  exigir('produtos:escrever'),
  rota(async (req, res) => {
    await eliminarProduto(req.params.slug);
    await registarAuditoria({
      actorName: req.operador?.op.name ?? '',
      actorEmail: req.operador?.email ?? '',
      actorRole: (req.operador?.papel ?? '') as Papel,
      action: 'PRODUTO_REMVIDO',
      entityType: 'produto',
      entityId: req.params.slug,
      entityName: req.params.slug,
      ipAddress: req.ip,
    });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------------

rotasProdutos.get(
  '/plans',
  rota(async (req, res) => {
    const produto = typeof req.query.produto === 'string' ? req.query.produto : undefined;
    res.json(await listarPlanos(produto));
  }),
);

rotasProdutos.post(
  '/plans',
  exigir('planos:escrever'),
  rota(async (req, res) => {
    const d = req.body as { produtoSlug?: string } & Partial<NovoPlano>;
    if (!d.produtoSlug) {
      res.status(400).json({ erro: 'Indica o produto do plano.' });
      return;
    }
    const plano = await criarPlano(d.produtoSlug, {
      codigo: d.codigo ?? '',
      nome: d.nome ?? '',
      priceAoa: d.priceAoa,
      maxStudents: d.maxStudents,
      maxUsers: d.maxUsers,
      maxStorageGb: d.maxStorageGb,
      isActive: d.isActive,
    });
    await registarAuditoria({
      actorName: req.operador?.op.name ?? '',
      actorEmail: req.operador?.email ?? '',
      actorRole: (req.operador?.papel ?? '') as Papel,
      action: 'PLANO_CRIADO',
      entityType: 'plano',
      entityId: String(plano.id),
      entityName: plano.nome,
      ipAddress: req.ip,
    });
    res.status(201).json(plano);
  }),
);

rotasProdutos.put(
  '/plans/:id',
  exigir('planos:escrever'),
  rota(async (req, res) => {
    const plano = await actualizarPlano(Number(req.params.id), req.body ?? {});
    await registarAuditoria({
      actorName: req.operador?.op.name ?? '',
      actorEmail: req.operador?.email ?? '',
      actorRole: (req.operador?.papel ?? '') as Papel,
      action: 'PLANO_ACTUALIZADO',
      entityType: 'plano',
      entityId: String(plano.id),
      entityName: plano.nome,
      ipAddress: req.ip,
    });
    res.json(plano);
  }),
);

rotasProdutos.delete(
  '/plans/:id',
  exigir('planos:escrever'),
  rota(async (req, res) => {
    await eliminarPlano(Number(req.params.id));
    await registarAuditoria({
      actorName: req.operador?.op.name ?? '',
      actorEmail: req.operador?.email ?? '',
      actorRole: (req.operador?.papel ?? '') as Papel,
      action: 'PLANO_DESACTIVADO',
      entityType: 'plano',
      entityId: req.params.id,
      ipAddress: req.ip,
    });
    res.status(204).end();
  }),
);

// Para o dashboard mostrar MRR e contagens sem inventar numeros.
export { erroDoServidor, procurarProduto };
