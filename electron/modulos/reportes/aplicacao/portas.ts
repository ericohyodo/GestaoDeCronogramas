// Portas do módulo de reportes: o que ele precisa de fora (usuários, arquivos) sem conhecer os outros módulos.
// As implementações são ligadas na raiz de composição.

export interface UsuarioAtualReporte {
  id: string;
  nome: string;
  administrador: boolean;
}

/** Quem está usando o app e quem cuida dos reportes (vem do módulo de usuários). */
export interface AcessoDosReportes {
  usuarioAtual(): UsuarioAtualReporte | null;
  listarNomes(): Promise<{ id: string; nome: string }[]>;
  /** Ids dos administradores ativos: recebem o aviso de novo reporte. */
  listarAdministradores(): Promise<string[]>;
}

/** Prints em `<pasta do banco>/reportes/<reporteId>/`. */
export interface ArmazenamentoDeImagensReporte {
  /** Grava os bytes e devolve o nome armazenado (único). */
  gravar(reporteId: string, nomeSeguro: string, bytes: Uint8Array): Promise<string>;
  ler(reporteId: string, nomeArmazenado: string): Promise<Uint8Array>;
  excluir(reporteId: string, nomeArmazenado: string): Promise<void>;
}

/** Converte bytes ↔ base64 (o domínio e a aplicação não usam `Buffer`). */
export interface CodificadorBase64 {
  decodificar(base64: string): Uint8Array;
  codificar(bytes: Uint8Array): string;
}
