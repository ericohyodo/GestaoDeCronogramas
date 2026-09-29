/** Grupos de AVs e presença de usuários, sobre SQLite em memória. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtualizarComercial } from '../../electron/modulos/avs/aplicacao/casos-de-uso/atualizar-comercial';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { SalvarContatosAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/contatos-av';
import { RepositorioContatosAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-contatos-av-sqlite';
import { AplicarAoGrupo, CriarGrupoDeAvs } from '../../electron/modulos/avs/aplicacao/casos-de-uso/grupos-av';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import type { ConsultaDeUsuarios } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioGruposAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-grupos-av-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { BaterPresenca, ListarUsuariosOnline } from '../../electron/modulos/usuarios/aplicacao/casos-de-uso/presenca';
import { Sessao } from '../../electron/modulos/usuarios/aplicacao/sessao';
import { RepositorioPresencaSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-presenca-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('Grupos de AVs', () => {
  let db: BancoDeDados;
  let repositorio: RepositorioAvsSqlite;
  let criar: CriarAv;
  let atualizar: AtualizarComercial;
  let criarGrupo: CriarGrupoDeAvs;
  let aplicar: AplicarAoGrupo;
  let salvarContatos: SalvarContatosAv;
  let contatosRepo: RepositorioContatosAvSqlite;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    await new RepositorioUsuariosSqlite(db).salvar(
      Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => ({ id: 'u1', nome: 'Erico', perfil: 'administrador' }),
      listarAtivos: async () => [{ id: 'u1', nome: 'Erico' }],
      obterPerfilGlobal: async () => 'administrador',
    };
    const ids = new GeradorDeIdSequencial('g');
    repositorio = new RepositorioAvsSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    criar = new CriarAv(repositorio, relogio, ids, consulta, autorizacao);
    atualizar = new AtualizarComercial(repositorio, autorizacao, consulta);
    const grupos = new RepositorioGruposAvSqlite(db);
    criarGrupo = new CriarGrupoDeAvs(grupos, repositorio, criar, autorizacao, relogio, ids);
    contatosRepo = new RepositorioContatosAvSqlite(db);
    aplicar = new AplicarAoGrupo(repositorio, autorizacao, contatosRepo, ids);
    salvarContatos = new SalvarContatosAv(repositorio, contatosRepo, autorizacao, ids);
  });

  afterEach(() => db.close());

  it('cria N AVs vinculadas, aplica só os campos comerciais preenchidos e recusa dados inválidos', async () => {
    const grupo = await criarGrupo.executar({ nome: 'Projeto Chaplin - Whirlpool', quantidade: 3 });
    expect(grupo.avs).toHaveLength(3);
    expect(grupo.avs.map((av) => av.descricao)).toEqual([
      'Projeto Chaplin - Whirlpool — 1/3',
      'Projeto Chaplin - Whirlpool — 2/3',
      'Projeto Chaplin - Whirlpool — 3/3',
    ]);
    const [a, b, c] = grupo.avs as [(typeof grupo.avs)[number], (typeof grupo.avs)[number], (typeof grupo.avs)[number]];
    expect((await repositorio.obterPorId(a.id))?.grupoNome).toBe('Projeto Chaplin - Whirlpool');

    await atualizar.executar({ avId: a.id, cliente: 'Whirlpool', codigo: 'W1', complexidade: 'baixa', prazoCliente: '2026-12-18', programa: 'n/a', volumeAnual: 300000, linha: 'Teste', descricao: 'Peça A' });
    await salvarContatos.executar({
      avId: a.id,
      contatos: [
        { nome: 'Ana', area: 'Comercial', telefone: '11 4555 2345', email: 'ana@whirlpool.com' },
        { nome: 'Bruno', area: 'Técnico' },
      ],
    });
    await expect(salvarContatos.executar({ avId: a.id, contatos: [{ nome: 'X', email: 'errado' }] })).rejects.toThrow(
      /E-mail inválido/,
    );
    expect(await aplicar.executar({ avId: a.id, secao: 'comercial' })).toEqual({ aplicadas: 2, ignoradas: [] });

    for (const outra of [b, c]) {
      const depois = (await repositorio.obterPorId(outra.id))!;
      expect(depois.cliente).toBe('Whirlpool');
      expect((await contatosRepo.listar(outra.id)).map((c) => [c.nome, c.area, c.email])).toEqual([
        ['Ana', 'Comercial', 'ana@whirlpool.com'],
        ['Bruno', 'Técnico', null],
      ]);
      expect(depois.prazoCliente).toBe('2026-12-18');
      // Campos do produto não são herdados: ficam vazios e em alerta para preenchimento manual.
      expect([depois.codigo, depois.programa, depois.volumeAnual, depois.linha]).toEqual([null, null, null, null]);
      expect(depois.camposPendentes).toEqual(['descricao', 'codigo', 'volumeAnual', 'linha', 'programa']);
      expect(depois.complexidade).toBeNull(); // não faz mais parte do que se aplica ao grupo
      expect(depois.descricao).toContain('Chaplin'); // a descrição é própria de cada AV
    }

    // Preencher os campos à mão tira o alerta; reaplicar não apaga o que já foi preenchido.
    await atualizar.executar({ avId: b.id, codigo: 'X9', descricao: 'Peça B', volumeAnual: 5, linha: 'Fogões', programa: 'P1' });
    expect((await repositorio.obterPorId(b.id))?.camposPendentes).toEqual([]);
    await aplicar.executar({ avId: a.id, secao: 'comercial' });
    expect((await repositorio.obterPorId(b.id))?.codigo).toBe('X9');
    expect((await repositorio.obterPorId(c.id))?.camposPendentes).toHaveLength(5);

    await expect(criarGrupo.executar({ nome: 'projeto chaplin - whirlpool', quantidade: 2 })).rejects.toThrow(/Já existe/);
    await expect(criarGrupo.executar({ nome: 'Outro', quantidade: 1 })).rejects.toThrow(/entre 2 e 50/);

    const avulsa = await criar.executar({ descricao: 'Sem grupo' });
    await expect(aplicar.executar({ avId: avulsa.id, secao: 'comercial' })).rejects.toThrow(/não pertence/);
  });
});

describe('Presença de usuários', () => {
  it('lista quem bateu há pouco, agrupa instâncias do mesmo usuário e some ao sair', async () => {
    const db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    const usuario = Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() });
    await new RepositorioUsuariosSqlite(db).salvar(usuario);

    const repositorio = new RepositorioPresencaSqlite(db);
    const sessao = new Sessao();
    const primeira = new BaterPresenca(repositorio, sessao, relogio, 'instancia-1');
    const segunda = new BaterPresenca(repositorio, sessao, relogio, 'instancia-2');
    const listar = new ListarUsuariosOnline(repositorio, relogio);

    await primeira.executar(); // sem sessão: nada registrado
    expect(await listar.executar()).toEqual([]);

    sessao.abrir(usuario);
    await primeira.executar();
    await segunda.executar();
    expect(await listar.executar()).toMatchObject([{ id: 'u1', nome: 'Erico', instancias: 2 }]);

    await repositorio.remover('instancia-2');
    expect(await listar.executar()).toMatchObject([{ instancias: 1 }]);

    relogio.instante = new Date(relogio.instante.getTime() + 120_000); // sem novo batimento
    expect(await listar.executar()).toEqual([]);
    db.close();
  });
});
