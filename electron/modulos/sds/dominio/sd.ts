import { ErroDeDominio, ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { somarDiasCorridos } from '../../../nucleo/dominio/calendario';
import { normalizarTextoOpcional } from '../../../nucleo/dominio/texto';

// =====================================================================================================
// SD — Solicitação de Desenvolvimento. Passagem de bastão do Comercial para a Engenharia:
//   pre_sd  (criada ao finalizar a AV; o Comercial preenche)
//     └─ abrir ──► aberta  (aguarda a Engenharia)
//                    ├─ aceitar ──► fechada  (projeto PRO criado)
//                    └─ devolver ──► pre_sd  (com motivo; o Comercial corrige e abre de novo)
// =====================================================================================================

export type StatusSd = 'pre_sd' | 'aberta' | 'fechada' | 'cancelada';

const TAMANHO_MAXIMO_PO = 60;
const TAMANHO_MAXIMO_OBSERVACOES = 2000;
const TAMANHO_MAXIMO_MOTIVO = 500;
const TAMANHO_MAXIMO_OBSERVACAO_PRAZO = 500;
/** Lead time acordado com o cliente: de 1 dia a 5 anos (dias corridos). */
const LEAD_TIME_MAXIMO = 1825;
const TAMANHO_MINIMO_JUSTIFICATIVA = 10;
const TAMANHO_MAXIMO_JUSTIFICATIVA = 1000;

export interface Sd {
  id: string;
  avId: string;
  numero: string;
  status: StatusSd;
  criadoPor: string | null;
  criadoEm: Date;
  /** Data (AAAA-MM-DD) em que a cotação foi enviada ao cliente. */
  dataEnvioCotacao: string | null;
  /** Número do pedido de compra (PO) do cliente, quando houver. */
  numeroPo: string | null;
  observacoes: string | null;
  abertaPor: string | null;
  abertaEm: Date | null;
  aceitePor: string | null;
  aceiteEm: Date | null;
  /** Observações da Engenharia registradas no aceite. */
  parecerAceite: string | null;
  devolucaoMotivo: string | null;
  devolucaoPor: string | null;
  devolucaoEm: Date | null;
  /** Projeto (cronograma) criado no aceite. */
  cronogramaId: string | null;
  /** Prazo acordado com o cliente, em dias corridos (lead time). Define o término do PRO no aceite. */
  leadTimeDias: number | null;
  /** Observação do Comercial sobre o prazo acordado (marcos do cliente etc.). */
  leadTimeObservacao: string | null;
  /** Justificativa da Engenharia quando o término do PRO difere de início + lead time. */
  prazoJustificativa: string | null;
}

/**
 * A SD e o projeto herdam o sequencial/ano da AV: só o prefixo muda (`AV 26-007` → `SD 26-007`). O marcador
 * de histórico se mantém (`H-AV 26-028` → `H-SD 26-028`), para não colidir com a numeração do uso real.
 */
export function trocarPrefixoDoNumero(numeroAv: string, prefixo: 'SD' | 'PRO'): string {
  const historico = numeroAv.startsWith('H-');
  return `${historico ? 'H-' : ''}${(historico ? numeroAv.slice(2) : numeroAv).replace(/^\S+/, prefixo)}`;
}

/** Dados do produto (da AV de origem) que a Engenharia confirma no aceite. */
export interface EspecificacoesSd {
  codigo: string | null;
  programa: string | null;
  volumeAnual: number | null;
  complexidade: string | null;
  linha: string | null;
  familia: string | null;
}

/** Uma SD junto com os dados da AV de origem que as telas precisam mostrar. */
export interface SdListada {
  sd: Sd;
  avNumero: string;
  cliente: string | null;
  descricao: string;
  /** Responsável pelo Comercial na AV: quem preenche e abre a SD. */
  responsavelComercialId: string | null;
  /** Código do projeto criado no aceite (`PRO 26-007`). */
  codigoProjeto: string | null;
  /** Criada antes do uso multiusuário (migração 0042). */
  historico: boolean;
  especificacoes: EspecificacoesSd;
}

/** SD recém-criada a partir da AV finalizada. */
export function novaPreSd(dados: { id: string; avId: string; avNumero: string; usuarioId: string | null; agora: Date }): Sd {
  return {
    id: dados.id,
    avId: dados.avId,
    numero: trocarPrefixoDoNumero(dados.avNumero, 'SD'),
    status: 'pre_sd',
    criadoPor: dados.usuarioId,
    criadoEm: dados.agora,
    dataEnvioCotacao: null,
    numeroPo: null,
    observacoes: null,
    abertaPor: null,
    abertaEm: null,
    aceitePor: null,
    aceiteEm: null,
    parecerAceite: null,
    devolucaoMotivo: null,
    devolucaoPor: null,
    devolucaoEm: null,
    cronogramaId: null,
    leadTimeDias: null,
    leadTimeObservacao: null,
    prazoJustificativa: null,
  };
}

function exigirStatus(sd: Sd, esperado: StatusSd, acao: string): void {
  if (sd.status !== esperado) {
    const rotulo: Record<StatusSd, string> = {
      pre_sd: 'Pré-SD',
      aberta: 'aberta',
      fechada: 'fechada',
      cancelada: 'cancelada',
    };
    throw new ErroDeDominio('SD_STATUS_INVALIDO', `Não é possível ${acao}: a SD está ${rotulo[sd.status]}.`);
  }
}

/** Valida data no formato AAAA-MM-DD (data real do calendário). */
function validarDataOpcional(data: string | null | undefined, rotulo: string): string | null {
  const texto = normalizarTextoOpcional(data);
  if (texto === null) return null;
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(`${texto}T00:00:00Z`));
  if (!valida || new Date(`${texto}T00:00:00Z`).toISOString().slice(0, 10) !== texto) {
    throw new ErroDeValidacao(`${rotulo} inválida.`);
  }
  return texto;
}

function limitar(texto: string | null | undefined, maximo: number, rotulo: string): string | null {
  const valor = normalizarTextoOpcional(texto);
  if (valor !== null && valor.length > maximo) {
    throw new ErroDeValidacao(`${rotulo} pode ter no máximo ${maximo} caracteres.`);
  }
  return valor;
}

/**
 * Valida o lead time informado pelo Comercial.
 * @param dias valor digitado (ausente = não informado)
 * @returns o número de dias, ou `null` se não informado
 */
function validarLeadTime(dias: number | null | undefined): number | null {
  if (dias === null || dias === undefined) return null;
  if (!Number.isInteger(dias) || dias < 1 || dias > LEAD_TIME_MAXIMO) {
    throw new ErroDeValidacao(`O prazo acordado deve ser um número inteiro de dias, de 1 a ${LEAD_TIME_MAXIMO}.`);
  }
  return dias;
}

/** Atualiza os campos do Comercial. Só enquanto a SD não foi aberta (ou depois de devolvida). */
export function atualizarFormulario(
  sd: Sd,
  campos: {
    dataEnvioCotacao?: string | null;
    numeroPo?: string | null;
    observacoes?: string | null;
    leadTimeDias?: number | null;
    leadTimeObservacao?: string | null;
  },
): Sd {
  exigirStatus(sd, 'pre_sd', 'alterar o formulário');
  return {
    ...sd,
    dataEnvioCotacao: validarDataOpcional(campos.dataEnvioCotacao, 'A data de envio da cotação'),
    numeroPo: limitar(campos.numeroPo, TAMANHO_MAXIMO_PO, 'O número do PO'),
    observacoes: limitar(campos.observacoes, TAMANHO_MAXIMO_OBSERVACOES, 'As observações'),
    leadTimeDias: validarLeadTime(campos.leadTimeDias),
    leadTimeObservacao: limitar(campos.leadTimeObservacao, TAMANHO_MAXIMO_OBSERVACAO_PRAZO, 'A observação do prazo'),
  };
}

/**
 * Comercial abre a SD (entrega para a Engenharia).
 * @param quantidadeDeEvidencias anexos de oficialização do cliente (PO, e-mail…) já gravados
 */
export function abrirSd(sd: Sd, usuarioId: string, agora: Date, quantidadeDeEvidencias: number): Sd {
  exigirStatus(sd, 'pre_sd', 'abrir a SD');
  if (!sd.dataEnvioCotacao) {
    throw new ErroDeValidacao('Informe a data de envio da cotação antes de abrir a SD.');
  }
  if (sd.leadTimeDias === null) {
    throw new ErroDeValidacao('Informe o prazo acordado com o cliente (em dias).');
  }
  if (quantidadeDeEvidencias < 1) {
    throw new ErroDeValidacao(
      'Anexe a evidência de oficialização do cliente (PO, e-mail ou documento) antes de abrir a SD.',
    );
  }
  return { ...sd, status: 'aberta', abertaPor: usuarioId, abertaEm: agora };
}

/**
 * Regra do término no aceite: o PRO termina em início + lead time. Se a Engenharia escolher outro término,
 * precisa justificar (a SD antiga, sem lead time, não exige).
 * @param sd SD aberta
 * @param dataInicio início previsto do PRO (AAAA-MM-DD)
 * @param dataFim término previsto do PRO (AAAA-MM-DD)
 * @param justificativa texto da Engenharia, se houver
 * @returns a justificativa normalizada, ou `null` quando não é necessária
 */
export function exigirJustificativaDoPrazo(
  sd: Sd,
  dataInicio: string,
  dataFim: string,
  justificativa?: string | null,
): string | null {
  if (sd.leadTimeDias === null || dataFim === somarDiasCorridos(dataInicio, sd.leadTimeDias)) return null;
  const texto = limitar(justificativa, TAMANHO_MAXIMO_JUSTIFICATIVA, 'A justificativa do prazo');
  if (!texto || texto.length < TAMANHO_MINIMO_JUSTIFICATIVA) {
    throw new ErroDeValidacao(
      `Justifique a alteração do prazo acordado (mínimo de ${TAMANHO_MINIMO_JUSTIFICATIVA} caracteres).`,
    );
  }
  return texto;
}

/** Engenharia aceita: a SD fecha e passa a apontar para o projeto criado. */
export function aceitarSd(
  sd: Sd,
  usuarioId: string,
  agora: Date,
  cronogramaId: string,
  parecer?: string | null,
  justificativaPrazo?: string | null,
): Sd {
  exigirStatus(sd, 'aberta', 'dar o aceite');
  return {
    ...sd,
    status: 'fechada',
    aceitePor: usuarioId,
    aceiteEm: agora,
    cronogramaId,
    parecerAceite: limitar(parecer, TAMANHO_MAXIMO_OBSERVACOES, 'O parecer'),
    prazoJustificativa: justificativaPrazo ?? null,
  };
}

/** Engenharia devolve ao Comercial com motivo obrigatório. */
export function devolverSd(sd: Sd, usuarioId: string, agora: Date, motivo: string): Sd {
  exigirStatus(sd, 'aberta', 'devolver a SD');
  const texto = limitar(motivo, TAMANHO_MAXIMO_MOTIVO, 'O motivo');
  if (!texto) throw new ErroDeValidacao('Informe o motivo da devolução.');
  return {
    ...sd,
    status: 'pre_sd',
    abertaPor: null,
    abertaEm: null,
    devolucaoMotivo: texto,
    devolucaoPor: usuarioId,
    devolucaoEm: agora,
  };
}
