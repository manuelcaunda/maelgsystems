/**
 * Sessao do operador no MaelG Systems.
 *
 * O token vive no localStorage e vai em `Authorization: Bearer`. E o unico
 * header de autenticacao da plataforma: sem ele, os endpoints nao respondem.
 */
import type { NovoOperador, Operator } from '../types';

const CHAVE_TOKEN = 'maelg.token';

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
  | 'auditoria:ler';

export interface RespostaSessao {
  token: string;
  operador: Operator;
  permissoes: Permissao[];
}

export class ErroSessao extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function lerToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function guardarToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function limparToken(): void {
  localStorage.removeItem(CHAVE_TOKEN);
}

/** fetch da plataforma, ja com o header de autorizacao. */
export async function pedir<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const token = lerToken();
  const headers = new Headers(opcoes.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const r = await fetch(`/api${caminho}`, { ...opcoes, headers });

  if (r.status === 204) return undefined as T;

  const corpo = await r.json().catch(() => null);

  if (!r.ok) {
    // 401 significa que o token morreu: limpa, para a UI poder mostrar o login
    if (r.status === 401) limparToken();
    throw new ErroSessao(
      (corpo as { erro?: string } | null)?.erro ?? `Erro ${r.status}`,
      r.status,
    );
  }
  return corpo as T;
}

export async function login(email: string, password: string): Promise<RespostaSessao> {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) {
    throw new ErroSessao((corpo as { erro?: string } | null)?.erro ?? 'Nao foi possivel entrar.', r.status);
  }
  return corpo as RespostaSessao;
}

export async function eu(): Promise<{ operador: Operator; permissoes: Permissao[] } | null> {
  if (!lerToken()) return null;
  try {
    return await pedir('/auth/me');
  } catch {
    return null;
  }
}

export interface EstadoPlataforma {
  total: number;
  bootstrapNecessario: boolean;
}

/** A plataforma esta vazia? A pagina de login usa isto para oferecer o bootstrap. */
export async function estadoPlataforma(): Promise<EstadoPlataforma> {
  const r = await fetch('/api/operadores/estado');
  if (!r.ok) return { total: 0, bootstrapNecessario: false };
  return (await r.json()) as EstadoPlataforma;
}

/**
 * Cria a primeira conta. So funciona enquanto a plataforma nao tiver nenhum
 * operador -- e o unico caminho para sair de um sistema vazio. Depois disso o
 * endpoint exige sessao e `operadores:escrever`.
 */
export async function bootstrap(dados: NovoOperador): Promise<Operator> {
  const r = await fetch('/api/operadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) {
    throw new ErroSessao((corpo as { erro?: string } | null)?.erro ?? 'Nao foi possivel criar a conta.', r.status);
  }
  return corpo as Operator;
}
