import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type {
  AnaliseArquivadaDTO,
  RepositorioDeAnalises,
  ResumoDeAnaliseDTO,
  TipoDeAnaliseDTO,
} from '../aplicacao/portas';

interface LinhaAnalise {
  id: string;
  tipo: TipoDeAnaliseDTO;
  cronograma_id: string | null;
  titulo: string;
  modelo: string;
  saude: ResumoDeAnaliseDTO['saude'];
  gerada_em: string;
  gerada_por: string | null;
}

interface LinhaAnaliseCompleta extends LinhaAnalise {
  conteudo: string;
}

const COLUNAS_DO_RESUMO = 'id, tipo, cronograma_id, titulo, modelo, saude, gerada_em, gerada_por';

/**
 * O relatório inteiro fica em JSON (`conteudo`); as colunas ao lado servem para listar e filtrar
 * sem abrir cada um. As análises não dependem do cronograma continuar existindo.
 */
export class RepositorioDeAnalisesSqlite implements RepositorioDeAnalises {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      salvar: db.prepare<[LinhaAnaliseCompleta]>(`
        INSERT INTO ia_analises
          (id, tipo, cronograma_id, titulo, modelo, saude, gerada_em, gerada_por, conteudo)
        VALUES
          (@id, @tipo, @cronograma_id, @titulo, @modelo, @saude, @gerada_em, @gerada_por, @conteudo)
      `),
      listar: db.prepare<[], LinhaAnalise>(
        `SELECT ${COLUNAS_DO_RESUMO} FROM ia_analises ORDER BY gerada_em DESC`,
      ),
      obter: db.prepare<[string], LinhaAnaliseCompleta>('SELECT * FROM ia_analises WHERE id = ?'),
      ultimaDoCronograma: db.prepare<[string], LinhaAnaliseCompleta>(`
        SELECT * FROM ia_analises WHERE tipo = 'cronograma' AND cronograma_id = ?
        ORDER BY gerada_em DESC LIMIT 1
      `),
      ultimaDoPortfolio: db.prepare<[], LinhaAnaliseCompleta>(`
        SELECT * FROM ia_analises WHERE tipo = 'portfolio' ORDER BY gerada_em DESC LIMIT 1
      `),
      excluir: db.prepare<[string]>('DELETE FROM ia_analises WHERE id = ?'),
    };
  }

  async salvar(analise: AnaliseArquivadaDTO): Promise<void> {
    this.sql.salvar.run({
      id: analise.id,
      tipo: analise.tipo,
      cronograma_id: analise.cronogramaId,
      titulo: analise.titulo,
      modelo: analise.modelo,
      saude: analise.saude,
      gerada_em: analise.geradaEm,
      gerada_por: analise.geradaPor,
      conteudo: JSON.stringify(analise.analise),
    });
  }

  async listar(): Promise<ResumoDeAnaliseDTO[]> {
    return this.sql.listar.all().map(paraResumo);
  }

  async obter(id: string): Promise<AnaliseArquivadaDTO | null> {
    const linha = this.sql.obter.get(id);
    return linha ? paraAnalise(linha) : null;
  }

  async ultima(tipo: TipoDeAnaliseDTO, cronogramaId: string | null): Promise<AnaliseArquivadaDTO | null> {
    const linha =
      tipo === 'portfolio'
        ? this.sql.ultimaDoPortfolio.get()
        : cronogramaId === null
          ? undefined
          : this.sql.ultimaDoCronograma.get(cronogramaId);
    return linha ? paraAnalise(linha) : null;
  }

  async excluir(id: string): Promise<boolean> {
    return this.sql.excluir.run(id).changes > 0;
  }
}

function paraResumo(linha: LinhaAnalise): ResumoDeAnaliseDTO {
  return {
    id: linha.id,
    tipo: linha.tipo,
    cronogramaId: linha.cronograma_id,
    titulo: linha.titulo,
    modelo: linha.modelo,
    saude: linha.saude,
    geradaEm: linha.gerada_em,
    geradaPor: linha.gerada_por,
  };
}

function paraAnalise(linha: LinhaAnaliseCompleta): AnaliseArquivadaDTO {
  // O JSON foi gravado por este mesmo repositório a partir de um DTO já validado.
  return { ...paraResumo(linha), analise: JSON.parse(linha.conteudo) } as AnaliseArquivadaDTO;
}
