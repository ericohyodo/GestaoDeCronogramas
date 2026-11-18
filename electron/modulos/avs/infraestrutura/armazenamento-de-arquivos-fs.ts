import { randomUUID } from 'node:crypto';
import { copyFile, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  garantirPastaGravavel,
  resolverPastaDoBanco,
} from '../../../nucleo/infraestrutura/banco/caminho-do-banco';
import type { ArmazenamentoDeArquivos, ArquivoArmazenado, ArquivoSelecionado } from '../aplicacao/portas';

const TIPOS_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.bmp': 'image/bmp',
};

/** Nome de arquivo sem caracteres problemáticos para o sistema de arquivos, preservando a extensão. */
function sanitizarNomeArquivo(nome: string): string {
  const extensao = path.extname(nome);
  const base = path.basename(nome, extensao).replace(/[\\/:*?"<>|]/g, '_').trim();
  return `${base || 'arquivo'}${extensao}`;
}

function pastaDaAv(avId: string): string {
  return path.join(resolverPastaDoBanco(), 'anexos-avs', avId);
}

export class ArmazenamentoDeArquivosFs implements ArmazenamentoDeArquivos {
  async copiarParaAnexos(avId: string, arquivo: ArquivoSelecionado): Promise<ArquivoArmazenado> {
    const pasta = pastaDaAv(avId);
    garantirPastaGravavel(pasta);

    const nomeArmazenado = `${randomUUID()}-${sanitizarNomeArquivo(arquivo.nomeArquivo)}`;
    const destino = path.join(pasta, nomeArmazenado);
    await copyFile(arquivo.caminhoOriginal, destino);

    const info = await stat(destino);
    const extensao = path.extname(arquivo.nomeArquivo).toLowerCase();
    return {
      nomeArmazenado,
      tipoMime: TIPOS_MIME[extensao] ?? null,
      tamanhoBytes: info.size,
    };
  }

  async lerConteudoBase64(avId: string, nomeArmazenado: string): Promise<string> {
    const caminho = path.join(pastaDaAv(avId), nomeArmazenado);
    const conteudo = await readFile(caminho);
    return conteudo.toString('base64');
  }

  async excluirArquivo(avId: string, nomeArmazenado: string): Promise<void> {
    const caminho = path.join(pastaDaAv(avId), nomeArmazenado);
    await rm(caminho, { force: true });
  }
}
