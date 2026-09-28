import type { Area } from './area';

export interface DefinicaoEtapaAv {
  numero: number;
  chave: string;
  nome: string;
  area: Area | null;
  terminal: boolean;
}

/**
 * Catálogo estático das etapas do fluxo de AV, espelhado na tabela `etapas_av` (só para
 * integridade referencial). `av.etapa_atual` avança uma a uma por este catálogo — não dá para
 * pular etapa nem liberar áreas fora de ordem, ao contrário do app antigo (Gestão AV).
 */
export const ETAPAS_AV: readonly DefinicaoEtapaAv[] = [
  { numero: 1, chave: 'comercial', nome: 'Comercial — Abertura', area: 'comercial', terminal: false },
  { numero: 2, chave: 'eng_produto', nome: 'Engenharia de Produto', area: 'produto', terminal: false },
  { numero: 3, chave: 'eng_processo', nome: 'Engenharia de Processo', area: 'processo', terminal: false },
  { numero: 4, chave: 'pcp', nome: 'PCP — Capacidade', area: 'pcp', terminal: false },
  { numero: 5, chave: 'mapa_custo', nome: 'Mapa de Custo', area: 'custo', terminal: false },
  { numero: 6, chave: 'proposta_enviada', nome: 'Proposta Enviada', area: 'comercial', terminal: false },
  { numero: 7, chave: 'sd_aberta', nome: 'SD Aberta', area: 'comercial', terminal: false },
  { numero: 8, chave: 'projeto_criado', nome: 'Projeto Criado', area: null, terminal: true },
  { numero: 9, chave: 'declinada_cliente', nome: 'Declinada pelo Cliente', area: null, terminal: true },
  { numero: 10, chave: 'declinada_empresa', nome: 'Declinada Internamente', area: null, terminal: true },
];

export const ETAPA_INICIAL = 1;

export function obterEtapaAv(numero: number): DefinicaoEtapaAv {
  const etapa = ETAPAS_AV.find((item) => item.numero === numero);
  if (!etapa) throw new Error(`Etapa de AV inválida: ${numero}`);
  return etapa;
}

export function obterEtapaPorChave(chave: string): DefinicaoEtapaAv {
  const etapa = ETAPAS_AV.find((item) => item.chave === chave);
  if (!etapa) throw new Error(`Chave de etapa de AV inválida: ${chave}`);
  return etapa;
}
