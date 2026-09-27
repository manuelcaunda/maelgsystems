/**
 * Cliente da API de cada produto.
 *
 * E' por aqui que o MaelG Systems fala com o MaelGest, o MaelFinance, etc.
 * Nunca por SQL: a base de cada produto e' sua, e a unica porta de entrada e'
 * a API dele. O segredo vem de `produto_acesso`, cifrado, e e' descifrado so
 * no instante de enviar.
 *
 * A credencial e' simetrica: o mesmo par chave/segredo que o produto usa para
 * nos chamar e' o que mandamos para lhe chamar. Um par so, guardado de um lado
 * so, com os dois sentidos a validar o mesmo valor.
 */
import { obterAcesso } from './repos/produtos';

export class ErroProduto extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** O que o produto respondeu, para o operador poder ver. */
    readonly detalhe?: unknown,
  ) {
    super(message);
  }
}

function caminhoCompleto(urlBase: string, caminho: string): string {
  const base = urlBase.replace(/\/+$/, '');
  const ca = caminho.startsWith('/') ? caminho : `/${caminho}`;
  return `${base}${ca}`;
}

async function chamarProduto<T>(
  produtoSlug: string,
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  caminho: string,
  corpo?: unknown,
  opcoes: { idempotencia?: string } = {},
): Promise<T> {
  const acesso = await obterAcesso(produtoSlug);
  if (!acesso) {
    throw new ErroProduto(
      `O produto ${produtoSlug} nao tem credencial de acesso configurada.`,
      409,
    );
  }
  if (!acesso.urlBase) {
    throw new ErroProduto(`O produto ${produtoSlug} nao tem URL de API.`, 409);
  }

  const headers: Record<string, string> = {
    'X-Maelg-Produto': acesso.chave,
    'X-Maelg-Segredo': acesso.segredo,
    Accept: 'application/json',
  };
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (opcoes.idempotencia) headers['X-Maelg-Idempotencia'] = opcoes.idempotencia;

  let resposta: Response;
  try {
    resposta = await fetch(caminhoCompleto(acesso.urlBase, caminho), {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    // DNS, porta fechada, timeout: o produto nao respondeu
    throw new ErroProduto(
      `O produto ${produtoSlug} nao respondeu (${(e as Error).message}).`,
      502,
    );
  }

  const texto = await resposta.text();
  let dados: unknown = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = texto;
    }
  }

  if (!resposta.ok) {
    const mensagem =
      (dados as { detail?: string; erro?: string } | null)?.detail ??
      (dados as { erro?: string } | null)?.erro ??
      `resposta ${resposta.status}`;
    throw new ErroProduto(
      `O produto ${produtoSlug} recusou o pedido: ${mensagem}`,
      resposta.status >= 500 ? 502 : resposta.status,
      dados,
    );
  }

  return dados as T;
}

// ---------------------------------------------------------------------------
// O contrato de criacao de escola
// ---------------------------------------------------------------------------

/** O que o produto devolve ao criar a escola. */
export interface EscolaCriadaNoProduto {
  escola_id: number;
  escola_codigo: string;
  /** O utilizador que vai entrar na escola, se o produto o criar. */
  admin?: { id: number; username: string; papel: string };
}

export interface DadosEscolaParaProduto {
  nome: string;
  nif?: string;
  tipo?: string;
  designacao?: string;
  regimeEnsino?: string;
  contactEmail?: string;
  contactPhone?: string;
  province?: string;
  city?: string;
  firstAdminName?: string;
  firstAdminEmail?: string;
  firstAdminPhone?: string;
  planoId?: number;
}

/**
 * Cria a escola na base do produto.
 *
 * O `codigo` do tenant viaja como chave de idempotencia. E o que impede que
 * dois cliques em "Criar" criem duas escolas: o produto ve a mesma chave e
 * devolve a escola que ja criou em vez de criar outra. Sem isto, um operador
 * impaciente pagava duas inscricoes.
 */
export async function criarEscolaNoProduto(
  produtoSlug: string,
  tenantCodigo: string,
  dados: DadosEscolaParaProduto,
): Promise<EscolaCriadaNoProduto> {
  return chamarProduto<EscolaCriadaNoProduto>(
    produtoSlug,
    'POST',
    '/api/v1/plataforma/escolas',
    dados,
    { idempotencia: tenantCodigo },
  );
}

/**
 * Bloqueia a conta da escola no produto, depois de a equipa rejeitar o pedido.
 *
 * Ao contrario da criacao, esta chamada vai com o motivo: o director tem de ver
 * **por que** a conta foi bloqueada quando entra na app. Sem o motivo, a
 * suspensao comercial e' indistinguivel de um erro.
 *
 * O `escolaCodigo` viaja como chave de idempotencia porque o produto pode
 * receber a mesma ordem duas vezes se uma decisao for repetida.
 */
export async function bloquearEscolaNoProduto(
  produtoSlug: string,
  escolaCodigo: string,
  dados: { motivo: string; pedidoId: number },
): Promise<void> {
  await chamarProduto<Record<string, unknown>>(
    produtoSlug,
    'POST',
    `/api/v1/plataforma/escolas/${encodeURIComponent(escolaCodigo)}/bloquear`,
    { motivo: dados.motivo, pedidoId: dados.pedidoId },
    { idempotencia: `bloqueio-${escolaCodigo}` },
  );
}

/** Sonda de saude do produto. Usada no ecrã de integracao. */
export async function testarProduto(produtoSlug: string): Promise<boolean> {  try {
    await chamarProduto(produtoSlug, 'GET', '/api/v1/plataforma/estados');
    return true;
  } catch (e) {
    if (e instanceof ErroProduto && e.status === 401) {
      // respondeu, mas recusou a credencial: o produto esta vivo, e' a
      // credencial que esta errada
      throw new ErroProduto(
        `O produto ${produtoSlug} recusou a nossa credencial.`,
        401,
      );
    }
    return false;
  }
}
