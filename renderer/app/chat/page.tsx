'use client';

import { ChatIa } from '@/modulos/ia/componentes/ChatIa';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

export default function PaginaChat() {
  // Quem edita tarefas pode aplicar as propostas do agente; os demais só consultam.
  const podeEditarTarefas = usePermissao('tarefas');
  return <ChatIa podeEditarTarefas={podeEditarTarefas} />;
}
