/**
 * Proteccao dos endpoints do MaelG Systems.
 *
 * O header e o unico portao de entrada:
 *
 *   Authorization: Bearer <jwt>
 *
 * Devolve sempre 401 quando o header falta ou o token nao e valido, e 403
 * quando o token e valido mas o papel nao tem a permissao pedida. A distincao
 * importa: 401 diz "identifica-te", 403 diz "identifica-te nao chega".
 */
import type { NextFunction, Request, Response } from 'express';
import { verificarToken, pode, type Permissao } from './auth';
import type { Papel } from './config';
import type { Operator } from '../types';
import { procurarPorId } from './repos/operadores';

export interface OperadorSessao {
  id: number;
  email: string;
  papel: Papel;
  op: Operator;
}

function extrairToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [esquema, token] = header.split(' ');
  if (esquema !== 'Bearer' || !token) return null;
  return token;
}

/** Exige sessao valida. Popula req.operador. */
export async function exigirSessao(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extrairToken(req);
  if (!token) {
    res.status(401).json({ erro: 'Falta o header Authorization: Bearer <token>' });
    return;
  }

  const payload = verificarToken(token);
  if (!payload) {
    res.status(401).json({ erro: 'Sessao invalida ou expirada. Entra de novo.' });
    return;
  }

  // o papel vem do token, mas confirmamos contra a base: se a conta foi
  // desactivada ou o papel mudou entretanto, o token antigo deixa de valer
  const op = await procurarPorId(payload.sub);
  if (!op || !op.active) {
    res.status(401).json({ erro: 'A conta ja nao esta activa.' });
    return;
  }
  if (op.role !== payload.papel) {
    res.status(401).json({ erro: 'O papel da conta mudou. Entra de novo.' });
    return;
  }

  req.operador = { id: op.id, email: op.email, papel: op.role, op };
  next();
}

/** Exige uma das permissoes indicadas. Usar sempre a seguir a exigirSessao. */
export function exigir(...permissoes: Permissao[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sessao: OperadorSessao | undefined = req.operador;
    if (!sessao) {
      res.status(401).json({ erro: 'Sem sessao.' });
      return;
    }
    const emFalta = permissoes.filter((p) => !pode(sessao.papel, p));
    if (emFalta.length) {
      res.status(403).json({
        erro: `O papel ${sessao.papel} nao tem estas permissoes: ${emFalta.join(', ')}`,
      });
      return;
    }
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      operador?: OperadorSessao;
    }
  }
}
