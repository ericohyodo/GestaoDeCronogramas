/** Executa várias gravações como uma só: ou todas valem, ou nenhuma (rollback). */
export interface UnidadeDeTrabalho {
  executar<T>(trabalho: () => Promise<T>): Promise<T>;
}

/** Sem transação (testes de unidade com repositórios em memória). */
export const semTransacao: UnidadeDeTrabalho = {
  executar: (trabalho) => trabalho(),
};
