/** Competências de AV e papéis especiais (aceite da SD), configurados pelo administrador. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { ListarPerfisAv, ObterMeuPerfilAv, SalvarPerfilAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/perfis-av';
import type { ConsultaDeUsuarios, UsuarioAtualAv } from '../../electron/modulos/avs/aplicacao/portas';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('perfis do fluxo AV/SD', () => {
  let db: BancoDeDados;
  let logado: UsuarioAtualAv;
  let autorizacao: AutorizacaoAv;
  let consulta: ConsultaDeUsuarios;
  const admin: UsuarioAtualAv = { id: 'adm', nome: 'Admin', perfil: 'administrador' };
  const vendedor: UsuarioAtualAv = { id: 'com', nome: 'Comercial', perfil: 'usuario' };
  const gerente: UsuarioAtualAv = { id: 'ger', nome: 'Gerente', perfil: 'usuario' };

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    const usuarios = new RepositorioUsuariosSqlite(db);
    for (const u of [admin, vendedor, gerente]) {
      await usuarios.salvar(Usuario.criar({ id: u.id, nome: u.nome, login: u.id, senhaHash: 'h', perfil: u.perfil, agora: relogio.agora() }));
    }
    logado = admin;
    consulta = {
      usuarioAtual: () => logado,
      listarAtivos: async () => [admin, vendedor, gerente].map(({ id, nome }) => ({ id, nome })),
      obterPerfilGlobal: async (id) => [admin, vendedor, gerente].find((u) => u.id === id)?.perfil ?? null,
    };
    autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
  });

  afterEach(() => db.close());

  it('administrador concede competência e papel; o comercial passa a criar AV e o gerente a dar aceite', async () => {
    const perfis = new RepositorioPerfisAvSqlite(db);
    const salvar = new SalvarPerfilAv(perfis, autorizacao, consulta);
    const criar = new CriarAv(new RepositorioAvsSqlite(db), new RelogioFixo(), new GeradorDeIdSequencial('a'), consulta, autorizacao);

    logado = vendedor;
    await expect(criar.executar({ descricao: 'X' })).rejects.toThrow();
    await expect(salvar.executar({ usuarioId: 'com', papelAv: 'padrao', competencias: ['comercial'], papeisEspeciais: [] })).rejects.toThrow(/administrador/);

    logado = admin;
    await salvar.executar({ usuarioId: 'com', papelAv: 'padrao', competencias: ['comercial'], papeisEspeciais: [] });
    await salvar.executar({ usuarioId: 'ger', papelAv: 'padrao', competencias: [], papeisEspeciais: ['gerente_engenharia'] });

    logado = vendedor;
    expect((await criar.executar({ descricao: 'X' })).numero).toMatch(/^AV \d{2}-001$/);
    await expect(autorizacao.exigirAceiteDaSd()).rejects.toThrow(/Gerente de Engenharia/);

    logado = gerente;
    await expect(autorizacao.exigirAceiteDaSd()).resolves.toMatchObject({ id: 'ger' });
    expect(await new ObterMeuPerfilAv(autorizacao).executar()).toMatchObject({ papeisEspeciais: ['gerente_engenharia'], administrador: false });

    logado = admin;
    const lista = await new ListarPerfisAv(perfis, autorizacao, consulta).executar();
    expect(lista.find((p) => p.usuarioId === 'ger')?.papeisEspeciais).toEqual(['gerente_engenharia']);
    expect(lista.find((p) => p.usuarioId === 'com')?.competencias).toEqual(['comercial']);
  });
});
