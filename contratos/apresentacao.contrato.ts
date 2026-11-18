/** Registros fictícios em destaque no roteiro da apresentação (ids no banco do modo apresentação). */
export interface RoteiroDaApresentacaoDTO {
  /** AV parada na Eng. Produto (blocos, N/A, anexos). */
  avEmProduto: string | null;
  /** AV no Mapa de Custo (custos, Calcular). */
  avNoCusto: string | null;
  /** AV com a proposta enviada: pronta para "Finalizar AV e criar Pré-SD". */
  avNaProposta: string | null;
  /** SD ainda com o Comercial (Pré-SD). */
  sdComComercial: string | null;
  /** SD aberta aguardando o aceite da Engenharia. */
  sdAguardandoAceite: string | null;
  /** Projeto PRO criado no aceite, com fases e tarefas. */
  projeto: string | null;
}

export interface EstadoApresentacaoDTO {
  /** O app está rodando no modo apresentação (dados fictícios e isolados). */
  ativo: boolean;
  roteiro: RoteiroDaApresentacaoDTO | null;
}
