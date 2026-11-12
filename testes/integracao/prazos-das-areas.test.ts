/** Prazos das áreas da AV: gravados a cada mudança de etapa (SQLite em memória, casos de uso reais). */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import { AvancarEtapa } from '../../electron/modulos/avs/aplicacao/casos-de-uso/avancar-etapa';
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

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    relogio = new RelogioFixo(new Date('2026-09-25T12:00:00.000Z')); // sexta
    ids = new GeradorDeIdSequencial('p');
    const usuarios = new RepositorioUsuariosSqlite(db);
    await usuarios.salvar(
      Usuario.criar({ id: 'adm', nome: 'Admin', login: 'adm', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    consulta = {
      usuarioAtual: () => ({ id: 'adm', nome: 'Admin', perfil: 'administrador' }),
      listarAtivos: async () => [{ id: 'adm', nome: 'Admin' }],
      obterPerfilGlobal: async () => 'administrador',
    };
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
        membros: { comercial: 'adm', produto: 'adm', processo: 'adm', pcp: 'adm', custo: 'adm' },
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
});
