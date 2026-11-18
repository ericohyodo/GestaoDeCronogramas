import { Suspense } from 'react';
import { PaginaDetalheAv } from '../../avs/detalhe/pagina-detalhe-av';

/** Detalhe da AV de Item de Portfólio: mesma moldura da AV, com as abas de checagem (escolhidas pelo tipo). */
export default function DetalheDeAvPortfolio() {
  return (
    <Suspense>
      <PaginaDetalheAv />
    </Suspense>
  );
}
