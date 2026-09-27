/**
 * Utilitarios HTTP partilhados pelos routers.
 *
 * Express 4 nao apanha erros de handlers assincronos: sem isto, um `throw`
 * dentro de um `async` crasha o processo em vez de virar um 500 limpo.
 *
 * **O handler tem de escrever no `res`.** O que ele devolve e' descartado: um
 * handler que devolve um valor sem responder deixa o pedido pendurado ate ao
 * timeout do cliente, e o sintoma parece um travamento do MySQL em vez de
 * uma resposta que nunca saiu.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function rota(
  fn: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

/** Erro de dominio com codigo HTTP proprio (ProdutoErro, TenantErro, ...). */
export class ErroHttp extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function erroDoServidor(
  err: unknown,
  res: Response,
  contexto: string,
): void {
  const status = (err as { status?: number }).status;
  if (typeof status === 'number' && status >= 400 && status < 600) {
    const codigo = (err as { code?: string }).code;
    // Violacoes de FK nao sao erro de programacao: sao o utilizador a tentar
    // apagar algo que ainda esta ligado.
    if (codigo === 'ER_ROW_IS_REFERENCED_2') {
      res.status(409).json({ erro: 'Ainda existem registos ligados a este. Desactiva em vez de apagar.' });
      return;
    }
    if (codigo === 'ER_DUP_ENTRY') {
      res.status(409).json({ erro: 'Ja existe um registo com estes dados.' });
      return;
    }
    res.status(status).json({ erro: (err as Error).message });
    return;
  }
  if ((err as { code?: string }).code === 'ECONNREFUSED') {
    res.status(502).json({ erro: 'A base de dados nao respondeu.' });
    return;
  }
  // erro desconhecido: logamos no servidor, nao expomos nada ao cliente
  console.error(`[${contexto}]`, err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}

export function paraErro(err: unknown, contexto: string, res: Response): void {
  erroDoServidor(err, res, contexto);
}

export type { NextFunction };
