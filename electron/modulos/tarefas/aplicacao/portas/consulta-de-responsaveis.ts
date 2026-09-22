/** Porta de saída para exibir o nome de quem responde pela tarefa, sem acoplar os módulos. */
export interface ConsultaDeResponsaveis {
  obterNomes(ids: string[]): Promise<Map<string, string>>;
  existe(responsavelId: string): Promise<boolean>;
}
