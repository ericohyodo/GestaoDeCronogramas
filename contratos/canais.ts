/** Nomes dos canais IPC. Usados em tempo de execução pelo main e pelo preload. */
export const CANAIS = {
  sessao: {
    obter: 'sessao:obter',
    entrar: 'sessao:entrar',
    sair: 'sessao:sair',
    primeiroAcesso: 'sessao:primeiro-acesso',
  },
  usuarios: {
    listar: 'usuarios:listar',
    criar: 'usuarios:criar',
    atualizar: 'usuarios:atualizar',
    alterarSenha: 'usuarios:alterar-senha',
    excluir: 'usuarios:excluir',
  },
  responsaveis: {
    listar: 'responsaveis:listar',
    criar: 'responsaveis:criar',
    atualizar: 'responsaveis:atualizar',
    excluir: 'responsaveis:excluir',
  },
  cronogramas: {
    listar: 'cronogramas:listar',
    obter: 'cronogramas:obter',
    criar: 'cronogramas:criar',
    atualizar: 'cronogramas:atualizar',
    excluir: 'cronogramas:excluir',
  },
  tarefas: {
    obterEstrutura: 'tarefas:obter-estrutura',
    criar: 'tarefas:criar',
    atualizar: 'tarefas:atualizar',
    excluir: 'tarefas:excluir',
    deslocarSucessoras: 'tarefas:deslocar-sucessoras',
    criarFase: 'tarefas:criar-fase',
    atualizarFase: 'tarefas:atualizar-fase',
    excluirFase: 'tarefas:excluir-fase',
    reordenar: 'tarefas:reordenar',
    duplicar: 'tarefas:duplicar',
    copiarEstrutura: 'tarefas:copiar-estrutura',
    listarAgenda: 'tarefas:listar-agenda',
  },
  impressao: {
    exportarPdf: 'impressao:exportar-pdf',
  },
  preferencias: {
    obter: 'preferencias:obter',
    definirTema: 'preferencias:definir-tema',
  },
  aparencia: {
    /** Canal síncrono (sendSync), lido pelo preload antes da primeira pintura. */
    obter: 'aparencia:obter',
  },
} as const;
