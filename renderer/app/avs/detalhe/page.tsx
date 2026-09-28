import { Suspense } from 'react';
import { PaginaDetalheAv } from './pagina-detalhe-av';

export default function DetalheDeAv() {
  return (
    <Suspense>
      <PaginaDetalheAv />
    </Suspense>
  );
}
