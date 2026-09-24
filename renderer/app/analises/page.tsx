'use client';

import { ArquivoDeAnalises } from '@/modulos/ia/componentes/ArquivoDeAnalises';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function PaginaAnalises() {
  return <ArquivoDeAnalises podeExcluir={usePermissao('planejamento')} />;
}
