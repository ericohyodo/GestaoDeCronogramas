import { randomUUID } from 'node:crypto';
import { copyFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BrowserWindow, dialog, shell } from 'electron';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import { garantirPastaGravavel, resolverPastaDoBanco } from '../../../nucleo/infraestrutura/banco/caminho-do-banco';
import type {
  ArmazenamentoDeEvidencias,
  ArquivoEscolhido,
  ArquivoGuardado,
  SeletorDeEvidencias,
} from '../aplicacao/portas';

// =====================================================================================================
// Evidências da SD no sistema de arquivos (ao lado do banco, na pasta de rede) e seletor nativo.
// =====================================================================================================

/** Limite por arquivo: e-mails com anexos grandes cabem; evita encher a pasta compartilhada. */
export const TAMANHO_MAXIMO_EVIDENCIA_BYTES = 25 * 1024 * 1024;

/** Extensões que executam código ao abrir: nunca aceitas como evidência. */
const EXTENSOES_BLOQUEADAS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.ps1', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.scr',
  '.lnk', '.hta', '.cpl', '.jar', '.reg', '.pif', '.dll',
]);

const TIPOS_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.msg': 'application/vnd.ms-outlook',
  '.eml': 'message/rfc822',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function sanitizarNomeArquivo(nome: string): string {
  const extensao = path.extname(nome);
  const base = path.basename(nome, extensao).replace(/[\\/:*?"<>|]/g, '_').trim();
  return `${base || 'arquivo'}${extensao}`;
}

/** Pasta da SD; o id vem do banco (UUID), mas ainda assim é sanitizado contra "..". */
function pastaDaSd(sdId: string): string {
  return path.join(resolverPastaDoBanco(), 'anexos-sds', sdId.replace(/[^\w-]/g, '_'));
}

function caminhoSeguro(sdId: string, nomeArmazenado: string): string {
  const pasta = pastaDaSd(sdId);
  const caminho = path.join(pasta, path.basename(nomeArmazenado));
  if (!caminho.startsWith(pasta + path.sep)) throw new ErroDeDominio('CAMINHO_INVALIDO', 'Arquivo inválido.');
  return caminho;
}

export class ArmazenamentoDeEvidenciasFs implements ArmazenamentoDeEvidencias {
  async guardar(sdId: string, arquivo: ArquivoEscolhido): Promise<ArquivoGuardado> {
    const extensao = path.extname(arquivo.nomeArquivo).toLowerCase();
    if (EXTENSOES_BLOQUEADAS.has(extensao)) {
      throw new ErroDeDominio('ARQUIVO_NAO_PERMITIDO', `Arquivos ${extensao} não podem ser anexados.`);
    }
    const tamanho = (await stat(arquivo.caminhoOriginal)).size;
    if (tamanho > TAMANHO_MAXIMO_EVIDENCIA_BYTES) {
      throw new ErroDeDominio(
        'ARQUIVO_GRANDE_DEMAIS',
        `"${arquivo.nomeArquivo}" tem mais de ${TAMANHO_MAXIMO_EVIDENCIA_BYTES / 1024 / 1024} MB.`,
      );
    }
    const pasta = pastaDaSd(sdId);
    garantirPastaGravavel(pasta);
    const nomeArmazenado = `${randomUUID()}-${sanitizarNomeArquivo(arquivo.nomeArquivo)}`;
    await copyFile(arquivo.caminhoOriginal, path.join(pasta, nomeArmazenado));
    return { nomeArmazenado, tipoMime: TIPOS_MIME[extensao] ?? null, tamanhoBytes: tamanho };
  }

  async gravarTexto(sdId: string, nomeArquivo: string, conteudo: string): Promise<ArquivoGuardado> {
    const pasta = pastaDaSd(sdId);
    garantirPastaGravavel(pasta);
    const nomeArmazenado = `${randomUUID()}-${sanitizarNomeArquivo(nomeArquivo)}`;
    await writeFile(path.join(pasta, nomeArmazenado), conteudo, 'utf-8');
    const extensao = path.extname(nomeArquivo).toLowerCase();
    return { nomeArmazenado, tipoMime: TIPOS_MIME[extensao] ?? null, tamanhoBytes: Buffer.byteLength(conteudo, 'utf-8') };
  }

  async abrir(sdId: string, nomeArmazenado: string): Promise<void> {
    const falha = await shell.openPath(caminhoSeguro(sdId, nomeArmazenado));
    if (falha) throw new ErroDeDominio('NAO_FOI_POSSIVEL_ABRIR', `Não foi possível abrir o arquivo: ${falha}`);
  }

  async excluir(sdId: string, nomeArmazenado: string): Promise<void> {
    await rm(caminhoSeguro(sdId, nomeArmazenado), { force: true });
  }
}

export class SeletorDeEvidenciasElectron implements SeletorDeEvidencias {
  async escolher(): Promise<ArquivoEscolhido[] | null> {
    const opcoes: Electron.OpenDialogOptions = {
      title: 'Anexar evidência de oficialização do cliente (PO)',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'E-mails e documentos', extensions: ['msg', 'eml', 'pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    };
    const janela = BrowserWindow.getFocusedWindow();
    const resposta = janela ? await dialog.showOpenDialog(janela, opcoes) : await dialog.showOpenDialog(opcoes);
    if (resposta.canceled || resposta.filePaths.length === 0) return null;
    return resposta.filePaths.map((caminho) => ({ caminhoOriginal: caminho, nomeArquivo: path.basename(caminho) }));
  }
}
