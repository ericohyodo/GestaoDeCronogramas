import { Suspense } from 'react';
import { DetalheCronograma } from './detalhe-cronograma';

/**
 * Export estático não gera páginas para IDs desconhecidos no build,
 * por isso o detalhe usa query string: /cronograma/?id=<uuid>.
 */
export default function PaginaCronograma() {
  return (
    <Suspense>
      <DetalheCronograma />
    </Suspense>
  );
}
