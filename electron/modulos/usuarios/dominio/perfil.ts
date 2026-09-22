import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

export const PERFIS = ['administrador', 'gestor', 'usuario', 'visualizador'] as const;
export type Perfil = (typeof PERFIS)[number];

export const PERMISSOES = ['leitura', 'tarefas', 'planejamento', 'administracao'] as const;
export type Permissao = (typeof PERMISSOES)[number];

/**
 * Política de acesso do aplicativo. É a fonte da verdade: o processo principal usa isto para
 * liberar cada canal IPC e envia a lista de permissões na sessão para a UI esconder o que não pode.
 *
 * leitura        consultar cronogramas, tarefas e responsáveis
 * tarefas        criar e editar tarefas, dependências e progresso
 * planejamento   criar cronogramas, fases e responsáveis
 * administracao  gerenciar usuários
 */
const POLITICA: Record<Perfil, readonly Permissao[]> = {
  administrador: ['leitura', 'tarefas', 'planejamento', 'administracao'],
  gestor: ['leitura', 'tarefas', 'planejamento'],
  usuario: ['leitura', 'tarefas'],
  visualizador: ['leitura'],
};

export function permissoesDoPerfil(perfil: Perfil): Permissao[] {
  return [...POLITICA[perfil]];
}

export function validarPerfil(valor: string): Perfil {
  if (!(PERFIS as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`Perfil inválido: "${valor}".`);
  }
  return valor as Perfil;
}
