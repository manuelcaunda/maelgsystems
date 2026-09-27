/**
 * Endpoints que os **produtos** chamam (nao os operadores).
 *
 * Aqui nao ha JWT de operador: ha a credencial do produto, no header. E o
 * unico sitio do MaelG Systems onde um sistema externo entra.
 *
 *   X-Maelg-Produto: <chave>
 *   X-Maelg-Segredo: <segredo>
 *
 * Um produto so ve os seus proprios dados. `exigirProduto` carimba o slug em
 * `req.produtoSlug` e cada rota filtra por ele — sem essa clausula, um produto
 * com credenciais validas lia os dados de outro.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { marcarCredencialUsada, verificarCredencialProduto } from '../repos/produtos';
import { registarAuditoria } from '../repos/auditoria';
import { erroDoServidor, rota } from '../http';
import { criarTenant, type NovoTenant } from '../repos/tenants';
import { aprovisionar } from '../registo_escola';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      produtoSlug?: string;
    }
  }
}

async function exigirProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
  const chave = req.header('x-maelg-produto') ?? '';
  const segredo = req.header('x-maelg-segredo') ?? '';

  const slug = await verificarCredencialProduto(chave, segredo);
  if (!slug) {
    // resposta igual para chave inexistente e segredo errado
    res.status(401).json({
      erro: 'Credencial de produto invalida (X-Maelg-Produto / X-Maelg-Segredo).',
    });
    return;
  }

  req.produtoSlug = slug;
  await marcarCredencialUsada(chave);
  next();
}

export const rotasPlataforma = Router();

rotasPlataforma.use(exigirProduto);

/**
 * O director da escola cria a conta na **app do produto**. O produto chama-nos
 * para a escola entrar na supervisao: registamos a inscricao comercial, ligamos
 * o plano e a assinatura, e a partir daqui e' o MaelG Systems que manda.
 *
 * A escola ja existe na base do produto — ele acaba de a criar. Por isso nao
 * voltamos a pedir nada ao produto: seria criar a mesma escola duas vezes. O
 * `escolaCodigo` no corpo do pedido e' o que diz que a escola e' nossa, e o
 * `produtoSlug` vem sempre da credencial, nunca do corpo.
 */
rotasPlataforma.post(
  '/escolas',
  rota(async (req, res) => {
    const d = req.body as Partial<NovoTenant>;

    if (!d.escolaCodigo || !d.escolaId) {
      res.status(400).json({
        erro: 'Indica escolaCodigo e escolaId: a escola tem de existir no produto antes de vir para aqui.',
      });
      return;
    }

    let tenant = await criarTenant({
      nome: d.nome ?? '',
      produtoSlug: req.produtoSlug as string,
      nif: d.nif,
      tipo: d.tipo,
      designacao: d.designacao,
      regimeEnsino: d.regimeEnsino,
      contactEmail: d.contactEmail,
      contactPhone: d.contactPhone,
      province: d.province,
      city: d.city,
      firstAdminName: d.firstAdminName,
      firstAdminEmail: d.firstAdminEmail,
      firstAdminPhone: d.firstAdminPhone,
      notas: d.notas,
      planoId: d.planoId,
      trialDias: d.trialDias,
      escolaCodigo: d.escolaCodigo,
      escolaId: d.escolaId,
    });

    tenant = await aprovisionar(tenant);

    await registarAuditoria({
      actorName: tenant.nome,
      actorEmail: d.firstAdminEmail ?? '',
      actorRole: 'produto',
      action: 'ESCOLA_SUPERVISIONADA',
      entityType: 'tenant',
      entityId: String(tenant.id),
      entityName: tenant.nome,
      ipAddress: req.ip,
      details: `Entrou pela app do produto ${req.produtoSlug}; escola ${d.escolaCodigo}.`,
    });

    res.status(201).json(tenant);
  }),
);

/**
 * Actualiza a escola que o produto ja manages. So o estado comercial; o
 * produto continua a ser dono dos dados pedagogicos.
 */
rotasPlataforma.put(
  '/escolas/:codigo',
  rota(async (req, res) => {
    const { actualizarTenant } = await import('../repos/tenants');
    const alvo = await actualizarTenant(req.params.codigo, req.body ?? {});
    if (alvo.produtoSlug !== req.produtoSlug) {
      res.status(404).json({ erro: 'Escola nao encontrada.' });
      return;
    }
    res.json(alvo);
  }),
);

/** O produto pergunta pelo estado do seu proprio tenant. */
rotasPlataforma.get(
  '/escolas/:codigo',
  rota(async (req, res) => {
    const { procurarTenant } = await import('../repos/tenants');
    const alvo = await procurarTenant(req.params.codigo);
    if (!alvo || alvo.produtoSlug !== req.produtoSlug) {
      res.status(404).json({ erro: 'Escola nao encontrada.' });
      return;
    }
    res.json(alvo);
  }),
);

export { erroDoServidor };
