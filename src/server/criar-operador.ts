#!/usr/bin/env node
/**
 * Cria a PRIMEIRA conta de operador do MaelG Systems.
 *
 * Existe porque a plataforma nasce vazia — nao ha seed, nao ha dados
 * inventados. Sem nenhuma conta nao ha login, e sem login nao ha forma de
 * criar contas. Este comando resolve essa circularidade: escreves os teus
 * dados, e eles ficam na base `maelg`.
 *
 *   npm run criar-operador
 *
 * Depois de existir um operador, cria os restantes pela propria UI.
 */
import readline from 'node:readline';
import { PAPEIS, type Papel } from './config';
import { contarOperadores, criarOperador } from './repos/operadores';
import { closePool } from './db';
import { registarAuditoria } from './repos/auditoria';

function perguntar(rl: readline.Interface, pergunta: string): Promise<string> {
  return new Promise((resolve) => rl.question(pergunta, resolve));
}

/** Le password sem eco. */
function perguntarSecreto(rl: readline.Interface, pergunta: string): Promise<string> {
  return new Promise((resolve) => {
    const w = process.stdout as NodeJS.WriteStream & { _writeToOutput?: (s: string) => void };
    const original = w._writeToOutput?.bind(w);
    let acumulado = '';
    w._writeToOutput = (s: string) => {
      if (s.includes(pergunta)) {
        acumulado = '';
        w.write(pergunta);
        return;
      }
      acumulado += s;
    };
    rl.question(pergunta, (resposta) => {
      w._writeToOutput = original;
      process.stdout.write('\n');
      resolve(resposta);
    });
  });
}

function validarEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

async function main() {
  const total = await contarOperadores();
  if (total > 0) {
    console.error(
      `Ja existem ${total} operador(es). Este comando e so para a primeira conta.\n` +
        `Cria as outras pela plataforma, em Operadores.`,
    );
    process.exit(1);
  }

  console.log('\n  MaelG Systems — primeira conta de operador\n');
  console.log(`  Papeis disponiveis: ${PAPEIS.join(', ')}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const nome = (await perguntar(rl, '  Nome: ')).trim();
  if (!nome) {
    console.error('\n  Nome obrigatorio.');
    rl.close();
    process.exit(1);
  }

  const email = (await perguntar(rl, '  Email: ')).trim().toLowerCase();
  if (!validarEmail(email)) {
    console.error('\n  Email invalido.');
    rl.close();
    process.exit(1);
  }

  const papelIn = (await perguntar(rl, `  Papel [${PAPEIS[0]}]: `)).trim() || PAPEIS[0];
  if (!(PAPEIS as readonly string[]).includes(papelIn)) {
    console.error(`\n  Papel invalido. Validos: ${PAPEIS.join(', ')}`);
    rl.close();
    process.exit(1);
  }

  const password = await perguntarSecreto(rl, '  Password: ');
  const confirmacao = await perguntarSecreto(rl, '  Repetir password: ');
  rl.close();

  if (password !== confirmacao) {
    console.error('\n  As passwords nao coincidem.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('\n  A password precisa de pelo menos 8 caracteres.');
    process.exit(1);
  }

  const op = await criarOperador({ nome, email, password, papel: papelIn as Papel });

  await registarAuditoria({
    actorName: nome,
    actorEmail: email,
    actorRole: op.role,
    ipAddress: null,
    action: 'OPERADOR_CRIADO',
    entityType: 'super_admin_user',
    entityId: String(op.id),
    entityName: nome,
    details: 'Primeira conta, criada por bootstrap da linha de comando.',
  });

  console.log(`\n  Criado: ${op.name} <${op.email}> — ${op.role}`);
  console.log(`  Entra em http://localhost:${process.env.PORT ?? 3000} com esta conta.\n`);

  await closePool();
}

main().catch(async (e) => {
  console.error(`\n  Erro: ${e instanceof Error ? e.message : String(e)}\n`);
  await closePool().catch(() => {});
  process.exit(1);
});
