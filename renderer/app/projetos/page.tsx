'use client';

import { PaginaCronogramas } from '@/modulos/cronogramas/componentes/PaginaCronogramas';
import { AnalisePortfolioComIa } from '@/modulos/ia/componentes/AnalisePortfolioComIa';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function Projetos() {
  return (
    <PaginaCronogramas podeEditar={usePermissao('planejamento')} acoesExtras={<AnalisePortfolioComIa />} />
  );
}
