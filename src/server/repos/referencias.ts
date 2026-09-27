/**
 * Referencias de plano: a subscricao e o upgrade entram pelo produto com um
 * codigo de 9 digitos emitido aqui pela equipa.
 *
 * Quem emite: so a equipa. Um downgrade NAO vem por referencia — reduzir
 * receita exige uma conversa, nao um codigo que o proprio director aplicava
 * sozinho.
 *
 * Quem resgata: o produto, com a credencial dele. E' a unica rota em que a
 * MaelG entrega dados de plano a partir de um segredo que o director digitou,
 * por isso `resgatarReferencia` e' deliberadamente tao magro no que diz: se a
 * referencia nao serve, nao diz porquê.
 *
 * A defesa contra adivinhar 10^9 codigos e' dupla:
 *   - `uk_referencia_codigo` impede colisao
 *   - o rate limit no produto (a outra metade) impede tentativas em massa
 * Nenhuma das duas sozinha chega: sem o rate limit, a unicidade nao protege
 * nada, porque o atacante vai tentando codigos diferentes.
 */
import { getPool } from '../db';
import { lerLimitesPlano, lerLimitesReferencia } from './limites';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type TipoReferencia = 'subscricao' | 'upgrade';
export type EstadoReferencia = 'emitida' | 'usada' | 'expirada' | 'anulada';

export interface ReferenciaPlano {
  id: number;
  codigo: string;
  produtoId: number;
  planoId: number;
  produtoEscola: string;
  tenantId: number | null;
  tipo: TipoReferencia;
  estado: EstadoReferencia;
  expiraEm: Date;
  usadaEm: Date | null;
  emitidoPor: number;
  planoNome: string;
}

/** Meses que uma referencia fica a espera de ser usada. */
const VALIDADE_REFERENCIA_MESES = 3;

class ErroReferencia extends Error {
  constructor(
    message: string,
    readonly status: number = 409,
  ) {
    super(message);
    this.name = 'ErroReferencia';
  }
}

/** A resposta ao produto. Deliberadamente igual em todos os fracassos. */
const RESPOSTA_NEUTRA = 'Referencia invalida, expirada ou ja usada.';

function gerarCodigo(): string {
  // crypto nao e' aqui: 9 digitos sao 10^9, e a unicidade e' garantida pela
  // base de dados. O que nao pode e' o codigo ser sequencial e adivinhavel.
  let n = '';
  for (let i = 0; i < 9; i += 1) n += Math.floor(Math.random() * 10);
  // Um codigo com todos os digitos iguais le-se como "nao foi gerado" e as
  // pessoas transcrevem-no mal. Nao e' seguranca, e' evitar atrito.
  if (/^(\d)\1{8}$/.test(n)) return gerarCodigo();
  return n;
}

function linha(r: RowDataPacket): ReferenciaPlano {
  return {
    id: Number(r.id),
    codigo: String(r.codigo),
    produtoId: Number(r.produto_id),
    planoId: Number(r.plano_id),
    produtoEscola: String(r.produto_escola),
    tenantId: r.tenant_id === null ? null : Number(r.tenant_id),
    tipo: r.tipo as TipoReferencia,
    estado: r.estado as EstadoReferencia,
    expiraEm: new Date(r.expira_em),
    usadaEm: r.usada_em === null ? null : new Date(r.usada_em),
    emitidoPor: Number(r.emitido_por),
    planoNome: r.plano_nome === undefined ? '' : String(r.plano_nome),
  };
}

const SELECAO = `SELECT rf.*, pl.nome AS plano_nome
                   FROM plano_referencia rf
                   JOIN plano pl ON pl.id = rf.plano_id`;

/**
 * A equipa emite uma referencia. E' a unica forma de uma referencia nascer,
 * por isso o `emitidoPor` e' obrigatorio e nao opcional.
 */
export async function emitirReferencia(dados: {
  produtoId: number;
  planoId: number;
  produtoEscola: string;
  tenantId: number | null;
  tipo: TipoReferencia;
  emitidoPor: number;
}): Promise<ReferenciaPlano> {
  const db = getPool();

  // O retrato e' tirado AGORA, do catalogo corrente. E' este o momento em que
  // se decide o que foi vendido.
  const limites = await lerLimitesPlano(dados.planoId);
  if (limites.length === 0) {
    throw new ErroReferencia(
      'Este plano nao tem limites no catalogo. Sem limites nao ha retrato para tirar, e uma referencia sem limites entregaria um plano que nao restringe nada.',
      422,
    );
  }

  const expiraEm = new Date();
  expiraEm.setMonth(expiraEm.getMonth() + VALIDADE_REFERENCIA_MESES);

  // Se a base devolver 1062, o codigo ja existia: outra referencia, outra vez.
  // Tenta-se outra vez em vez de devolver 409 ao director por um motivo que
  // nao tem nada a ver com ele.
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const codigo = gerarCodigo();
    try {
      const [r] = await db.execute<ResultSetHeader>(
        `INSERT INTO plano_referencia
           (codigo, produto_id, plano_id, produto_escola, tenant_id, tipo,
            estado, expira_em, emitido_por)
         VALUES (?, ?, ?, ?, ?, ?, 'emitida', ?, ?)`,
        [
          codigo,
          dados.produtoId,
          dados.planoId,
          dados.produtoEscola,
          dados.tenantId,
          dados.tipo,
          expiraEm,
          dados.emitidoPor,
        ],
      );
      const id = r.insertId;
      // Um SELECT so, com todos os ids do catalogo de uma vez. A versao
      // anterior fazia uma consulta por recurso dentro deste laco — seis
      // viagens a base para gravar seis linhas.
      const [recursos] = await db.query<RowDataPacket[]>(
        'SELECT id, chave FROM plano_recurso WHERE produto_id = ?',
        [dados.produtoId],
      );
      const porChave = new Map(recursos.map((x) => [String(x.chave), Number(x.id)]));
      for (const l of limites) {
        const recursoId = porChave.get(l.chave);
        if (recursoId === undefined) continue;
        await db.execute(
          `INSERT INTO plano_referencia_recurso
             (referencia_id, recurso_id, valor, tolerancia_meses)
           VALUES (?, ?, ?, 1)`,
          [id, recursoId, l.valor],
        );
      }
      return (await buscarReferencia(id)) as ReferenciaPlano;
    } catch (e) {
      if ((e as { code?: string }).code === 'ER_DUP_ENTRY') continue;
      throw e;
    }
  }
  throw new ErroReferencia('Nao foi possivel gerar um codigo unico. Tente outra vez.', 503);
}

export async function buscarReferencia(id: number): Promise<ReferenciaPlano | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(`${SELECAO} WHERE rf.id = ?`, [id]);
  return rows[0] ? linha(rows[0]) : null;
}

export async function listarReferencias(filtro: {
  produtoEscola?: string;
  estado?: EstadoReferencia;
}): Promise<ReferenciaPlano[]> {
  const cond: string[] = [];
  const args: unknown[] = [];
  if (filtro.produtoEscola) {
    cond.push('rf.produto_escola = ?');
    args.push(filtro.produtoEscola);
  }
  if (filtro.estado) {
    cond.push('rf.estado = ?');
    args.push(filtro.estado);
  }
  const onde = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const [rows] = await getPool().query<RowDataPacket[]>(
    `${SELECAO} ${onde} ORDER BY rf.criado_em DESC LIMIT 200`,
    args,
  );
  return rows.map(linha);
}

export async function anularReferencia(id: number): Promise<boolean> {
  const [r] = await getPool().execute<ResultSetHeader>(
    "UPDATE plano_referencia SET estado = 'anulada' WHERE id = ? AND estado = 'emitida'",
    [id],
  );
  return r.affectedRows > 0;
}

/**
 * O produto resgata a referencia. E' a unica vez em que a MaelG transforma um
 * segredo digitado por um director em dados de plano.
 *
 * Concorrencia: o `UPDATE ... WHERE estado = 'emitida'` faz o resgate ser
 * single-shot. Dois produtos a resgatar o mesmo codigo ao mesmo tempo: um
 *ganha, o outro recebe a resposta neutra. Sem isto, o mesmo plano era
 *entregue duas vezes.
 */
export async function resgatarReferencia(
  codigo: string,
  produtoId: number,
): Promise<{ planoId: number; planoNome: string; produtoEscola: string; limites: Awaited<ReturnType<typeof lerLimitesPlano>> }> {
  const db = getPool();

  const [rows] = await db.query<RowDataPacket[]>(`${SELECAO} WHERE rf.codigo = ?`, [codigo]);
  const ref = rows[0];

  // A resposta e' a mesma para codigo que nao existe, que ja foi usado, que
  // expirou e que pertence a outro produto. Dizer qual destas coisas
  // aconteceu e' dizer o que um atacante deve tentar a seguir.
  const neutra = () => {
    throw new ErroReferencia(RESPOSTA_NEUTRA, 422);
  };
  if (!ref) neutra();
  if (Number(ref.produto_id) !== produtoId) neutra();
  if (String(ref.estado) !== 'emitida') neutra();
  if (new Date(ref.expira_em).getTime() < Date.now()) {
    // Marca expirada, mas nao e' o que se responde: a resposta neutra e' a
    // mesma, o estado interno e' que muda.
    await db.execute("UPDATE plano_referencia SET estado = 'expirada' WHERE id = ?", [ref.id]);
    neutra();
  }

  const [u] = await db.execute<ResultSetHeader>(
    `UPDATE plano_referencia SET estado = 'usada', usada_em = NOW()
      WHERE id = ? AND estado = 'emitida'`,
    [ref.id],
  );
  if (u.affectedRows === 0) neutra();

  const limites = await lerLimitesReferencia(Number(ref.id));
  if (limites.length === 0) {
    // Nao devolve' nada: um resgate sem limites nao subscreve ninguem, e
    // ficar com a referencia gasta seria o pior dos dois.
    throw new ErroReferencia('A referencia nao tem limites associated. Contacte a MaelG.', 500);
  }

  return {
    planoId: Number(ref.plano_id),
    planoNome: String(ref.plano_nome),
    produtoEscola: String(ref.produto_escola),
    limites,
  };
}
