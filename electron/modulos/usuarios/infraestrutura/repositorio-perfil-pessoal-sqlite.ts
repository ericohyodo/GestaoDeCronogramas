import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { PerfilPessoal, RepositorioPerfilPessoal, TipoDeFoto } from '../dominio/perfil-pessoal';

interface LinhaPerfil {
  usuario_id: string;
  cargo: string | null;
  ramal: string | null;
  celular: string | null;
  sobre: string | null;
  foto_base64: string | null;
  foto_mime: TipoDeFoto | null;
  atualizado_em: string;
}

/** Perfil pessoal dos usuários (tabela `usuarios_perfil`, uma linha por usuário). */
export class RepositorioPerfilPessoalSqlite implements RepositorioPerfilPessoal {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      obter: db.prepare<[string], LinhaPerfil>('SELECT * FROM usuarios_perfil WHERE usuario_id = ?'),
      salvar: db.prepare<[LinhaPerfil]>(`
        INSERT INTO usuarios_perfil (usuario_id, cargo, ramal, celular, sobre, foto_base64, foto_mime, atualizado_em)
        VALUES (@usuario_id, @cargo, @ramal, @celular, @sobre, @foto_base64, @foto_mime, @atualizado_em)
        ON CONFLICT (usuario_id) DO UPDATE SET
          cargo = excluded.cargo, ramal = excluded.ramal, celular = excluded.celular, sobre = excluded.sobre,
          foto_base64 = excluded.foto_base64, foto_mime = excluded.foto_mime, atualizado_em = excluded.atualizado_em
      `),
    };
  }

  async obter(usuarioId: string): Promise<PerfilPessoal | null> {
    const linha = this.sql.obter.get(usuarioId);
    if (!linha) return null;
    return {
      usuarioId: linha.usuario_id,
      cargo: linha.cargo,
      ramal: linha.ramal,
      celular: linha.celular,
      sobre: linha.sobre,
      foto: linha.foto_base64 && linha.foto_mime ? { base64: linha.foto_base64, mime: linha.foto_mime } : null,
      atualizadoEm: new Date(linha.atualizado_em),
    };
  }

  async salvar(perfil: PerfilPessoal): Promise<void> {
    this.sql.salvar.run({
      usuario_id: perfil.usuarioId,
      cargo: perfil.cargo,
      ramal: perfil.ramal,
      celular: perfil.celular,
      sobre: perfil.sobre,
      foto_base64: perfil.foto?.base64 ?? null,
      foto_mime: perfil.foto?.mime ?? null,
      atualizado_em: perfil.atualizadoEm.toISOString(),
    });
  }
}
