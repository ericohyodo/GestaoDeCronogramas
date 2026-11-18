'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { EditorItemPortfolio } from '@/modulos/avs/componentes/portfolio/EditorItemPortfolio';
import { usePermissao } from '@/modulos/usuarios/store/use-sessao-store';

function Editor() {
  const id = useSearchParams().get('id');
  const podeEditar = usePermissao('planejamento');
  // `key`: trocar de item (ou criar e passar a editar) recarrega o formulário.
  return <EditorItemPortfolio key={id ?? 'novo'} id={id} podeEditar={podeEditar} />;
}

/** Export estático: o item vem na query string (/portfolio/itens/editar/?id=<uuid>; sem id = novo). */
export default function EditarItemPortfolio() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
