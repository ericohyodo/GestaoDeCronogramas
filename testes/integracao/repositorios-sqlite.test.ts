/**
 * Integração com SQLite real (banco em memória). O better-sqlite3 13 usa Node-API com
 * binários pré-compilados, então roda tanto no Node do Vitest quanto no Electron.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Periodo } from '../../electron/nucleo/dominio/periodo';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { Cronograma } from '../../electron/modulos/cronogramas/dominio/cronograma';
import { RepositorioCronogramasSqlite } from '../../electron/modulos/cronogramas/infraestrutura/repositorio-cronogramas-sqlite';
import { RepositorioPreferenciasSqlite } from '../../electron/modulos/preferencias/infraestrutura/repositorio-preferencias-sqlite';
import { Responsavel } from '../../electron/modulos/responsaveis/dominio/responsavel';
import { RepositorioResponsaveisSqlite } from '../../electron/modulos/responsaveis/infraestrutura/repositorio-responsaveis-sqlite';
import { Fase } from '../../electron/modulos/tarefas/dominio/fase';
import { Tarefa } from '../../electron/modulos/tarefas/dominio/tarefa';
import { RepositorioFasesSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-fases-sqlite';
import { RepositorioTarefasSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-tarefas-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';

const agora = new Date('2026-09-22T12:00:00.000Z');

describe('Banco SQLite', () => {
  let db: BancoDeDados;

  beforeEach(() => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
  });

  afterEach(() => db.close());

  it('aplica cada migração uma única vez', () => {
    expect(executarMigracoes(db, MIGRACOES)).toEqual([]);
    const versoes = db.prepare('SELECT versao FROM migracoes_aplicadas ORDER BY versao').pluck().all();
    expect(versoes).toEqual(MIGRACOES.map((migracao) => migracao.versao));
  });

  it('persiste, atualiza e reconstitui cronogramas', async () => {
    const repositorio = new RepositorioCronogramasSqlite(db);
    const cronograma = Cronograma.criar({
      id: 'c1',
      nome: 'Mudança de sede',
      periodo: Periodo.criar('2026-11-01', '2026-11-30'),
      agora,
    });
    await repositorio.salvar(cronograma);

    cronograma.alterarSituacao('em_andamento', agora);
    await repositorio.salvar(cronograma);

    const lido = await repositorio.obterPorId('c1');
    expect(lido?.nome).toBe('Mudança de sede');
    expect(lido?.situacao).toBe('em_andamento');
    expect(lido?.periodo.duracaoEmDias).toBe(30);
    expect(await repositorio.listar()).toHaveLength(1);
    expect(await repositorio.existe('c1')).toBe(true);
    expect(await repositorio.existe('c2')).toBe(false);
  });

  it('exclui as tarefas junto com o cronograma (ON DELETE CASCADE)', async () => {
    const cronogramas = new RepositorioCronogramasSqlite(db);
    const tarefas = new RepositorioTarefasSqlite(db);
    const periodo = Periodo.criar('2026-11-01', '2026-11-30');

    await cronogramas.salvar(Cronograma.criar({ id: 'c1', nome: 'X', periodo, agora }));
    expect(await tarefas.proximaOrdem('c1', null)).toBe(1);
    await tarefas.salvar(
      Tarefa.criar({ id: 't1', cronogramaId: 'c1', titulo: 'A', periodo, ordem: 1, agora }),
    );
    await tarefas.salvar(
      Tarefa.criar({ id: 't2', cronogramaId: 'c1', titulo: 'B', periodo, ordem: 2, agora }),
    );
    expect(await tarefas.proximaOrdem('c1', null)).toBe(3);
    expect((await tarefas.listarPorCronograma('c1')).map((t) => t.titulo)).toEqual(['A', 'B']);

    await cronogramas.excluir('c1');
    expect(await tarefas.listarPorCronograma('c1')).toEqual([]);
  });

  it('recusa tarefa de cronograma inexistente (chave estrangeira)', async () => {
    const tarefas = new RepositorioTarefasSqlite(db);
    const tarefa = Tarefa.criar({
      id: 't1',
      cronogramaId: 'nao-existe',
      titulo: 'Órfã',
      periodo: Periodo.criar('2026-11-01', '2026-11-02'),
      ordem: 1,
      agora,
    });
    await expect(tarefas.salvar(tarefa)).rejects.toThrow(/FOREIGN KEY/);
  });

  it('grava dependências, fases e responsável junto da tarefa', async () => {
    const cronogramas = new RepositorioCronogramasSqlite(db);
    const tarefas = new RepositorioTarefasSqlite(db);
    const fases = new RepositorioFasesSqlite(db);
    const responsaveis = new RepositorioResponsaveisSqlite(db);
    const periodo = Periodo.criar('2026-11-01', '2026-11-30');

    await cronogramas.salvar(Cronograma.criar({ id: 'c1', nome: 'X', periodo, agora }));
    await responsaveis.salvar(Responsavel.criar({ id: 'r1', nome: 'Ana Souza', agora }));
    await fases.salvar(Fase.criar({ id: 'f1', cronogramaId: 'c1', nome: 'Fase 1', ordem: 1, agora }));

    const primeira = Tarefa.criar({
      id: 't1',
      cronogramaId: 'c1',
      faseId: 'f1',
      titulo: 'A',
      periodo,
      responsavelId: 'r1',
      ordem: 1,
      agora,
    });
    const segunda = Tarefa.criar({
      id: 't2',
      cronogramaId: 'c1',
      faseId: 'f1',
      titulo: 'B',
      periodo,
      ordem: 2,
      agora,
    });
    segunda.definirDependencias(['t1'], agora);
    await tarefas.salvarVarias([primeira, segunda]);

    const lidas = await tarefas.listarPorCronograma('c1');
    expect(lidas.map((t) => [t.titulo, t.faseId, t.responsavelId, t.dependencias])).toEqual([
      ['A', 'f1', 'r1', []],
      ['B', 'f1', null, ['t1']],
    ]);
    expect(await tarefas.proximaOrdem('c1', 'f1')).toBe(3);
    // Tarefas soltas compartilham a numeração de topo com as fases.
    expect(await tarefas.proximaOrdem('c1', null)).toBe(2);

    // Excluir o responsável apenas desvincula; excluir a fase leva as tarefas junto.
    await responsaveis.excluir('r1');
    expect((await tarefas.obterPorId('t1'))?.responsavelId).toBeNull();
    await fases.excluir('f1');
    expect(await tarefas.listarPorCronograma('c1')).toEqual([]);
  });

  it('grava a evidência e reordena tarefas e fases', async () => {
    const cronogramas = new RepositorioCronogramasSqlite(db);
    const tarefas = new RepositorioTarefasSqlite(db);
    const fases = new RepositorioFasesSqlite(db);
    const periodo = Periodo.criar('2026-11-01', '2026-11-30');

    await cronogramas.salvar(Cronograma.criar({ id: 'c1', nome: 'X', periodo, agora }));
    await fases.salvar(Fase.criar({ id: 'f1', cronogramaId: 'c1', nome: 'Fase 1', ordem: 1, agora }));
    const tarefa = Tarefa.criar({ id: 't1', cronogramaId: 'c1', titulo: 'A', periodo, ordem: 2, agora });
    tarefa.registrarEvidencia('  PPAP aprovado em 12/10  ', agora);
    await tarefas.salvar(tarefa);

    expect((await tarefas.obterPorId('t1'))?.evidencia).toBe('PPAP aprovado em 12/10');

    await tarefas.atualizarOrdens([{ id: 't1', ordem: 1 }]);
    await fases.atualizarOrdens([{ id: 'f1', ordem: 2 }]);
    expect((await tarefas.obterPorId('t1'))?.ordem).toBe(1);
    expect((await fases.obterPorId('f1'))?.ordem).toBe(2);

    tarefa.registrarEvidencia('   ', agora);
    await tarefas.salvar(tarefa);
    expect((await tarefas.obterPorId('t1'))?.evidencia).toBeNull();
  });

  it('persiste usuários com login único, sem diferenciar maiúsculas', async () => {
    const repositorio = new RepositorioUsuariosSqlite(db);
    const usuario = Usuario.criar({
      id: 'u1',
      nome: 'Erico',
      login: 'erico',
      senhaHash: 'hash',
      perfil: 'administrador',
      agora,
    });
    await repositorio.salvar(usuario);

    expect((await repositorio.obterPorLogin('ERICO'))?.nome).toBe('Erico');
    expect(await repositorio.contar()).toBe(1);
    expect(await repositorio.contarAdministradoresAtivos('u1')).toBe(0);

    const repetido = Usuario.criar({
      id: 'u2',
      nome: 'Outro',
      login: 'Erico',
      senhaHash: 'hash',
      perfil: 'gestor',
      agora,
    });
    await expect(repositorio.salvar(repetido)).rejects.toThrow(/UNIQUE/);
  });

  it('guarda o tema como preferência chave/valor', async () => {
    const repositorio = new RepositorioPreferenciasSqlite(db);
    expect(await repositorio.obterTema()).toBeNull();
    await repositorio.salvarTema('claro');
    await repositorio.salvarTema('escuro');
    expect(await repositorio.obterTema()).toBe('escuro');
  });
});
