// Portas do módulo de SDs: o que ele precisa de fora (usuários, AVs, projetos, arquivos) sem conhecer
// o domínio dos outros módulos. As implementações são ligadas na raiz de composição.

export interface UsuarioAtualSd {
  id: string;
  nome: string;
  administrador: boolean;
}

/** Quem está usando o app e o que pode fazer no fluxo (vem dos módulos de usuários e de AVs). */
export interface AcessoDoFluxoSd {
  usuarioAtual(): UsuarioAtualSd | null;
  /** Gerente de Engenharia ou Gestor de Programa. */
  podeDarAceite(usuarioId: string): Promise<boolean>;
  listarNomes(): Promise<{ id: string; nome: string }[]>;
  /** Quem dá o aceite (Gerente de Engenharia e Gestores de Programa): recebem o aviso de SD aberta. */
  listarAprovadores(): Promise<string[]>;
}

/** Efeito do aceite na AV: vai para "Projeto Criado" apontando para o projeto. */
export interface AvsDoFluxoSd {
  concluirComProjeto(entrada: { avId: string; cronogramaId: string; usuarioId: string; comentario: string }): Promise<void>;
}

/** Cria o projeto (cronograma) com o código PRO no aceite. */
export interface CriadorDeProjeto {
  criar(entrada: {
    nome: string;
    descricao: string | null;
    codigo: string;
    sdId: string;
    dataInicio: string;
    dataFim: string;
  }): Promise<{ id: string }>;
}

export interface ArquivoEscolhido {
  caminhoOriginal: string;
  nomeArquivo: string;
}

export interface SeletorDeEvidencias {
  /** `null` quando o usuário cancelou. */
  escolher(): Promise<ArquivoEscolhido[] | null>;
}

export interface ArquivoGuardado {
  nomeArmazenado: string;
  tipoMime: string | null;
  tamanhoBytes: number;
}

/** Arquivos das SDs em `<pasta do banco>/anexos-sds/<sdId>/`. */
export interface ArmazenamentoDeEvidencias {
  /** Copia o arquivo; recusa executáveis e arquivos acima do limite. */
  guardar(sdId: string, arquivo: ArquivoEscolhido): Promise<ArquivoGuardado>;
  /** Abre o arquivo no programa padrão do Windows (ex.: Outlook para .msg). */
  abrir(sdId: string, nomeArmazenado: string): Promise<void>;
  excluir(sdId: string, nomeArmazenado: string): Promise<void>;
  /** Grava um arquivo gerado pelo app (dados de exemplo do modo apresentação). */
  gravarTexto(sdId: string, nomeArquivo: string, conteudo: string): Promise<ArquivoGuardado>;
}
