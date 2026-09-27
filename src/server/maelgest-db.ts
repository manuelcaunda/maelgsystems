/**
 * Ligação MySQL ao MaelGest (backend FastAPI) a partir da plataforma MaelG.
 *
 * A Equipa MaelG é quem cria as escolas, e o backend da escola NÃO expõe essa
 * rota. Esta módulo lê as credenciais de `backend/.env` (apenas variáveis DB_*)
 * e fala com a MESMA base de dados do MaelGest.
 *
 * Portado de `maelg/server.py` (asyncmy → mysql2).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

export interface MaelgestDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Candidatos para o `.env` do backend, do mais próximo para o mais largo. */
function candidatosEnv(): string[] {
  return [
    path.resolve(HERE, '../../../backend/.env'),   // src/server -> maelgsystems -> root
    path.resolve(HERE, '../../backend/.env'),
    path.resolve(process.cwd(), '../backend/.env'),
    path.resolve(process.cwd(), 'backend/.env'),
  ];
}

let config: MaelgestDbConfig | null = null;

/**
 * Lê apenas as chaves `DB_*` do backend, tal como o `server.py` fazia.
 * Não importa nada do pacote `app.*` — o sistema continua independente.
 */
export function carregarConfig(): MaelgestDbConfig {
  if (config) return config;

  for (const ficheiro of candidatosEnv()) {
    if (!fs.existsSync(ficheiro)) continue;
    for (const linha of fs.readFileSync(ficheiro, 'utf-8').split(/\r?\n/)) {
      const t = linha.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const chave = t.slice(0, i).trim();
      if (!chave.startsWith('DB_')) continue;
      if (process.env[chave] === undefined) {
        process.env[chave] = t.slice(i + 1).trim();
      }
    }
    break;
  }

  config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'maelgest',
  };
  return config;
}

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (pool) return pool;
  const c = carregarConfig();
  pool = mysql.createPool({
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: c.database,
    waitForConnections: true,
    connectionLimit: 5,
    namedPlaceholders: false,
    decimalNumbers: true,
  });
  return pool;
}

/** Liga à base `maelg` (plataforma: tenant/subscription/produto/plano). */
export async function getMaelgConnection(): Promise<mysql.Connection> {
  const c = carregarConfig();
  return await mysql.createConnection({
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: 'maelg',
  });
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Diagnóstico leve, usado por `/api/healthz`. */
export async function testarLigacao(): Promise<{ ok: boolean; erro?: string }> {
  try {
    const conn = await getPool().getConnection();
    try {
      await conn.query('SELECT 1');
    } finally {
      conn.release();
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
