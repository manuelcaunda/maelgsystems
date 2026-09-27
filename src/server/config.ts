/**
 * Configuração do MaelG Systems.
 *
 * Lê o `.env` do próprio maelgsystems. Não toca no `.env` do backend: a
 * plataforma tem a sua base de dados (maelg) e fala com cada produto por
 * HTTP, usando as credenciais da tabela `produto_acesso`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let carregado = false;
const valores: Record<string, string> = {};

export function carregarEnv(): Record<string, string> {
  if (carregado) return valores;

  // variaveis de ambiente teem prioridade sobre o ficheiro
  for (const ficheiro of [path.join(RAIZ, '.env'), path.join(RAIZ, '.env.local')]) {
    if (!fs.existsSync(ficheiro)) continue;
    for (const linha of fs.readFileSync(ficheiro, 'utf-8').split(/\r?\n/)) {
      const t = linha.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const chave = t.slice(0, i).trim();
      if (chave in valores) continue;
      valores[chave] = t.slice(i + 1).trim();
    }
  }

  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) valores[k] = v;
  }

  carregado = true;
  return valores;
}

function obter(chave: string, alternativa?: string): string {
  const v = carregarEnv()[chave];
  if (v === undefined || v === '') {
    if (alternativa !== undefined) return alternativa;
    throw new Error(`Falta a variavel ${chave} no .env do maelgsystems`);
  }
  return v;
}

export const config = {
  get port(): number {
    return Number(obter('PORT', '3000'));
  },

  get db(): {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  } {
    return {
      host: obter('MAELG_DB_HOST', 'localhost'),
      port: Number(obter('MAELG_DB_PORT', '3306')),
      user: obter('MAELG_DB_USER'),
      password: obter('MAELG_DB_PASSWORD', ''),
      database: obter('MAELG_DB_NAME', 'maelg'),
    };
  },

  get jwtSecret(): string {
    return obter('MAELG_JWT_SECRET');
  },

  /**
   * Chave de cifra das credenciais de produto. Vai no `.env`, nunca na base:
   * se a base encriptar e a chave estiver la dentro, a cifra nao protege nada.
   */
  get chaveCredenciais(): string {
    return obter('MAELG_CREDENTIALS_KEY');
  },

  get sessaoHoras(): number {
    return Number(obter('MAELG_SESSAO_HORAS', '12'));
  },
};

/** Papeis de operador, por ordem de privilegio. */
export const PAPEIS = [
  'super_admin',
  'product_admin',
  'finance_admin',
  'support_admin',
  'auditor',
] as const;

export type Papel = (typeof PAPEIS)[number];

export function ehPapel(valor: string): valor is Papel {
  return (PAPEIS as readonly string[]).includes(valor);
}
