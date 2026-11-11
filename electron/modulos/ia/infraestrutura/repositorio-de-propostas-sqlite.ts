import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { PropostaGuardada, RepositorioDePropostas } from '../aplicacao/portas';

interface LinhaProposta {
  id: string;
  usuario_id: string;
  cronograma_id: string;
  cronograma_nome: string;
  resumo: string;
  operacoes: string;
  esperado: string;
  itens: string;
  situacao: PropostaGuardada['situacao'];
  criada_em: string;
  decidida_em: string | null;
  motivo: string | null;
}

const paraProposta = (linha: LinhaProposta): PropostaGuardada => ({
  id: linha.id,
  usuarioId: linha.usuario_id,
  cronogramaId: linha.cronograma_id,
  cronogramaNome: linha.cronograma_nome,
  resumo: linha.resumo,
  operacoes: JSON.parse(linha.operacoes) as PropostaGuardada['operacoes'],
  esperado: JSON.parse(linha.esperado) as PropostaGuardada['esperado'],
  itens: JSON.parse(linha.itens) as PropostaGuardada['itens'],
  situacao: linha.situacao,
  criadaEm: new Date(linha.criada_em),
  decididaEm: linha.decidida_em ? new Date(linha.decidida_em) : null,
  motivo: linha.motivo,
});

/** Propostas do agente do chat. Toda leitura filtra pelo dono (`usuario_id`). */
export class RepositorioDePropostasSqlite implements RepositorioDePropostas {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      salvar: db.prepare<[LinhaProposta]>(`
        INSERT INTO ia_propostas
          (id, usuario_id, cronograma_id, cronograma_nome, resumo, operacoes, esperado, itens, situacao, criada_em,
           decidida_em, motivo)
        VALUES
          (@id, @usuario_id, @cronograma_id, @cronograma_nome, @resumo, @operacoes, @esperado, @itens, @situacao,
           @criada_em, @decidida_em, @motivo)
        ON CONFLICT (id) DO UPDATE SET
          situacao    = excluded.situacao,
          decidida_em = excluded.decidida_em,
          motivo      = excluded.motivo
      `),
      obter: db.prepare<[string, string], LinhaProposta>('SELECT * FROM ia_propostas WHERE id = ? AND usuario_id = ?'),
      doUsuario: db.prepare<[string], LinhaProposta>(
        `SELECT p.* FROM ia_propostas p
           JOIN ia_conversa_mensagens m ON m.proposta_id = p.id
          WHERE p.usuario_id = ?`,
      ),
      apagarSoltas: db.prepare<[string]>(`
        DELETE FROM ia_propostas
         WHERE criada_em < ?
           AND id NOT IN (SELECT proposta_id FROM ia_conversa_mensagens WHERE proposta_id IS NOT NULL)
      `),
    };
  }

  async salvar(proposta: PropostaGuardada): Promise<void> {
    this.sql.salvar.run({
      id: proposta.id,
      usuario_id: proposta.usuarioId,
      cronograma_id: proposta.cronogramaId,
      cronograma_nome: proposta.cronogramaNome,
      resumo: proposta.resumo,
      operacoes: JSON.stringify(proposta.operacoes),
      esperado: JSON.stringify(proposta.esperado),
      itens: JSON.stringify(proposta.itens),
      situacao: proposta.situacao,
      criada_em: proposta.criadaEm.toISOString(),
      decidida_em: proposta.decididaEm?.toISOString() ?? null,
      motivo: proposta.motivo,
    });
  }

  async obter(id: string, usuarioId: string): Promise<PropostaGuardada | null> {
    const linha = this.sql.obter.get(id, usuarioId);
    return linha ? paraProposta(linha) : null;
  }

  async obterVarias(ids: string[], usuarioId: string): Promise<Map<string, PropostaGuardada>> {
    const procurados = new Set(ids);
    const propostas = new Map<string, PropostaGuardada>();
    if (procurados.size === 0) return propostas;
    for (const linha of this.sql.doUsuario.all(usuarioId)) {
      if (procurados.has(linha.id)) propostas.set(linha.id, paraProposta(linha));
    }
    return propostas;
  }

  async apagarSoltasDesde(limite: Date): Promise<number> {
    return this.sql.apagarSoltas.run(limite.toISOString()).changes;
  }
}
