import { beforeEach, describe, expect, it } from 'vitest';
import { AtualizarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/atualizar-tarefa';
import { CopiarEstrutura } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/copiar-estrutura';
import { CriarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/criar-tarefa';
import { DuplicarTarefa } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/duplicar-tarefa';
import { CriarFase } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/gerenciar-fases';
import { ListarAgenda } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/listar-agenda';
import { ObterEstrutura } from '../../../electron/modulos/tarefas/aplicacao/casos-de-uso/obter-estrutura';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import {
  ConsultaDeCronogramasFalsa,
  ConsultaDeResponsaveisFalsa,
  GeradorDeIdSequencial,
  RelogioFixo,
  RepositorioFasesEmMemoria,
  RepositorioTarefasEmMemoria,
} from '../../dubles/dubles';

describe('Duplicar tarefa, copiar estrutura e agenda', () => {
  let tarefas: RepositorioTarefasEmMemoria;
  let fases: RepositorioFasesEmMemoria;
  let consultaDeCronogramas: ConsultaDeCronogramasFalsa;
  let criarFase: CriarFase;
  let criarTarefa: CriarTarefa;
  let atualizarTarefa: AtualizarTarefa;
  let duplicar: DuplicarTarefa;
  let copiar: CopiarEstrutura;
  let agenda: ListarAgenda;
  let estrutura: ObterEstrutura;
  const consultaDeResponsaveis = new ConsultaDeResponsaveisFalsa();

  beforeEach(() => {
    tarefas = new RepositorioTarefasEmMemoria();
    fases = new RepositorioFasesEmMemoria();
    consultaDeCronogramas = new ConsultaDeCronogramasFalsa(
      new Map([
        ['cron-1', { inicio: '2026-10-01', fim: '2026-12-31' }],
        ['cron-2', { inicio: '2027-02-01', fim: '2027-06-30' }],
        ['cron-3', { inicio: '2026-10-01', fim: '2026-12-31' }],
      ]),
    );
    const relogio = new RelogioFixo();
    const geradorDeId = new GeradorDeIdSequencial('x');
    criarFase = new CriarFase(fases, tarefas, consultaDeCronogramas, relogio, geradorDeId);
    criarTarefa = new CriarTarefa(
      tarefas,
      fases,
      consultaDeCronogramas,
      consultaDeResponsaveis,
      relogio,
      geradorDeId,
    );
    atualizarTarefa = new AtualizarTarefa(tarefas, consultaDeResponsaveis, relogio);
    duplicar = new DuplicarTarefa(tarefas, fases, relogio, geradorDeId);
    copiar = new CopiarEstrutura(tarefas, fases, consultaDeCronogramas, relogio, geradorDeId);
    agenda = new ListarAgenda(tarefas, fases, consultaDeCronogramas, consultaDeResponsaveis);
    estrutura = new ObterEstrutura(tarefas, fases, consultaDeCronogramas, consultaDeResponsaveis);
  });

  const titulos = async (cronogramaId: string) =>
    (await estrutura.executar(cronogramaId)).linhas.map((linha) => `${linha.numero} ${linha.titulo}`);

  it('duplica a tarefa logo abaixo da original, empurrando as seguintes', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase A', quantidadeDeSubtarefas: 3 });
    const [primeira] = await tarefas.listarPorCronograma('cron-1');
    await atualizarTarefa.executar({
      id: primeira!.id,
      titulo: 'Projeto',
      responsavelId: 'resp-1',
      percentualConcluido: 60,
    });

    const copia = await duplicar.executar(primeira!.id);

    expect(await titulos('cron-1')).toEqual([
      '1 Fase A',
      '1.1 Projeto',
      '1.2 Projeto',
      '1.3 Tarefa 2',
      '1.4 Tarefa 3',
    ]);
    expect(copia.responsavelId).toBe('resp-1');
    expect(copia.percentualConcluido).toBe(0);
  });

  it('duplicar uma tarefa solta empurra também as fases que vêm depois', async () => {
    const solta = await criarTarefa.executar({
      cronogramaId: 'cron-1',
      titulo: 'Kickoff',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-01',
    });
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase A', quantidadeDeSubtarefas: 1 });
    // No SQLite, fases e tarefas soltas dividem a numeração de topo; o dublê não sabe disso.
    const [faseA] = await fases.listarPorCronograma('cron-1');
    await fases.atualizarOrdens([{ id: faseA!.id, ordem: 2 }]);

    await duplicar.executar(solta.id);

    expect(await titulos('cron-1')).toEqual(['1 Kickoff', '2 Kickoff', '3 Fase A', '3.1 Tarefa 1']);
  });

  it('copia fases, tarefas e dependências, com datas zeradas no início do destino', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase A', quantidadeDeSubtarefas: 2 });
    const [a, b] = await tarefas.listarPorCronograma('cron-1');
    await atualizarTarefa.executar({ id: b!.id, dependencias: [a!.id], responsavelId: 'resp-1' });

    await copiar.executar({ origemId: 'cron-1', destinoId: 'cron-2' });

    const linhas = (await estrutura.executar('cron-2')).linhas;
    expect(linhas.map((linha) => `${linha.numero} ${linha.titulo}`)).toEqual([
      '1 Fase A',
      '1.1 Tarefa 1',
      '1.2 Tarefa 2',
    ]);
    const segunda = linhas[2]!;
    expect(segunda.dependenciasNumeros).toEqual(['1.1']);
    expect(segunda.responsavelId).toBeNull();
    expect([segunda.dataInicio, segunda.dataFim]).toEqual(['2027-02-01', '2027-02-01']);
    // A origem continua intacta.
    expect((await tarefas.listarPorCronograma('cron-1')).map((t) => t.cronogramaId)).toEqual([
      'cron-1',
      'cron-1',
    ]);
  });

  it('só copia para um cronograma vazio', async () => {
    await criarFase.executar({ cronogramaId: 'cron-1', nome: 'Fase A', quantidadeDeSubtarefas: 1 });
    await criarFase.executar({ cronogramaId: 'cron-2', nome: 'Já existe', quantidadeDeSubtarefas: 0 });

    await expect(copiar.executar({ origemId: 'cron-1', destinoId: 'cron-2' })).rejects.toThrow(
      ErroDeValidacao,
    );
  });

  it('a agenda junta tarefas de vários projetos, ordenadas pelo término, sem os arquivados', async () => {
    await criarTarefa.executar({
      cronogramaId: 'cron-1',
      titulo: 'Entrega tardia',
      dataInicio: '2026-11-01',
      dataFim: '2026-11-20',
      responsavelId: 'resp-1',
    });
    await criarFase.executar({ cronogramaId: 'cron-2', nome: 'Fase B', quantidadeDeSubtarefas: 1 });
    await criarTarefa.executar({
      cronogramaId: 'cron-3',
      titulo: 'Arquivada',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-02',
    });
    consultaDeCronogramas.arquivados.add('cron-3');

    const itens = await agenda.executar();

    expect(itens.map((item) => [item.titulo, item.cronogramaNome, item.faseNome])).toEqual([
      ['Entrega tardia', 'Projeto cron-1', null],
      ['Tarefa 1', 'Projeto cron-2', 'Fase B'],
    ]);
    expect(itens[0]!.responsavelNome).toBe('Ana Souza');
  });
});
