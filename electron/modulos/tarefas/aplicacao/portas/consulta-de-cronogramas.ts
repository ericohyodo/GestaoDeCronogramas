/**
 * Porta de saída: o módulo Tarefas precisa do período do cronograma, mas não conhece
 * o módulo Cronogramas. A raiz de composição liga esta porta à API pública daquele módulo.
 */
export interface ConsultaDeCronogramas {
  existe(cronogramaId: string): Promise<boolean>;
  obterPeriodo(cronogramaId: string): Promise<{ inicio: string; fim: string } | null>;
}
