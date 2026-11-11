/** "Inserir linha" estilo Word no cronograma: nova tarefa entra na posição escolhida e as seguintes descem. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Cronograma } from '../../electron/modulos/cronogramas/dominio/cronograma';
import { RepositorioCronogramasSqlite } from '../../electron/modulos/cronogramas/infraestrutura/repositorio-cronogramas-sqlite';
import { CriarTarefa } from '../../electron/modulos/tarefas/aplicacao/casos-de-uso/criar-tarefa';
import { Fase } from '../../electron/modulos/tarefas/dominio/fase';
import { RepositorioFasesSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-fases-sqlite';
import { RepositorioTarefasSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-tarefas-sqlite';
import { Periodo } from '../../electron/nucleo/dominio/periodo';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('inserir linha no cronograma', () => {
  let db: BancoDeDados;
  let criar: CriarTarefa;
  let tarefas: RepositorioTarefasSqlite;
  const base = { cronogramaId: 'c1', dataInicio: '2026-11-01', dataFim: '2026-11-05' };

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    await new RepositorioCronogramasSqlite(db).salvar(
      Cronograma.criar({ id: 'c1', nome: 'P', periodo: Periodo.criar('2026-11-01', '2026-12-31'), agora: relogio.agora() }),
    );
    const fases = new RepositorioFasesSqlite(db);
    await fases.salvar(Fase.criar({ id: 'f1', cronogramaId: 'c1', nome: 'Fase 1', ordem: 1, agora: relogio.agora() }));
    tarefas = new RepositorioTarefasSqlite(db);
    criar = new CriarTarefa(
      tarefas,
      fases,
      { existe: async () => true, obterPeriodo: async () => null, listar: async () => [] },
      { existe: async () => true, obterNomes: async () => new Map() },
      relogio,
      new GeradorDeIdSequencial('t'),
    );
  });

  afterEach(() => db.close());

  const titulosDaFase = async () =>
    (await tarefas.listarPorCronograma('c1'))
      .filter((tarefa) => tarefa.faseId === 'f1')
      .sort((a, b) => a.ordem - b.ordem)
      .map((tarefa) => tarefa.titulo);

  it('insere logo abaixo da tarefa escolhida e no início da fase', async () => {
    const a = await criar.executar({ ...base, faseId: 'f1', titulo: 'A' });
    await criar.executar({ ...base, faseId: 'f1', titulo: 'C' });
    await criar.executar({ ...base, titulo: 'B', inserirApos: a.id });
    expect(await titulosDaFase()).toEqual(['A', 'B', 'C']);

    await criar.executar({ ...base, faseId: 'f1', titulo: 'Primeira', inserirNoInicio: true });
    expect(await titulosDaFase()).toEqual(['Primeira', 'A', 'B', 'C']);
  });

  it('recusa referência de outro cronograma', async () => {
    await expect(criar.executar({ ...base, titulo: 'X', inserirApos: 'nao-existe' })).rejects.toThrow(/referência/);
  });
});
