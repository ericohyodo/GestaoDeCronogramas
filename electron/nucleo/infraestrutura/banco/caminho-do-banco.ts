import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export const NOME_ARQUIVO_BANCO = 'gestao-cronogramas.db';

/** Argumento de linha de comando que liga o modo apresentação (o app é reiniciado com ele). */
export const ARGUMENTO_MODO_APRESENTACAO = '--modo-apresentacao';
/**
 * Pasta do modo apresentação: banco, anexos e backups próprios, recriados a cada entrada. Fica no computador
 * local (pasta temporária do usuário do Windows), não na pasta de rede: cada PC tem a sua apresentação, sem
 * conflito entre dois administradores apresentando ao mesmo tempo e sem depender da rede.
 */
export function pastaDoModoApresentacao(): string {
  return path.join(app.getPath('temp'), 'gestao-novos-desenvolvimentos', 'apresentacao');
}

/** O app está em modo apresentação (dados fictícios, isolados dos reais)? */
export function ehModoApresentacao(): boolean {
  return process.argv.includes(ARGUMENTO_MODO_APRESENTACAO);
}

export class ErroPastaSemPermissao extends Error {
  constructor(readonly pasta: string) {
    super(
      `Não é possível gravar dados em:\n${pasta}\n\n` +
        'Mova o aplicativo para uma pasta com permissão de escrita ' +
        '(por exemplo, Documentos ou um pendrive) e abra-o novamente.',
    );
    this.name = 'ErroPastaSemPermissao';
  }
}

/**
 * O banco fica ao lado do executável:
 * 1. `.exe` portátil: o launcher do electron-builder informa a pasta real do `.exe` em
 *    PORTABLE_EXECUTABLE_DIR (o app em si roda descompactado dentro do %TEMP%).
 * 2. Build desempacotado (dist/win-unpacked): pasta do executável.
 * 3. Desenvolvimento: <repositório>/dados-dev.
 */
export function resolverPastaDoBanco(): string {
  // No modo apresentação tudo (banco, anexos, backups) vai para uma pasta local própria: os dados reais nunca
  // são abertos nem tocados.
  return ehModoApresentacao() ? pastaDoModoApresentacao() : resolverPastaDosDadosReais();
}

/** Pasta dos dados reais (ao lado do .exe), mesmo no modo apresentação: o aviso de atualização fica nela. */
export function resolverPastaDosDadosReais(): string {
  const pastaPortatil = process.env.PORTABLE_EXECUTABLE_DIR;
  if (pastaPortatil) return pastaPortatil;
  if (app.isPackaged) return path.dirname(process.execPath);
  return path.join(app.getAppPath(), 'dados-dev');
}

/** Garante que a pasta existe e aceita escrita (testa gravando um arquivo de fato). */
export function garantirPastaGravavel(pasta: string): void {
  const sonda = path.join(pasta, `.teste-escrita-${process.pid}`);
  try {
    mkdirSync(pasta, { recursive: true });
    writeFileSync(sonda, '');
    rmSync(sonda);
  } catch {
    throw new ErroPastaSemPermissao(pasta);
  }
}
