'use client';

import { PaginaCronogramas } from '@/modulos/cronogramas/componentes/PaginaCronogramas';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function Inicio() {
  return <PaginaCronogramas podeEditar={usePermissao('planejamento')} />;
}
