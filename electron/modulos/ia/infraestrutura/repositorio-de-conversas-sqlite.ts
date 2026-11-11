import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { ConversaGuardada, MensagemGuardada, RepositorioDeConversas } from '../aplicacao/portas';

interface LinhaConversa {
  id: string;
  usuario_id: string;
  escopo: 'projetos' | 'avs';
  titulo: string;
  criada_em: string;
  atualizada_em: string;
}

interface LinhaMensagem {
  papel: 'usuario' | 'ia';
  texto: string;
  modelo: string | null;
}

const paraConversa = (linha: LinhaConversa): ConversaGuardada => ({
  id: linha.id,
  usuarioId: linha.usuario_id,
  escopo: linha.escopo,
  titulo: linha.titulo,
  criadaEm: new Date(linha.criada_em),
  atualizadaEm: new Date(linha.atualizada_em),
});

/** Conversas do Chat com IA. Toda leitura e exclusão filtra pelo dono (`usuario_id`). */
export class RepositorioDeConversasSqlite implements RepositorioDeConversas {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      criar: db.prepare<[LinhaConversa]>(`
        INSERT INTO ia_conversas (id, usuario_id, escopo, titulo, criada_em, atualizada_em)
        VALUES (@id, @usuario_id, @escopo, @titulo, @criada_em, @atualizada_em)
      `),
      proximaOrdem: db
        .prepare<[string], number>('SELECT COALESCE(MAX(ordem), 0) + 1 FROM ia_conversa_mensagens WHERE conversa_id = ?')
        .pluck(),
      inserirMensagem: db.prepare<[string, string, number, string, string, string | null, string]>(`
        INSERT INTO ia_conversa_mensagens (id, conversa_id, ordem, papel, texto, modelo, criada_em)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      tocar: db.prepare<[string, string]>('UPDATE ia_conversas SET atualizada_em = ? WHERE id = ?'),
      listar: db.prepare<[string, string], LinhaConversa>(
        'SELECT * FROM ia_conversas WHERE usuario_id = ? AND escopo = ? ORDER BY atualizada_em DESC LIMIT 200',
      ),
      obter: db.prepare<[string, string], LinhaConversa>('SELECT * FROM ia_conversas WHERE id = ? AND usuario_id = ?'),
      mensagens: db.prepare<[string], LinhaMensagem>(
        'SELECT papel, texto, modelo FROM ia_conversa_mensagens WHERE conversa_id = ? ORDER BY ordem',
      ),
      excluir: db.prepare<[string, string]>('DELETE FROM ia_conversas WHERE id = ? AND usuario_id = ?'),
      apagarAntigas: db.prepare<[string]>('DELETE FROM ia_conversas WHERE atualizada_em < ?'),
    };
  }

  async criar(conversa: ConversaGuardada): Promise<void> {
    this.sql.criar.run({
      id: conversa.id,
      usuario_id: conversa.usuarioId,
      escopo: conversa.escopo,
      titulo: conversa.titulo,
      criada_em: conversa.criadaEm.toISOString(),
      atualizada_em: conversa.atualizadaEm.toISOString(),
    });
  }

  async acrescentar(conversaId: string, mensagens: MensagemGuardada[], agora: Date): Promise<void> {
    this.db.transaction(() => {
      let ordem = this.sql.proximaOrdem.get(conversaId) ?? 1;
      for (const mensagem of mensagens) {
        this.sql.inserirMensagem.run(
          `${conversaId}:${ordem}`,
          conversaId,
          ordem,
          mensagem.papel,
          mensagem.texto,
          mensagem.modelo,
          agora.toISOString(),
        );
        ordem += 1;
      }
      this.sql.tocar.run(agora.toISOString(), conversaId);
    })();
  }

  async listar(usuarioId: string, escopo: 'projetos' | 'avs'): Promise<ConversaGuardada[]> {
    return this.sql.listar.all(usuarioId, escopo).map(paraConversa);
  }

  async obter(id: string, usuarioId: string) {
    const linha = this.sql.obter.get(id, usuarioId);
    if (!linha) return null;
    return { ...paraConversa(linha), mensagens: this.sql.mensagens.all(id) };
  }

  async excluir(id: string, usuarioId: string): Promise<boolean> {
    return this.sql.excluir.run(id, usuarioId).changes > 0;
  }

  async apagarSemUsoDesde(limite: Date): Promise<number> {
    return this.sql.apagarAntigas.run(limite.toISOString()).changes;
  }
}
