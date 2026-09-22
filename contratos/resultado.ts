/**
 * Envelope de resposta de todo canal IPC. Erros de negócio atravessam o IPC como dados,
 * pois exceções lançadas no main perdem suas propriedades ao serem serializadas.
 */
export interface ErroApi {
  codigo: string;
  mensagem: string;
}

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: ErroApi };
