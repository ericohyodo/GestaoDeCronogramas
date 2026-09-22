/** Porta de saída: o domínio só conhece o hash, nunca a senha em texto puro. */
export interface HashDeSenha {
  gerar(senha: string): Promise<string>;
  conferir(senha: string, hash: string): Promise<boolean>;
}
