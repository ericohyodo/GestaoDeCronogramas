import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { ContatoAv, RepositorioContatosAv } from '../dominio/contato-av';

interface LinhaContato {
  id: string;
  av_id: string;
  ordem: number;
  nome: string;
  area: string | null;
  telefone: string | null;
  email: string | null;
}

export class RepositorioContatosAvSqlite implements RepositorioContatosAv {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[string], LinhaContato>('SELECT * FROM av_contatos WHERE av_id = ? ORDER BY ordem'),
      excluir: db.prepare<[string]>('DELETE FROM av_contatos WHERE av_id = ?'),
      inserir: db.prepare<[LinhaContato]>(`
        INSERT INTO av_contatos (id, av_id, ordem, nome, area, telefone, email)
        VALUES (@id, @av_id, @ordem, @nome, @area, @telefone, @email)
      `),
    };
  }

  async listar(avId: string): Promise<ContatoAv[]> {
    return this.sql.listar.all(avId).map((linha) => ({
      id: linha.id,
      avId: linha.av_id,
      ordem: linha.ordem,
      nome: linha.nome,
      area: linha.area,
      telefone: linha.telefone,
      email: linha.email,
    }));
  }

  async substituir(avId: string, contatos: ContatoAv[]): Promise<void> {
    this.db.transaction(() => {
      this.sql.excluir.run(avId);
      for (const contato of contatos) {
        this.sql.inserir.run({
          id: contato.id,
          av_id: avId,
          ordem: contato.ordem,
          nome: contato.nome,
          area: contato.area,
          telefone: contato.telefone,
          email: contato.email,
        });
      }
    })();
  }
}
