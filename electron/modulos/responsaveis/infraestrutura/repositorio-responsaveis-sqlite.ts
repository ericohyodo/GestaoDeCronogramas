import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RepositorioResponsaveis } from '../dominio/repositorio-responsaveis';
import { Responsavel } from '../dominio/responsavel';

interface LinhaResponsavel {
  id: string;
  nome: string;
  email: string | null;
  funcao: string | null;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
}

export class RepositorioResponsaveisSqlite implements RepositorioResponsaveis {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[], LinhaResponsavel>(
        'SELECT * FROM responsaveis ORDER BY ativo DESC, nome COLLATE NOCASE',
      ),
      obterPorId: db.prepare<[string], LinhaResponsavel>('SELECT * FROM responsaveis WHERE id = ?'),
      salvar: db.prepare<[LinhaResponsavel]>(`
        INSERT INTO responsaveis (id, nome, email, funcao, ativo, criado_em, atualizado_em)
        VALUES (@id, @nome, @email, @funcao, @ativo, @criado_em, @atualizado_em)
        ON CONFLICT (id) DO UPDATE SET
          nome          = excluded.nome,
          email         = excluded.email,
          funcao        = excluded.funcao,
          ativo         = excluded.ativo,
          atualizado_em = excluded.atualizado_em
      `),
      excluir: db.prepare<[string]>('DELETE FROM responsaveis WHERE id = ?'),
    };
  }

  async listar(): Promise<Responsavel[]> {
    return this.sql.listar.all().map(paraEntidade);
  }

  async obterPorId(id: string): Promise<Responsavel | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha) : null;
  }

  async salvar(responsavel: Responsavel): Promise<void> {
    this.sql.salvar.run(paraLinha(responsavel));
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }
}

function paraEntidade(linha: LinhaResponsavel): Responsavel {
  return Responsavel.reconstituir({
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    funcao: linha.funcao,
    ativo: linha.ativo === 1,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  });
}

function paraLinha(responsavel: Responsavel): LinhaResponsavel {
  return {
    id: responsavel.id,
    nome: responsavel.nome,
    email: responsavel.email,
    funcao: responsavel.funcao,
    ativo: responsavel.ativo ? 1 : 0,
    criado_em: responsavel.criadoEm.toISOString(),
    atualizado_em: responsavel.atualizadoEm.toISOString(),
  };
}
