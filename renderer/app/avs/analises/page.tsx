'use client';

import { ArquivoDeAnalises } from '@/modulos/ia/componentes/ArquivoDeAnalises';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function AnalisesDasAvs() {
  return <ArquivoDeAnalises escopo="avs" podeExcluir={usePermissao('planejamento')} />;
}
