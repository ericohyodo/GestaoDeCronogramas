/** Sequência de operações, sugestões já usadas e templates da AV, sobre SQLite em memória. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepositorioCatalogoCustoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-catalogo-custo-sqlite';
import { RepositorioSecaoProcessoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-processo-sqlite';
import { RepositorioTemplatesAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-templates-av-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';

const agora = new Date('2026-09-22T12:00:00.000Z');

describe('Operações da Eng. Processo', () => {
  let db: BancoDeDados;

  beforeEach(() => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    db.prepare(
      `INSERT INTO av (id, numero, sequencial, ano, descricao, etapa_atual, criado_em)
       VALUES ('av1', 'AV-001/2026', 1, 2026, 'Teste', 1, ?)`,
    ).run(agora.toISOString());
  });

  afterEach(() => db.close());

  it('persiste a sequência na ordem e passa a sugerir os nomes usados', async () => {
    const repositorio = new RepositorioSecaoProcessoSqlite(db);
    await repositorio.salvar({
      secao: { avId: 'av1', prazoProducaoDias: null, atualizadoEm: agora, atualizadoPor: null },
      operacoes: [
        { id: 'o1', avId: 'av1', ordem: 0, descricao: 'Corte a laser', maquina: 'LASER-9', pecasHora: 300 },
        { id: 'o2', avId: 'av1', ordem: 1, descricao: 'Dobra', maquina: null, pecasHora: null },
      ],
      investimentos: [],
    });

    const lida = await repositorio.obter('av1');
    expect(lida?.operacoes.map((o) => [o.descricao, o.maquina, o.pecasHora])).toEqual([
      ['Corte a laser', 'LASER-9', 300],
      ['Dobra', null, null],
    ]);

    const catalogo = new RepositorioCatalogoCustoSqlite(db);
    expect(await catalogo.listarOperacoes()).toEqual(expect.arrayContaining(['Corte a laser', 'Dobra', 'Solda']));
    expect(await catalogo.listarMaquinas()).toContain('LASER-9');
  });
});

describe('Templates de AV', () => {
  let db: BancoDeDados;

  beforeEach(() => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
  });

  afterEach(() => db.close());

  it('lista por tipo e substitui o template de mesmo nome, sem diferenciar maiúsculas', async () => {
    const repositorio = new RepositorioTemplatesAvSqlite(db);
    const base = { usuarioId: null, criadoEm: agora };
    await repositorio.salvar({ ...base, id: 't1', tipo: 'operacoes', nome: 'Suporte', itens: [{ descricao: 'Corte' }] });
    await repositorio.salvar({
      ...base,
      id: 't2',
      tipo: 'operacoes',
      nome: 'SUPORTE',
      itens: [{ descricao: 'Corte' }, { descricao: 'Solda' }],
    });
    await repositorio.salvar({ ...base, id: 't3', tipo: 'custo_processo', nome: 'Suporte', itens: [] });

    const operacoes = await repositorio.listar('operacoes');
    expect(operacoes).toHaveLength(1);
    expect(operacoes[0]).toMatchObject({ id: 't1', nome: 'SUPORTE' });
    expect(operacoes[0]!.itens).toHaveLength(2);
    expect(await repositorio.listar('custo_processo')).toHaveLength(1);

    await repositorio.excluir('t1');
    expect(await repositorio.listar('operacoes')).toHaveLength(0);
  });
});
