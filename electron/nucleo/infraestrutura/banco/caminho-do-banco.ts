import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export const NOME_ARQUIVO_BANCO = 'gestao-cronogramas.db';

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
