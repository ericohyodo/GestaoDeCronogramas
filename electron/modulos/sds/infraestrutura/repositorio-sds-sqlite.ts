import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { Sd, SdListada, StatusSd } from '../dominio/sd';
import type { RepositorioSds } from '../dominio/repositorio-sds';

interface LinhaSd {
  id: string;
  av_id: string;
  numero: string;
  status: StatusSd;
  criado_por: string | null;
  criado_em: string;
}

interface LinhaSdListada extends LinhaSd {
  av_numero: string;
  cliente: string | null;
  descricao: string;
}

// Junta a AV de origem só para leitura (número, cliente, descrição); a SD nunca altera a AV.
const SELECT_LISTADA = `
  SELECT sd.*, av.numero AS av_numero, av.cliente AS cliente, av.descricao AS descricao
  FROM sd JOIN av ON av.id = sd.av_id
`;

export class RepositorioSdsSqlite implements RepositorioSds {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[], LinhaSdListada>(`${SELECT_LISTADA} ORDER BY sd.criado_em DESC`),
      obterPorAv: db.prepare<[string], LinhaSdListada>(`${SELECT_LISTADA} WHERE sd.av_id = ?`),
      inserir: db.prepare<[LinhaSd]>(`
        INSERT INTO sd (id, av_id, numero, status, criado_por, criado_em)
        VALUES (@id, @av_id, @numero, @status, @criado_por, @criado_em)
      `),
    };
  }

  async salvar(sd: Sd): Promise<void> {
    this.sql.inserir.run({
      id: sd.id,
      av_id: sd.avId,
      numero: sd.numero,
      status: sd.status,
      criado_por: sd.criadoPor,
      criado_em: sd.criadoEm.toISOString(),
    });
  }

  async obterPorAv(avId: string): Promise<SdListada | null> {
    const linha = this.sql.obterPorAv.get(avId);
    return linha ? paraListada(linha) : null;
  }

  async listar(): Promise<SdListada[]> {
    return this.sql.listar.all().map(paraListada);
  }
}

function paraListada(linha: LinhaSdListada): SdListada {
  return {
    sd: {
      id: linha.id,
      avId: linha.av_id,
      numero: linha.numero,
      status: linha.status,
      criadoPor: linha.criado_por,
      criadoEm: new Date(linha.criado_em),
    },
    avNumero: linha.av_numero,
    cliente: linha.cliente,
    descricao: linha.descricao,
  };
}
