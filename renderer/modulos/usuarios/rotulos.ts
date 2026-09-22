import { PERFIS, type PerfilDTO } from '@contratos/sessao.contrato';
import type { OpcaoSelecao } from '@/compartilhado/ui/Campos';
import type { Tom } from '@/compartilhado/ui/Etiqueta';

export const ROTULO_PERFIL: Record<PerfilDTO, string> = {
  administrador: 'Administrador',
  gestor: 'Gestor de projeto',
  usuario: 'Usuário',
  visualizador: 'Visualizador',
};

export const DESCRICAO_PERFIL: Record<PerfilDTO, string> = {
  administrador: 'Tudo, incluindo gerenciar usuários',
  gestor: 'Cria cronogramas, fases e responsáveis',
  usuario: 'Edita tarefas e progresso',
  visualizador: 'Somente leitura',
};

export const TOM_PERFIL: Record<PerfilDTO, Tom> = {
  administrador: 'primaria',
  gestor: 'destaque',
  usuario: 'info',
  visualizador: 'neutro',
};

export const OPCOES_PERFIL: OpcaoSelecao[] = PERFIS.map((perfil) => ({
  valor: perfil,
  rotulo: `${ROTULO_PERFIL[perfil]} — ${DESCRICAO_PERFIL[perfil]}`,
}));
