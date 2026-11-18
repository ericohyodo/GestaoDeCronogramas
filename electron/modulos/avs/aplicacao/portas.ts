import type { PerfilDTO } from '@contratos/sessao.contrato';
import type { SdDTO } from '@contratos/sds.contrato';

export interface UsuarioAtualAv {
  id: string;
  nome: string;
  perfil: PerfilDTO;
}

/** Fornecida pelo módulo `usuarios`, sem expor seu domínio interno. */
export interface ConsultaDeUsuarios {
  usuarioAtual(): UsuarioAtualAv | null;
  listarAtivos(): Promise<{ id: string; nome: string }[]>;
  obterPerfilGlobal(id: string): Promise<PerfilDTO | null>;
}

/** Fornecida pelo módulo `sds`: cria a SD de uma AV sem expor o domínio de SDs. */
export interface CriadorDePreSd {
  criar(entrada: { avId: string; avNumero: string; usuarioId: string | null }): Promise<SdDTO>;
}

/** Abre uma pasta (rede/local) no explorador de arquivos, ou uma URL no navegador padrão. */
export interface AbridorDeCaminho {
  /** `null` quando abriu com sucesso; mensagem de erro caso contrário. */
  abrir(caminho: string): Promise<string | null>;
}

export interface ArquivoSelecionado {
  caminhoOriginal: string;
  nomeArquivo: string;
}

export interface OpcoesSeletorDeArquivos {
  /** Padrão: seleção múltipla dos tipos de desenho/imagem aceitos como anexo. */
  modo?: 'anexos' | 'qualquer-arquivo';
}

/** Abre o diálogo nativo de seleção de arquivos do SO. */
export interface SeletorDeArquivos {
  /** `null` quando o usuário cancelou. */
  escolher(opcoes?: OpcoesSeletorDeArquivos): Promise<ArquivoSelecionado[] | null>;
}

export interface ArquivoArmazenado {
  nomeArmazenado: string;
  tipoMime: string | null;
  tamanhoBytes: number;
}

/** Copia/lê/apaga os arquivos de anexo em disco, ao lado do banco de dados. */
export interface ArmazenamentoDeArquivos {
  copiarParaAnexos(avId: string, arquivo: ArquivoSelecionado): Promise<ArquivoArmazenado>;
  lerConteudoBase64(avId: string, nomeArmazenado: string): Promise<string>;
  excluirArquivo(avId: string, nomeArmazenado: string): Promise<void>;
}
