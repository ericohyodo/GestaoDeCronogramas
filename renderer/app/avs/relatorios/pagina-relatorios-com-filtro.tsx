'use client';

import { useSearchParams } from 'next/navigation';
import { PaginaRelatoriosAvs, type FiltroDePrazo } from '@/modulos/avs/componentes/PaginaRelatoriosAvs';

const FILTROS_VALIDOS: readonly FiltroDePrazo[] = ['no_prazo', 'vencendo', 'atrasada'];

/** /avs/relatorios/?prazo=atrasada — abre o relatório já filtrado (links da faixa "Prazos das áreas"). */
export function PaginaRelatoriosComFiltro() {
  const prazo = useSearchParams().get('prazo');
  const filtro = FILTROS_VALIDOS.find((valor) => valor === prazo) ?? 'todas';
  // A chave remonta a página quando o filtro do link muda (o estado inicial vem do link).
  return <PaginaRelatoriosAvs key={filtro} prazoInicial={filtro} />;
}
