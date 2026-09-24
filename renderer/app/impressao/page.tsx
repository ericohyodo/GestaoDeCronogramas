import { Suspense } from 'react';
import { ImpressaoCronograma } from './impressao-cronograma';

/** Aberta pelo processo principal numa janela invisível e impressa em PDF (A4). */
export default function PaginaImpressao() {
  return (
    <Suspense>
      <ImpressaoCronograma />
    </Suspense>
  );
}
