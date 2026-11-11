import { describe, expect, it } from 'vitest';
import { gerarNumeroAv } from '../../electron/modulos/avs/dominio/av';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { trocarPrefixoDoNumero } from '../../electron/modulos/sds/dominio/sd';
import { abrirConexao } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';

describe('numeração unificada AV → SD → PRO', () => {
  it('gera AV AA-SSS e o mesmo sufixo para SD e PRO', () => {
    expect(gerarNumeroAv(1, 2026)).toBe('AV 26-001');
    expect(gerarNumeroAv(42, 2027)).toBe('AV 27-042');
    expect(gerarNumeroAv(1000, 2026)).toBe('AV 26-1000');
    expect(gerarNumeroAv(5, 2100)).toBe('AV 00-005');
    expect(trocarPrefixoDoNumero('AV 26-001', 'SD')).toBe('SD 26-001');
    expect(trocarPrefixoDoNumero('AV 26-001', 'PRO')).toBe('PRO 26-001');
  });

  it('renumera AVs e SDs existentes e registra o número antigo no histórico', () => {
    const db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES.filter((m) => m.versao <= 30));
    db.prepare(
      `INSERT INTO av (id, numero, sequencial, ano, descricao, etapa_atual, criado_em)
       VALUES ('a1', 'AV 0007-26', 7, 2026, 'Item', 6, '2026-01-01T00:00:00Z')`,
    ).run();
    db.prepare(
      `INSERT INTO sd (id, av_id, numero, status, criado_em) VALUES ('s1', 'a1', 'SD 0007-26', 'pre_sd', '2026-01-02T00:00:00Z')`,
    ).run();

    executarMigracoes(db, MIGRACOES.filter((m) => m.versao <= 41));

    expect(db.prepare("SELECT numero FROM av WHERE id = 'a1'").pluck().get()).toBe('AV 26-007');
    expect(db.prepare("SELECT numero FROM sd WHERE id = 's1'").pluck().get()).toBe('SD 26-007');
    const comentario = db.prepare("SELECT comentario FROM etapa_historico WHERE av_id = 'a1'").pluck().get() as string;
    expect(comentario).toContain('AV 0007-26');
    expect(comentario).toContain('AV 26-007');
    db.close();
  });

  it('o histórico mantém o marcador H- ao virar SD e PRO', () => {
    expect(trocarPrefixoDoNumero('H-AV 26-028', 'SD')).toBe('H-SD 26-028');
    expect(trocarPrefixoDoNumero('H-AV 26-028', 'PRO')).toBe('H-PRO 26-028');
  });

  it('ponto de corte: o que existia antes do uso multiusuário vira histórico e a numeração recomeça', async () => {
    const db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES.filter((m) => m.versao <= 41));
    const inserirAv = db.prepare(
      `INSERT INTO av (id, numero, sequencial, ano, descricao, etapa_atual, criado_em) VALUES (?, ?, ?, 2026, 'Item', 2, ?)`,
    );
    inserirAv.run('antiga', 'AV 26-028', 28, '2026-09-29T13:36:00.000Z');
    inserirAv.run('nova', 'AV 26-029', 29, '2026-11-11T18:00:00.000Z');
    db.prepare(`INSERT INTO sd (id, av_id, numero, status, criado_em) VALUES ('s1', 'antiga', 'SD 26-028', 'pre_sd', '2026-11-12T00:00:00.000Z')`).run();
    db.prepare(
      `INSERT INTO cronogramas (id, nome, descricao, data_inicio, data_fim, situacao, criado_em, atualizado_em)
       VALUES ('c1', 'BOSCH', NULL, '2026-08-01', '2026-10-28', 'em_andamento', '2026-09-22T17:19:44.924Z', '2026-09-22T17:19:44.924Z')`,
    ).run();

    executarMigracoes(db, MIGRACOES);

    const av = (id: string) => db.prepare('SELECT numero, historico FROM av WHERE id = ?').get(id);
    expect(av('antiga')).toEqual({ numero: 'H-AV 26-028', historico: 1 });
    expect(av('nova')).toEqual({ numero: 'AV 26-029', historico: 0 });
    // A SD da AV histórica também vira histórico, mesmo criada depois do corte.
    expect(db.prepare("SELECT numero, historico FROM sd WHERE id = 's1'").get()).toEqual({ numero: 'H-SD 26-028', historico: 1 });
    expect(db.prepare("SELECT historico FROM cronogramas WHERE id = 'c1'").pluck().get()).toBe(1);

    // Só as AVs fora do histórico contam para o próximo número; o histórico pode repetir o sequencial.
    const repositorio = new RepositorioAvsSqlite(db);
    expect(await repositorio.proximoSequencial(2026)).toBe(30);
    db.prepare("DELETE FROM av WHERE id = 'nova'").run();
    expect(await repositorio.proximoSequencial(2026)).toBe(1);
    expect((await repositorio.obterPorId('antiga'))?.historico).toBe(true);
    db.close();
  });
});
