import { create } from 'zustand';
import type { MeuPerfilDTO, SalvarMeuPerfilEntrada } from '@contratos/usuarios.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';

interface EstadoMeuPerfil {
  /** `null` até carregar (ou sem sessão). */
  perfil: MeuPerfilDTO | null;
  carregar(): Promise<MeuPerfilDTO>;
  salvar(entrada: SalvarMeuPerfilEntrada): Promise<MeuPerfilDTO>;
  limpar(): void;
}

/** Perfil de quem está logado: a página "Meu perfil" e a foto da barra de título leem daqui. */
export const useMeuPerfilStore = create<EstadoMeuPerfil>()((set) => ({
  perfil: null,
  async carregar() {
    const perfil = await clienteDesktop.usuarios.obterMeuPerfil();
    set({ perfil });
    return perfil;
  },
  async salvar(entrada) {
    const perfil = await clienteDesktop.usuarios.salvarMeuPerfil(entrada);
    set({ perfil });
    return perfil;
  },
  limpar() {
    set({ perfil: null });
  },
}));
