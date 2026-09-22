import { beforeEach, describe, expect, it } from 'vitest';
import { ErroNaoEncontrado } from '../../../electron/nucleo/aplicacao/erros';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import { Periodo } from '../../../electron/nucleo/dominio/periodo';
import { AtualizarCronograma } from '../../../electron/modulos/cronogramas/aplicacao/casos-de-uso/atualizar-cronograma';
import { CriarCronograma } from '../../../electron/modulos/cronogramas/aplicacao/casos-de-uso/criar-cronograma';
import { ExcluirCronograma } from '../../../electron/modulos/cronogramas/aplicacao/casos-de-uso/excluir-cronograma';
import { ObterCronograma } from '../../../electron/modulos/cronogramas/aplicacao/casos-de-uso/obter-cronograma';
import { Cronograma } from '../../../electron/modulos/cronogramas/dominio/cronograma';
import {
  GeradorDeIdSequencial,
  RelogioFixo,
  RepositorioCronogramasEmMemoria,
} from '../../dubles/dubles';

describe('Cronograma (entidade)', () => {
  const periodo = Periodo.criar('2026-09-01', '2026-09-30');
  const agora = new Date('2026-09-22T12:00:00Z');

  it('nasce planejado, com nome e descrição normalizados', () => {
    const cronograma = Cronograma.criar({
      id: 'c1',
      nome: '  Implantação ERP  ',
      descricao: '   ',
      periodo,
      agora,
    });
    expect(cronograma.nome).toBe('Implantação ERP');
    expect(cronograma.descricao).toBeNull();
    expect(cronograma.situacao).toBe('planejado');
  });

  it('exige nome', () => {
    expect(() => Cronograma.criar({ id: 'c1', nome: ' ', periodo, agora })).toThrow(ErroDeValidacao);
  });

  it('rejeita situação desconhecida', () => {
    const cronograma = Cronograma.criar({ id: 'c1', nome: 'X', periodo, agora });
    expect(() => cronograma.alterarSituacao('cancelado', agora)).toThrow(ErroDeValidacao);
  });
});

describe('Casos de uso de cronogramas', () => {
  let repositorio: RepositorioCronogramasEmMemoria;
  let relogio: RelogioFixo;

  beforeEach(() => {
    repositorio = new RepositorioCronogramasEmMemoria();
    relogio = new RelogioFixo();
  });

  const criar = () =>
    new CriarCronograma(repositorio, relogio, new GeradorDeIdSequencial('cron')).executar({
      nome: 'Obra do galpão',
      dataInicio: '2026-10-01',
      dataFim: '2026-12-15',
    });

  it('cria e devolve o DTO com a duração calculada', async () => {
    const dto = await criar();
    expect(dto).toMatchObject({
      id: 'cron-1',
      nome: 'Obra do galpão',
      situacao: 'planejado',
      duracaoEmDias: 76,
      criadoEm: '2026-09-22T12:00:00.000Z',
    });
    expect(repositorio.itens.size).toBe(1);
  });

  it('atualiza somente os campos informados', async () => {
    const { id } = await criar();
    relogio.instante = new Date('2026-09-23T08:00:00Z');

    const dto = await new AtualizarCronograma(repositorio, relogio).executar({
      id,
      dataFim: '2026-12-31',
      situacao: 'em_andamento',
    });

    expect(dto).toMatchObject({
      nome: 'Obra do galpão',
      dataInicio: '2026-10-01',
      dataFim: '2026-12-31',
      situacao: 'em_andamento',
      atualizadoEm: '2026-09-23T08:00:00.000Z',
    });
  });

  it('não aceita período inválido na atualização', async () => {
    const { id } = await criar();
    await expect(
      new AtualizarCronograma(repositorio, relogio).executar({ id, dataFim: '2026-09-01' }),
    ).rejects.toThrow(ErroDeValidacao);
  });

  it('informa "não encontrado" ao obter ou excluir um id inexistente', async () => {
    await expect(new ObterCronograma(repositorio).executar('nada')).rejects.toThrow(ErroNaoEncontrado);
    await expect(new ExcluirCronograma(repositorio).executar('nada')).rejects.toThrow(ErroNaoEncontrado);
  });
});
