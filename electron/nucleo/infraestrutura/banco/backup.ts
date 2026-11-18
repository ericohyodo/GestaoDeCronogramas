import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { BancoDeDados } from './conexao-sqlite';

// =====================================================================================================
// Backup automático do banco SQLite
// -----------------------------------------------------------------------------------------------------
// Cópia consistente (API de backup online do SQLite) para `<pasta do banco>/backups/`. Roda na abertura
// do app: sempre antes de aplicar migrações e, fora isso, no máximo uma vez por dia. A rotação mantém
// os 7 dias mais recentes, 1 cópia por semana das 4 semanas anteriores e as 3 últimas pré-migração.
// =====================================================================================================

export const PASTA_DE_BACKUPS = 'backups';
const PREFIXO = 'gestao-cronogramas_';
const SUFIXO_PRE_MIGRACAO = '_pre-migracao';
const DIAS_MANTIDOS = 7;
const SEMANAS_MANTIDAS = 4;
const PRE_MIGRACAO_MANTIDOS = 3;

export type MotivoDoBackup = 'diario' | 'pre-migracao';

interface ArquivoDeBackup {
  nome: string;
  /** Data/hora local extraída do nome (AAAA-MM-DD_HHMMSS). */
  dia: string;
  carimbo: string;
  preMigracao: boolean;
}

/**
 * Monta o nome do arquivo de backup a partir da data local.
 * @param agora momento do backup
 * @param motivo diário ou pré-migração (sufixo próprio, rotação separada)
 * @returns nome do arquivo, ex.: `gestao-cronogramas_2026-11-11_083015.db`
 */
export function nomeDoBackup(agora: Date, motivo: MotivoDoBackup): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const dia = `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
  const hora = `${p(agora.getHours())}${p(agora.getMinutes())}${p(agora.getSeconds())}`;
  return `${PREFIXO}${dia}_${hora}${motivo === 'pre-migracao' ? SUFIXO_PRE_MIGRACAO : ''}.db`;
}

/** Interpreta um nome de arquivo de backup; devolve `null` para qualquer outro arquivo da pasta. */
function lerNome(nome: string): ArquivoDeBackup | null {
  const casamento = /^gestao-cronogramas_(\d{4}-\d{2}-\d{2})_(\d{6})(_pre-migracao)?\.db$/.exec(nome);
  if (!casamento) return null;
  return { nome, dia: casamento[1]!, carimbo: `${casamento[1]}_${casamento[2]}`, preMigracao: !!casamento[3] };
}

/** Segunda-feira (AAAA-MM-DD) da semana de um dia, para agrupar backups semanais. */
function inicioDaSemana(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  const data = new Date(a, m - 1, d);
  const deslocamento = (data.getDay() + 6) % 7;
  data.setDate(data.getDate() - deslocamento);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

/**
 * Decide quais arquivos de backup apagar (função pura, testável).
 * @param nomes nomes presentes na pasta de backups (outros arquivos são ignorados)
 * @returns nomes que devem ser apagados
 */
export function backupsParaApagar(nomes: readonly string[]): string[] {
  const backups = nomes.map(lerNome).filter((b): b is ArquivoDeBackup => b !== null);
  const manter = new Set<string>();

  const preMigracao = backups.filter((b) => b.preMigracao).sort((a, b) => b.carimbo.localeCompare(a.carimbo));
  preMigracao.slice(0, PRE_MIGRACAO_MANTIDOS).forEach((b) => manter.add(b.nome));

  // O mais recente de cada dia; os 7 dias mais recentes ficam; dos demais, o mais recente de cada semana.
  const diarios = backups.filter((b) => !b.preMigracao).sort((a, b) => b.carimbo.localeCompare(a.carimbo));
  const ultimoPorDia = new Map<string, ArquivoDeBackup>();
  for (const b of diarios) if (!ultimoPorDia.has(b.dia)) ultimoPorDia.set(b.dia, b);
  const dias = [...ultimoPorDia.values()];
  dias.slice(0, DIAS_MANTIDOS).forEach((b) => manter.add(b.nome));

  const semanas = new Set<string>();
  for (const b of dias.slice(DIAS_MANTIDOS)) {
    const semana = inicioDaSemana(b.dia);
    if (semanas.has(semana)) continue;
    if (semanas.size >= SEMANAS_MANTIDAS) break;
    semanas.add(semana);
    manter.add(b.nome);
  }

  return backups.filter((b) => !manter.has(b.nome)).map((b) => b.nome);
}

/** Já existe backup diário de hoje? Evita uma cópia a cada abertura do app. */
export function jaTemBackupDoDia(nomes: readonly string[], agora: Date): boolean {
  const hoje = nomeDoBackup(agora, 'diario').slice(PREFIXO.length, PREFIXO.length + 10);
  return nomes.some((nome) => {
    const b = lerNome(nome);
    return b !== null && !b.preMigracao && b.dia === hoje;
  });
}

/**
 * Faz o backup se for necessário e aplica a rotação.
 * @param db conexão aberta
 * @param pastaDoBanco pasta onde está o arquivo .db
 * @param agora relógio (injetado para testes)
 * @param motivo `pre-migracao` sempre copia; `diario` só se ainda não houver cópia do dia
 * @returns caminho do backup criado, ou `null` quando não foi preciso
 */
export async function fazerBackup(
  db: BancoDeDados,
  pastaDoBanco: string,
  agora: Date,
  motivo: MotivoDoBackup,
): Promise<string | null> {
  const pasta = path.join(pastaDoBanco, PASTA_DE_BACKUPS);
  mkdirSync(pasta, { recursive: true });
  if (motivo === 'diario' && jaTemBackupDoDia(readdirSync(pasta), agora)) return null;

  // Grava num nome temporário e renomeia: um backup interrompido nunca parece válido.
  const destino = path.join(pasta, nomeDoBackup(agora, motivo));
  const temporario = `${destino}.parcial`;
  try {
    await db.backup(temporario);
    renameSync(temporario, destino);
  } catch (erro) {
    rmSync(temporario, { force: true });
    throw erro;
  }

  for (const nome of backupsParaApagar(readdirSync(pasta))) rmSync(path.join(pasta, nome), { force: true });
  return destino;
}
