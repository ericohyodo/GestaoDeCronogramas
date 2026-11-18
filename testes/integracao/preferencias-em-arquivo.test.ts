import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepositorioPreferenciasEmArquivo } from '../../electron/modulos/preferencias/infraestrutura/repositorio-preferencias-em-arquivo';

let pasta: string;
beforeEach(() => {
  pasta = mkdtempSync(path.join(tmpdir(), 'preferencias-'));
});
afterEach(() => rmSync(pasta, { recursive: true, force: true }));

describe('tema guardado neste computador', () => {
  it('começa sem escolha e guarda a última escolhida', async () => {
    const repositorio = new RepositorioPreferenciasEmArquivo(pasta);
    expect(await repositorio.obterTema()).toBeNull();
    await repositorio.salvarTema('claro');
    await repositorio.salvarTema('escuro');
    expect(await new RepositorioPreferenciasEmArquivo(pasta).obterTema()).toBe('escuro');
  });

  it('arquivo corrompido ou tema desconhecido contam como "não escolhido"', async () => {
    writeFileSync(path.join(pasta, 'preferencias.json'), '{ quebrado');
    expect(await new RepositorioPreferenciasEmArquivo(pasta).obterTema()).toBeNull();
    writeFileSync(path.join(pasta, 'preferencias.json'), JSON.stringify({ tema: 'neon' }));
    expect(await new RepositorioPreferenciasEmArquivo(pasta).obterTema()).toBeNull();
  });
});
