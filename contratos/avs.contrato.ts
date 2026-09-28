export const AREAS_AV = ['comercial', 'produto', 'processo', 'pcp', 'custo'] as const;
export type AreaAvDTO = (typeof AREAS_AV)[number];

export const PAPEIS_AV = ['padrao', 'visualizador'] as const;
export type PapelAvDTO = (typeof PAPEIS_AV)[number];

export interface EtapaAvDTO {
  numero: number;
  chave: string;
  nome: string;
  area: AreaAvDTO | null;
  terminal: boolean;
}

export interface MembroAreaDTO {
  id: string;
  nome: string;
}

export interface AvResumoDTO {
  id: string;
  numero: string;
  cliente: string | null;
  descricao: string;
  complexidade: string | null;
  prazoCliente: string | null;
  etapaAtual: EtapaAvDTO;
  membros: Partial<Record<AreaAvDTO, MembroAreaDTO>>;
  propostaEnviada: boolean;
  criadoEm: string;
}

export interface AvDetalheDTO extends AvResumoDTO {
  codigo: string | null;
  solicitante: string | null;
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
  dataProposta: string | null;
  cronogramaId: string | null;
}

export interface CriarAvEntrada {
  descricao: string;
  cliente?: string | null;
  codigo?: string | null;
  complexidade?: string | null;
  solicitante?: string | null;
  prazoCliente?: string | null;
  membros?: Partial<Record<AreaAvDTO, string | null>>;
}

export interface AtualizarComercialEntrada {
  avId: string;
  cliente?: string | null;
  codigo?: string | null;
  descricao?: string;
  complexidade?: string | null;
  solicitante?: string | null;
  prazoCliente?: string | null;
  desenhoClienteRef?: string | null;
  contatoComercial?: string | null;
  emailComercial?: string | null;
  foneComercial?: string | null;
  contatoTecnico?: string | null;
  dataFechamento?: string | null;
  programa?: string | null;
  volumeAnual?: number | null;
  anoSopEop?: string | null;
  respAbertura?: string | null;
  linha?: string | null;
  origemProjeto?: string | null;
  localEntrega?: string | null;
  conceitoLogistico?: string | null;
  respEmbalagem?: string | null;
  infoComplementarComercial?: string | null;
}

export interface AtualizarEquipeEntrada {
  avId: string;
  membros: Partial<Record<AreaAvDTO, string | null>>;
}

export interface AvancarEtapaEntrada {
  avId: string;
  comentario?: string | null;
}

export const ETAPAS_DE_DECLINIO = ['declinada_cliente', 'declinada_empresa'] as const;
export type EtapaDeDeclinioDTO = (typeof ETAPAS_DE_DECLINIO)[number];

export interface DeclinarAvEntrada {
  avId: string;
  etapa: EtapaDeDeclinioDTO;
  motivo: string;
  comentario?: string | null;
}

export interface HistoricoAvItemDTO {
  id: string;
  etapaDe: EtapaAvDTO | null;
  etapaPara: EtapaAvDTO;
  usuarioNome: string | null;
  comentario: string | null;
  data: string;
}

export interface ContagemPorEtapaDTO {
  etapa: EtapaAvDTO;
  quantidade: number;
}

export interface DashboardAvDTO {
  total: number;
  emAndamento: number;
  concluidas: number;
  declinadas: number;
  porEtapa: ContagemPorEtapaDTO[];
}

// --- Mapa de Custo ---

export const INCOTERMS = [
  'EXW',
  'FOB',
  'CIF',
  'DDP',
  'FCA',
  'CPT',
  'CIP',
  'DAT',
  'DAP',
  'FAS',
  'CFR',
] as const;
export type IncotermDTO = (typeof INCOTERMS)[number];

export const SECOES_CUSTO_MATERIAL = ['materia_prima', 'outros_insumos', 'embalagem'] as const;
export type SecaoCustoMaterialDTO = (typeof SECOES_CUSTO_MATERIAL)[number];

export interface ItemCustoMaterialDTO {
  id: string;
  secao: SecaoCustoMaterialDTO;
  codigoItem: string | null;
  descricao: string;
  qtdeBruta: number | null;
  qtdeNet: number | null;
  unidadeMedida: string | null;
  custoUnitario: number | null;
  custoTotal: number | null;
}

export interface ItemCustoProcessoDTO {
  id: string;
  processo: string | null;
  maquina: string | null;
  pecasHora: number | null;
  qtdeColaboradores: number | null;
  taxaMod: number | null;
  taxaMoi: number | null;
  taxaGgf: number | null;
  custoTotal: number | null;
}

export interface SecaoCustoDTO {
  incoterm: IncotermDTO | null;
  observacoes: string | null;
  materiais: ItemCustoMaterialDTO[];
  processo: ItemCustoProcessoDTO[];
  atualizadoEm: string | null;
}

export interface ItemCustoMaterialEntrada {
  secao: SecaoCustoMaterialDTO;
  codigoItem?: string | null;
  descricao: string;
  qtdeBruta?: number | null;
  qtdeNet?: number | null;
  unidadeMedida?: string | null;
  custoUnitario?: number | null;
  custoTotal?: number | null;
}

export interface ItemCustoProcessoEntrada {
  processo?: string | null;
  maquina?: string | null;
  pecasHora?: number | null;
  qtdeColaboradores?: number | null;
  taxaMod?: number | null;
  taxaMoi?: number | null;
  taxaGgf?: number | null;
  custoTotal?: number | null;
}

export interface AtualizarSecaoCustoEntrada {
  avId: string;
  incoterm?: IncotermDTO | null;
  observacoes?: string | null;
  materiais: ItemCustoMaterialEntrada[];
  processo: ItemCustoProcessoEntrada[];
}

export interface ItemCatalogoMaterialDTO {
  codigo: string;
  descricao: string;
}

export interface CatalogoCustoDTO {
  operacoes: string[];
  maquinas: string[];
  materiaPrima: ItemCatalogoMaterialDTO[];
  embalagem: ItemCatalogoMaterialDTO[];
}

// --- Investimentos (compartilhado por Eng. Produto e Eng. Processo) ---

export const AREAS_INVESTIMENTO = ['produto', 'processo'] as const;
export type AreaInvestimentoDTO = (typeof AREAS_INVESTIMENTO)[number];

export const CLASSIFICACOES_INVESTIMENTO = [
  'capex',
  'suporte_desenvolvimento',
  'sup_des_ou_cliente',
  'cliente',
] as const;
export type ClassificacaoInvestimentoDTO = (typeof CLASSIFICACOES_INVESTIMENTO)[number];

export interface InvestimentoDTO {
  id: string;
  descricao: string;
  classificacao: ClassificacaoInvestimentoDTO | null;
  valor: number | null;
}

export interface InvestimentoEntrada {
  descricao: string;
  classificacao?: ClassificacaoInvestimentoDTO | null;
  valor?: number | null;
}

// --- Eng. Produto ---

export interface SecaoProdutoDTO {
  descritivoTecnicoExistente: boolean | null;
  descritivoTecnicoDisponivel: boolean | null;
  desenho2dExistente: boolean | null;
  desenho2dDisponivel: boolean | null;
  desenho3dExistente: boolean | null;
  desenho3dDisponivel: boolean | null;
  desenhoInterfacesExistente: boolean | null;
  desenhoInterfacesDisponivel: boolean | null;
  normasTecnicasExistente: boolean | null;
  normasTecnicasDisponivel: boolean | null;
  requisitosClienteExistente: boolean | null;
  requisitosClienteDisponivel: boolean | null;
  requisitosGarantiaExistente: boolean | null;
  requisitosGarantiaDisponivel: boolean | null;
  /** Caminho de pasta (rede/local) ou URL onde ficam as evidências de cada item do checklist. */
  descritivoTecnicoLink: string | null;
  desenho2dLink: string | null;
  desenho3dLink: string | null;
  desenhoInterfacesLink: string | null;
  normasTecnicasLink: string | null;
  requisitosClienteLink: string | null;
  requisitosGarantiaLink: string | null;
  escopoTecnico: string | null;
  riscosProjeto: string | null;
  premissasProjeto: string | null;
  recursosProjeto: string | null;
  restricoesProjeto: string | null;
  infoComplementar: string | null;
  prazoPrototipoDias: number | null;
  investimentos: InvestimentoDTO[];
  atualizadoEm: string | null;
}

export interface AtualizarSecaoProdutoEntrada {
  avId: string;
  descritivoTecnicoExistente?: boolean | null;
  descritivoTecnicoDisponivel?: boolean | null;
  desenho2dExistente?: boolean | null;
  desenho2dDisponivel?: boolean | null;
  desenho3dExistente?: boolean | null;
  desenho3dDisponivel?: boolean | null;
  desenhoInterfacesExistente?: boolean | null;
  desenhoInterfacesDisponivel?: boolean | null;
  normasTecnicasExistente?: boolean | null;
  normasTecnicasDisponivel?: boolean | null;
  requisitosClienteExistente?: boolean | null;
  requisitosClienteDisponivel?: boolean | null;
  requisitosGarantiaExistente?: boolean | null;
  requisitosGarantiaDisponivel?: boolean | null;
  descritivoTecnicoLink?: string | null;
  desenho2dLink?: string | null;
  desenho3dLink?: string | null;
  desenhoInterfacesLink?: string | null;
  normasTecnicasLink?: string | null;
  requisitosClienteLink?: string | null;
  requisitosGarantiaLink?: string | null;
  escopoTecnico?: string | null;
  riscosProjeto?: string | null;
  premissasProjeto?: string | null;
  recursosProjeto?: string | null;
  restricoesProjeto?: string | null;
  infoComplementar?: string | null;
  prazoPrototipoDias?: number | null;
  investimentos: InvestimentoEntrada[];
}

// --- Eng. Processo (só o que já dá pra adiantar; sequência de operações/máquinas fica pra depois) ---

export interface SecaoProcessoDTO {
  prazoProducaoDias: number | null;
  investimentos: InvestimentoDTO[];
  atualizadoEm: string | null;
}

export interface AtualizarSecaoProcessoEntrada {
  avId: string;
  prazoProducaoDias?: number | null;
  investimentos: InvestimentoEntrada[];
}

// --- Anexos (desenhos, PDFs, fotos) ---

export interface AnexoAvDTO {
  id: string;
  secao: AreaAvDTO;
  nomeArquivo: string;
  tipoMime: string | null;
  tamanhoBytes: number;
  criadoEm: string;
  criadoPor: string | null;
}

export interface ConteudoAnexoDTO {
  nomeArquivo: string;
  tipoMime: string | null;
  base64: string;
}

export interface SelecionarEAnexarEntrada {
  avId: string;
  secao: AreaAvDTO;
}
