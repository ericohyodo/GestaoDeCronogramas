import clsx from 'clsx';
import type { ComponentProps } from 'react';
import { Ajuda } from './Ajuda';

/** Primitivas de tabela. Linhas sem blur (desempenho): o vidro fica no painel que envolve a tabela. */
export function Tabela({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx('w-full border-separate border-spacing-0 text-sm', className)} {...props} />
    </div>
  );
}

/** `ajuda` acrescenta o ícone de explicação ao lado do título da coluna. */
export function CelulaCabecalho({
  className,
  ajuda,
  children,
  ...props
}: ComponentProps<'th'> & { ajuda?: string }) {
  return (
    <th
      scope="col"
      className={clsx(
        'border-b border-borda px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-texto-sutil',
        className,
      )}
      {...props}
    >
      {ajuda ? (
        <span className="inline-flex items-center gap-1">
          {children}
          <Ajuda texto={ajuda} />
        </span>
      ) : (
        children
      )}
    </th>
  );
}

export function LinhaTabela({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={clsx('transition-colors hover:bg-primaria/4', className)} {...props} />;
}

export function CelulaTabela({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td className={clsx('border-b border-borda/60 px-3 py-3 align-middle', className)} {...props} />
  );
}
