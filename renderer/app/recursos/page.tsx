'use client';

import { PaginaResponsaveis } from '@/modulos/responsaveis/componentes/PaginaResponsaveis';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function Recursos() {
  return <PaginaResponsaveis podeEditar={usePermissao('planejamento')} />;
}
