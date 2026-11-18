import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { Notificacao, RepositorioNotificacoes } from '../dominio/notificacao';

interface LinhaNotificacao {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  chave: string | null;
  criada_em: string;
  lida_em: string | null;
}

const paraEntidade = (linha: LinhaNotificacao): Notificacao => ({
  id: linha.id,
  usuarioId: linha.usuario_id,
  tipo: linha.tipo,
  titulo: linha.titulo,
  mensagem: linha.mensagem,
  link: linha.link,
  chave: linha.chave ?? null,
  criadaEm: new Date(linha.criada_em),
  lidaEm: linha.lida_em ? new Date(linha.lida_em) : null,
});

export class RepositorioNotificacoesSqlite implements RepositorioNotificacoes {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      // Só insere se o usuário existe: um destinatário excluído não derruba a operação que notificou.
      inserir: db.prepare<[LinhaNotificacao]>(`
        INSERT INTO notificacoes (id, usuario_id, tipo, titulo, mensagem, link, chave, criada_em, lida_em)
        SELECT @id, @usuario_id, @tipo, @titulo, @mensagem, @link, @chave, @criada_em, NULL
        WHERE EXISTS (SELECT 1 FROM usuarios WHERE id = @usuario_id)
          AND (@chave IS NULL OR NOT EXISTS (
            SELECT 1 FROM notificacoes WHERE usuario_id = @usuario_id AND tipo = @tipo AND chave = @chave
          ))
      `),
      listar: db.prepare<[string, number], LinhaNotificacao>(
        'SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY criada_em DESC LIMIT ?',
      ),
      contar: db
        .prepare<[string], number>('SELECT COUNT(*) FROM notificacoes WHERE usuario_id = ? AND lida_em IS NULL')
        .pluck(),
      marcarLida: db.prepare<[string, string, string]>(
        'UPDATE notificacoes SET lida_em = ? WHERE id = ? AND usuario_id = ? AND lida_em IS NULL',
      ),
      marcarTodas: db.prepare<[string, string]>(
        'UPDATE notificacoes SET lida_em = ? WHERE usuario_id = ? AND lida_em IS NULL',
      ),
    };
  }

  async inserir(notificacoes: Notificacao[]): Promise<void> {
    this.db.transaction(() => {
      for (const n of notificacoes) {
        this.sql.inserir.run({
          id: n.id,
          usuario_id: n.usuarioId,
          tipo: n.tipo,
          titulo: n.titulo,
          mensagem: n.mensagem,
          link: n.link,
          chave: n.chave,
          criada_em: n.criadaEm.toISOString(),
          lida_em: null,
        });
      }
    })();
  }

  async listarDoUsuario(usuarioId: string, limite: number): Promise<Notificacao[]> {
    return this.sql.listar.all(usuarioId, limite).map(paraEntidade);
  }

  async contarNaoLidas(usuarioId: string): Promise<number> {
    return this.sql.contar.get(usuarioId) ?? 0;
  }

  async marcarLida(id: string, usuarioId: string, agora: Date): Promise<void> {
    this.sql.marcarLida.run(agora.toISOString(), id, usuarioId);
  }

  async marcarTodasLidas(usuarioId: string, agora: Date): Promise<void> {
    this.sql.marcarTodas.run(agora.toISOString(), usuarioId);
  }
}
