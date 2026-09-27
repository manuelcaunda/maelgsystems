/**
 * MaelG Systems — arranque.
 *
 * A app esta em `src/server/app.ts` para poder ser montada sem escutar uma
 * porta: e' assim que o teste de integracao a exercita sem subir o Vite.
 */
import { closePool } from './src/server/db';
import { app, servirFrontend } from './src/server/app';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const isProd = process.env.NODE_ENV === 'production';

await servirFrontend();

const server = app.listen(PORT, HOST, () => {
  console.log(
    `MaelG Systems em http://${HOST}:${PORT}  (${isProd ? 'producao' : 'desenvolvimento'})`,
  );
});

/** Fecha o pool antes de sair, para nao deixar sessoes MySQL abertas. */
function encerrar(sinal: string): void {
  console.log(`\n${sinal} recebido, a encerrar...`);
  server.close(() => {
    void closePool().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
