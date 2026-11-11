import { ErroDeDominio, ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
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
  devolucaoMotivo: string | null;
  devolucaoPor: string | null;
  devolucaoEm: Date | null;
  /** Projeto (cronograma) criado no aceite. */
  cronogramaId: string | null;
}

/** A SD e o projeto herdam o sequencial/ano da AV: só o prefixo muda (`AV 26-007` → `SD 26-007`). */
export function trocarPrefixoDoNumero(numeroAv: string, prefixo: 'SD' | 'PRO'): string {
  return numeroAv.replace(/^\S+/, prefixo);
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
    devolucaoMotivo: null,
    devolucaoPor: null,
    devolucaoEm: null,
    cronogramaId: null,
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

/** Atualiza os campos do Comercial. Só enquanto a SD não foi aberta (ou depois de devolvida). */
export function atualizarFormulario(
  sd: Sd,
  campos: { dataEnvioCotacao?: string | null; numeroPo?: string | null; observacoes?: string | null },
): Sd {
  exigirStatus(sd, 'pre_sd', 'alterar o formulário');
  return {
    ...sd,
    dataEnvioCotacao: validarDataOpcional(campos.dataEnvioCotacao, 'A data de envio da cotação'),
    numeroPo: limitar(campos.numeroPo, TAMANHO_MAXIMO_PO, 'O número do PO'),
    observacoes: limitar(campos.observacoes, TAMANHO_MAXIMO_OBSERVACOES, 'As observações'),
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
  if (quantidadeDeEvidencias < 1) {
    throw new ErroDeValidacao(
      'Anexe a evidência de oficialização do cliente (PO, e-mail ou documento) antes de abrir a SD.',
    );
  }
  return { ...sd, status: 'aberta', abertaPor: usuarioId, abertaEm: agora };
}

/** Engenharia aceita: a SD fecha e passa a apontar para o projeto criado. */
export function aceitarSd(sd: Sd, usuarioId: string, agora: Date, cronogramaId: string): Sd {
  exigirStatus(sd, 'aberta', 'dar o aceite');
  return { ...sd, status: 'fechada', aceitePor: usuarioId, aceiteEm: agora, cronogramaId };
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
