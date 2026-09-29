import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { Area } from '../dominio/area';
import { Av } from '../dominio/av';
import type { RepositorioAvs } from '../dominio/repositorio-avs';

interface LinhaAv {
  id: string;
  numero: string;
  sequencial: number;
  ano: number;
  cliente: string | null;
  codigo: string | null;
  descricao: string;
  complexidade: string | null;
  solicitante: string | null;
  prazo_cliente: string | null;
  desenho_cliente_ref: string | null;
  contato_comercial: string | null;
  email_comercial: string | null;
  fone_comercial: string | null;
  contato_tecnico: string | null;
  data_fechamento: string | null;
  programa: string | null;
  volume_anual: number | null;
  ano_sop_eop: string | null;
  resp_abertura: string | null;
  linha: string | null;
  origem_projeto: string | null;
  familia: string | null;
  local_entrega: string | null;
  conceito_logistico: string | null;
  resp_embalagem: string | null;
  info_complementar_comercial: string | null;
  etapa_atual: number;
  membro_comercial: string | null;
  membro_produto: string | null;
  membro_processo: string | null;
  membro_pcp: string | null;
  membro_custo: string | null;
  proposta_enviada: number;
  data_proposta: string | null;
  cronograma_id: string | null;
  criado_por: string | null;
  criado_em: string;
  grupo_id: string | null;
  campos_pendentes: string | null;
  grupo_nome?: string | null;
}

// O vínculo com o grupo é lido junto (com o nome), mas gravado só pelo repositório de grupos.
const SELECT_AV = `
  SELECT av.*, g.nome AS grupo_nome
  FROM av LEFT JOIN av_grupo g ON g.id = av.grupo_id
`;

export class RepositorioAvsSqlite implements RepositorioAvs {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[], LinhaAv>(`${SELECT_AV} ORDER BY av.criado_em DESC`),
      obterPorId: db.prepare<[string], LinhaAv>(`${SELECT_AV} WHERE av.id = ?`),
      proximoSequencial: db.prepare<[number], { proximo: number }>(
        'SELECT COALESCE(MAX(sequencial), 0) + 1 AS proximo FROM av WHERE ano = ?',
      ),
      salvar: db.prepare<[LinhaAv]>(`
        INSERT INTO av (
          id, numero, sequencial, ano, cliente, codigo, descricao, complexidade, solicitante,
          prazo_cliente, desenho_cliente_ref, contato_comercial, email_comercial, fone_comercial,
          contato_tecnico, data_fechamento, programa, volume_anual, ano_sop_eop, resp_abertura,
          linha, origem_projeto, familia, local_entrega, conceito_logistico, resp_embalagem,
          info_complementar_comercial, etapa_atual, membro_comercial, membro_produto,
          membro_processo, membro_pcp, membro_custo, proposta_enviada, data_proposta,
          cronograma_id, criado_por, criado_em, grupo_id, campos_pendentes
        ) VALUES (
          @id, @numero, @sequencial, @ano, @cliente, @codigo, @descricao, @complexidade, @solicitante,
          @prazo_cliente, @desenho_cliente_ref, @contato_comercial, @email_comercial, @fone_comercial,
          @contato_tecnico, @data_fechamento, @programa, @volume_anual, @ano_sop_eop, @resp_abertura,
          @linha, @origem_projeto, @familia, @local_entrega, @conceito_logistico, @resp_embalagem,
          @info_complementar_comercial, @etapa_atual, @membro_comercial, @membro_produto,
          @membro_processo, @membro_pcp, @membro_custo, @proposta_enviada, @data_proposta,
          @cronograma_id, @criado_por, @criado_em, @grupo_id, @campos_pendentes
        )
        ON CONFLICT (id) DO UPDATE SET
          cliente                     = excluded.cliente,
          codigo                      = excluded.codigo,
          descricao                   = excluded.descricao,
          complexidade                = excluded.complexidade,
          solicitante                 = excluded.solicitante,
          prazo_cliente               = excluded.prazo_cliente,
          desenho_cliente_ref         = excluded.desenho_cliente_ref,
          contato_comercial           = excluded.contato_comercial,
          email_comercial             = excluded.email_comercial,
          fone_comercial              = excluded.fone_comercial,
          contato_tecnico             = excluded.contato_tecnico,
          data_fechamento             = excluded.data_fechamento,
          programa                    = excluded.programa,
          volume_anual                = excluded.volume_anual,
          ano_sop_eop                 = excluded.ano_sop_eop,
          resp_abertura               = excluded.resp_abertura,
          linha                       = excluded.linha,
          origem_projeto              = excluded.origem_projeto,
          familia                     = excluded.familia,
          campos_pendentes            = excluded.campos_pendentes,
          local_entrega               = excluded.local_entrega,
          conceito_logistico          = excluded.conceito_logistico,
          resp_embalagem              = excluded.resp_embalagem,
          info_complementar_comercial = excluded.info_complementar_comercial,
          etapa_atual                 = excluded.etapa_atual,
          membro_comercial            = excluded.membro_comercial,
          membro_produto              = excluded.membro_produto,
          membro_processo             = excluded.membro_processo,
          membro_pcp                  = excluded.membro_pcp,
          membro_custo                = excluded.membro_custo,
          proposta_enviada            = excluded.proposta_enviada,
          data_proposta               = excluded.data_proposta,
          cronograma_id               = excluded.cronograma_id
      `),
    };
  }

  async listar(): Promise<Av[]> {
    return this.sql.listar.all().map(paraEntidade);
  }

  async obterPorId(id: string): Promise<Av | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha) : null;
  }

  async salvar(av: Av): Promise<void> {
    this.sql.salvar.run(paraLinha(av));
  }

  async proximoSequencial(ano: number): Promise<number> {
    return this.sql.proximoSequencial.get(ano)!.proximo;
  }
}

const COLUNA_POR_AREA: Record<Area, keyof Pick<LinhaAv, 'membro_comercial' | 'membro_produto' | 'membro_processo' | 'membro_pcp' | 'membro_custo'>> = {
  comercial: 'membro_comercial',
  produto: 'membro_produto',
  processo: 'membro_processo',
  pcp: 'membro_pcp',
  custo: 'membro_custo',
};

function paraEntidade(linha: LinhaAv): Av {
  const membros: Partial<Record<Area, string>> = {};
  for (const [area, coluna] of Object.entries(COLUNA_POR_AREA) as [Area, keyof LinhaAv][]) {
    const valor = linha[coluna] as string | null;
    if (valor) membros[area] = valor;
  }

  return Av.reconstituir({
    id: linha.id,
    numero: linha.numero,
    sequencial: linha.sequencial,
    ano: linha.ano,
    cliente: linha.cliente,
    codigo: linha.codigo,
    descricao: linha.descricao,
    complexidade: linha.complexidade,
    solicitante: linha.solicitante,
    prazoCliente: linha.prazo_cliente,
    desenhoClienteRef: linha.desenho_cliente_ref,
    contatoComercial: linha.contato_comercial,
    emailComercial: linha.email_comercial,
    foneComercial: linha.fone_comercial,
    contatoTecnico: linha.contato_tecnico,
    dataFechamento: linha.data_fechamento,
    programa: linha.programa,
    volumeAnual: linha.volume_anual,
    anoSopEop: linha.ano_sop_eop,
    respAbertura: linha.resp_abertura,
    linha: linha.linha,
    origemProjeto: linha.origem_projeto,
    familia: linha.familia,
    localEntrega: linha.local_entrega,
    conceitoLogistico: linha.conceito_logistico,
    respEmbalagem: linha.resp_embalagem,
    infoComplementarComercial: linha.info_complementar_comercial,
    etapaAtual: linha.etapa_atual,
    membros,
    propostaEnviada: linha.proposta_enviada === 1,
    dataProposta: linha.data_proposta ? new Date(linha.data_proposta) : null,
    cronogramaId: linha.cronograma_id,
    criadoPor: linha.criado_por,
    criadoEm: new Date(linha.criado_em),
    grupoId: linha.grupo_id,
    grupoNome: linha.grupo_nome ?? null,
    camposPendentes: linha.campos_pendentes ? (JSON.parse(linha.campos_pendentes) as string[]) : null,
  });
}

function paraLinha(av: Av): LinhaAv {
  const membros = av.membros;
  return {
    id: av.id,
    numero: av.numero,
    sequencial: av.sequencial,
    ano: av.ano,
    cliente: av.cliente,
    codigo: av.codigo,
    descricao: av.descricao,
    complexidade: av.complexidade,
    solicitante: av.solicitante,
    prazo_cliente: av.prazoCliente,
    desenho_cliente_ref: av.desenhoClienteRef,
    contato_comercial: av.contatoComercial,
    email_comercial: av.emailComercial,
    fone_comercial: av.foneComercial,
    contato_tecnico: av.contatoTecnico,
    data_fechamento: av.dataFechamento,
    programa: av.programa,
    volume_anual: av.volumeAnual,
    ano_sop_eop: av.anoSopEop,
    resp_abertura: av.respAbertura,
    linha: av.linha,
    origem_projeto: av.origemProjeto,
    familia: av.familia,
    local_entrega: av.localEntrega,
    conceito_logistico: av.conceitoLogistico,
    resp_embalagem: av.respEmbalagem,
    info_complementar_comercial: av.infoComplementarComercial,
    etapa_atual: av.etapaAtual,
    membro_comercial: membros.comercial ?? null,
    membro_produto: membros.produto ?? null,
    membro_processo: membros.processo ?? null,
    membro_pcp: membros.pcp ?? null,
    membro_custo: membros.custo ?? null,
    proposta_enviada: av.propostaEnviada ? 1 : 0,
    data_proposta: av.dataProposta ? av.dataProposta.toISOString() : null,
    cronograma_id: av.cronogramaId,
    criado_por: av.criadoPor,
    criado_em: av.criadoEm.toISOString(),
    grupo_id: av.grupoId,
    campos_pendentes: av.camposPendentes ? JSON.stringify(av.camposPendentes) : null,
  };
}
