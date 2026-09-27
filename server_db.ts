import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Tenant, Product, Plan, Subscription, Payment, AuditLog, Operator, PlatformSettings } from './src/types';
import {
  mockProducts,
  mockPlans,
  mockTenants,
  mockSubscriptions,
  mockPayments,
  mockAuditLogs,
  mockOperators,
  mockSettings,
} from './src/data/mockData';

// DB File Paths
const DB_FILE = path.resolve('db_fullstack.json');
const CREDENTIALS_LOG_FILE = path.resolve('credenciais_emitidas.txt');

// Logical Product Database Structure (MaelGest)
export interface Escola {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  designacao: string;
  regime_ensino: string;
  endereco?: string;
  contacto_telefone?: string;
  director_id?: number | null;
  primeiro_acesso_pendente: number;
}

export interface Utilizador {
  id: number;
  codigo: string;
  email: string;
  nome: string;
  password_hash: string;
  ativo: number;
  is_super_admin: number;
}

export interface UtilizadorEscola {
  id: number;
  utilizador_id: number;
  escola_id: number;
  papel_id: number;
}

export interface UsuarioPapel {
  id: number;
  usuario_id: number;
  papel_id: number;
  escola_id: number;
}

export interface Funcionario {
  id: number;
  nome: string;
  escola_id: number;
  data_admissao: string;
  categoria: string;
  tipo_professor: string;
  numero_agente?: string | null;
  utilizador_id: number;
  cargo: string;
}

export interface FullstackDatabase {
  // Platform Database (maelg)
  products: Product[];
  plans: Plan[];
  tenants: Tenant[];
  subscriptions: Subscription[];
  payments: Payment[];
  operators: Operator[];
  settings: PlatformSettings;
  auditLogs: AuditLog[];
  
  // Product Database (maelgest)
  escola: Escola[];
  utilizador: Utilizador[];
  utilizador_escola: UtilizadorEscola[];
  usuario_papel: UsuarioPapel[];
  funcionario: Funcionario[];
}

// Load default database state
function getDefaultDb(): FullstackDatabase {
  // Ensure default products have associated administrators
  const defaultProducts = mockProducts.map(p => {
    if (p.slug === 'maelgest') {
      return { ...p, adminName: 'Dr. Manuel Gaspar', adminEmail: 'm.gaspar@maelg.ao', adminPhone: '+244 923 111 222' };
    } else if (p.slug === 'maelfinance') {
      return { ...p, adminName: 'Dra. Elisa Pinto', adminEmail: 'e.pinto@maelg.ao', adminPhone: '+244 912 333 444' };
    } else if (p.slug === 'maelrh') {
      return { ...p, adminName: 'Yuri Francisco', adminEmail: 'y.francisco@maelg.ao', adminPhone: '+244 934 555 666' };
    }
    return p;
  });

  return {
    products: defaultProducts,
    plans: mockPlans,
    tenants: mockTenants,
    subscriptions: mockSubscriptions,
    payments: mockPayments,
    operators: mockOperators,
    settings: mockSettings,
    auditLogs: mockAuditLogs,
    escola: [
      {
        id: 42,
        codigo: 'MAELG-7437-3917',
        nome: 'Complexo Escolar Girassol',
        tipo: 'privada',
        designacao: 'complexo_escolar',
        regime_ensino: 'geral',
        endereco: 'Sumbe',
        contacto_telefone: '+244 923 456 789',
        director_id: 104,
        primeiro_acesso_pendente: 0
      }
    ],
    utilizador: [
      {
        id: 104,
        codigo: 'MAELG-8812-4912',
        email: 'a.morais@colegiogirassol.ao',
        nome: 'Prof. António Morais',
        password_hash: bcrypt.hashSync('MaelG@2026xY', 10),
        ativo: 1,
        is_super_admin: 0
      }
    ],
    utilizador_escola: [
      { id: 1, utilizador_id: 104, escola_id: 42, papel_id: 1 }
    ],
    usuario_papel: [
      { id: 1, usuario_id: 104, papel_id: 1, escola_id: 42 }
    ],
    funcionario: [
      {
        id: 104,
        nome: 'Prof. António Morais',
        escola_id: 42,
        data_admissao: '2026-03-12',
        categoria: 'PEPS',
        tipo_professor: 'especialista',
        numero_agente: '88491238',
        utilizador_id: 104,
        cargo: 'Director Geral'
      }
    ]
  };
}

let dbInstance: FullstackDatabase | null = null;

// Initialize Database Connection
export function getDb(): FullstackDatabase {
  if (dbInstance) return dbInstance;
  
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbInstance = JSON.parse(data);
    } catch (e) {
      console.error('Error parsing database file, regenerating defaults...', e);
      dbInstance = getDefaultDb();
      saveDb();
    }
  } else {
    dbInstance = getDefaultDb();
    saveDb();
  }
  return dbInstance!;
}

// Save Database to Disk
export function saveDb(): void {
  if (!dbInstance) return;
  fs.writeFileSync(DB_FILE, JSON.stringify(dbInstance, null, 2), 'utf-8');
}

// Generate code MAELG-XXXX-XXXX
export function generateMaelgCode(): string {
  const segment1 = Math.floor(1000 + Math.random() * 9000);
  const segment2 = Math.floor(1000 + Math.random() * 9000);
  return `MAELG-${segment1}-${segment2}`;
}

// Simulated email credential logging
export function logCredentialEmission(escolaCodigo: string, adminEmail: string, body: string): void {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logEntry = `[${timestamp}] Escola ${escolaCodigo} — admin ${adminEmail} — credenciais enviadas por email (simulado)\n`;
  fs.appendFileSync(CREDENTIALS_LOG_FILE, logEntry + '\n' + body + '\n' + '='.repeat(80) + '\n', 'utf-8');
}

// Load simulated credentials
export function getCredentialsLogs(): string {
  if (fs.existsSync(CREDENTIALS_LOG_FILE)) {
    return fs.readFileSync(CREDENTIALS_LOG_FILE, 'utf-8');
  }
  return 'Nenhuma emissão de credenciais registada ainda.';
}
