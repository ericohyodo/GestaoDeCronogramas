/**
 * API pública do módulo Usuários (autenticação, perfis e sessão).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { ControleDeAcesso } from '../../nucleo/aplicacao/portas/controle-de-acesso';
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
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
import { Sessao } from './aplicacao/sessao';
import { registrarIpcUsuarios } from './apresentacao/controlador-ipc-usuarios';
import type { Perfil } from './dominio/perfil';
import { HashDeSenhaScrypt } from './infraestrutura/hash-de-senha-scrypt';
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
  consultas: {
    /** Nome de quem está logado agora; `null` sem sessão. */
    nomeDoUsuarioAtual(): string | null;
    /** Quem está logado agora, com o perfil global; `null` sem sessão. */
    usuarioAtual(): { id: string; nome: string; perfil: Perfil } | null;
    listarAtivos(): Promise<{ id: string; nome: string }[]>;
    obterPerfilGlobal(id: string): Promise<Perfil | null>;
  };
}

export function montarModuloUsuarios(deps: DependenciasModuloUsuarios): ModuloUsuarios {
  const repositorio = new RepositorioUsuariosSqlite(deps.db);
  const hashDeSenha = new HashDeSenhaScrypt();
  const sessao = new Sessao();

  registrarIpcUsuarios(deps.ipc, {
    obterSessao: new ObterSessao(repositorio, sessao),
    entrar: new Entrar(repositorio, hashDeSenha, sessao, deps.relogio),
    sair: new Sair(repositorio, sessao),
    primeiroAcesso: new CriarPrimeiroUsuario(
      repositorio,
      hashDeSenha,
      sessao,
      deps.relogio,
      deps.geradorDeId,
    ),
    listar: new ListarUsuarios(repositorio),
    criar: new CriarUsuario(repositorio, hashDeSenha, deps.relogio, deps.geradorDeId),
    atualizar: new AtualizarUsuario(repositorio, deps.relogio),
    alterarSenha: new AlterarSenha(repositorio, hashDeSenha, sessao, deps.relogio),
    excluir: new ExcluirUsuario(repositorio, sessao),
  });

  return {
    controleDeAcesso: {
      autenticado: () => sessao.autenticado(),
      possuiPermissao: (permissao) => sessao.possuiPermissao(permissao),
    },
    consultas: {
      nomeDoUsuarioAtual: () => sessao.usuarioAtual?.nome ?? null,
      usuarioAtual: () => {
        const usuario = sessao.usuarioAtual;
        return usuario ? { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil } : null;
      },
      listarAtivos: async () =>
        (await repositorio.listar())
          .filter((usuario) => usuario.ativo)
          .map((usuario) => ({ id: usuario.id, nome: usuario.nome })),
      obterPerfilGlobal: async (id) => (await repositorio.obterPorId(id))?.perfil ?? null,
    },
  };
}
