import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { HashDeSenha } from '../aplicacao/portas/hash-de-senha';

const derivar = promisify(scrypt) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
  opcoes: { N: number; r: number; p: number },
) => Promise<Buffer>;

// Parâmetros do scrypt guardados junto do hash: permitem endurecer os custos no futuro
// sem invalidar as senhas já cadastradas.
const PARAMETROS = { N: 16_384, r: 8, p: 1 };
const TAMANHO_CHAVE = 64;

/** Formato: scrypt$N$r$p$<sal em base64>$<hash em base64> */
export class HashDeSenhaScrypt implements HashDeSenha {
  async gerar(senha: string): Promise<string> {
    const sal = randomBytes(16);
    const chave = await derivar(senha, sal, TAMANHO_CHAVE, PARAMETROS);
    const { N, r, p } = PARAMETROS;
    return `scrypt$${N}$${r}$${p}$${sal.toString('base64')}$${chave.toString('base64')}`;
  }

  async conferir(senha: string, hash: string): Promise<boolean> {
    const partes = hash.split('$');
    if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

    const [, n, r, p, salBase64, chaveBase64] = partes as [
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    const esperado = Buffer.from(chaveBase64, 'base64');
    const calculado = await derivar(senha, Buffer.from(salBase64, 'base64'), esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
  }
}
