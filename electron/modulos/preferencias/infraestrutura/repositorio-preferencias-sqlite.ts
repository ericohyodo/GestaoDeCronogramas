import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RepositorioPreferencias } from '../dominio/repositorio-preferencias';
import { TEMAS, type Tema } from '../dominio/tema';

const CHAVE_TEMA = 'tema';

/** Preferências gravadas como pares chave/valor na tabela `preferencias`. */
export class RepositorioPreferenciasSqlite implements RepositorioPreferencias {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      obter: db.prepare<[string], string>('SELECT valor FROM preferencias WHERE chave = ?').pluck(),
      salvar: db.prepare<[string, string]>(`
        INSERT INTO preferencias (chave, valor) VALUES (?, ?)
        ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor
      `),
    };
  }

  async obterTema(): Promise<Tema | null> {
    const valor = this.sql.obter.get(CHAVE_TEMA);
    // Valor desconhecido (ex.: gravado por outra versão) é tratado como "não definido".
    return valor !== undefined && (TEMAS as readonly string[]).includes(valor) ? (valor as Tema) : null;
  }

  async salvarTema(tema: Tema): Promise<void> {
    this.sql.salvar.run(CHAVE_TEMA, tema);
  }
}
