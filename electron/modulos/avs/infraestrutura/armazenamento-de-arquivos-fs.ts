import { randomUUID } from 'node:crypto';
import { copyFile, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { shell } from 'electron';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
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
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
};

/** Nome de arquivo sem caracteres problemáticos para o sistema de arquivos, preservando a extensão. */
function sanitizarNomeArquivo(nome: string): string {
  const extensao = path.extname(nome);
  const base = path.basename(nome, extensao).replace(/[\\/:*?"<>|]/g, '_').trim();
  return `${base || 'arquivo'}${extensao}`;
}

/** Pasta do dono (AV ou item de portfólio); o id vem do banco (UUID), mas ainda é sanitizado contra "..". */
function pastaDaAv(avId: string, pastaRaiz = 'anexos-avs'): string {
  return path.join(resolverPastaDoBanco(), pastaRaiz, avId.replace(/[^\w-]/g, '_'));
}

/**
 * Caminho do arquivo garantidamente dentro da pasta da AV (protege contra path traversal).
 * @param avId id da AV
 * @param nomeArmazenado nome gravado no banco
 * @returns caminho absoluto do arquivo
 */
function caminhoSeguro(avId: string, nomeArmazenado: string, pastaRaiz?: string): string {
  const pasta = pastaDaAv(avId, pastaRaiz);
  const caminho = path.join(pasta, path.basename(nomeArmazenado));
  if (!caminho.startsWith(pasta + path.sep)) throw new ErroDeDominio('CAMINHO_INVALIDO', 'Arquivo inválido.');
  return caminho;
}

export class ArmazenamentoDeArquivosFs implements ArmazenamentoDeArquivos {
  /** @param pastaRaiz subpasta ao lado do banco (`anexos-avs` para as AVs, `anexos-portfolio` para os itens) */
  constructor(private readonly pastaRaiz = 'anexos-avs') {}

  async copiarParaAnexos(avId: string, arquivo: ArquivoSelecionado): Promise<ArquivoArmazenado> {
    const pasta = pastaDaAv(avId, this.pastaRaiz);
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
    const conteudo = await readFile(caminhoSeguro(avId, nomeArmazenado, this.pastaRaiz));
    return conteudo.toString('base64');
  }

  async excluirArquivo(avId: string, nomeArmazenado: string): Promise<void> {
    await rm(caminhoSeguro(avId, nomeArmazenado, this.pastaRaiz), { force: true });
  }

  async abrirNoProgramaPadrao(avId: string, nomeArmazenado: string): Promise<void> {
    const falha = await shell.openPath(caminhoSeguro(avId, nomeArmazenado, this.pastaRaiz));
    if (falha) throw new ErroDeDominio('NAO_FOI_POSSIVEL_ABRIR', `Não foi possível abrir o arquivo: ${falha}`);
  }
}
