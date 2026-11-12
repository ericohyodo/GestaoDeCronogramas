/** AV de vitrine do modo apresentação: casos de uso reais sobre SQLite em memória. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtualizarComercial } from '../../electron/modulos/avs/aplicacao/casos-de-uso/atualizar-comercial';
import { AvancarEtapa } from '../../electron/modulos/avs/aplicacao/casos-de-uso/avancar-etapa';
import { SalvarContatosAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/contatos-av';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { FinalizarECriarPreSd } from '../../electron/modulos/avs/aplicacao/casos-de-uso/finalizar-e-criar-pre-sd';
import { GerarAvVitrine } from '../../electron/modulos/avs/aplicacao/casos-de-uso/gerar-av-vitrine';
import { SalvarSecaoCusto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-custo';
import { SalvarSecaoProcesso } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-processo';
import { SalvarSecaoProduto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/salvar-secao-produto';
import { SalvarSecaoPcp } from '../../electron/modulos/avs/aplicacao/casos-de-uso/secao-pcp';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import type { ConsultaDeUsuarios } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioContatosAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-contatos-av-sqlite';
import { RepositorioHistoricoAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { RepositorioSecaoCustoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-custo-sqlite';
import { RepositorioSecaoPcpSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-pcp-sqlite';
import { RepositorioSecaoProcessoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-processo-sqlite';
import { RepositorioSecaoProdutoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-produto-sqlite';
import { CriarPreSd } from '../../electron/modulos/sds/aplicacao/casos-de-uso/criar-pre-sd';
import { RepositorioSdsSqlite } from '../../electron/modulos/sds/infraestrutura/repositorio-sds-sqlite';
import { semearProjetoDeVitrine } from '../../electron/modulos/tarefas/aplicacao/projeto-de-exemplo';
import { RepositorioFasesSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-fases-sqlite';
import { RepositorioTarefasSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-tarefas-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('GerarAvVitrine', () => {
  let db: BancoDeDados;
  let gerar: GerarAvVitrine;
  let perfil: 'administrador' | 'gestor';
  const avancarSd = vi.fn(async () => {});

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    perfil = 'administrador';
    avancarSd.mockClear();

    const relogio = new RelogioFixo();
    const usuarios = new RepositorioUsuariosSqlite(db);
    for (const [id, nome, login] of [['u1', 'Erico', 'erico'], ['u2', 'Allan', 'allan'], ['u3', 'Thiago', 'thiago']] as const) {
      await usuarios.salvar(Usuario.criar({ id, nome, login, senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }));
    }
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => ({ id: 'u1', nome: 'Erico', perfil }),
      listarAtivos: async () => [{ id: 'u1', nome: 'Erico' }, { id: 'u2', nome: 'Allan' }, { id: 'u3', nome: 'Thiago' }],
      obterPerfilGlobal: async () => perfil,
    };

    const repositorio = new RepositorioAvsSqlite(db);
    const historico = new RepositorioHistoricoAvSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    const ids = new GeradorDeIdSequencial('v');
    const preSd = new CriarPreSd(new RepositorioSdsSqlite(db), relogio, ids);
    gerar = new GerarAvVitrine(
      autorizacao,
      consulta,
      relogio,
      new CriarAv(repositorio, relogio, ids, consulta, autorizacao),
      new AtualizarComercial(repositorio, autorizacao, consulta),
      new SalvarContatosAv(repositorio, new RepositorioContatosAvSqlite(db), autorizacao, ids),
      new SalvarSecaoProduto(repositorio, new RepositorioSecaoProdutoSqlite(db), autorizacao, relogio, ids),
      new SalvarSecaoProcesso(repositorio, new RepositorioSecaoProcessoSqlite(db), autorizacao, relogio, ids),
      new SalvarSecaoPcp(repositorio, new RepositorioSecaoPcpSqlite(db), autorizacao, relogio, ids),
      new SalvarSecaoCusto(repositorio, new RepositorioSecaoCustoSqlite(db), autorizacao, relogio, ids),
      new AvancarEtapa(repositorio, historico, autorizacao, relogio, ids, consulta),
      new FinalizarECriarPreSd(repositorio, historico, autorizacao, { criar: (e) => preSd.executar(e) }, relogio, ids),
      avancarSd,
    );
  });

  afterEach(() => db.close());

  const contar = (tabela: string, avId: string) =>
    db.prepare(`SELECT COUNT(*) FROM ${tabela} WHERE av_id = ?`).pluck().get(avId) as number;

  it('preenche todas as áreas, monta a equipe pelos nomes e leva a AV até a SD', async () => {
    const { avId, membros } = await gerar.executar();

    // Quem existe entra pelo nome; quem falta (Alexandre, André Navarro) vira o apresentador.
    expect(membros).toEqual({ comercial: 'u1', produto: 'u1', processo: 'u2', pcp: 'u3', custo: 'u1' });

    const av = db.prepare('SELECT * FROM av WHERE id = ?').get(avId) as Record<string, unknown>;
    expect(av.etapa_atual).toBe(7);
    expect(av.programa).toContain('VX-300');
    expect(av.membro_processo).toBe('u2');
    expect(contar('av_contatos', avId)).toBe(3);
    expect(contar('av_estrutura_produto', avId)).toBeGreaterThanOrEqual(8);
    expect(contar('av_operacoes', avId)).toBe(5);
    expect(contar('av_pcp_cargas', avId)).toBe(4);
    expect(contar('av_pcp_custos', avId)).toBe(3);
    expect(contar('av_custo_materiais', avId)).toBe(6);
    expect(contar('av_custo_processo', avId)).toBe(4);
    expect(db.prepare('SELECT status FROM sd WHERE av_id = ?').pluck().get(avId)).toBe('pre_sd');

    // A SD é levada até "fechada" (com o PRO) pelo módulo de SDs, com os textos da vitrine.
    expect(avancarSd).toHaveBeenCalledWith(avId, 'fechada', 'u1', expect.objectContaining({ numeroPo: expect.any(String) }));
  });

  it('recusa quem não é administrador', async () => {
    perfil = 'gestor';
    await expect(gerar.executar()).rejects.toThrow(/administradores/);
  });
});

describe('semearProjetoDeVitrine', () => {
  it('cria as fases APQP e dá a cada tarefa o recurso da área dela', async () => {
    const db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const agora = '2026-11-12T10:00:00.000Z';
    db.prepare(
      `INSERT INTO cronogramas (id, nome, descricao, data_inicio, data_fim, situacao, criado_em, atualizado_em)
       VALUES ('c1', 'PRO 26-001', NULL, '2026-09-28', '2027-03-27', 'em_andamento', ?, ?)`,
    ).run(agora, agora);
    const inserirRecurso = db.prepare('INSERT INTO responsaveis (id, nome, criado_em, atualizado_em) VALUES (?, ?, ?, ?)');
    for (const id of ['r-com', 'r-prod', 'r-proc', 'r-pcp', 'r-custo', 'r-gest', 'r-qual']) inserirRecurso.run(id, id, agora, agora);

    await semearProjetoDeVitrine(
      new RepositorioTarefasSqlite(db),
      new RepositorioFasesSqlite(db),
      new GeradorDeIdSequencial('t'),
      new RelogioFixo(),
      {
        cronogramaId: 'c1',
        inicioIso: '2026-11-12',
        responsavelPorArea: {
          comercial: 'r-com', produto: 'r-prod', processo: 'r-proc', pcp: 'r-pcp', custo: 'r-custo', gestao: 'r-gest', qualidade: 'r-qual',
        },
      },
    );

    expect(db.prepare("SELECT COUNT(*) FROM fases WHERE cronograma_id = 'c1'").pluck().get()).toBe(7);
    const responsavelDe = (titulo: string) =>
      db.prepare('SELECT responsavel_id FROM tarefas WHERE titulo = ?').pluck().get(titulo);
    expect(responsavelDe('DFMEA e características especiais (SC)')).toBe('r-prod');
    expect(responsavelDe('Projeto do ferramental progressivo')).toBe('r-proc');
    expect(responsavelDe('Carga de máquina e plano do 2º turno na solda')).toBe('r-pcp');
    expect(responsavelDe('Aprovação PPAP pelo cliente (PSW)')).toBe('r-com');
    expect(db.prepare("SELECT COUNT(*) FROM tarefas WHERE responsavel_id IS NULL").pluck().get()).toBe(0);
    // Todas as datas cabem no período do aceite (hoje −45 a hoje +135).
    const limites = db.prepare('SELECT MIN(data_inicio) AS ini, MAX(data_fim) AS fim FROM tarefas').get() as { ini: string; fim: string };
    expect(limites.ini >= '2026-09-28').toBe(true);
    expect(limites.fim <= '2027-03-27').toBe(true);
    db.close();
  });
});
