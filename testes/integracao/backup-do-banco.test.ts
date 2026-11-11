import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  backupsParaApagar,
  fazerBackup,
  jaTemBackupDoDia,
  nomeDoBackup,
  PASTA_DE_BACKUPS,
} from '../../electron/nucleo/infraestrutura/banco/backup';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { haMigracoesPendentes, executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';

const dia = (d: number, h = 8) => new Date(2026, 10, d, h, 0, 0);

describe('rotação de backups', () => {
  it('mantém os 7 dias mais recentes, 1 por semana das 4 anteriores e 3 pré-migração', () => {
    const nomes: string[] = [];
    // 60 dias seguidos, dois backups por dia (o mais antigo do dia sempre sai).
    for (let i = 0; i < 60; i++) {
      const data = new Date(2026, 8, 1 + i, 8);
      nomes.push(nomeDoBackup(data, 'diario'), nomeDoBackup(new Date(data.getTime() + 3600_000), 'diario'));
    }
    for (let i = 0; i < 5; i++) nomes.push(nomeDoBackup(new Date(2026, 9, 1 + i, 7), 'pre-migracao'));
    nomes.push('outro-arquivo.txt');

    const apagar = new Set(backupsParaApagar(nomes));
    const ficam = nomes.filter((n) => !apagar.has(n) && n.endsWith('.db'));
    expect(ficam.filter((n) => n.includes('pre-migracao'))).toHaveLength(3);
    expect(ficam.filter((n) => !n.includes('pre-migracao'))).toHaveLength(7 + 4);
    expect(apagar.has('outro-arquivo.txt')).toBe(false);
    // O backup mais recente sempre fica.
    expect(ficam).toContain(nomes[119]);
  });

  it('reconhece se já há backup diário de hoje', () => {
    const nomes = [nomeDoBackup(dia(10), 'diario'), nomeDoBackup(dia(11), 'pre-migracao')];
    expect(jaTemBackupDoDia(nomes, dia(10, 17))).toBe(true);
    expect(jaTemBackupDoDia(nomes, dia(11, 17))).toBe(false);
  });
});

describe('backup do arquivo', () => {
  let pasta: string;
  let db: BancoDeDados;

  beforeEach(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'gc-backup-'));
    db = abrirConexao(path.join(pasta, 'gestao-cronogramas.db'));
  });
  afterEach(() => {
    db.close();
    rmSync(pasta, { recursive: true, force: true });
  });

  it('faz backup pré-migração sempre e o diário só uma vez por dia', async () => {
    expect(haMigracoesPendentes(db, MIGRACOES)).toBe(true);
    const pre = await fazerBackup(db, pasta, dia(11, 8), 'pre-migracao');
    expect(pre).toMatch(/pre-migracao\.db$/);
    executarMigracoes(db, MIGRACOES);
    expect(haMigracoesPendentes(db, MIGRACOES)).toBe(false);

    expect(await fazerBackup(db, pasta, dia(11, 9), 'diario')).not.toBeNull();
    expect(await fazerBackup(db, pasta, dia(11, 10), 'diario')).toBeNull();

    const copia = abrirConexao(path.join(pasta, PASTA_DE_BACKUPS, path.basename(pre!)));
    copia.close();
    expect(readdirSync(path.join(pasta, PASTA_DE_BACKUPS)).filter((n) => n.endsWith('.parcial'))).toHaveLength(0);
  });

  it('remove backups antigos ao gravar um novo', async () => {
    const pastaBackups = path.join(pasta, PASTA_DE_BACKUPS);
    await fazerBackup(db, pasta, dia(1), 'diario');
    for (let i = 0; i < 20; i++) writeFileSync(path.join(pastaBackups, nomeDoBackup(new Date(2026, 6, 1 + i), 'diario')), '');
    await fazerBackup(db, pasta, dia(11), 'diario');
    expect(readdirSync(pastaBackups).length).toBeLessThanOrEqual(11);
  });
});
