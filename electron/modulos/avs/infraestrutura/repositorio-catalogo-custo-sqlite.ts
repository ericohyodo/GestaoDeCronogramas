import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { ItemCatalogoMaterial, RepositorioCatalogoCusto } from '../dominio/repositorio-secao-custo';

export class RepositorioCatalogoCustoSqlite implements RepositorioCatalogoCusto {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      // Além do catálogo semeado, sugere tudo que já foi digitado em outras AVs (operações e custo).
      listarOperacoes: db.prepare<[], { nome: string }>(`
        SELECT nome FROM av_catalogo_operacoes
        UNION SELECT TRIM(descricao) FROM av_operacoes
        UNION SELECT TRIM(processo) FROM av_custo_processo WHERE TRIM(COALESCE(processo, '')) <> ''
        ORDER BY 1 COLLATE NOCASE
      `),
      listarMaquinas: db.prepare<[], { nome: string }>(`
        SELECT nome FROM av_catalogo_maquinas
        UNION SELECT TRIM(maquina) FROM av_operacoes WHERE TRIM(COALESCE(maquina, '')) <> ''
        UNION SELECT TRIM(maquina) FROM av_custo_processo WHERE TRIM(COALESCE(maquina, '')) <> ''
        ORDER BY 1 COLLATE NOCASE
      `),
      listarMateriais: db.prepare<[string], { codigo: string; descricao: string }>(
        'SELECT codigo, descricao FROM av_catalogo_materiais WHERE tipo = ? ORDER BY descricao',
      ),
    };
  }

  async listarOperacoes(): Promise<string[]> {
    return this.sql.listarOperacoes.all().map((linha) => linha.nome);
  }

  async listarMaquinas(): Promise<string[]> {
    return this.sql.listarMaquinas.all().map((linha) => linha.nome);
  }

  async listarMateriais(tipo: 'materia_prima' | 'embalagem'): Promise<ItemCatalogoMaterial[]> {
    return this.sql.listarMateriais.all(tipo);
  }
}
