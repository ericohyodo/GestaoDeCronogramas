import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { Area } from '../dominio/area';
import type { PapelAv, PerfilAvUsuario } from '../dominio/papel-av';
import type { RepositorioPerfisAv } from '../dominio/repositorio-perfis-av';

interface LinhaPerfil {
  usuario_id: string;
  papel_av: PapelAv;
}

interface LinhaCompetencia {
  usuario_id: string;
  area: Area;
}

export class RepositorioPerfisAvSqlite implements RepositorioPerfisAv {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obterPerfil: db.prepare<[string], LinhaPerfil>(
        'SELECT usuario_id, papel_av FROM av_perfis_usuario WHERE usuario_id = ?',
      ),
      listarPerfis: db.prepare<[], LinhaPerfil>('SELECT usuario_id, papel_av FROM av_perfis_usuario'),
      obterCompetencias: db.prepare<[string], LinhaCompetencia>(
        'SELECT usuario_id, area FROM av_competencias_usuario WHERE usuario_id = ?',
      ),
      listarCompetencias: db.prepare<[], LinhaCompetencia>(
        'SELECT usuario_id, area FROM av_competencias_usuario',
      ),
      salvarPerfil: db.prepare<[string, PapelAv, string]>(`
        INSERT INTO av_perfis_usuario (usuario_id, papel_av, atualizado_em)
        VALUES (?, ?, ?)
        ON CONFLICT (usuario_id) DO UPDATE SET papel_av = excluded.papel_av, atualizado_em = excluded.atualizado_em
      `),
      limparCompetencias: db.prepare<[string]>('DELETE FROM av_competencias_usuario WHERE usuario_id = ?'),
      inserirCompetencia: db.prepare<[string, Area]>(
        'INSERT INTO av_competencias_usuario (usuario_id, area) VALUES (?, ?)',
      ),
    };
  }

  async obterPerfil(usuarioId: string): Promise<PerfilAvUsuario | null> {
    const perfil = this.sql.obterPerfil.get(usuarioId);
    if (!perfil) return null;
    const competencias = this.sql.obterCompetencias.all(usuarioId).map((linha) => linha.area);
    return { usuarioId: perfil.usuario_id, papelAv: perfil.papel_av, competencias };
  }

  async listarPerfis(): Promise<PerfilAvUsuario[]> {
    const perfis = this.sql.listarPerfis.all();
    const competenciasPorUsuario = new Map<string, Area[]>();
    for (const linha of this.sql.listarCompetencias.all()) {
      const lista = competenciasPorUsuario.get(linha.usuario_id) ?? [];
      lista.push(linha.area);
      competenciasPorUsuario.set(linha.usuario_id, lista);
    }
    return perfis.map((perfil) => ({
      usuarioId: perfil.usuario_id,
      papelAv: perfil.papel_av,
      competencias: competenciasPorUsuario.get(perfil.usuario_id) ?? [],
    }));
  }

  async salvarPerfil(perfil: PerfilAvUsuario): Promise<void> {
    const agora = new Date().toISOString();
    this.db.transaction(() => {
      this.sql.salvarPerfil.run(perfil.usuarioId, perfil.papelAv, agora);
      this.sql.limparCompetencias.run(perfil.usuarioId);
      for (const area of perfil.competencias) {
        this.sql.inserirCompetencia.run(perfil.usuarioId, area);
      }
    })();
  }
}
