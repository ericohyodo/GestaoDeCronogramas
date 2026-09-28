/** Desenha uma página de impressão do renderer e devolve o PDF. */
export interface GeradorDePdf {
  /** `rota`: caminho do renderer com a busca (ex.: `/impressao/?id=…`). `titulo` vai no rodapé. */
  gerar(rota: string, titulo: string): Promise<Uint8Array>;
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

/** Porta para o arquivo de análises do módulo IA. */
export interface ConsultaDeAnalises {
  obterResumo(analiseId: string): Promise<{ titulo: string; geradaEm: string } | null>;
}
