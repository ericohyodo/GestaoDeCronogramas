import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PropsEstadoVazio {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}

export function EstadoVazio({ icone: Icone, titulo, descricao, acao, className }: PropsEstadoVazio) {
  return (
    <div className={clsx('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primaria/10 text-primaria">
        <Icone aria-hidden className="size-6" />
      </div>
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {descricao && <p className="mt-1 max-w-sm text-sm text-texto-secundario">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
