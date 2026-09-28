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
