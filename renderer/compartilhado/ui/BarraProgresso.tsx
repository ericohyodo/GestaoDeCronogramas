import clsx from 'clsx';

interface PropsBarraProgresso {
  valor: number;
  rotulo: string;
  className?: string;
}

export function BarraProgresso({ valor, rotulo, className }: PropsBarraProgresso) {
  const percentual = Math.min(100, Math.max(0, valor));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuenow={percentual}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-texto/8', className)}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-primaria to-destaque transition-[width] duration-500"
        style={{ width: `${percentual}%` }}
      />
    </div>
  );
}
