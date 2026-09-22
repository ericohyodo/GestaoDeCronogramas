import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { Perfil } from '../dominio/perfil';
import type { RepositorioUsuarios } from '../dominio/repositorio-usuarios';
import { Usuario } from '../dominio/usuario';

interface LinhaUsuario {
  id: string;
  nome: string;
  login: string;
  senha_hash: string;
  perfil: string;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
  ultimo_acesso_em: string | null;
}

export class RepositorioUsuariosSqlite implements RepositorioUsuarios {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[], LinhaUsuario>('SELECT * FROM usuarios ORDER BY nome COLLATE NOCASE'),
      obterPorId: db.prepare<[string], LinhaUsuario>('SELECT * FROM usuarios WHERE id = ?'),
      obterPorLogin: db.prepare<[string], LinhaUsuario>(
        'SELECT * FROM usuarios WHERE login = ? COLLATE NOCASE',
      ),
      contar: db.prepare<[], number>('SELECT COUNT(*) FROM usuarios').pluck(),
      contarAdministradoresAtivos: db
        .prepare<
          [string],
          number
        >("SELECT COUNT(*) FROM usuarios WHERE perfil = 'administrador' AND ativo = 1 AND id <> ?")
        .pluck(),
      salvar: db.prepare<[LinhaUsuario]>(`
        INSERT INTO usuarios
          (id, nome, login, senha_hash, perfil, ativo, criado_em, atualizado_em, ultimo_acesso_em)
        VALUES
          (@id, @nome, @login, @senha_hash, @perfil, @ativo, @criado_em, @atualizado_em, @ultimo_acesso_em)
        ON CONFLICT (id) DO UPDATE SET
          nome             = excluded.nome,
          login            = excluded.login,
          senha_hash       = excluded.senha_hash,
          perfil           = excluded.perfil,
          ativo            = excluded.ativo,
          atualizado_em    = excluded.atualizado_em,
          ultimo_acesso_em = excluded.ultimo_acesso_em
      `),
      excluir: db.prepare<[string]>('DELETE FROM usuarios WHERE id = ?'),
    };
  }

  async listar(): Promise<Usuario[]> {
    return this.sql.listar.all().map(paraEntidade);
  }

  async obterPorId(id: string): Promise<Usuario | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha) : null;
  }

  async obterPorLogin(login: string): Promise<Usuario | null> {
    const linha = this.sql.obterPorLogin.get(login);
    return linha ? paraEntidade(linha) : null;
  }

  async contar(): Promise<number> {
    return this.sql.contar.get() ?? 0;
  }

  async contarAdministradoresAtivos(exceto = ''): Promise<number> {
    return this.sql.contarAdministradoresAtivos.get(exceto) ?? 0;
  }

  async salvar(usuario: Usuario): Promise<void> {
    this.sql.salvar.run(paraLinha(usuario));
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }
}

function paraEntidade(linha: LinhaUsuario): Usuario {
  return Usuario.reconstituir({
    id: linha.id,
    nome: linha.nome,
    login: linha.login,
    senhaHash: linha.senha_hash,
    perfil: linha.perfil as Perfil,
    ativo: linha.ativo === 1,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
    ultimoAcessoEm: linha.ultimo_acesso_em ? new Date(linha.ultimo_acesso_em) : null,
  });
}

function paraLinha(usuario: Usuario): LinhaUsuario {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    senha_hash: usuario.senhaHash,
    perfil: usuario.perfil,
    ativo: usuario.ativo ? 1 : 0,
    criado_em: usuario.criadoEm.toISOString(),
    atualizado_em: usuario.atualizadoEm.toISOString(),
    ultimo_acesso_em: usuario.ultimoAcessoEm?.toISOString() ?? null,
  };
}
