/**
 * API pública do módulo Responsáveis (as pessoas que respondem pelas tarefas).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import {
  AtualizarResponsavel,
  CriarResponsavel,
  ExcluirResponsavel,
  ListarResponsaveis,
} from './aplicacao/casos-de-uso/gerenciar-responsaveis';
import { registrarIpcResponsaveis } from './apresentacao/controlador-ipc-responsaveis';
import { RepositorioResponsaveisSqlite } from './infraestrutura/repositorio-responsaveis-sqlite';

export interface DependenciasModuloResponsaveis {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
}

export interface ModuloResponsaveis {
  comandos: {
    /** Cadastra um recurso (usado pelo seed do modo apresentação). */
    criar(entrada: { nome: string; funcao: string | null; usuarioId: string | null }): Promise<{ id: string }>;
  };
  consultas: {
    /** Nomes por id, para o módulo de tarefas exibir o responsável sem conhecer este módulo. */
    obterNomes(ids: string[]): Promise<Map<string, string>>;
    existe(id: string): Promise<boolean>;
    /** Usuário do sistema vinculado a cada responsável (só os que têm vínculo). */
    obterUsuarios(ids: string[]): Promise<Map<string, string>>;
  };
}

export function montarModuloResponsaveis(
  deps: DependenciasModuloResponsaveis,
): ModuloResponsaveis {
  const repositorio = new RepositorioResponsaveisSqlite(deps.db);

  registrarIpcResponsaveis(deps.ipc, {
    listar: new ListarResponsaveis(repositorio),
    criar: new CriarResponsavel(repositorio, deps.relogio, deps.geradorDeId),
    atualizar: new AtualizarResponsavel(repositorio, deps.relogio),
    excluir: new ExcluirResponsavel(repositorio),
  });

  const criarResponsavel = new CriarResponsavel(repositorio, deps.relogio, deps.geradorDeId);

  return {
    comandos: { criar: async (entrada) => ({ id: (await criarResponsavel.executar(entrada)).id }) },
    consultas: {
      async obterNomes(ids) {
        const procurados = new Set(ids);
        const nomes = new Map<string, string>();
        for (const responsavel of await repositorio.listar()) {
          if (procurados.has(responsavel.id)) nomes.set(responsavel.id, responsavel.nome);
        }
        return nomes;
      },
      async obterUsuarios(ids) {
        const procurados = new Set(ids);
        const usuarios = new Map<string, string>();
        for (const responsavel of await repositorio.listar()) {
          if (procurados.has(responsavel.id) && responsavel.usuarioId && responsavel.ativo) {
            usuarios.set(responsavel.id, responsavel.usuarioId);
          }
        }
        return usuarios;
      },
      async existe(id) {
        return (await repositorio.obterPorId(id)) !== null;
      },
    },
  };
}
