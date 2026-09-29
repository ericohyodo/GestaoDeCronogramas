import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { PresencaAtiva, RepositorioPresenca } from '../dominio/repositorio-presenca';

interface LinhaPresenca {
  usuario_id: string;
  nome: string;
  perfil: string;
  iniciado_em: string;
}

export class RepositorioPresencaSqlite implements RepositorioPresenca {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      registrar: db.prepare<[string, string, string, string, string]>(`
        INSERT INTO presenca_usuarios (sessao_id, usuario_id, iniciado_em, ultimo_batimento)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (sessao_id) DO UPDATE SET
          iniciado_em = CASE WHEN presenca_usuarios.usuario_id = ? THEN presenca_usuarios.iniciado_em
                             ELSE excluded.iniciado_em END,
          usuario_id = excluded.usuario_id,
          ultimo_batimento = excluded.ultimo_batimento
      `),
      remover: db.prepare<[string]>('DELETE FROM presenca_usuarios WHERE sessao_id = ?'),
      limpar: db.prepare<[string]>('DELETE FROM presenca_usuarios WHERE ultimo_batimento < ?'),
      listarDesde: db.prepare<[string], LinhaPresenca>(`
        SELECT p.usuario_id, u.nome, u.perfil, p.iniciado_em
        FROM presenca_usuarios p JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.ultimo_batimento >= ? AND u.ativo = 1
        ORDER BY p.iniciado_em
      `),
    };
  }

  async registrar(sessaoId: string, usuarioId: string, agora: Date): Promise<void> {
    const instante = agora.toISOString();
    this.sql.registrar.run(sessaoId, usuarioId, instante, instante, usuarioId);
  }

  async remover(sessaoId: string): Promise<void> {
    this.sql.remover.run(sessaoId);
  }

  async listarDesde(limite: Date): Promise<PresencaAtiva[]> {
    const iso = limite.toISOString();
    // Instâncias que fecharam sem avisar (queda, kill) ficam para trás: limpa as bem antigas.
    this.sql.limpar.run(new Date(limite.getTime() - 24 * 3_600_000).toISOString());
    return this.sql.listarDesde.all(iso).map((linha) => ({
      usuarioId: linha.usuario_id,
      nome: linha.nome,
      perfil: linha.perfil,
      iniciadoEm: new Date(linha.iniciado_em),
    }));
  }
}
