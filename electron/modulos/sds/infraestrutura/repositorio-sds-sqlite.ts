import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { AnexoSd, RepositorioAnexosSd, RepositorioSds } from '../dominio/repositorio-sds';
import type { Sd, SdListada, StatusSd } from '../dominio/sd';

interface LinhaSd {
  id: string;
  av_id: string;
  numero: string;
  status: StatusSd;
  criado_por: string | null;
  criado_em: string;
  data_envio_cotacao: string | null;
  numero_po: string | null;
  observacoes: string | null;
  aberta_por: string | null;
  aberta_em: string | null;
  aceite_por: string | null;
  aceite_em: string | null;
  parecer_aceite: string | null;
  devolucao_motivo: string | null;
  devolucao_por: string | null;
  devolucao_em: string | null;
  cronograma_id: string | null;
  lead_time_dias: number | null;
  lead_time_observacao: string | null;
  prazo_justificativa: string | null;
}

interface LinhaSdListada extends LinhaSd {
  av_numero: string;
  cliente: string | null;
  descricao: string;
  membro_comercial: string | null;
  codigo_projeto: string | null;
  historico: number;
  av_codigo: string | null;
  av_programa: string | null;
  av_volume_anual: number | null;
  av_complexidade: string | null;
  av_linha: string | null;
  av_familia: string | null;
}

// Junta a AV de origem e o projeto só para leitura; a SD nunca grava na AV por aqui.
const SELECT_LISTADA = `
  SELECT sd.*, av.numero AS av_numero, av.cliente AS cliente, av.descricao AS descricao,
         av.membro_comercial AS membro_comercial, c.codigo AS codigo_projeto,
         av.codigo AS av_codigo, av.programa AS av_programa, av.volume_anual AS av_volume_anual,
         av.complexidade AS av_complexidade, av.linha AS av_linha, av.familia AS av_familia
  FROM sd
  JOIN av ON av.id = sd.av_id
  LEFT JOIN cronogramas c ON c.id = sd.cronograma_id
`;

const data = (valor: Date | null) => (valor ? valor.toISOString() : null);
const dataOuNull = (valor: string | null) => (valor ? new Date(valor) : null);

export class RepositorioSdsSqlite implements RepositorioSds {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[], LinhaSdListada>(`${SELECT_LISTADA} ORDER BY sd.criado_em DESC`),
      obterPorAv: db.prepare<[string], LinhaSdListada>(`${SELECT_LISTADA} WHERE sd.av_id = ?`),
      obterPorId: db.prepare<[string], LinhaSdListada>(`${SELECT_LISTADA} WHERE sd.id = ?`),
      salvar: db.prepare<[LinhaSd]>(`
        INSERT INTO sd (
          id, av_id, numero, status, criado_por, criado_em, data_envio_cotacao, numero_po, observacoes,
          aberta_por, aberta_em, aceite_por, aceite_em, devolucao_motivo, devolucao_por, devolucao_em, cronograma_id,
          parecer_aceite, lead_time_dias, lead_time_observacao, prazo_justificativa
        ) VALUES (
          @id, @av_id, @numero, @status, @criado_por, @criado_em, @data_envio_cotacao, @numero_po, @observacoes,
          @aberta_por, @aberta_em, @aceite_por, @aceite_em, @devolucao_motivo, @devolucao_por, @devolucao_em,
          @cronograma_id, @parecer_aceite, @lead_time_dias, @lead_time_observacao, @prazo_justificativa
        )
        ON CONFLICT (id) DO UPDATE SET
          status             = excluded.status,
          data_envio_cotacao = excluded.data_envio_cotacao,
          numero_po          = excluded.numero_po,
          observacoes        = excluded.observacoes,
          aberta_por         = excluded.aberta_por,
          aberta_em          = excluded.aberta_em,
          aceite_por         = excluded.aceite_por,
          aceite_em          = excluded.aceite_em,
          parecer_aceite     = excluded.parecer_aceite,
          devolucao_motivo   = excluded.devolucao_motivo,
          devolucao_por      = excluded.devolucao_por,
          devolucao_em       = excluded.devolucao_em,
          cronograma_id      = excluded.cronograma_id,
          lead_time_dias       = excluded.lead_time_dias,
          lead_time_observacao = excluded.lead_time_observacao,
          prazo_justificativa  = excluded.prazo_justificativa
      `),
    };
  }

  async salvar(sd: Sd): Promise<void> {
    this.sql.salvar.run({
      id: sd.id,
      av_id: sd.avId,
      numero: sd.numero,
      status: sd.status,
      criado_por: sd.criadoPor,
      criado_em: sd.criadoEm.toISOString(),
      data_envio_cotacao: sd.dataEnvioCotacao,
      numero_po: sd.numeroPo,
      observacoes: sd.observacoes,
      aberta_por: sd.abertaPor,
      aberta_em: data(sd.abertaEm),
      aceite_por: sd.aceitePor,
      aceite_em: data(sd.aceiteEm),
      parecer_aceite: sd.parecerAceite,
      devolucao_motivo: sd.devolucaoMotivo,
      devolucao_por: sd.devolucaoPor,
      devolucao_em: data(sd.devolucaoEm),
      cronograma_id: sd.cronogramaId,
      lead_time_dias: sd.leadTimeDias,
      lead_time_observacao: sd.leadTimeObservacao,
      prazo_justificativa: sd.prazoJustificativa,
    });
  }

  async obterPorId(id: string): Promise<SdListada | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraListada(linha) : null;
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
      dataEnvioCotacao: linha.data_envio_cotacao,
      numeroPo: linha.numero_po,
      observacoes: linha.observacoes,
      abertaPor: linha.aberta_por,
      abertaEm: dataOuNull(linha.aberta_em),
      aceitePor: linha.aceite_por,
      aceiteEm: dataOuNull(linha.aceite_em),
      parecerAceite: linha.parecer_aceite,
      devolucaoMotivo: linha.devolucao_motivo,
      devolucaoPor: linha.devolucao_por,
      devolucaoEm: dataOuNull(linha.devolucao_em),
      cronogramaId: linha.cronograma_id,
      leadTimeDias: linha.lead_time_dias,
      leadTimeObservacao: linha.lead_time_observacao,
      prazoJustificativa: linha.prazo_justificativa,
    },
    avNumero: linha.av_numero,
    cliente: linha.cliente,
    descricao: linha.descricao,
    responsavelComercialId: linha.membro_comercial,
    codigoProjeto: linha.codigo_projeto,
    historico: linha.historico === 1,
    especificacoes: {
      codigo: linha.av_codigo,
      programa: linha.av_programa,
      volumeAnual: linha.av_volume_anual,
      complexidade: linha.av_complexidade,
      linha: linha.av_linha,
      familia: linha.av_familia,
    },
  };
}

interface LinhaAnexoSd {
  id: string;
  sd_id: string;
  nome_arquivo: string;
  nome_armazenado: string;
  tipo_mime: string | null;
  tamanho_bytes: number;
  usuario_id: string | null;
  criado_em: string;
}

const paraAnexo = (linha: LinhaAnexoSd): AnexoSd => ({
  id: linha.id,
  sdId: linha.sd_id,
  nomeArquivo: linha.nome_arquivo,
  nomeArmazenado: linha.nome_armazenado,
  tipoMime: linha.tipo_mime,
  tamanhoBytes: linha.tamanho_bytes,
  usuarioId: linha.usuario_id,
  criadoEm: new Date(linha.criado_em),
});

export class RepositorioAnexosSdSqlite implements RepositorioAnexosSd {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      inserir: db.prepare<[LinhaAnexoSd]>(`
        INSERT INTO sd_anexos (id, sd_id, nome_arquivo, nome_armazenado, tipo_mime, tamanho_bytes, usuario_id, criado_em)
        VALUES (@id, @sd_id, @nome_arquivo, @nome_armazenado, @tipo_mime, @tamanho_bytes, @usuario_id, @criado_em)
      `),
      listar: db.prepare<[string], LinhaAnexoSd>('SELECT * FROM sd_anexos WHERE sd_id = ? ORDER BY criado_em'),
      obterPorId: db.prepare<[string], LinhaAnexoSd>('SELECT * FROM sd_anexos WHERE id = ?'),
      excluir: db.prepare<[string]>('DELETE FROM sd_anexos WHERE id = ?'),
      contar: db.prepare<[string], number>('SELECT COUNT(*) FROM sd_anexos WHERE sd_id = ?').pluck(),
    };
  }

  async inserir(anexo: AnexoSd): Promise<void> {
    this.sql.inserir.run({
      id: anexo.id,
      sd_id: anexo.sdId,
      nome_arquivo: anexo.nomeArquivo,
      nome_armazenado: anexo.nomeArmazenado,
      tipo_mime: anexo.tipoMime,
      tamanho_bytes: anexo.tamanhoBytes,
      usuario_id: anexo.usuarioId,
      criado_em: anexo.criadoEm.toISOString(),
    });
  }

  async listar(sdId: string): Promise<AnexoSd[]> {
    return this.sql.listar.all(sdId).map(paraAnexo);
  }

  async obterPorId(id: string): Promise<AnexoSd | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraAnexo(linha) : null;
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }

  async contar(sdId: string): Promise<number> {
    return this.sql.contar.get(sdId) ?? 0;
  }
}
