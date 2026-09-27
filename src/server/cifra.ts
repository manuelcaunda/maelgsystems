/**
 * Cifra de credenciais de produto em repouso.
 *
 * Por que cifra e nao hash: a credencial e' de dois lados. O produto chama-nos
 * com ela (verificamos) e tambem mandamos ao produto (recuperamos). Um hash
 *Resolve o primeiro caso e estraga o segundo. Por isso AES-256-GCM, com a chave
 * fora da base de dados (variavel de ambiente), e nao um hash bcrypt.
 *
 * Formato guardado: `v1:<iv b64>:<tag b64>:<ciphertext b64>`
 *
 * GCM da autenticacao: se alguem mexer num byte do IV, da tag ou do texto, a
 * decifra falha em vez de devolver lixo. E a razao de ser GCM e nao CBC.
 */
import crypto from 'crypto';
import { config } from './config';

const PREFIXO = 'v1';
const IV = 12; // 96 bits, o tamanho recomendado para GCM
const TAG = 16;

function chaveMaestra(): Buffer {
  // pela config, para o `.env` do maelgsystems ser carregado
  const chave = Buffer.from(config.chaveCredenciais, 'base64');
  if (chave.length !== 32) {
    throw new Error(
      `MAELG_CREDENTIALS_KEY tem de ter 32 bytes em base64; tem ${chave.length}.`,
    );
  }
  return chave;
}

/** Cifra texto para a base de dados. */
export function cifrar(texto: string): Buffer {
  const iv = crypto.randomBytes(IV);
  const cif = crypto.createCipheriv('aes-256-gcm', chaveMaestra(), iv);
  const dados = Buffer.concat([cif.update(texto, 'utf-8'), cif.final()]);
  const tag = cif.getAuthTag();
  return Buffer.concat([Buffer.from(`${PREFIXO}:`, 'utf-8'), iv, tag, dados]);
}

/** Descifra o que a base devolveve. Lanca se estiver corrompido ou adulterado. */
export function decifrar(bruto: Buffer | string): string {
  const buf = Buffer.isBuffer(bruto) ? bruto : Buffer.from(bruto, 'binary');
  const cab = buf.subarray(0, 3).toString('utf-8');
  if (cab !== `${PREFIXO}:`) {
    throw new Error('Valor cifrado invalido: falta o prefixo de versao.');
  }
  const iv = buf.subarray(3, 3 + IV);
  const tag = buf.subarray(3 + IV, 3 + IV + TAG);
  const dados = buf.subarray(3 + IV + TAG);

  const desc = crypto.createDecipheriv('aes-256-gcm', chaveMaestra(), iv);
  desc.setAuthTag(tag);
  return Buffer.concat([desc.update(dados), desc.final()]).toString('utf-8');
}

/**
 * Comparacao em tempo constante. `timingSafeEqual` lanca se os comprimentos
 * nao batem, por isso igualamos o tamanho com zeros antes — senao o proprio
 * erro de comprimento denuncia o tamanho certo da credencial.
 */
export function compararSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ba.length !== bb.length) {
    // ainda assim comparar algo, para nao sair pelo tempo de resposta
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}
