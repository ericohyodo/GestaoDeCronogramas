import type { ControleDeVersao } from '../../aplicacao/portas/controle-de-versao';
import { ErroConflitoDeEdicao } from '../../aplicacao/erros';
import type { BancoDeDados } from './conexao-sqlite';

/** Contadores de versão na tabela `controle_de_versao`; o avanço é um único UPDATE condicional. */
export class ControleDeVersaoSqlite implements ControleDeVersao {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obter: db.prepare<[string], number>('SELECT versao FROM controle_de_versao WHERE chave = ?').pluck(),
      criar: db.prepare<[string]>('INSERT OR IGNORE INTO controle_de_versao (chave, versao) VALUES (?, 1)'),
      avancar: db.prepare<[string]>('UPDATE controle_de_versao SET versao = versao + 1 WHERE chave = ?'),
      avancarSeIgual: db.prepare<[string, number]>(
        'UPDATE controle_de_versao SET versao = versao + 1 WHERE chave = ? AND versao = ?',
      ),
    };
  }

  /** @inheritdoc */
  obter(chave: string): number {
    return this.sql.obter.get(chave) ?? 1;
  }

  /** @inheritdoc */
  confirmar(chave: string, versaoEsperada?: number | null): number {
    return this.db.transaction(() => {
      this.sql.criar.run(chave);
      if (versaoEsperada == null) {
        this.sql.avancar.run(chave);
      } else if (this.sql.avancarSeIgual.run(chave, versaoEsperada).changes === 0) {
        throw new ErroConflitoDeEdicao();
      }
      return this.sql.obter.get(chave)!;
    })();
  }
}
