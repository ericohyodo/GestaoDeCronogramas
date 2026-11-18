/** AV de Item de Portfólio: cadastro de itens-modelo, abertura a partir do item, checagens e conclusão sem SD. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import { AvancarEtapa } from '../../electron/modulos/avs/aplicacao/casos-de-uso/avancar-etapa';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { FinalizarECriarPreSd } from '../../electron/modulos/avs/aplicacao/casos-de-uso/finalizar-e-criar-pre-sd';
import { ObterDashboard } from '../../electron/modulos/avs/aplicacao/casos-de-uso/obter-dashboard';
import { RepositorioPrazosAreaSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-prazos-area-sqlite';
import {
  ConcluirAvPortfolio,
  DefinirAtivoItemPortfolio,
  type DependenciasPortfolio,
  ListarItensPortfolio,
  ObterPortfolioDaAv,
  SalvarChecagemPortfolio,
  SalvarItemPortfolio,
} from '../../electron/modulos/avs/aplicacao/casos-de-uso/portfolio';
import type { ConsultaDeUsuarios, UsuarioAtualAv } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioHistoricoAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-historico-av-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import {
  RepositorioChecagensPortfolioSqlite,
  RepositorioPortfolioSqlite,
} from '../../electron/modulos/avs/infraestrutura/repositorio-portfolio-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

const ITEM = {
  codigo: 'TB-4410',
  descricao: 'Tubo de forno 44 cm',
  cliente: 'Electrolux',
  linha: 'Fogões',
  familia: 'Tubos',
  programa: 'Linha 2026',
  revisaoDesenho: 'C',
  custos: { materiaPrima: 4.2, insumos: 0.35, embalagem: 0.12, processo: 1.8 },
  custosAtualizadosEm: '2026-06-30',
  estrutura: [
    { chave: 'c', paiChave: null, tipo: 'componente' as const, descricao: 'Tubo cortado', quantidade: 1, unidade: 'un' },
    { chave: 'e', paiChave: null, tipo: 'embalagem' as const, descricao: 'Caixa', unidade: 'cx', pecasPorEmbalagem: 50 },
  ],
  operacoes: [
    { descricao: 'Corte', maquina: 'SR-02', pecasHora: 600 },
    { descricao: 'Conformação', maquina: 'PR-55', pecasHora: 300 },
  ],
};

describe('AV de Item de Portfólio', () => {
  let db: BancoDeDados;
  let logado: UsuarioAtualAv;
  let deps: DependenciasPortfolio;
  let criarAv: CriarAv;
  let avancar: AvancarEtapa;
  let concluir: ConcluirAvPortfolio;
  let relogio: RelogioFixo;

  const admin: UsuarioAtualAv = { id: 'u1', nome: 'Erico', perfil: 'administrador' };

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    relogio = new RelogioFixo();
    const usuarios = new RepositorioUsuariosSqlite(db);
    await usuarios.salvar(Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }));
    await usuarios.salvar(Usuario.criar({ id: 'u2', nome: 'Ana', login: 'ana', senhaHash: 'h', perfil: 'usuario', agora: relogio.agora() }));
    logado = admin;
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => logado,
      listarAtivos: async () => [
        { id: 'u1', nome: 'Erico' },
        { id: 'u2', nome: 'Ana' },
      ],
      obterPerfilGlobal: async (id) => (id === 'u1' ? 'administrador' : 'usuario'),
    };
    const ids = new GeradorDeIdSequencial('p');
    const avs = new RepositorioAvsSqlite(db);
    const historico = new RepositorioHistoricoAvSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    const repositorio = new RepositorioPortfolioSqlite(db);
    deps = {
      repositorio,
      checagens: new RepositorioChecagensPortfolioSqlite(db),
      avs,
      autorizacao,
      usuarios: consulta,
      armazenamento: {
        copiarParaAnexos: async () => ({ nomeArmazenado: 'x', tipoMime: null, tamanhoBytes: 1 }),
        lerConteudoBase64: async () => '',
        excluirArquivo: async () => undefined,
        abrirNoProgramaPadrao: async () => undefined,
      },
      seletor: { escolher: async () => null },
      relogio,
      geradorDeId: ids,
    };
    criarAv = new CriarAv(avs, relogio, ids, consulta, autorizacao, undefined, undefined, repositorio);
    avancar = new AvancarEtapa(avs, historico, autorizacao, relogio, ids, consulta);
    concluir = new ConcluirAvPortfolio(avs, historico, autorizacao, relogio, ids, consulta);
  });

  afterEach(() => db.close());

  it('cadastra o item com estrutura (1/peças na embalagem) e operações; código é único', async () => {
    const item = await new SalvarItemPortfolio(deps).executar(ITEM);
    expect(item).toMatchObject({ codigo: 'TB-4410', ativo: true, materiaPrima: 4.2, custosAtualizadosEm: '2026-06-30' });
    expect(item.estrutura.find((no) => no.tipo === 'embalagem')).toMatchObject({ pecasPorEmbalagem: 50, quantidade: 0.02 });
    expect(item.operacoes.map((o) => [o.descricao, o.pecasHora])).toEqual([
      ['Corte', 600],
      ['Conformação', 300],
    ]);

    await expect(new SalvarItemPortfolio(deps).executar({ ...ITEM, codigo: 'tb-4410' })).rejects.toThrow(/Já existe/);
    // Alterar o próprio item com o mesmo código é permitido.
    await new SalvarItemPortfolio(deps).executar({ ...ITEM, id: item.id, descricao: 'Tubo 44 cm rev. C' });

    await new DefinirAtivoItemPortfolio(deps).executar({ id: item.id, ativo: false });
    expect(await new ListarItensPortfolio(deps).executar({ apenasAtivos: true })).toEqual([]);
    expect(await new ListarItensPortfolio(deps).executar(undefined)).toHaveLength(1);
  });

  it('só gestor ou administrador edita o cadastro', async () => {
    logado = { id: 'u2', nome: 'Ana', perfil: 'usuario' };
    await expect(new SalvarItemPortfolio(deps).executar(ITEM)).rejects.toThrow(/gestores e administradores/);
  });

  it('abre a AV a partir do item, checa área por área e conclui sem SD', async () => {
    const item = await new SalvarItemPortfolio(deps).executar(ITEM);
    const av = await criarAv.executar({ tipo: 'portfolio', itemPortfolioId: item.id, descricao: '', cliente: 'Whirlpool' });
    expect(av).toMatchObject({
      tipo: 'portfolio',
      itemPortfolioId: item.id,
      descricao: 'Tubo de forno 44 cm',
      codigo: 'TB-4410',
      cliente: 'Whirlpool',
      linha: 'Fogões',
      familia: 'Tubos',
      programa: 'Linha 2026',
    });

    // Mesma numeração da AV completa.
    const completa = await criarAv.executar({ descricao: 'Desenvolvimento novo' });
    expect([av.numero, completa.numero]).toEqual(['AV 26-001', 'AV 26-002'].map((n) => n.replace('26', String(relogio.agora().getFullYear()).slice(2))));

    const checar = new SalvarChecagemPortfolio(deps);
    await expect(checar.executar({ avId: av.id, area: 'produto', resultado: 'diverge' })).rejects.toThrow(/Descreva/);
    await checar.executar({ avId: av.id, area: 'produto', resultado: 'ressalvas', observacao: 'Furo de fixação mudou' });
    await checar.executar({ avId: av.id, area: 'processo', resultado: 'confere' });
    await checar.executar({ avId: av.id, area: 'pcp', resultado: 'confere' });
    const comCusto = await checar.executar({
      avId: av.id,
      area: 'custo',
      resultado: 'ressalvas',
      observacao: 'Aço subiu 8%',
      custosNovos: { materiaPrima: 4.55, insumos: null, embalagem: null, processo: null },
    });
    expect(comCusto.custos).toMatchObject({
      referencia: { materiaPrima: 4.2, processo: 1.8, atualizadosEm: '2026-06-30' },
      novos: { materiaPrima: 4.55, insumos: null },
    });
    expect(comCusto.checagens.map((c) => [c.area, c.resultado])).toEqual(
      expect.arrayContaining([
        ['produto', 'ressalvas'],
        ['custo', 'ressalvas'],
      ]),
    );
    expect((await new ObterPortfolioDaAv(deps).executar(av.id)).item?.codigo).toBe('TB-4410');

    // Comercial → Produto → Processo → PCP → Custo → Proposta Enviada.
    let atual = av;
    for (let i = 0; i < 5; i++) atual = await avancar.executar({ avId: av.id });
    expect(atual.etapaAtual.chave).toBe('proposta_enviada');
    await expect(avancar.executar({ avId: av.id })).rejects.toThrow(/Concluir AV de portfólio/);
    const sd = new FinalizarECriarPreSd(
      new RepositorioAvsSqlite(db),
      new RepositorioHistoricoAvSqlite(db),
      deps.autorizacao,
      { criar: async () => { throw new Error('não deveria criar SD'); } },
      relogio,
      deps.geradorDeId,
    );
    await expect(sd.executar(av.id)).rejects.toThrow(/não gera SD/);

    const concluida = await concluir.executar({ avId: av.id });
    expect(concluida.etapaAtual).toMatchObject({ chave: 'portfolio_concluida', terminal: true });
  });

  it('não abre AV de portfólio com item inativo e deixa a AV de portfólio fora do painel das AVs', async () => {
    const item = await new SalvarItemPortfolio(deps).executar(ITEM);
    await criarAv.executar({ tipo: 'portfolio', itemPortfolioId: item.id, descricao: '' });
    await criarAv.executar({ descricao: 'Desenvolvimento novo' });
    const painel = await new ObterDashboard(new RepositorioAvsSqlite(db), new RepositorioPrazosAreaSqlite(db), relogio).executar();
    expect(painel.total).toBe(1);

    await new DefinirAtivoItemPortfolio(deps).executar({ id: item.id, ativo: false });
    await expect(criarAv.executar({ tipo: 'portfolio', itemPortfolioId: item.id, descricao: '' })).rejects.toThrow(/inativo/);
  });
});
