'use client';

import { PaginaItensPortfolio } from '@/modulos/avs/componentes/portfolio/PaginaItensPortfolio';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function ItensPortfolio() {
  // Gestores e administradores (planejamento) cadastram; os demais consultam.
  return <PaginaItensPortfolio podeEditar={usePermissao('planejamento')} />;
}
