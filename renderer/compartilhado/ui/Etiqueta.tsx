import clsx from 'clsx';
import type { ReactNode } from 'react';

export type Tom = 'neutro' | 'info' | 'sucesso' | 'alerta' | 'perigo' | 'destaque' | 'primaria';

const TONS: Record<Tom, string> = {
  neutro: 'tom-texto-sutil',
  info: 'tom-info',
  sucesso: 'tom-sucesso',
  alerta: 'tom-alerta',
  perigo: 'tom-perigo',
  destaque: 'tom-destaque',
  primaria: 'tom-primaria',
};

export function Etiqueta({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'etiqueta inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONS[tom],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
