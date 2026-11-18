export interface PresencaAtiva {
  usuarioId: string;
  nome: string;
  perfil: string;
  iniciadoEm: Date;
}

export interface RepositorioPresenca {
  /** Cria ou renova o batimento desta instância do aplicativo (`sessaoId`) para o usuário. */
  registrar(sessaoId: string, usuarioId: string, agora: Date): Promise<void>;
  remover(sessaoId: string): Promise<void>;
  /** Instâncias com batimento posterior a `limite`, de usuários ativos. */
  listarDesde(limite: Date): Promise<PresencaAtiva[]>;
}
