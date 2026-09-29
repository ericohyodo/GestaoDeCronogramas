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
  /** Grupo de AVs a que esta AV pertence, se houver. */
  grupo: { id: string; nome: string } | null;
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
  familia: string | null;
  localEntrega: string | null;
  conceitoLogistico: string | null;
  respEmbalagem: string | null;
  infoComplementarComercial: string | null;
  dataProposta: string | null;
  cronogramaId: string | null;
  /** Quem abriu a AV (nome do usuário; `null` se a conta foi desativada ou removida). */
  criadoPorNome: string | null;
  /** Campos (descricao, codigo, volumeAnual, linha, programa) a preencher à mão após herdar dados do grupo. */
  camposPendentes: string[];
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
  familia?: string | null;
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

// --- Estrutura do produto (árvore) ---

export const TIPOS_NO_ESTRUTURA = ['conjunto', 'componente', 'materia_prima', 'embalagem', 'insumo'] as const;
export type TipoNoEstruturaDTO = (typeof TIPOS_NO_ESTRUTURA)[number];

/**
 * O que pode ficar dentro de cada tipo. O conjunto principal (nome vindo do desenho do cliente) é implícito e
 * aceita qualquer tipo; conjuntos e componentes também; matérias-primas, embalagens e insumos são folhas. O "nível" é a
 * profundidade na árvore.
 */
export const FILHOS_PERMITIDOS_NA_ESTRUTURA: Record<TipoNoEstruturaDTO, readonly TipoNoEstruturaDTO[]> = {
  conjunto: ['conjunto', 'componente', 'materia_prima', 'embalagem', 'insumo'],
  componente: ['conjunto', 'componente', 'materia_prima', 'embalagem', 'insumo'],
  materia_prima: [],
  embalagem: [],
  insumo: [],
};

export interface NoEstruturaDTO {
  id: string;
  paiId: string | null;
  tipo: TipoNoEstruturaDTO;
  codigo: string | null;
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
}

/** `chave` identifica o item só dentro do envio; `paiChave` aponta para o pai (`null` na raiz). */
export interface NoEstruturaEntrada {
  chave: string;
  paiChave: string | null;
  tipo: TipoNoEstruturaDTO;
  codigo?: string | null;
  descricao: string;
  quantidade?: number | null;
  unidade?: string | null;
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
  /** Alta, Média ou Baixa (avaliada pela Engenharia de Produto). */
  complexidade: string | null;
  /** Estrutura do produto em árvore, em lista plana com o pai antes dos filhos. */
  estrutura: NoEstruturaDTO[];
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
  complexidade?: string | null;
  estrutura: NoEstruturaEntrada[];
  investimentos: InvestimentoEntrada[];
}

// --- Eng. Processo (só o que já dá pra adiantar; sequência de operações/máquinas fica pra depois) ---

export interface OperacaoDTO {
  id: string;
  descricao: string;
  maquina: string | null;
  pecasHora: number | null;
}

export interface OperacaoEntrada {
  descricao: string;
  maquina?: string | null;
  pecasHora?: number | null;
}

export interface SecaoProcessoDTO {
  prazoProducaoDias: number | null;
  /** Sequência de operações, na ordem em que acontecem. */
  operacoes: OperacaoDTO[];
  investimentos: InvestimentoDTO[];
  atualizadoEm: string | null;
}

export interface AtualizarSecaoProcessoEntrada {
  avId: string;
  prazoProducaoDias?: number | null;
  operacoes: OperacaoEntrada[];
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

// --- Dados de exemplo ---

export interface GerarAvsExemploSaida {
  criadas: number;
  /** `true` quando já havia AVs de exemplo e nada foi criado. */
  jaExistiam: boolean;
}

// --- Templates (sequências reutilizáveis) ---

export const TIPOS_TEMPLATE_AV = ['operacoes', 'custo_processo'] as const;
export type TipoTemplateAvDTO = (typeof TIPOS_TEMPLATE_AV)[number];

export type TemplateAvEntrada =
  | { tipo: 'operacoes'; nome: string; itens: OperacaoEntrada[] }
  | { tipo: 'custo_processo'; nome: string; itens: ItemCustoProcessoEntrada[] };

export type TemplateAvDTO = { id: string; nome: string; criadoEm: string } & (
  | { tipo: 'operacoes'; itens: OperacaoEntrada[] }
  | { tipo: 'custo_processo'; itens: ItemCustoProcessoEntrada[] }
);

// --- Grupos de AVs ---

export interface AvDoGrupoDTO {
  id: string;
  numero: string;
  cliente: string | null;
  descricao: string;
  etapaAtual: EtapaAvDTO;
}

export interface GrupoAvDTO {
  id: string;
  nome: string;
  criadoEm: string;
  avs: AvDoGrupoDTO[];
}

/** Cria o grupo e, de uma vez, `quantidade` AVs novas e vazias já vinculadas a ele. */
export interface CriarGrupoAvEntrada {
  /** Descrição do grupo, ex.: "AVs Projeto Chaplin - Whirlpool". */
  nome: string;
  quantidade: number;
}

export const QUANTIDADE_MINIMA_DO_GRUPO = 2;
export const QUANTIDADE_MAXIMA_DO_GRUPO = 50;

/** O que dá para replicar da AV aberta para as demais do grupo. */
export const SECOES_APLICAVEIS_AO_GRUPO = ['comercial', 'equipe'] as const;
export type SecaoAplicavelAoGrupoDTO = (typeof SECOES_APLICAVEIS_AO_GRUPO)[number];

export interface AplicarAoGrupoEntrada {
  avId: string;
  secao: SecaoAplicavelAoGrupoDTO;
}

export interface AplicarAoGrupoSaida {
  aplicadas: number;
  ignoradas: { numero: string; motivo: string }[];
}

// --- Contatos da AV ---

export interface ContatoAvDTO {
  id: string;
  nome: string;
  area: string | null;
  telefone: string | null;
  email: string | null;
}

export interface ContatoAvEntrada {
  nome: string;
  area?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface SalvarContatosAvEntrada {
  avId: string;
  /** Substitui a lista inteira, na ordem enviada. */
  contatos: ContatoAvEntrada[];
}

// --- PCP: carga de máquina, custos logísticos e observações ---

export interface CargaMaquinaDTO {
  id: string;
  operacao: string;
  maquina: string | null;
  pecasHora: number | null;
  /** Ocupação da máquina hoje, em %. */
  cargaAtual: number | null;
  /** Ocupação prevista depois de implantar o item, em %. */
  cargaFutura: number | null;
}

export interface CargaMaquinaEntrada {
  operacao: string;
  maquina?: string | null;
  pecasHora?: number | null;
  cargaAtual?: number | null;
  cargaFutura?: number | null;
}

export interface CustoLogisticoDTO {
  id: string;
  descricao: string;
  valor: number | null;
}

export interface CustoLogisticoEntrada {
  descricao: string;
  valor?: number | null;
}

export interface SecaoPcpDTO {
  observacoes: string | null;
  cargas: CargaMaquinaDTO[];
  custos: CustoLogisticoDTO[];
  atualizadoEm: string | null;
}

export interface AtualizarSecaoPcpEntrada {
  avId: string;
  observacoes?: string | null;
  cargas: CargaMaquinaEntrada[];
  custos: CustoLogisticoEntrada[];
}

// --- Relatório das AVs (também é a base do que a IA enxerga sobre as AVs) ---

export type SituacaoAvDTO = 'em_andamento' | 'concluida' | 'declinada';

export interface LinhaRelatorioAvDTO {
  id: string;
  numero: string;
  cliente: string | null;
  descricao: string;
  grupo: string | null;
  etapa: string;
  etapaChave: string;
  situacao: SituacaoAvDTO;
  /** ISO da criação da AV. */
  abertaEm: string;
  /** Prazo para a AV (data do cliente); `null` se não informado. */
  prazo: string | null;
  /** Em andamento e com o prazo já vencido. */
  atrasada: boolean;
  /** Dias parada na etapa atual (desde a última mudança de etapa ou, sem histórico, desde a abertura). */
  diasNaEtapa: number;
  /** Quem responde pela área da etapa atual; `null` em etapas finais ou sem responsável. */
  responsavelDaEtapa: string | null;
  familia: string | null;
  linha: string | null;
  complexidade: string | null;
  volumeAnual: number | null;
  /** Soma dos investimentos de Eng. Produto e Eng. Processo (R$). */
  investimentoTotal: number;
  /** Soma dos custos do Mapa de Custo (materiais + mão de obra), por peça (R$). */
  custoPorPeca: number;
}
