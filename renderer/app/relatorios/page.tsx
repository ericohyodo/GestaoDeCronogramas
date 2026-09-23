'use client';

import { PaginaRelatorios } from '@/modulos/relatorios/componentes/PaginaRelatorios';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function Relatorios() {
  return <PaginaRelatorios podeMarcar={usePermissao('tarefas')} />;
}
