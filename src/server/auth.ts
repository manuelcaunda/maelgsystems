/**
 * Sessao dos operadores: JWT assinado com MAELG_JWT_SECRET + mapa de
 * permissoes por papel.
 */
import crypto from 'crypto';
import { config, type Papel } from './config';
import type { Operator } from '../types';

export interface SessaoPayload {
  sub: number;
  email: string;
  papel: Papel;
  exp: number;
  iat: number;
}

const b64 = (s: string) => Buffer.from(s, 'utf-8').toString('base64url');

function assinar(dados: string): string {
  return crypto.createHmac('sha256', config.jwtSecret).update(dados).digest('base64url');
}

export function criarToken(op: { id: number; email: string; role: Papel }): string {
  const agora = Math.floor(Date.now() / 1000);
  const payload: SessaoPayload = {
    sub: op.id,
    email: op.email,
    papel: op.role,
    iat: agora,
    exp: agora + config.sessaoHoras * 3600,
  };
  const corpo = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(
    JSON.stringify(payload),
  )}`;
  return `${corpo}.${assinar(corpo)}`;
}

export function verificarToken(token: string): SessaoPayload | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [cabecalho, corpo, assinatura] = partes;

  // comparacao em tempo constante: nao deixa revelar o segredo por temporizacao
  const esperada = Buffer.from(assinar(`${cabecalho}.${corpo}`));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length) return null;
  if (!crypto.timingSafeEqual(esperada, recebida)) return null;

  try {
    const payload = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf-8')) as SessaoPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Permissoes
// ---------------------------------------------------------------------------

export type Permissao =
  | 'produtos:ler'
  | 'produtos:escrever'
  | 'planos:ler'
  | 'planos:escrever'
  | 'tenants:ler'
  | 'tenants:escrever'
  | 'financeiro:ler'
  | 'financeiro:escrever'
  | 'operadores:ler'
  | 'operadores:escrever'
  | 'auditoria:ler'
  | 'config:ler'
  | 'config:escrever';

/**
 * O `auditor` ve tudo e nao escreve nada. O `support_admin` mexe em tenants mas
 * nao em dinheiro. Nao ha nenhum papel, por mais alto que seja, que escapes a
 * separacao entre ver e escrever.
 */
export const PERMISSOES: Record<Papel, Permissao[]> = {
  super_admin: [
    'produtos:ler', 'produtos:escrever',
    'planos:ler', 'planos:escrever',
    'tenants:ler', 'tenants:escrever',
    'financeiro:ler', 'financeiro:escrever',
    'operadores:ler', 'operadores:escrever',
    'auditoria:ler',
    'config:ler', 'config:escrever',
  ],
  product_admin: [
    'produtos:ler', 'produtos:escrever',
    'planos:ler', 'planos:escrever',
    'tenants:ler', 'tenants:escrever',
    'auditoria:ler',
  ],
  finance_admin: [
    'produtos:ler',
    'planos:ler',
    'tenants:ler',
    'financeiro:ler', 'financeiro:escrever',
    'auditoria:ler',
    'config:ler',
  ],
  support_admin: [
    'produtos:ler',
    'planos:ler',
    'tenants:ler', 'tenants:escrever',
    'auditoria:ler',
  ],
  auditor: [
    'produtos:ler',
    'planos:ler',
    'tenants:ler',
    'financeiro:ler',
    'operadores:ler',
    'auditoria:ler',
  ],
};

export function pode(papel: Papel, permissao: Permissao): boolean {
  return PERMISSOES[papel]?.includes(permissao) ?? false;
}

/** O que o frontend recebe para decidir o que mostrar. */
export function permissoesDe(papel: Papel): Permissao[] {
  return PERMISSOES[papel] ?? [];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      operador?: { id: number; email: string; papel: Papel; op: Operator };
    }
  }
}
