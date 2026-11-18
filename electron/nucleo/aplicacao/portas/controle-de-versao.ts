/**
 * Gravação otimista. Cada trecho editável tem um contador de versão identificado por "<recurso>:<id>".
 * A tela guarda a versão que leu e a devolve ao salvar; se alguém gravou antes, a gravação é recusada.
 */
export interface ControleDeVersao {
  /** Versão atual (1 quando o trecho nunca foi gravado com controle). */
  obter(chave: string): number;
  /**
   * Confirma que ninguém gravou desde `versaoEsperada` e já avança a versão (operação atômica no banco).
   * Sem `versaoEsperada` (gravações internas, dados de exemplo) só avança.
   * @returns a nova versão, que volta para a tela
   * @throws ErroConflitoDeEdicao quando a versão gravada é outra
   */
  confirmar(chave: string, versaoEsperada?: number | null): number;
}

/** Sem controle (testes e montagens que não precisam): sempre versão 1, nunca recusa. */
export const versaoSemControle: ControleDeVersao = {
  obter: () => 1,
  confirmar: () => 1,
};
