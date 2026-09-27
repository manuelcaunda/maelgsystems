/**
 * Operadores da plataforma — tabela `super_admin_user` da base `maelg`.
 *
 * Sem dados semeados: a primeira conta cria-se com `npm run criar-operador`,
 * a partir dos dados que o utilizador escreve. A partir dai, pela propria UI.
 */
import bcrypt from 'bcryptjs';
import type { ResultSetHeader } from 'mysql2';
import { getPool } from '../db';
import { PAPEIS, type Papel } from '../config';
import type { ContagemRow, OperadorRow } from './tabelas';
import type { Operator } from '../../types';

/** 12 rounds, o mesmo custo do backend (bcrypt 4.x). */
const ROUNDS = 12;

/** Projecao para a API. O hash nunca sai daqui. */
function paraOperador(r: OperadorRow): Operator {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    lastAccess: (r.lastLoginAt ?? r.criado_em).toISOString(),
    active: r.activo === 1,
    twoFactorEnabled: r.twoFactorEnabled === 1,
    createdAt: r.criado_em.toISOString(),
  };
}

export class OperadorErro extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

export async function listarOperadores(): Promise<Operator[]> {
  const [rows] = await getPool().query<OperadorRow[]>(
    'SELECT * FROM super_admin_user ORDER BY id',
  );
  return rows.map(paraOperador);
}

export async function contarOperadores(): Promise<number> {
  const [rows] = await getPool().query<ContagemRow[]>(
    'SELECT COUNT(*) AS n FROM super_admin_user',
  );
  return Number(rows[0].n);
}

export async function procurarPorEmail(email: string): Promise<OperadorRow | null> {
  const [rows] = await getPool().query<OperadorRow[]>(
    'SELECT * FROM super_admin_user WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()],
  );
  return rows[0] ?? null;
}

export async function procurarPorId(id: number): Promise<Operator | null> {
  const [rows] = await getPool().query<OperadorRow[]>(
    'SELECT * FROM super_admin_user WHERE id = ? LIMIT 1',
    [id],
  );
  return rows[0] ? paraOperador(rows[0]) : null;
}

export interface NovoOperador {
  nome: string;
  email: string;
  password: string;
  papel: Papel;
  criadoPor?: number | null;
}

export async function criarOperador(dados: NovoOperador): Promise<Operator> {
  const nome = (dados.nome ?? '').trim();
  const email = (dados.email ?? '').trim().toLowerCase();

  if (!nome) throw new OperadorErro('O nome e obrigatorio.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new OperadorErro('Email invalido.');
  if (!PAPEIS.includes(dados.papel)) {
    throw new OperadorErro(`Papel invalido. Validos: ${PAPEIS.join(', ')}`);
  }
  // 8 caracteres e o minimo aceitavel; abaixo disso a conta e trivial de adivinhar
  if (!dados.password || dados.password.length < 8) {
    throw new OperadorErro('A password precisa de pelo menos 8 caracteres.');
  }
  if (await procurarPorEmail(email)) {
    throw new OperadorErro('Ja existe um operador com esse email.', 409);
  }

  const hash = await bcrypt.hash(dados.password, ROUNDS);
  const [r] = await getPool().execute<ResultSetHeader>(
    `INSERT INTO super_admin_user (name, email, password_hash, role, criado_por)
     VALUES (?, ?, ?, ?, ?)`,
    [nome, email, hash, dados.papel, dados.criadoPor ?? null],
  );

  const criado = await procurarPorId(r.insertId);
  if (!criado) throw new OperadorErro('Operador criado mas nao encontrado.', 500);
  return criado;
}

export async function validarPassword(hash: string, tentativa: string): Promise<boolean> {
  return bcrypt.compare(tentativa, hash);
}

export async function registarLogin(id: number): Promise<void> {
  await getPool().execute('UPDATE super_admin_user SET lastLoginAt = NOW() WHERE id = ?', [id]);
}

export async function actualizarOperador(
  id: number,
  campos: { nome?: string; papel?: Papel; activo?: boolean; password?: string },
): Promise<Operator> {
  const actual = await procurarPorId(id);
  if (!actual) throw new OperadorErro('Operador nao encontrado.', 404);

  const sets: string[] = [];
  const args: unknown[] = [];

  if (campos.nome !== undefined) {
    if (!campos.nome.trim()) throw new OperadorErro('O nome nao pode ficar vazio.');
    sets.push('name = ?');
    args.push(campos.nome.trim());
  }
  if (campos.papel !== undefined) {
    if (!PAPEIS.includes(campos.papel)) {
      throw new OperadorErro(`Papel invalido. Validos: ${PAPEIS.join(', ')}`);
    }
    sets.push('role = ?');
    args.push(campos.papel);
  }
  if (campos.activo !== undefined) {
    sets.push('activo = ?');
    args.push(campos.activo ? 1 : 0);
  }
  if (campos.password !== undefined && campos.password !== '') {
    if (campos.password.length < 8) {
      throw new OperadorErro('A password precisa de pelo menos 8 caracteres.');
    }
    sets.push('password_hash = ?');
    args.push(await bcrypt.hash(campos.password, ROUNDS));
  }

  if (sets.length) {
    await getPool().query(
      `UPDATE super_admin_user SET ${sets.join(', ')} WHERE id = ?`,
      [...args, id],
    );
  }

  const actualizado = await procurarPorId(id);
  if (!actualizado) throw new OperadorErro('Operador nao encontrado.', 404);
  return actualizado;
}

/**
 * Impede que a plataforma fique sem nenhum super_admin activo: sem isto, um
 * erro de Apagamento deixava o MaelG Systems sem ninguem able de entrar.
 */
export async function eliminarOperador(id: number): Promise<void> {
  const op = await procurarPorId(id);
  if (!op) throw new OperadorErro('Operador nao encontrado.', 404);
  if (op.role !== 'super_admin') {
    await getPool().execute('DELETE FROM super_admin_user WHERE id = ?', [id]);
    return;
  }
  const [rows] = await getPool().query<ContagemRow[]>(
    "SELECT COUNT(*) AS n FROM super_admin_user WHERE role = 'super_admin' AND activo = 1 AND id <> ?",
    [id],
  );
  if (Number(rows[0].n) === 0) {
    throw new OperadorErro(
      'E o unico super_admin activo. Cria ou promove outro antes de o remover.',
      409,
    );
  }
  await getPool().execute('DELETE FROM super_admin_user WHERE id = ?', [id]);
}
