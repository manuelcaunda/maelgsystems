/**
 * Pool MySQL da base de dados da plataforma (maelg).
 *
 * Esta e a UNICA ligacao de base de dados do maelgsystems. O produto (maelgest)
 * nunca e acedido por SQL — para isso existe `produto-client.ts`, que fala HTTP
 * com a API do produto usando as credenciais da tabela `produto_acesso`.
 */
import mysql from 'mysql2/promise';
import { config } from './config';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (pool) return pool;
  const c = config.db;
  pool = mysql.createPool({
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: c.database,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    charset: 'utf8mb4',
  });
  return pool;
}

/** Igual ao getPool, mas dentro de uma transacao. Faz rollback se algo falhar. */
export async function emTransacao<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Diagnostico usado por /api/healthz. */
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
