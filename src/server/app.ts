/**
 * MaelG Systems — porta de entrada.
 *
 * Tudo o que a app ve esta aqui, e tudo vai ao MySQL `maelg`. Nao ha JSON, nao
 * ha mock, nao ha seed: se a base esta vazia, a app esta vazia.
 *
 * Duas portas de entrada, separadas de proposito:
 *
 *   /api/*            operadores, header Authorization: Bearer <jwt>
 *   /api/v1/plataforma/*  produtos, header X-Maelg-Produto / X-Maelg-Segredo
 *
 * Nao existe rota que escreva na base de dados de um produto. O MaelG Systems
 * fala com o produto pela API do produto; nunca por SQL.
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getPool } from './db';
import { erroDoServidor } from './http';
import { rotasOperadores } from './routes/operadores';
import { rotasProdutos } from './routes/produtos';
import { rotasGestao } from './routes/gestao';
import { rotasPlataforma } from './routes/plataforma';
import {
  rotasLimitesOperador,
  rotasReferenciaOperador,
  rotasReferenciaProduto,
} from './routes/referencias';
import {
  rotasSupervisaoOperador,
  rotasSupervisaoProduto,
} from './routes/supervisao';

const isProd = process.env.NODE_ENV === 'production';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', isProd ? 1 : false);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '256kb' }));

/**
 * Sonda de saude. Responde 200 so se o MySQL `maelg` estiver a responder — um
 * healthz que da 200 com a base em baixo so faz o erro aparecer mais tarde.
 */
app.get('/api/healthz', async (_req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ ok: true, base: 'maelg' });
  } catch (e) {
    console.error('[healthz]', e);
    res.status(503).json({ ok: false, base: 'maelg' });
  }
});

// A submissao de uma escola para supervisao entra pela credencial do produto,
// por isso e' montada dentro de `rotasPlataforma` (que ja exige
// `X-Maelg-Produto`/`X-Maelg-Segredo` em tudo o que lhe passa por baixo).
rotasPlataforma.use(rotasSupervisaoProduto);
// O resgate da referencia entra pela mesma porta da submissao: mesma credencial.
rotasPlataforma.use(rotasReferenciaProduto);

// A plataforma primeiro: e' a unica familia que NUNCA aceita sessao de
// operador, e vive em /api/v1/plataforma. Qualquer `app.use('/api', ...)` que
// exija sessao e' montada depois, para nunca poder tocar nela.
app.use('/api/v1/plataforma', rotasPlataforma);

// A ORDEM IMPORTA. `rotasProdutos` e `rotasGestao` fazem `use(exigirSessao)`
// no router inteiro, e esse `use` corre para QUALQUER pedido que entre no
// router, mesmo que nenhuma rota do router corresponda. Montando-os antes de
// `rotasOperadores`, o `/api/auth/*` e o `/api/bootstrap` recebiam 401 de
// sessao antes de qualquer rota poder responder.
app.use('/api', rotasOperadores);
app.use('/api', rotasProdutos);
app.use('/api', rotasGestao);

app.use('/api/limites', rotasLimitesOperador);
app.use('/api', rotasReferenciaOperador);
app.use('/api', rotasSupervisaoOperador);

app.use('/api', (_req, res) => {
  res.status(404).json({ erro: 'Endpoint inexistente.' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  erroDoServidor(err, res, 'global');
});

/**
 * Serve o frontend. Em desenvolvimento o Vite entra como middleware; em
 * producao, os ficheiros de `dist/`. Fica numa funcao para o teste de
 * integracao poder montar a API sem levantar o Vite.
 */
export async function servirFrontend(): Promise<void> {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    return;
  }
  const dist = path.resolve('dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
}
