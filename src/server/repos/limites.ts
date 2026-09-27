/**
 * Limites de plano, lidos do catalogo.
 *
 * Um plano deixou de ser "um preco e tres numeros" e passou a descrever o que
 * limita, num catalogo de recursos. Este repo le esse catalogo.
 *
 * Duas leituras diferentes, e a distincao e' o ponto todo:
 *
 *   - `lerLimitesPlano`   o que uma VENDA NOVA entrega. Le `plano_limite`,
 *                         o catalogo corrente.
 *   - `lerLimitesReferencia` o que um contrato JÁ EXISTENTE entrega. Le o
 *                         retrato tirado no momento da venda.
 *
 * Se as duas fossem a mesma leitura, mexer no plano "pro" amanha mudaria o
 * que os clientes compraram anteontem. Uma reducao feita a essa leitura
 * atirava escolas que nunca escolheram descer de plano, sem ninguem lhes
 * ter falado. Por isso o retrato e' uma tabela a parte.
 *
 * `valor: 0` significa ilimitado, e mantem-se a convencao que ja existia em
 * `plano.maxStudents`. Nao se transformou em NULL porque NULL seria ambiguo
 * entre "ilimitado" e "a empresa ainda nao respondeu", que sao coisas
 * diferentes — e a segunda precisa de soar a erro, nao a permissao.
 */
import { getPool } from '../db';
import type { RowDataPacket } from 'mysql2/promise';

/** Um limite tal como o produto vai precisar de o aplicar. */
export interface LimiteRecurso {
  /** `alunos`, `funcionarios`, `turmas`, `utilizadores`, `armazenamento`, `duracao`. */
  chave: string;
  nome: string;
  unidade: string;
  /**
   * O nome do contador no produto. E' contrato com o `escola_limite` de la: se
   * o produto nao implementar este contador, o recurso tem de aparecer como
   * nao-aplicavel. Nunca como ilimitado — um limite que nao existe e' pior do
   * que um limite declarado, porque ninguem repara.
   */
  comoContar: string;
  /** false = o limite avisa, mas nao recusa (a `duracao` resolve-se expirando). */
  bloqueia: boolean;
  /** 0 = ilimitado. */
  valor: number;
  /** Meses de folga antes de cortar. Vem do retrato, nao do catalogo. */
  toleranciaMeses: number;
}

/** Le o catalogo de limites de um plano: o que uma venda nova entrega. */
export async function lerLimitesPlano(planoId: number): Promise<LimiteRecurso[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT r.chave, r.nome, r.unidade, r.como_contar, r.bloqueia, l.valor
       FROM plano_limite l
       JOIN plano_recurso r ON r.id = l.recurso_id
      WHERE l.plano_id = ?
      ORDER BY r.chave`,
    [planoId],
  );
  return rows.map((r) => ({
    chave: String(r.chave),
    nome: String(r.nome),
    unidade: String(r.unidade),
    comoContar: String(r.como_contar),
    bloqueia: Number(r.bloqueia) === 1,
    valor: Number(r.valor),
    // Sem retrato nao ha tolerancia: uma venda directa pelo plano nao tem
    // contrato de que se apegue. O valor por omissao e' o mesmo de sempre
    // (1 mes) para que a diferenca entre os dois caminhos nao seja sentida
    // como um castigo.
    toleranciaMeses: 1,
  }));
}

/**
 * Le o retrato de uma referencia: o que aquele contrato entrega, tal como
 * estava no momento em que a referencia foi emitida.
 */
export async function lerLimitesReferencia(referenciaId: number): Promise<LimiteRecurso[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT r.chave, r.nome, r.unidade, r.como_contar, r.bloqueia,
            rr.valor, rr.tolerancia_meses
       FROM plano_referencia_recurso rr
       JOIN plano_recurso r ON r.id = rr.recurso_id
      WHERE rr.referencia_id = ?
      ORDER BY r.chave`,
    [referenciaId],
  );
  return rows.map((r) => ({
    chave: String(r.chave),
    nome: String(r.nome),
    unidade: String(r.unidade),
    comoContar: String(r.como_contar),
    bloqueia: Number(r.bloqueia) === 1,
    valor: Number(r.valor),
    toleranciaMeses: Number(r.tolerancia_meses),
  }));
}

/**
 * O limite de um recurso, ou `null` se o plano nao o restringe.
 *
 * `null` e' "o plano nao diz nada sobre isto", que e' diferente de
 * `valor: 0` ("o plano diz que e' ilimitado"). O produto trata os dois
 * diferente, e a funcao devolve 0 para o ilimitado para nao obrigar quem
 * chama a tratar um caso que nao existe.
 */
export async function limiteDe(
  planoId: number,
  chave: string,
): Promise<{ valor: number; bloqueia: boolean } | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT l.valor, r.bloqueia
       FROM plano_limite l
       JOIN plano_recurso r ON r.id = l.recurso_id
      WHERE l.plano_id = ? AND r.chave = ?`,
    [planoId, chave],
  );
  const r = rows[0];
  if (!r) return null;
  return { valor: Number(r.valor), bloqueia: Number(r.bloqueia) === 1 };
}

/**
 * O catalogo completo do produto, para a equipa ver o que existe.
 * Serve tambem para o produto saber que recursos TEM de implementar.
 */
export async function listarRecursos(produtoId: number): Promise<
  Array<{ chave: string; nome: string; unidade: string; comoContar: string; bloqueia: boolean }>
> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT chave, nome, unidade, como_contar, bloqueia
       FROM plano_recurso
      WHERE produto_id = ? AND ativo = 1
      ORDER BY chave`,
    [produtoId],
  );
  return rows.map((r) => ({
    chave: String(r.chave),
    nome: String(r.nome),
    unidade: String(r.unidade),
    comoContar: String(r.como_contar),
    bloqueia: Number(r.bloqueia) === 1,
  }));
}
