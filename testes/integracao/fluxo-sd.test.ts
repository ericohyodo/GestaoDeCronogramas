/** Fluxo da SD: Comercial preenche e abre; Engenharia aceita (cria PRO, conclui a AV) ou devolve. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConcluirAvComProjeto } from '../../electron/modulos/avs/aplicacao/casos-de-uso/concluir-com-projeto';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { FinalizarECriarPreSd } from '../../electron/modulos/avs/aplicacao/casos-de-uso/finalizar-e-criar-pre-sd';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import type { ConsultaDeUsuarios, UsuarioAtualAv } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioHistoricoAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { CriarProjetoDaSd } from '../../electron/modulos/cronogramas/aplicacao/casos-de-uso/criar-cronograma';
import { ExcluirCronograma } from '../../electron/modulos/cronogramas/aplicacao/casos-de-uso/excluir-cronograma';
import { RepositorioCronogramasSqlite } from '../../electron/modulos/cronogramas/infraestrutura/repositorio-cronogramas-sqlite';
import { ObterSd } from '../../electron/modulos/sds/aplicacao/casos-de-uso/consultar-sds';
import { AvancarSdDeExemplo } from '../../electron/modulos/sds/aplicacao/casos-de-uso/exemplo-sd';
import { CriarPreSd } from '../../electron/modulos/sds/aplicacao/casos-de-uso/criar-pre-sd';
import {
  AbrirSd,
  AceitarSd,
  DevolverSd,
  SalvarSd,
  type DependenciasFluxoSd,
} from '../../electron/modulos/sds/aplicacao/casos-de-uso/fluxo-sd';
import {
  RepositorioAnexosSdSqlite,
  RepositorioSdsSqlite,
} from '../../electron/modulos/sds/infraestrutura/repositorio-sds-sqlite';
import { NotificadorInterno } from '../../electron/modulos/notificacoes/aplicacao/casos-de-uso';
import { RepositorioNotificacoesSqlite } from '../../electron/modulos/notificacoes/infraestrutura/repositorio-notificacoes-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { ControleDeVersaoSqlite } from '../../electron/nucleo/infraestrutura/banco/controle-de-versao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { ErroDeValidacao } from '../../electron/nucleo/dominio/erro-de-dominio';
import { UnidadeDeTrabalhoSqlite } from '../../electron/nucleo/infraestrutura/banco/unidade-de-trabalho-sqlite';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('fluxo da SD', () => {
  let db: BancoDeDados;
  let logado: UsuarioAtualAv;
  let sdId: string;
  let avId: string;
  let deps: DependenciasFluxoSd;
  let aceitar: AceitarSd;
  const admin: UsuarioAtualAv = { id: 'adm', nome: 'Admin', perfil: 'administrador' };
  const comercial: UsuarioAtualAv = { id: 'com', nome: 'Comercial', perfil: 'usuario' };
  const engenharia: UsuarioAtualAv = { id: 'eng', nome: 'Leandro', perfil: 'usuario' };
  const outro: UsuarioAtualAv = { id: 'out', nome: 'Outro', perfil: 'usuario' };

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    const ids = new GeradorDeIdSequencial('s');
    const todos = [admin, comercial, engenharia, outro];
    for (const u of todos) {
      await new RepositorioUsuariosSqlite(db).salvar(
        Usuario.criar({ id: u.id, nome: u.nome, login: u.id, senhaHash: 'h', perfil: u.perfil, agora: relogio.agora() }),
      );
    }
    logado = admin;
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => logado,
      listarAtivos: async () => todos.map(({ id, nome }) => ({ id, nome })),
      obterPerfilGlobal: async (id) => todos.find((u) => u.id === id)?.perfil ?? null,
    };
    const perfis = new RepositorioPerfisAvSqlite(db);
    await perfis.salvarPerfil({
      usuarioId: 'eng',
      papelAv: 'padrao',
      competencias: [],
      papeisEspeciais: ['gerente_engenharia'],
    });
    const autorizacao = new AutorizacaoAv(consulta, perfis);
    const avs = new RepositorioAvsSqlite(db);
    const historico = new RepositorioHistoricoAvSqlite(db);
    const repoSds = new RepositorioSdsSqlite(db);

    const criada = await new CriarAv(avs, relogio, ids, consulta, autorizacao).executar({
      descricao: 'Suporte do motor',
      cliente: 'Aurora',
      membros: { comercial: 'com' },
    });
    avId = criada.id;
    const av = (await avs.obterPorId(avId))!;
    av.moverParaEtapa(6);
    await avs.salvar(av);
    const criarPreSd = new CriarPreSd(repoSds, relogio, ids);
    const finalizar = new FinalizarECriarPreSd(
      avs,
      historico,
      autorizacao,
      { criar: (e) => criarPreSd.executar(e) },
      relogio,
      ids,
    );
    sdId = (await finalizar.executar(avId)).id;

    deps = {
      repositorio: repoSds,
      anexos: new RepositorioAnexosSdSqlite(db),
      acesso: {
        usuarioAtual: () => ({ id: logado.id, nome: logado.nome, administrador: logado.perfil === 'administrador' }),
        podeDarAceite: async (id) => ((await perfis.obterPerfil(id))?.papeisEspeciais.length ?? 0) > 0,
        listarNomes: consulta.listarAtivos,
        listarAprovadores: async () => ['eng'],
      },
      notificador: new NotificadorInterno(new RepositorioNotificacoesSqlite(db), relogio, ids),
      versoes: new ControleDeVersaoSqlite(db),
      relogio,
      geradorDeId: ids,
    };
    const concluir = new ConcluirAvComProjeto(avs, historico, relogio, ids);
    const criarProjeto = new CriarProjetoDaSd(new RepositorioCronogramasSqlite(db), relogio, ids);
    aceitar = new AceitarSd(
      deps,
      { criar: (e) => criarProjeto.executar(e) },
      { concluirComProjeto: (e) => concluir.executar(e) },
    );
  });

  afterEach(() => db.close());

  /** Tipos das notificações recebidas por um usuário. */
  const tiposDe = (usuarioId: string) =>
    db.prepare('SELECT tipo FROM notificacoes WHERE usuario_id = ? ORDER BY criada_em').pluck().all(usuarioId);

  const anexarPo = () =>
    deps.anexos.inserir({
      id: 'anx1',
      sdId,
      nomeArquivo: 'PO cliente.msg',
      nomeArmazenado: 'x.msg',
      tipoMime: null,
      tamanhoBytes: 10,
      usuarioId: 'com',
      criadoEm: new Date(),
    });

  it('só o Comercial da AV preenche; abrir exige data e evidência; aceite cria o PRO e conclui a AV', async () => {
    const salvar = new SalvarSd(deps);
    const abrir = new AbrirSd(deps);

    logado = outro;
    await expect(salvar.executar({ id: sdId, dataEnvioCotacao: '2026-11-01' })).rejects.toThrow(
      /responsável pelo Comercial/,
    );

    logado = comercial;
    await expect(abrir.executar(sdId)).rejects.toThrow(/data de envio da cotação/);
    const salva = await salvar.executar({
      id: sdId,
      versaoEsperada: 1,
      dataEnvioCotacao: '2026-11-01',
      numeroPo: 'PO-778',
      leadTimeDias: 180,
    });
    await expect(salvar.executar({ id: sdId, versaoEsperada: 1, numeroPo: 'X' })).rejects.toThrow(/Outro usuário/);
    expect(salva.numeroPo).toBe('PO-778');
    await expect(abrir.executar(sdId)).rejects.toThrow(/evidência/);
    await anexarPo();
    expect((await abrir.executar(sdId)).status).toBe('aberta');
    expect(tiposDe('eng')).toEqual(['sd.aberta']);

    // Comercial não dá aceite; Engenharia sim.
    const periodo = { id: sdId, dataInicio: '2026-11-15', dataFim: '2027-05-14' }; // início + 180 dias
    await expect(aceitar.executar(periodo)).rejects.toThrow(/Gerente de Engenharia/);
    logado = engenharia;
    const aceita = await new UnidadeDeTrabalhoSqlite(db).executar(() => aceitar.executar(periodo));
    expect(aceita.status).toBe('fechada');
    expect(aceita.aceitePorNome).toBe('Leandro');
    expect(aceita.numeroProjeto).toMatch(/^PRO \d{2}-001$/);
    expect(tiposDe('com')).toContain('sd.aceita');

    const projeto = db
      .prepare('SELECT codigo, nome, sd_id FROM cronogramas WHERE id = ?')
      .get(aceita.cronogramaId) as { codigo: string; nome: string; sd_id: string };
    expect(projeto).toMatchObject({ codigo: aceita.numeroProjeto, nome: 'Suporte do motor', sd_id: sdId });
    expect(db.prepare('SELECT etapa_atual, cronograma_id FROM av WHERE id = ?').get(avId)).toEqual({
      etapa_atual: 8,
      cronograma_id: aceita.cronogramaId,
    });
    await expect(
      new ExcluirCronograma(new RepositorioCronogramasSqlite(db)).executar(aceita.cronogramaId!),
    ).rejects.toThrow(/Arquivado/);
  });

  it('lead time é obrigatório para abrir e validado ao salvar', async () => {
    logado = comercial;
    const salvar = new SalvarSd(deps);
    await salvar.executar({ id: sdId, dataEnvioCotacao: '2026-11-01' });
    await anexarPo();
    await expect(new AbrirSd(deps).executar(sdId)).rejects.toThrow(/prazo acordado com o cliente/);

    for (const invalido of [0, -5, 2.5, 1826]) {
      await expect(salvar.executar({ id: sdId, dataEnvioCotacao: '2026-11-01', leadTimeDias: invalido })).rejects.toThrow(
        ErroDeValidacao,
      );
    }
    await expect(
      salvar.executar({ id: sdId, dataEnvioCotacao: '2026-11-01', leadTimeDias: 180, leadTimeObservacao: 'x'.repeat(501) }),
    ).rejects.toThrow(ErroDeValidacao);

    const salva = await salvar.executar({
      id: sdId,
      dataEnvioCotacao: '2026-11-01',
      leadTimeDias: 180,
      leadTimeObservacao: 'SOP em mar/27',
    });
    expect(salva).toMatchObject({ leadTimeDias: 180, leadTimeObservacao: 'SOP em mar/27', prazoJustificativa: null });
    expect((await new AbrirSd(deps).executar(sdId)).leadTimeDias).toBe(180);
  });

  it('SD de exemplo (modo Apresentação) chega a fechada com lead time e sem justificativa', async () => {
    const aceitarSemPapel = new AceitarSd(
      deps,
      { criar: (e) => new CriarProjetoDaSd(new RepositorioCronogramasSqlite(db), deps.relogio, deps.geradorDeId).executar(e) },
      { concluirComProjeto: (e) => new ConcluirAvComProjeto(new RepositorioAvsSqlite(db), new RepositorioHistoricoAvSqlite(db), deps.relogio, deps.geradorDeId).executar(e) },
      true,
    );
    await new AvancarSdDeExemplo(deps.repositorio, deps.versoes, deps.relogio, aceitarSemPapel).executar(avId, 'fechada', 'adm', {
      numeroPo: 'PO-1',
      observacoes: 'obs',
      parecer: 'ok',
      leadTimeObservacao: 'SOP em mar/27',
    });
    const sd = db.prepare('SELECT status, lead_time_dias, lead_time_observacao FROM sd WHERE id = ?').get(sdId);
    expect(sd).toEqual({ status: 'fechada', lead_time_dias: 180, lead_time_observacao: 'SOP em mar/27' });
  });

  it('aceite: término calculado dispensa justificativa; diferente exige; sem lead time aceita', async () => {
    db.prepare("UPDATE av SET codigo = 'VX3-1', programa = 'VX-300', volume_anual = 48000 WHERE id = ?").run(avId);
    logado = comercial;
    await new SalvarSd(deps).executar({ id: sdId, dataEnvioCotacao: '2026-11-01', leadTimeDias: 180 });
    await anexarPo();
    const aberta = await new AbrirSd(deps).executar(sdId);
    expect(aberta.especificacoes).toMatchObject({ codigo: 'VX3-1', programa: 'VX-300', volumeAnual: 48000 });

    logado = engenharia;
    const transacao = new UnidadeDeTrabalhoSqlite(db);
    await expect(
      transacao.executar(() => aceitar.executar({ id: sdId, dataInicio: '2026-11-12', dataFim: '2027-06-01' })),
    ).rejects.toThrow(/Justifique a alteração/);
    await expect(
      transacao.executar(() =>
        aceitar.executar({ id: sdId, dataInicio: '2026-11-12', dataFim: '2027-06-01', justificativaPrazo: 'curta' }),
      ),
    ).rejects.toThrow(/Justifique a alteração/);
    expect(db.prepare('SELECT COUNT(*) FROM cronogramas').pluck().get()).toBe(0);

    const aceita = await transacao.executar(() =>
      aceitar.executar({
        id: sdId,
        dataInicio: '2026-11-12',
        dataFim: '2027-06-01',
        justificativaPrazo: 'Ferramental importado: +3 semanas',
      }),
    );
    expect(aceita.prazoJustificativa).toBe('Ferramental importado: +3 semanas');
    expect(db.prepare('SELECT data_fim FROM cronogramas WHERE id = ?').pluck().get(aceita.cronogramaId)).toBe('2027-06-01');
  });

  it('aceite com o término calculado não pede justificativa', async () => {
    logado = comercial;
    await new SalvarSd(deps).executar({ id: sdId, dataEnvioCotacao: '2026-11-01', leadTimeDias: 180 });
    await anexarPo();
    await new AbrirSd(deps).executar(sdId);
    logado = engenharia;
    const aceita = await new UnidadeDeTrabalhoSqlite(db).executar(() =>
      aceitar.executar({ id: sdId, dataInicio: '2026-11-12', dataFim: '2027-05-11' }),
    );
    expect(aceita.prazoJustificativa).toBeNull();
    expect(db.prepare('SELECT data_fim FROM cronogramas WHERE id = ?').pluck().get(aceita.cronogramaId)).toBe('2027-05-11');
  });

  it('SD aberta antes da 0.4.0 (sem lead time) aceita qualquer término sem justificativa', async () => {
    logado = comercial;
    await new SalvarSd(deps).executar({ id: sdId, dataEnvioCotacao: '2026-11-01', leadTimeDias: 180 });
    await anexarPo();
    await new AbrirSd(deps).executar(sdId);
    db.prepare('UPDATE sd SET lead_time_dias = NULL WHERE id = ?').run(sdId);
    logado = engenharia;
    const aceita = await new UnidadeDeTrabalhoSqlite(db).executar(() =>
      aceitar.executar({ id: sdId, dataInicio: '2026-11-12', dataFim: '2027-02-01' }),
    );
    expect(aceita.status).toBe('fechada');
    expect(aceita.prazoJustificativa).toBeNull();
  });

  it('Engenharia devolve com motivo e o Comercial reabre', async () => {
    logado = comercial;
    await new SalvarSd(deps).executar({ id: sdId, dataEnvioCotacao: '2026-11-01', leadTimeDias: 180 });
    await anexarPo();
    await new AbrirSd(deps).executar(sdId);

    logado = engenharia;
    await expect(new DevolverSd(deps).executar({ id: sdId, motivo: '  ' })).rejects.toThrow(/motivo/);
    const devolvida = await new DevolverSd(deps).executar({ id: sdId, motivo: 'PO sem assinatura' });
    expect(tiposDe('com')).toEqual(['sd.devolvida']);
    expect(devolvida).toMatchObject({
      status: 'pre_sd',
      devolucaoMotivo: 'PO sem assinatura',
      devolucaoPorNome: 'Leandro',
    });

    logado = comercial;
    expect((await new AbrirSd(deps).executar(sdId)).status).toBe('aberta');
    expect((await new ObterSd(deps.repositorio, deps.acesso, deps.versoes).executar(sdId)).abertaPorNome).toBe(
      'Comercial',
    );
  });

  it('aceite que falha no meio não deixa nada pela metade', async () => {
    logado = comercial;
    await new SalvarSd(deps).executar({ id: sdId, dataEnvioCotacao: '2026-11-01', leadTimeDias: 180 });
    await anexarPo();
    await new AbrirSd(deps).executar(sdId);
    logado = engenharia;
    // Período inválido: o projeto não é criado e a SD continua aberta.
    await expect(
      new UnidadeDeTrabalhoSqlite(db).executar(() =>
        aceitar.executar({ id: sdId, dataInicio: '2027-01-10', dataFim: '2026-01-01' }),
      ),
    ).rejects.toThrow();
    expect(db.prepare('SELECT status FROM sd WHERE id = ?').pluck().get(sdId)).toBe('aberta');
    expect(db.prepare('SELECT COUNT(*) FROM cronogramas').pluck().get()).toBe(0);
  });
});
