import { describe, expect, it } from 'vitest';
import { gerarNumeroAv } from '../../electron/modulos/avs/dominio/av';
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

    executarMigracoes(db, MIGRACOES);

    expect(db.prepare("SELECT numero FROM av WHERE id = 'a1'").pluck().get()).toBe('AV 26-007');
    expect(db.prepare("SELECT numero FROM sd WHERE id = 's1'").pluck().get()).toBe('SD 26-007');
    const comentario = db.prepare("SELECT comentario FROM etapa_historico WHERE av_id = 'a1'").pluck().get() as string;
    expect(comentario).toContain('AV 0007-26');
    expect(comentario).toContain('AV 26-007');
    db.close();
  });
});
