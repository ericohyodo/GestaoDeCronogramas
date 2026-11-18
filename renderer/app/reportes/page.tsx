import { Suspense } from 'react';
import { PaginaReportes } from '@/modulos/reportes/componentes/PaginaReportes';

export default function Reportes() {
  return (
    <Suspense>
      <PaginaReportes />
    </Suspense>
  );
}
