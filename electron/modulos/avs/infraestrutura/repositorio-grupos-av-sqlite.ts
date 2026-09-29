import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { GrupoAv, RepositorioGruposAv } from '../dominio/grupo-av';

interface LinhaGrupo {
  id: string;
  nome: string;
  criado_por: string | null;
  criado_em: string;
}

export class RepositorioGruposAvSqlite implements RepositorioGruposAv {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[], LinhaGrupo>('SELECT * FROM av_grupo ORDER BY nome COLLATE NOCASE'),
      obterPorId: db.prepare<[string], LinhaGrupo>('SELECT * FROM av_grupo WHERE id = ?'),
      obterPorNome: db.prepare<[string], LinhaGrupo>('SELECT * FROM av_grupo WHERE nome = ? COLLATE NOCASE'),
      inserir: db.prepare<[LinhaGrupo]>(
        'INSERT INTO av_grupo (id, nome, criado_por, criado_em) VALUES (@id, @nome, @criado_por, @criado_em)',
      ),
      renomear: db.prepare<[string, string]>('UPDATE av_grupo SET nome = ? WHERE id = ?'),
      soltarMembros: db.prepare<[string]>('UPDATE av SET grupo_id = NULL WHERE grupo_id = ?'),
      prenderMembro: db.prepare<[string, string]>('UPDATE av SET grupo_id = ? WHERE id = ?'),
      excluir: db.prepare<[string]>('DELETE FROM av_grupo WHERE id = ?'),
    };
  }

  async listar(): Promise<GrupoAv[]> {
    return this.sql.listar.all().map(paraEntidade);
  }

  async obterPorId(id: string): Promise<GrupoAv | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha) : null;
  }

  async obterPorNome(nome: string): Promise<GrupoAv | null> {
    const linha = this.sql.obterPorNome.get(nome);
    return linha ? paraEntidade(linha) : null;
  }

  async salvar(grupo: GrupoAv, avIds: string[]): Promise<void> {
    this.db.transaction(() => {
      if (this.sql.obterPorId.get(grupo.id)) {
        this.sql.renomear.run(grupo.nome, grupo.id);
      } else {
        this.sql.inserir.run({
          id: grupo.id,
          nome: grupo.nome,
          criado_por: grupo.criadoPor,
          criado_em: grupo.criadoEm.toISOString(),
        });
      }
      this.sql.soltarMembros.run(grupo.id);
      for (const avId of avIds) this.sql.prenderMembro.run(grupo.id, avId);
    })();
  }

  async excluir(id: string): Promise<void> {
    this.db.transaction(() => {
      this.sql.soltarMembros.run(id);
      this.sql.excluir.run(id);
    })();
  }
}

function paraEntidade(linha: LinhaGrupo): GrupoAv {
  return {
    id: linha.id,
    nome: linha.nome,
    criadoPor: linha.criado_por,
    criadoEm: new Date(linha.criado_em),
  };
}
