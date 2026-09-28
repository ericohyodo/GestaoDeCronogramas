import { Suspense } from 'react';
import { ImpressaoDaAnalise } from '@/modulos/ia/componentes/ImpressaoDaAnalise';

/** Aberta pelo processo principal numa janela invisível e impressa em PDF (A4). */
export default function PaginaImpressaoDaAnalise() {
  return (
    <Suspense>
      <ImpressaoDaAnalise />
    </Suspense>
  );
}
