import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { ItemCatalogoMaterial, RepositorioCatalogoCusto } from '../dominio/repositorio-secao-custo';

export class RepositorioCatalogoCustoSqlite implements RepositorioCatalogoCusto {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listarOperacoes: db.prepare<[], { nome: string }>(
        'SELECT nome FROM av_catalogo_operacoes ORDER BY nome',
      ),
      listarMaquinas: db.prepare<[], { nome: string }>(
        'SELECT nome FROM av_catalogo_maquinas ORDER BY nome',
      ),
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
