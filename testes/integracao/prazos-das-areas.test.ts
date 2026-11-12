/** Prazos das áreas da AV: gravados a cada mudança de etapa (SQLite em memória, casos de uso reais). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import { AvancarEtapa } from '../../electron/modulos/avs/aplicacao/casos-de-uso/avancar-etapa';
import {
  ObterPrazosConfig,
  SalvarPrazosConfig,
} from '../../electron/modulos/avs/aplicacao/casos-de-uso/configurar-prazos-das-areas';
import { ObterDashboard } from '../../electron/modulos/avs/aplicacao/casos-de-uso/obter-dashboard';
import { ObterEntregasNoPrazo } from '../../electron/modulos/avs/aplicacao/casos-de-uso/obter-entregas-no-prazo';
import { ObterRelatorioAvs } from '../../electron/modulos/avs/aplicacao/casos-de-uso/obter-relatorio-avs';
import { RepositorioSecaoCustoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-custo-sqlite';
import { RepositorioSecaoProcessoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-processo-sqlite';
import { RepositorioSecaoProdutoSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-secao-produto-sqlite';
import { GarantirPrazosDasAreas } from '../../electron/modulos/avs/aplicacao/casos-de-uso/garantir-prazos-das-areas';
import { VerificarPrazosDasAreas } from '../../electron/modulos/avs/aplicacao/casos-de-uso/verificar-prazos-das-areas';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { DeclinarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/declinar-av';
import { FinalizarECriarPreSd } from '../../electron/modulos/avs/aplicacao/casos-de-uso/finalizar-e-criar-pre-sd';
import { HistoricoComPrazos } from '../../electron/modulos/avs/aplicacao/prazos/historico-com-prazos';
import type { ConsultaDeUsuarios } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioHistoricoAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import {
  RepositorioConfigPrazosSqlite,
  RepositorioPrazosAreaSqlite,
} from '../../electron/modulos/avs/infraestrutura/repositorio-prazos-area-sqlite';
import { NotificadorInterno } from '../../electron/modulos/notificacoes/aplicacao/casos-de-uso';
import { RepositorioNotificacoesSqlite } from '../../electron/modulos/notificacoes/infraestrutura/repositorio-notificacoes-sqlite';
import { CriarPreSd } from '../../electron/modulos/sds/aplicacao/casos-de-uso/criar-pre-sd';
import { RepositorioSdsSqlite } from '../../electron/modulos/sds/infraestrutura/repositorio-sds-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';
import { MIGRACOES } from '../dubles/migracoes-de-teste';

interface LinhaPrazo {
  etapa: number;
  area: string;
  dias_uteis: number;
  data_limite: string;
  entregue_em: string | null;
}

describe('prazos das áreas da AV', () => {
  let db: BancoDeDados;
  let relogio: RelogioFixo;
  let ids: GeradorDeIdSequencial;
  let consulta: ConsultaDeUsuarios;
  let avs: RepositorioAvsSqlite;
  let historico: HistoricoComPrazos;
  let prazos: RepositorioPrazosAreaSqlite;
  let config: RepositorioConfigPrazosSqlite;
  let autorizacao: AutorizacaoAv;
  let avancar: AvancarEtapa;
  let avId: string;
  let perfil: 'administrador' | 'gestor';
  let notificador: NotificadorInterno;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    relogio = new RelogioFixo(new Date('2026-09-25T12:00:00.000Z')); // sexta
    ids = new GeradorDeIdSequencial('p');
    const usuarios = new RepositorioUsuariosSqlite(db);
    for (const [id, nome] of [['adm', 'Admin'], ['pro', 'Produto']] as const) {
      await usuarios.salvar(
        Usuario.criar({ id, nome, login: id, senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
      );
    }
    perfil = 'administrador';
    consulta = {
      usuarioAtual: () => ({ id: 'adm', nome: 'Admin', perfil }),
      listarAtivos: async () => [{ id: 'adm', nome: 'Admin' }, { id: 'pro', nome: 'Produto' }],
      obterPerfilGlobal: async () => perfil,
    };
    notificador = new NotificadorInterno(new RepositorioNotificacoesSqlite(db), relogio, ids);
    avs = new RepositorioAvsSqlite(db);
    prazos = new RepositorioPrazosAreaSqlite(db);
    config = new RepositorioConfigPrazosSqlite(db);
    historico = new HistoricoComPrazos(new RepositorioHistoricoAvSqlite(db), prazos, config, ids);
    autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    avancar = new AvancarEtapa(avs, historico, autorizacao, relogio, ids, consulta);
    avId = (
      await new CriarAv(avs, relogio, ids, consulta, autorizacao).executar({
        descricao: 'Suporte',
        cliente: 'Aurora',
        membros: { comercial: 'adm', produto: 'pro', processo: 'adm', pcp: 'adm', custo: 'adm' },
      })
    ).id;
  });

  afterEach(() => db.close());

  const linhas = () =>
    db
      .prepare('SELECT etapa, area, dias_uteis, data_limite, entregue_em FROM av_prazos_area WHERE av_id = ? ORDER BY etapa')
      .all(avId) as LinhaPrazo[];

  it('abre o prazo ao chegar em Produto e entrega ao sair', async () => {
    await avancar.executar({ avId });
    expect(linhas()).toEqual([{ etapa: 2, area: 'produto', dias_uteis: 3, data_limite: '2026-09-30', entregue_em: null }]);

    relogio.instante = new Date('2026-09-29T15:00:00.000Z');
    await avancar.executar({ avId });
    const [produto, processo] = linhas();
    expect(produto!.entregue_em).toBe('2026-09-29T15:00:00.000Z');
    expect(processo).toEqual({ etapa: 3, area: 'processo', dias_uteis: 3, data_limite: '2026-10-02', entregue_em: null });
  });

  it('mudar a configuração não altera prazo aberto, só os próximos', async () => {
    await avancar.executar({ avId });
    await config.salvar({ produto: 5, processo: 1, pcp: 3, custo: 3 }, 'adm', relogio.agora());
    expect(linhas()[0]!.data_limite).toBe('2026-09-30');
    await avancar.executar({ avId });
    expect(linhas()[1]).toMatchObject({ area: 'processo', dias_uteis: 1, data_limite: '2026-09-28' });
  });

  it('finalizar a AV na etapa de Custo encerra o prazo de Custo', async () => {
    for (let i = 0; i < 4; i += 1) await avancar.executar({ avId }); // 1 → 5
    expect(linhas().at(-1)).toMatchObject({ etapa: 5, entregue_em: null });
    const preSd = new CriarPreSd(new RepositorioSdsSqlite(db), relogio, ids);
    await new FinalizarECriarPreSd(avs, historico, autorizacao, { criar: (e) => preSd.executar(e) }, relogio, ids).executar(avId);
    expect(linhas().every((linha) => linha.entregue_em !== null)).toBe(true);
  });

  it('declinar a AV encerra o prazo aberto', async () => {
    await avancar.executar({ avId });
    await avancar.executar({ avId }); // na 3
    await new DeclinarAv(avs, historico, autorizacao, relogio, ids, consulta).executar({
      avId,
      etapa: 'declinada_cliente',
      motivo: 'Cliente desistiu',
    });
    expect(linhas().find((linha) => linha.etapa === 3)!.entregue_em).not.toBeNull();
  });

  it('abrir o mesmo prazo duas vezes não duplica', async () => {
    await avancar.executar({ avId });
    const aberto = (await prazos.obterAberto(avId, 2))!;
    await prazos.abrir({ ...aberto, id: 'outro' });
    expect(linhas()).toHaveLength(1);
  });

  /** Notificações gravadas para um usuário (tipo, título e mensagem). */
  const notificacoesDe = (usuarioId: string) =>
    db.prepare('SELECT tipo, titulo, mensagem FROM notificacoes WHERE usuario_id = ? ORDER BY criada_em').all(usuarioId) as {
      tipo: string;
      titulo: string;
      mensagem: string;
    }[];

  it('o aviso de etapa liberada informa o prazo da área', async () => {
    const comAviso = new AvancarEtapa(avs, historico, autorizacao, relogio, ids, consulta, undefined, notificador, prazos);
    await comAviso.executar({ avId });
    const aviso = notificacoesDe('pro').find((n) => n.tipo === 'av.etapa_liberada');
    expect(aviso?.mensagem).toContain('Prazo: 30/09 (3 dias úteis)');
  });

  describe('rotinas', () => {
    let garantir: GarantirPrazosDasAreas;
    let verificar: VerificarPrazosDasAreas;
    const historicoReal = () => new RepositorioHistoricoAvSqlite(db);

    beforeEach(() => {
      garantir = new GarantirPrazosDasAreas(avs, historicoReal(), prazos, config, ids);
      verificar = new VerificarPrazosDasAreas(avs, prazos, notificador, relogio);
    });

    /** Cria uma AV direto na etapa informada, com a linha de histórico da chegada (sem o decorador). */
    const avNaEtapa = async (etapa: number, chegada: string, extra: { historico?: boolean } = {}) => {
      const id = (
        await new CriarAv(avs, relogio, ids, consulta, autorizacao).executar({
          descricao: `AV na ${etapa}`,
          membros: { comercial: 'adm', produto: 'pro', processo: 'adm', pcp: 'adm', custo: 'adm' },
        })
      ).id;
      const av = (await avs.obterPorId(id))!;
      av.moverParaEtapa(etapa);
      await avs.salvar(av);
      await historicoReal().registrar({
        id: ids.gerar(),
        avId: id,
        etapaDe: etapa - 1,
        etapaPara: etapa,
        usuarioId: 'adm',
        comentario: null,
        data: new Date(chegada),
      });
      if (extra.historico) db.prepare('UPDATE av SET historico = 1 WHERE id = ?').run(id);
      return id;
    };

    it('preenche retroativamente só AVs ativas fora do histórico, uma vez', async () => {
      const ativa = await avNaEtapa(3, '2026-09-25T12:00:00.000Z');
      await avNaEtapa(8, '2026-09-25T12:00:00.000Z');
      // Por último: a AV marcada como histórico libera o número, e a próxima criada colidiria com ele.
      await avNaEtapa(3, '2026-09-25T12:00:00.000Z', { historico: true });
      expect(await garantir.executar()).toBe(1);
      expect(await prazos.obterAberto(ativa, 3)).toMatchObject({ area: 'processo', dataLimite: '2026-09-30' });
      expect(await garantir.executar()).toBe(0);
    });

    it('avisa "vencendo" e "atrasada" uma única vez cada', async () => {
      await avancar.executar({ avId }); // produto, limite 30/09, membro 'pro'
      relogio.instante = new Date('2026-09-29T12:00:00.000Z');
      await verificar.executar();
      await verificar.executar();
      relogio.instante = new Date('2026-10-01T12:00:00.000Z');
      await verificar.executar();
      await verificar.executar();
      const tipos = notificacoesDe('pro').map((n) => n.tipo).filter((tipo) => tipo.startsWith('av.area_'));
      expect(tipos).toEqual(['av.area_vencendo', 'av.area_atrasada']);
      expect(notificacoesDe('pro').at(-1)!.titulo).toContain('Eng. Produto em atraso desde 01/10');
    });

    it('área sem membro não avisa e não quebra', async () => {
      await avancar.executar({ avId });
      db.prepare('UPDATE av SET membro_produto = NULL WHERE id = ?').run(avId);
      relogio.instante = new Date('2026-10-05T12:00:00.000Z');
      await expect(verificar.executar()).resolves.toBe(0);
      expect(notificacoesDe('pro').filter((n) => n.tipo.startsWith('av.area_'))).toEqual([]);
    });

    it('prazo entregue não gera aviso', async () => {
      await avancar.executar({ avId });
      await avancar.executar({ avId }); // produto entregue; processo (adm) aberto até 30/09
      relogio.instante = new Date('2026-10-05T12:00:00.000Z');
      await verificar.executar();
      expect(notificacoesDe('pro').filter((n) => n.tipo.startsWith('av.area_'))).toEqual([]);
      expect(notificacoesDe('adm').map((n) => n.tipo)).toContain('av.area_atrasada');
    });
  });

  describe('configuração', () => {
    it('só administrador salva; valores fora de 1..30 são recusados', async () => {
      const salvar = new SalvarPrazosConfig(config, consulta, relogio);
      const valores = { produto: 4, processo: 3, pcp: 2, custo: 5 };
      perfil = 'gestor';
      await expect(salvar.executar(valores)).rejects.toThrow(/administradores/);
      perfil = 'administrador';
      await expect(salvar.executar({ ...valores, produto: 0 })).rejects.toThrow(/1 a 30/);
      await expect(salvar.executar({ ...valores, custo: 31 })).rejects.toThrow(/1 a 30/);
      await expect(salvar.executar({ ...valores, pcp: 2.5 })).rejects.toThrow(/1 a 30/);
      expect(await salvar.executar(valores)).toEqual(valores);
      expect(await new ObterPrazosConfig(config).executar()).toEqual(valores);
    });
  });

  describe('painel e relatório', () => {
    /** Cria uma AV (etapa 1) com um prazo de Produto já gravado. */
    const avComPrazo = async (descricao: string, dataLimite: string, entregueEm: string | null = null, iniciadaEm = '2026-09-25T12:00:00.000Z') => {
      const id = (await new CriarAv(avs, relogio, ids, consulta, autorizacao).executar({ descricao, membros: { produto: 'pro' } })).id;
      await prazos.abrir({
        id: ids.gerar(),
        avId: id,
        etapa: 2,
        area: 'produto',
        diasUteis: 3,
        iniciadaEm: new Date(iniciadaEm),
        dataLimite,
        entregueEm: entregueEm ? new Date(entregueEm) : null,
      });
      return id;
    };

    it('painel separa AVs no prazo, vencendo e atrasadas e ignora o histórico', async () => {
      relogio.instante = new Date('2026-10-05T12:00:00.000Z'); // segunda
      const noPrazo = await avComPrazo('No prazo', '2026-10-20');
      const vencendo = await avComPrazo('Vencendo', '2026-10-05');
      const atrasada = await avComPrazo('Atrasada', '2026-09-30');
      const doHistorico = await avComPrazo('Histórico', '2026-09-30');
      db.prepare('UPDATE av SET historico = 1 WHERE id = ?').run(doHistorico);

      const painel = await new ObterDashboard(avs, prazos, relogio).executar();
      expect(painel.prazosDasAreas).toEqual({ noPrazo: [noPrazo], vencendo: [vencendo], atrasadas: [atrasada] });
    });

    it('relatório traz o prazo e a situação da área e os dias úteis de atraso', async () => {
      relogio.instante = new Date('2026-10-05T12:00:00.000Z');
      const atrasada = await avComPrazo('Atrasada', '2026-09-30');
      const relatorio = new ObterRelatorioAvs(
        avs,
        new RepositorioHistoricoAvSqlite(db),
        new RepositorioSecaoProdutoSqlite(db),
        new RepositorioSecaoProcessoSqlite(db),
        new RepositorioSecaoCustoSqlite(db),
        consulta,
        relogio,
        prazos,
      );
      const linha = (await relatorio.executar()).find((item) => item.id === atrasada)!;
      expect(linha).toMatchObject({
        areaComPrazo: 'Eng. Produto',
        prazoArea: '2026-09-30',
        situacaoPrazoArea: 'atrasada',
        diasUteisDeAtraso: 3,
      });
      expect((await relatorio.executar()).find((item) => item.id === avId)).toMatchObject({
        areaComPrazo: null,
        prazoArea: null,
        situacaoPrazoArea: null,
        diasUteisDeAtraso: 0,
      });
    });

    it('entregas no prazo por área nos últimos 90 dias', async () => {
      relogio.instante = new Date('2026-10-05T12:00:00.000Z');
      await avComPrazo('No prazo', '2026-09-30', '2026-09-29T15:00:00.000Z');
      await avComPrazo('Com atraso', '2026-09-30', '2026-10-02T15:00:00.000Z');
      await avComPrazo('Antiga', '2026-05-30', '2026-05-29T15:00:00.000Z', '2026-05-25T12:00:00.000Z');
      const entregas = await new ObterEntregasNoPrazo(prazos, avs, relogio).executar();
      expect(entregas.map((item) => item.area)).toEqual(['Eng. Produto', 'Eng. Processo', 'PCP', 'Mapa de Custo']);
      expect(entregas[0]).toEqual({ area: 'Eng. Produto', entregues: 2, noPrazo: 1, percentualNoPrazo: 50, mediaDiasUteis: 3.5 });
      expect(entregas[1]).toEqual({ area: 'Eng. Processo', entregues: 0, noPrazo: 0, percentualNoPrazo: 0, mediaDiasUteis: 0 });
    });
  });
});
