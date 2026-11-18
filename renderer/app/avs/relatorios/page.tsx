import { Suspense } from 'react';
import { PaginaRelatoriosComFiltro } from './pagina-relatorios-com-filtro';

export default function RelatoriosDasAvs() {
  return (
    <Suspense>
      <PaginaRelatoriosComFiltro />
    </Suspense>
  );
}
