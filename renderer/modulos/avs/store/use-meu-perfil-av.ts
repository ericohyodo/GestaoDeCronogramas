import { create } from 'zustand';
import type { AreaAvDTO, MeuPerfilAvDTO } from '@contratos/avs.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';

// =====================================================================================================
// Perfil AV/SD do usuário logado: a tela usa para habilitar botões (aceite da SD) e deixar abas em
// somente leitura. O servidor continua sendo quem decide; isto só evita oferecer o que vai ser recusado.
// =====================================================================================================

interface EstadoMeuPerfilAv {
  perfil: MeuPerfilAvDTO | null;
  /** Carrega uma vez por sessão (ou de novo, com `forcar`). */
  carregar(forcar?: boolean): Promise<MeuPerfilAvDTO | null>;
}

export const useMeuPerfilAv = create<EstadoMeuPerfilAv>()((set, get) => ({
  perfil: null,
  async carregar(forcar = false) {
    if (get().perfil && !forcar) return get().perfil;
    try {
      const perfil = await clienteDesktop.avs.obterMeuPerfil();
      set({ perfil });
      return perfil;
    } catch {
      set({ perfil: null });
      return null;
    }
  },
}));

/**
 * O usuário logado pode editar a área desta AV? Mesma regra do servidor (`podeEditarArea`):
 * administrador sempre; papel "visualizador" nunca; os demais só se forem o responsável da área.
 * @param perfil perfil carregado (`null` enquanto carrega: trata como sem permissão)
 * @param responsavelId id do responsável designado para a área na AV
 */
export function podeEditarAreaDaAv(perfil: MeuPerfilAvDTO | null, responsavelId: string | null | undefined): boolean {
  if (!perfil) return false;
  if (perfil.administrador) return true;
  if (perfil.papelAv === 'visualizador') return false;
  return !!responsavelId && responsavelId === perfil.usuarioId;
}

/** Gerente de Engenharia ou Gestor de Programa: dá o aceite da SD. */
export function podeDarAceite(perfil: MeuPerfilAvDTO | null): boolean {
  return !!perfil && perfil.papeisEspeciais.length > 0;
}

export type { AreaAvDTO };
