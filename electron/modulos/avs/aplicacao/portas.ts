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
  /** Tamanho lido no momento da seleção, para recusar arquivos grandes antes de copiar. */
  tamanhoBytes: number;
}

export interface OpcoesSeletorDeArquivos {
  /** Padrão: seleção múltipla dos tipos de desenho/imagem aceitos como anexo. `pasta`: escolhe uma pasta. */
  modo?: 'anexos' | 'qualquer-arquivo' | 'pasta';
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
  /** Abre o arquivo no programa padrão do Windows (ex.: TIFF, que o app não pré-visualiza). */
  abrirNoProgramaPadrao(avId: string, nomeArmazenado: string): Promise<void>;
}

/** Um arquivo ou subpasta dentro da pasta da AV. */
export interface ItemDaPasta {
  /** Caminho relativo à pasta da AV (com `\\`). */
  caminhoRelativo: string;
  nome: string;
  ehPasta: boolean;
  tamanhoBytes: number | null;
  modificadoEm: Date;
  /** 0 = direto na pasta da AV. */
  profundidade: number;
}

/** Pastas das AVs no Windows (rede ou local). */
export interface GerenciadorDePastas {
  /** Cria `<raiz>\\<nome>` (reaproveita se já existir) e devolve o caminho completo. */
  criar(raiz: string, nome: string): Promise<string>;
  existe(caminho: string): Promise<boolean>;
  listar(caminho: string): Promise<{ itens: ItemDaPasta[]; limitado: boolean }>;
  /** Abre a pasta (relativo nulo) ou um item dela; recusa caminhos fora da pasta. */
  abrir(base: string, relativo: string | null): Promise<void>;
}
