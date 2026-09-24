/** Desenha a página de impressão do cronograma e devolve o PDF. */
export interface GeradorDePdf {
  gerar(cronogramaId: string, titulo: string): Promise<Uint8Array>;
}

/** Onde o PDF vai parar: a pessoa escolhe o arquivo, e ele é gravado e aberto. */
export interface DestinoDoArquivo {
  /** `null` quando a escolha é cancelada. */
  escolher(nomeSugerido: string): Promise<string | null>;
  gravarEAbrir(caminho: string, conteudo: Uint8Array): Promise<void>;
}

/** O módulo não conhece Cronogramas: a raiz de composição liga esta porta à API pública dele. */
export interface ConsultaDeCronogramas {
  obterNome(cronogramaId: string): Promise<string | null>;
}
