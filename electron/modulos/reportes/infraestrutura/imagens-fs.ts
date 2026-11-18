import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import { garantirPastaGravavel, resolverPastaDoBanco } from '../../../nucleo/infraestrutura/banco/caminho-do-banco';
import type { ArmazenamentoDeImagensReporte, CodificadorBase64 } from '../aplicacao/portas';

// =====================================================================================================
// Prints dos reportes no sistema de arquivos (ao lado do banco, na pasta de rede)
// =====================================================================================================

/** Pasta do reporte; o id vem do banco (UUID), mas ainda assim é sanitizado contra "..". */
function pastaDoReporte(reporteId: string): string {
  return path.join(resolverPastaDoBanco(), 'reportes', reporteId.replace(/[^\w-]/g, '_'));
}

/**
 * Caminho do arquivo garantidamente dentro da pasta do reporte (protege contra path traversal).
 * @param reporteId id do reporte
 * @param nomeArmazenado nome gravado no banco
 */
function caminhoSeguro(reporteId: string, nomeArmazenado: string): string {
  const pasta = pastaDoReporte(reporteId);
  const caminho = path.join(pasta, path.basename(nomeArmazenado));
  if (!caminho.startsWith(pasta + path.sep)) throw new ErroDeDominio('CAMINHO_INVALIDO', 'Arquivo inválido.');
  return caminho;
}

export class ArmazenamentoDeImagensReporteFs implements ArmazenamentoDeImagensReporte {
  async gravar(reporteId: string, nomeSeguro: string, bytes: Uint8Array): Promise<string> {
    const pasta = pastaDoReporte(reporteId);
    garantirPastaGravavel(pasta);
    const nomeArmazenado = `${randomUUID()}-${path.basename(nomeSeguro)}`;
    // `wx`: nunca sobrescreve um arquivo existente.
    await writeFile(caminhoSeguro(reporteId, nomeArmazenado), bytes, { flag: 'wx' });
    return nomeArmazenado;
  }

  async ler(reporteId: string, nomeArmazenado: string): Promise<Uint8Array> {
    return readFile(caminhoSeguro(reporteId, nomeArmazenado));
  }

  async excluir(reporteId: string, nomeArmazenado: string): Promise<void> {
    await rm(caminhoSeguro(reporteId, nomeArmazenado), { force: true });
  }
}

/** Base64 com o `Buffer` do Node (fica na infraestrutura; a aplicação só conhece a porta). */
export const codificadorBase64Node: CodificadorBase64 = {
  decodificar: (base64) => new Uint8Array(Buffer.from(base64, 'base64')),
  codificar: (bytes) => Buffer.from(bytes).toString('base64'),
};
