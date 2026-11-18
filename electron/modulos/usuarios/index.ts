/**
 * API pública do módulo Usuários (autenticação, perfis e sessão).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { ControleDeAcesso } from '../../nucleo/aplicacao/portas/controle-de-acesso';
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { ConcluirPrimeiroAcesso } from './aplicacao/casos-de-uso/concluir-primeiro-acesso';
import { CriarPrimeiroUsuario } from './aplicacao/casos-de-uso/criar-primeiro-usuario';
import { Entrar } from './aplicacao/casos-de-uso/entrar';
import {
  AlterarSenha,
  AtualizarUsuario,
  CriarUsuario,
  ExcluirUsuario,
  ListarUsuarios,
} from './aplicacao/casos-de-uso/gerenciar-usuarios';
import { ObterSessao, Sair } from './aplicacao/casos-de-uso/obter-sessao';
import { BaterPresenca, ListarUsuariosOnline } from './aplicacao/casos-de-uso/presenca';
import { Sessao } from './aplicacao/sessao';
import { registrarIpcUsuarios } from './apresentacao/controlador-ipc-usuarios';
import type { Perfil } from './dominio/perfil';
import { Usuario } from './dominio/usuario';
import { HashDeSenhaScrypt } from './infraestrutura/hash-de-senha-scrypt';
import { RepositorioPresencaSqlite } from './infraestrutura/repositorio-presenca-sqlite';
import { RepositorioUsuariosSqlite } from './infraestrutura/repositorio-usuarios-sqlite';

export interface DependenciasModuloUsuarios {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
}

export interface ModuloUsuarios {
  /** Consultado pelo registrador de IPC para liberar ou barrar cada canal. */
  controleDeAcesso: ControleDeAcesso;
  /** Consultas que o módulo oferece aos demais módulos. */
  /** Avisa que este aplicativo está fechando: some da lista de usuários online. */
  encerrar(): Promise<void>;
  comandos: {
    /**
     * Modo apresentação: cria (se preciso) o usuário "Apresentação" (administrador) e abre a sessão com ele,
     * sem senha. Nunca é chamado fora do modo apresentação (banco isolado e descartável).
     */
    entrarComoApresentador(): Promise<{ id: string; nome: string }>;
  };
  consultas: {
    /** Nome de quem está logado agora; `null` sem sessão. */
    nomeDoUsuarioAtual(): string | null;
    /** Quem está logado agora, com o perfil global; `null` sem sessão. */
    usuarioAtual(): { id: string; nome: string; perfil: Perfil; departamento: string | null } | null;
    listarAtivos(): Promise<{ id: string; nome: string }[]>;
    obterPerfilGlobal(id: string): Promise<Perfil | null>;
  };
}

export function montarModuloUsuarios(deps: DependenciasModuloUsuarios): ModuloUsuarios {
  const repositorio = new RepositorioUsuariosSqlite(deps.db);
  const hashDeSenha = new HashDeSenhaScrypt();
  const sessao = new Sessao();
  const presenca = new RepositorioPresencaSqlite(deps.db);
  // Uma identificação por execução do aplicativo (o mesmo usuário pode ter várias instâncias abertas).
  const idDestaInstancia = deps.geradorDeId.gerar();

  const sair = new Sair(repositorio, sessao);

  registrarIpcUsuarios(deps.ipc, {
    obterSessao: new ObterSessao(repositorio, sessao),
    entrar: new Entrar(repositorio, hashDeSenha, sessao, deps.relogio),
    sair,
    primeiroAcesso: new CriarPrimeiroUsuario(
      repositorio,
      hashDeSenha,
      sessao,
      deps.relogio,
      deps.geradorDeId,
    ),
    concluirPrimeiroAcesso: new ConcluirPrimeiroAcesso(repositorio, hashDeSenha, sessao, deps.relogio),
    listar: new ListarUsuarios(repositorio),
    criar: new CriarUsuario(repositorio, hashDeSenha, deps.relogio, deps.geradorDeId),
    atualizar: new AtualizarUsuario(repositorio, deps.relogio),
    alterarSenha: new AlterarSenha(repositorio, hashDeSenha, sessao, deps.relogio),
    excluir: new ExcluirUsuario(repositorio, sessao),
    baterPresenca: new BaterPresenca(presenca, sessao, deps.relogio, idDestaInstancia),
    listarOnline: new ListarUsuariosOnline(presenca, deps.relogio),
  });

  return {
    encerrar: () => presenca.remover(idDestaInstancia),
    comandos: {
      async entrarComoApresentador() {
        let usuario = await repositorio.obterPorLogin('apresentacao');
        if (!usuario) {
          usuario = Usuario.criar({
            id: deps.geradorDeId.gerar(),
            nome: 'Apresentação',
            login: 'apresentacao',
            senhaHash: '!sem-senha',
            perfil: 'administrador',
            departamento: 'Gestão de Projetos',
            agora: deps.relogio.agora(),
          });
          await repositorio.salvar(usuario);
        }
        sessao.abrir(usuario);
        return { id: usuario.id, nome: usuario.nome };
      },
    },
    controleDeAcesso: {
      autenticado: () => sessao.autenticado(),
      possuiPermissao: (permissao) => sessao.possuiPermissao(permissao),
    },
    consultas: {
      nomeDoUsuarioAtual: () => sessao.usuarioAtual?.nome ?? null,
      usuarioAtual: () => {
        const usuario = sessao.usuarioAtual;
        return usuario
          ? { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil, departamento: usuario.departamento }
          : null;
      },
      listarAtivos: async () =>
        (await repositorio.listar())
          .filter((usuario) => usuario.ativo)
          .map((usuario) => ({ id: usuario.id, nome: usuario.nome })),
      obterPerfilGlobal: async (id) => (await repositorio.obterPorId(id))?.perfil ?? null,
    },
  };
}
