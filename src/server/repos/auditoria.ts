/**
 * Registo de auditoria — tabela `audit_log` da base `maelg`.
 *
 * Tudo o que um operador faz na plataforma passa por aqui. As escritas nunca
 * saem da base: nao ha update nem delete neste repositorio, de proposito.
 */
import type { AuditLogRow, ContagemRow } from './tabelas';
import { getPool } from '../db';

export interface EntradaAuditoria {
  actorName: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  details?: string | null;
  changes?: unknown;
}

export async function registarAuditoria(e: EntradaAuditoria): Promise<void> {
  await getPool().execute(
    `INSERT INTO audit_log
       (actorName, actorEmail, actorRole, ipAddress, action, entityType, entityId, entityName, details, changes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.actorName,
      e.actorEmail ?? null,
      e.actorRole ?? null,
      e.ipAddress ?? null,
      e.action,
      e.entityType,
      e.entityId ?? null,
      e.entityName ?? null,
      e.details ?? null,
      e.changes === undefined ? null : JSON.stringify(e.changes),
    ],
  );
}

export async function listarAuditoria(filtros: {
  acao?: string;
  entidade?: string;
  limite?: number;
  offset?: number;
} = {}): Promise<{ total: number; registos: unknown[] }> {
  const where: string[] = [];
  const args: unknown[] = [];

  if (filtros.acao) {
    where.push('action = ?');
    args.push(filtros.acao);
  }
  if (filtros.entidade) {
    where.push('entityType = ?');
    args.push(filtros.entidade);
  }
  const clausula = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const limite = Math.min(Number(filtros.limite ?? 50), 500);
  const offset = Number(filtros.offset ?? 0);

  const [[{ n }]] = await getPool().query<ContagemRow[]>(
    `SELECT COUNT(*) AS n FROM audit_log ${clausula}`,
    args,
  );

  const [rows] = await getPool().query<AuditLogRow[]>(
    `SELECT * FROM audit_log ${clausula} ORDER BY id DESC LIMIT ${limite} OFFSET ${offset}`,
    args,
  );

  return {
    total: Number(n),
    registos: rows.map((r) => ({
      id: r.id,
      operatorName: r.actorName,
      operatorEmail: r.actorEmail,
      operatorRole: r.actorRole,
      ipAddress: r.ipAddress,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      entityName: r.entityName,
      details: r.details,
      changes: r.changes ? JSON.parse(r.changes) : null,
      createdAt: r.criado_em.toISOString(),
    })),
  };
}
