import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';
import { AREAS_AV, type Area } from './area';
import { ETAPA_INICIAL } from './etapa-av';

const TAMANHO_MAXIMO_DESCRICAO = 200;

export interface CamposComerciaisAv {
  cliente: string | null;
  codigo: string | null;
  descricao: string;
  complexidade: string | null;
  solicitante: string | null;
  prazoCliente: string | null;
  desenhoClienteRef: string | null;
  contatoComercial: string | null;
  emailComercial: string | null;
  foneComercial: string | null;
  contatoTecnico: string | null;
  dataFechamento: string | null;
  programa: string | null;
  volumeAnual: number | null;
  anoSopEop: string | null;
  respAbertura: string | null;
  linha: string | null;
  origemProjeto: string | null;
  localEntrega: string | null;
  conceitoLogistico: string | null;
  respEmbalagem: string | null;
  infoComplementarComercial: string | null;
}

export interface PropsAv extends CamposComerciaisAv {
  id: string;
  numero: string;
  sequencial: number;
  ano: number;
  etapaAtual: number;
  membros: Partial<Record<Area, string>>;
  propostaEnviada: boolean;
  dataProposta: Date | null;
  cronogramaId: string | null;
  criadoPor: string | null;
  criadoEm: Date;
}

export interface DadosNovaAv {
  id: string;
  numero: string;
  sequencial: number;
  ano: number;
  descricao: string;
  cliente?: string | null;
  codigo?: string | null;
  complexidade?: string | null;
  solicitante?: string | null;
  prazoCliente?: string | null;
  membros?: Partial<Record<Area, string | null>>;
  criadoPor: string | null;
  agora: Date;
}

export class Av {
  private constructor(private props: PropsAv) {}

  static criar(dados: DadosNovaAv): Av {
    return new Av({
      id: dados.id,
      numero: dados.numero,
      sequencial: dados.sequencial,
      ano: dados.ano,
      descricao: exigirTexto(dados.descricao, 'A descrição', TAMANHO_MAXIMO_DESCRICAO),
      cliente: normalizarTextoOpcional(dados.cliente),
      codigo: normalizarTextoOpcional(dados.codigo),
      complexidade: normalizarTextoOpcional(dados.complexidade),
      solicitante: normalizarTextoOpcional(dados.solicitante),
      prazoCliente: normalizarTextoOpcional(dados.prazoCliente),
      desenhoClienteRef: null,
      contatoComercial: null,
      emailComercial: null,
      foneComercial: null,
      contatoTecnico: null,
      dataFechamento: null,
      programa: null,
      volumeAnual: null,
      anoSopEop: null,
      respAbertura: null,
      linha: null,
      origemProjeto: null,
      localEntrega: null,
      conceitoLogistico: null,
      respEmbalagem: null,
      infoComplementarComercial: null,
      etapaAtual: ETAPA_INICIAL,
      membros: normalizarMembros(dados.membros),
      propostaEnviada: false,
      dataProposta: null,
      cronogramaId: null,
      criadoPor: dados.criadoPor,
      criadoEm: dados.agora,
    });
  }

  static reconstituir(props: PropsAv): Av {
    return new Av({ ...props, membros: { ...props.membros } });
  }

  get id(): string {
    return this.props.id;
  }
  get numero(): string {
    return this.props.numero;
  }
  get sequencial(): number {
    return this.props.sequencial;
  }
  get ano(): number {
    return this.props.ano;
  }
  get cliente(): string | null {
    return this.props.cliente;
  }
  get codigo(): string | null {
    return this.props.codigo;
  }
  get descricao(): string {
    return this.props.descricao;
  }
  get complexidade(): string | null {
    return this.props.complexidade;
  }
  get solicitante(): string | null {
    return this.props.solicitante;
  }
  get prazoCliente(): string | null {
    return this.props.prazoCliente;
  }
  get desenhoClienteRef(): string | null {
    return this.props.desenhoClienteRef;
  }
  get contatoComercial(): string | null {
    return this.props.contatoComercial;
  }
  get emailComercial(): string | null {
    return this.props.emailComercial;
  }
  get foneComercial(): string | null {
    return this.props.foneComercial;
  }
  get contatoTecnico(): string | null {
    return this.props.contatoTecnico;
  }
  get dataFechamento(): string | null {
    return this.props.dataFechamento;
  }
  get programa(): string | null {
    return this.props.programa;
  }
  get volumeAnual(): number | null {
    return this.props.volumeAnual;
  }
  get anoSopEop(): string | null {
    return this.props.anoSopEop;
  }
  get respAbertura(): string | null {
    return this.props.respAbertura;
  }
  get linha(): string | null {
    return this.props.linha;
  }
  get origemProjeto(): string | null {
    return this.props.origemProjeto;
  }
  get localEntrega(): string | null {
    return this.props.localEntrega;
  }
  get conceitoLogistico(): string | null {
    return this.props.conceitoLogistico;
  }
  get respEmbalagem(): string | null {
    return this.props.respEmbalagem;
  }
  get infoComplementarComercial(): string | null {
    return this.props.infoComplementarComercial;
  }
  get etapaAtual(): number {
    return this.props.etapaAtual;
  }
  get membros(): Partial<Record<Area, string>> {
    return { ...this.props.membros };
  }
  get propostaEnviada(): boolean {
    return this.props.propostaEnviada;
  }
  get dataProposta(): Date | null {
    return this.props.dataProposta;
  }
  get cronogramaId(): string | null {
    return this.props.cronogramaId;
  }
  get criadoPor(): string | null {
    return this.props.criadoPor;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  atualizarComercial(campos: Partial<CamposComerciaisAv>): void {
    if (campos.descricao !== undefined) {
      this.props.descricao = exigirTexto(campos.descricao, 'A descrição', TAMANHO_MAXIMO_DESCRICAO);
    }
    if (campos.cliente !== undefined) this.props.cliente = normalizarTextoOpcional(campos.cliente);
    if (campos.codigo !== undefined) this.props.codigo = normalizarTextoOpcional(campos.codigo);
    if (campos.complexidade !== undefined) {
      this.props.complexidade = normalizarTextoOpcional(campos.complexidade);
    }
    if (campos.solicitante !== undefined) {
      this.props.solicitante = normalizarTextoOpcional(campos.solicitante);
    }
    if (campos.prazoCliente !== undefined) {
      this.props.prazoCliente = normalizarTextoOpcional(campos.prazoCliente);
    }
    if (campos.desenhoClienteRef !== undefined) {
      this.props.desenhoClienteRef = normalizarTextoOpcional(campos.desenhoClienteRef);
    }
    if (campos.contatoComercial !== undefined) {
      this.props.contatoComercial = normalizarTextoOpcional(campos.contatoComercial);
    }
    if (campos.emailComercial !== undefined) {
      this.props.emailComercial = validarEmailOpcional(campos.emailComercial);
    }
    if (campos.foneComercial !== undefined) {
      this.props.foneComercial = normalizarTextoOpcional(campos.foneComercial);
    }
    if (campos.contatoTecnico !== undefined) {
      this.props.contatoTecnico = normalizarTextoOpcional(campos.contatoTecnico);
    }
    if (campos.dataFechamento !== undefined) this.props.dataFechamento = campos.dataFechamento;
    if (campos.programa !== undefined) this.props.programa = normalizarTextoOpcional(campos.programa);
    if (campos.volumeAnual !== undefined) this.props.volumeAnual = campos.volumeAnual;
    if (campos.anoSopEop !== undefined) {
      this.props.anoSopEop = normalizarTextoOpcional(campos.anoSopEop);
    }
    if (campos.respAbertura !== undefined) {
      this.props.respAbertura = normalizarTextoOpcional(campos.respAbertura);
    }
    if (campos.linha !== undefined) this.props.linha = normalizarTextoOpcional(campos.linha);
    if (campos.origemProjeto !== undefined) {
      this.props.origemProjeto = normalizarTextoOpcional(campos.origemProjeto);
    }
    if (campos.localEntrega !== undefined) {
      this.props.localEntrega = normalizarTextoOpcional(campos.localEntrega);
    }
    if (campos.conceitoLogistico !== undefined) {
      this.props.conceitoLogistico = normalizarTextoOpcional(campos.conceitoLogistico);
    }
    if (campos.respEmbalagem !== undefined) {
      this.props.respEmbalagem = normalizarTextoOpcional(campos.respEmbalagem);
    }
    if (campos.infoComplementarComercial !== undefined) {
      this.props.infoComplementarComercial = normalizarTextoOpcional(campos.infoComplementarComercial);
    }
  }

  atualizarEquipe(membros: Partial<Record<Area, string | null>>): void {
    for (const area of AREAS_AV) {
      if (membros[area] === undefined) continue;
      const valor = membros[area];
      if (valor) this.props.membros[area] = valor;
      else delete this.props.membros[area];
    }
  }

  /** O motor sequencial só chama isto depois de validar a transição — a entidade não conhece o catálogo de etapas. */
  moverParaEtapa(numero: number): void {
    this.props.etapaAtual = numero;
  }

  marcarPropostaEnviada(agora: Date): void {
    this.props.propostaEnviada = true;
    this.props.dataProposta = agora;
  }
}

function normalizarMembros(
  membros?: Partial<Record<Area, string | null>>,
): Partial<Record<Area, string>> {
  const resultado: Partial<Record<Area, string>> = {};
  if (!membros) return resultado;
  for (const area of AREAS_AV) {
    const valor = membros[area];
    if (valor) resultado[area] = valor;
  }
  return resultado;
}

function validarEmailOpcional(email: string | null | undefined): string | null {
  const texto = normalizarTextoOpcional(email);
  if (texto !== null && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(texto)) {
    throw new ErroDeValidacao('E-mail comercial inválido.');
  }
  return texto;
}

/** Ex.: `AV 0007-26`. */
export function gerarNumeroAv(sequencial: number, ano: number): string {
  const seq = String(sequencial).padStart(4, '0');
  const anoCurto = String(ano).slice(-2);
  return `AV ${seq}-${anoCurto}`;
}
