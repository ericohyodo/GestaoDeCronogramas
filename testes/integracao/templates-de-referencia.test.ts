/** Templates de operações de referência (migração 0051): carregados, válidos e sem sobrescrever os do usuário. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepositorioTemplatesAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-templates-av-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';

interface ItemDeOperacao {
  descricao: string;
  maquina: string | null;
  pecasHora: number | null;
}

describe('templates de operações de referência', () => {
  let db: BancoDeDados;

  beforeEach(() => {
    db = abrirConexao(':memory:');
  });
  afterEach(() => db.close());

  it('traz os 15 templates das folhas de processo, com operações, máquina e pç/h válidos', async () => {
    executarMigracoes(db, MIGRACOES);
    const templates = (await new RepositorioTemplatesAvSqlite(db).listar('operacoes')).filter((t) =>
      t.nome.endsWith('(referência)'),
    );
    expect(templates).toHaveLength(15);
    expect(templates.map((t) => t.nome)).toEqual(
      expect.arrayContaining([
        'Base forjada — simples (referência)',
        'Venturi horizontal (referência)',
        'Capa com pinos soldados (referência)',
      ]),
    );
    for (const template of templates) {
      const itens = template.itens as ItemDeOperacao[];
      expect(itens.length).toBeGreaterThan(1);
      for (const item of itens) {
        expect(item.descricao.trim().length).toBeGreaterThan(0);
        expect(item.descricao.length).toBeLessThanOrEqual(200);
        if (item.pecasHora !== null) expect(item.pecasHora).toBeGreaterThan(0);
      }
    }
    const venturi = templates.find((t) => t.nome === 'Venturi com janela e rasgo (referência)')!;
    expect((venturi.itens as ItemDeOperacao[]).map((i) => i.descricao)).toEqual([
      'Cortar Disco',
      'Estampar Aba',
      'Extrusão',
      'Estampar Janela',
      'Estampar Rasgo',
      'Cortar e Frisar',
      'Usinar',
      'Cravação/Virola',
      'Lavar',
      'Seleção 100%',
      'Montagem/Teste Injetor/Embalar',
    ]);
  });

  it('não sobrescreve um template de mesmo nome criado pelo usuário antes da migração', async () => {
    executarMigracoes(db, MIGRACOES.filter((m) => m.versao < 51));
    db.prepare(
      "INSERT INTO av_templates (id, tipo, nome, itens, usuario_id, criado_em) VALUES ('meu', 'operacoes', 'capa esmaltada (referência)', '[]', NULL, '2026-11-01T00:00:00.000Z')",
    ).run();
    executarMigracoes(db, MIGRACOES);
    const capa = (await new RepositorioTemplatesAvSqlite(db).listar('operacoes')).find(
      (t) => t.nome.toLowerCase() === 'capa esmaltada (referência)',
    )!;
    expect(capa.id).toBe('meu');
    expect(capa.itens).toEqual([]);
  });
});
