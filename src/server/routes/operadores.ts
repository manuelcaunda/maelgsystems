/**
 * Endpoints de sessao e de contas de operador.
 *
 * Tudo aqui e exclusivo da equipa MaelG Systems. A app do cliente nunca chama
 * estes endpoints — para isso existe o router de plataforma do produto.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { criarToken, permissoesDe } from '../auth';
import { exigirSessao, exigir } from '../middleware';
import { pode } from '../auth';
import { ehPapel, PAPEIS } from '../config';
import {
  OperadorErro,
  criarOperador,
  contarOperadores,
  listarOperadores,
  procurarPorEmail,
  procurarPorId,
  registarLogin,
  validarPassword,
  actualizarOperador,
  eliminarOperador,
} from '../repos/operadores';
import { registarAuditoria } from '../repos/auditoria';

export const rotasOperadores = Router();

// ---------------------------------------------------------------------------
// Sessao
// ---------------------------------------------------------------------------

/** Quem sou eu — usado pelo frontend para saber o que pode mostrar. */
rotasOperadores.get('/auth/me', exigirSessao, async (req, res) => {
  const { op, papel } = req.operador!;
  res.json({ operador: op, permissoes: permissoesDe(papel) });
});

rotasOperadores.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ erro: 'Email e password sao obrigatorios.' });
  }

  const linha = await procurarPorEmail(email);

  // mesma resposta para "nao existe" e "password errada": nao dizemos quais
  // emails estao registados
  if (!linha || !(await validarPassword(linha.password_hash, password))) {
    return res.status(401).json({ erro: 'Email ou password incorrectos.' });
  }
  if (!linha.activo) {
    return res.status(403).json({ erro: 'A conta esta desactivada. Contacta um administrador.' });
  }

  await registarLogin(linha.id);
  const op = await procurarPorId(linha.id);

  await registarAuditoria({
    actorName: linha.name,
    actorEmail: linha.email,
    actorRole: linha.role,
    ipAddress: req.ip ?? null,
    action: 'OPERADOR_LOGIN',
    entityType: 'super_admin_user',
    entityId: String(linha.id),
    entityName: linha.name,
  });

  res.json({
    token: criarToken({ id: linha.id, email: linha.email, role: linha.role }),
    operador: op,
    permissoes: permissoesDe(linha.role),
  });
});

// ---------------------------------------------------------------------------
// Contas de operador
// ---------------------------------------------------------------------------

/** Sem sessao e permitida a leitura: serve a pagina de login dizer se a
 *  plataforma esta vazia e o bootstrap e necessario. */
rotasOperadores.get('/operadores/estado', async (_req, res) => {
  const total = await contarOperadores();
  res.json({ total, bootstrapNecessario: total === 0 });
});

/** Papeis disponiveis, para alimentar o selector da UI. */
rotasOperadores.get('/operadores/papeis', exigirSessao, exigir('operadores:ler'), (_req, res) => {
  res.json({ papeis: PAPEIS });
});

rotasOperadores.get('/operadores', exigirSessao, exigir('operadores:ler'), async (_req, res) => {
  res.json(await listarOperadores());
});

/**
 * Criar conta. O papel vem do corpo, validado contra a lista fechada.
 *
 * Se ainda nao existe nenhum operador, o primeiro pode ser criado sem sessao:
 * e o unico caminho para dar de sistema vazio. A partir de ai, tudo exige sessao.
 */
rotasOperadores.post('/operadores', exigirSessaoOBootstrap, async (req, res) => {
  try {
    const nome = String(req.body?.name ?? req.body?.nome ?? '');
    const email = String(req.body?.email ?? '');
    const password = String(req.body?.password ?? '');
    const papel = String(req.body?.role ?? req.body?.papel ?? '');

    if (!ehPapel(papel)) {
      return res.status(400).json({
        erro: `Papel invalido. Validos: ${PAPEIS.join(', ')}`,
      });
    }

    const op = await criarOperador({
      nome,
      email,
      password,
      papel,
      criadoPor: req.operador?.id ?? null,
    });

    await registarAuditoria({
      actorName: req.operador?.op.name ?? 'bootstrap',
      actorEmail: req.operador?.op.email ?? null,
      actorRole: req.operador?.papel ?? 'super_admin',
      ipAddress: req.ip ?? null,
      action: 'OPERADOR_CRIADO',
      entityType: 'super_admin_user',
      entityId: String(op.id),
      entityName: op.name,
      details: `Papel ${op.role}. Conta de ${op.email}.`,
    });

    res.status(201).json(op);
  } catch (e) {
    if (e instanceof OperadorErro) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
});

rotasOperadores.put('/operadores/:id', exigirSessao, exigir('operadores:escrever'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const corpo = req.body ?? {};

    if (corpo.password && String(corpo.password).length < 8) {
      return res.status(400).json({ erro: 'A password precisa de pelo menos 8 caracteres.' });
    }
    if (corpo.role !== undefined && !ehPapel(String(corpo.role))) {
      return res.status(400).json({ erro: `Papel invalido. Validos: ${PAPEIS.join(', ')}` });
    }

    const op = await actualizarOperador(id, {
      nome: corpo.name ?? corpo.nome,
      papel: corpo.role,
      activo: corpo.active,
      password: corpo.password,
    });

    await registarAuditoria({
      actorName: req.operador!.op.name,
      actorEmail: req.operador!.op.email,
      actorRole: req.operador!.papel,
      ipAddress: req.ip ?? null,
      action: 'OPERADOR_ACTUALIZADO',
      entityType: 'super_admin_user',
      entityId: String(op.id),
      entityName: op.name,
    });

    res.json(op);
  } catch (e) {
    if (e instanceof OperadorErro) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
});

rotasOperadores.delete('/operadores/:id', exigirSessao, exigir('operadores:escrever'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.operador!.id) {
      return res.status(400).json({ erro: 'Nao podes remover a tua propria conta.' });
    }
    const alvo = await procurarPorId(id);
    await eliminarOperador(id);

    await registarAuditoria({
      actorName: req.operador!.op.name,
      actorEmail: req.operador!.op.email,
      actorRole: req.operador!.papel,
      ipAddress: req.ip ?? null,
      action: 'OPERADOR_REMOVIDO',
      entityType: 'super_admin_user',
      entityId: String(id),
      entityName: alvo?.name ?? String(id),
    });

    res.status(204).end();
  } catch (e) {
    if (e instanceof OperadorErro) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
});

/**
 * Plataforma vazia: o primeiro operador nasce sem sessao. E o unico pedido do
 * sistema que passa sem `Authorization` — e so enquanto a tabela esta vazia.
 *
 * A verificacao de permissao e' feita aqui, e nao num `exigir(...)` seguinte:
 * com a base vazia nao ha `req.operador`, e esse middleware responderia 401 e
 * o bootstrap nunca fecharia. A partir da segunda conta, a permissao passa a
 * ser exigida normalmente.
 */
async function exigirSessaoOBootstrap(req: Request, res: Response, next: NextFunction) {
  try {
    const total = await contarOperadores();

    if (total === 0) {
      // primeira conta: tem de ser super_admin, senao ficava nobody com
      // permissao para criar a segunda conta.
      const papel = String(req.body?.role ?? req.body?.papel ?? '');
      if (papel !== 'super_admin') {
        res.status(400).json({
          erro: 'A primeira conta tem de ser super_admin.',
        });
        return;
      }
      next();
      return;
    }

    if (!req.header('authorization')) {
      res.status(401).json({ erro: 'Falta o header Authorization: Bearer <token>' });
      return;
    }

    exigirSessao(req, res, (erro?: unknown) => {
      if (erro) return next(erro);
      if (!req.operador || !pode(req.operador.papel, 'operadores:escrever')) {
        res.status(403).json({ erro: 'Sem permissao para criar operadores.' });
        return;
      }
      next();
    });
  } catch (e) {
    next(e);
  }
}
