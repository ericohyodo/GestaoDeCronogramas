'use client';

import clsx from 'clsx';
import { type ComponentProps, type ReactNode, useId } from 'react';

const CLASSE_CAMPO =
  'w-full rounded-lg border border-borda bg-superficie-solida/80 px-3 text-sm text-texto ' +
  'placeholder:text-texto-sutil transition-colors ' +
  'focus:border-primaria focus:outline-none focus:ring-3 focus:ring-primaria/20 ' +
  'disabled:opacity-60 aria-invalid:border-perigo';

interface PropsCampo {
  id: string;
  rotulo: string;
  dica?: string;
  erro?: string;
  className?: string;
  children: ReactNode;
}

function Campo({ id, rotulo, dica, erro, className, children }: PropsCampo) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-texto-secundario">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-xs text-perigo">
          {erro}
        </p>
      ) : (
        dica && <p className="text-xs text-texto-sutil">{dica}</p>
      )}
    </div>
  );
}

type PropsComuns = { rotulo: string; dica?: string; erro?: string; classeContainer?: string };

export function CampoTexto({
  rotulo,
  dica,
  erro,
  classeContainer,
  className,
  ...props
}: PropsComuns & ComponentProps<'input'>) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo} dica={dica} erro={erro} className={classeContainer}>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={clsx(CLASSE_CAMPO, 'h-9', className)}
        {...props}
      />
    </Campo>
  );
}

export function CampoData(props: PropsComuns & Omit<ComponentProps<'input'>, 'type'>) {
  return <CampoTexto type="date" className="tabular-nums" {...props} />;
}

export function AreaTexto({
  rotulo,
  dica,
  erro,
  classeContainer,
  className,
  ...props
}: PropsComuns & ComponentProps<'textarea'>) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo} dica={dica} erro={erro} className={classeContainer}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={erro ? true : undefined}
        className={clsx(CLASSE_CAMPO, 'resize-none py-2', className)}
        {...props}
      />
    </Campo>
  );
}

export interface OpcaoSelecao {
  valor: string;
  rotulo: string;
}

export function Selecao({
  rotulo,
  dica,
  erro,
  classeContainer,
  className,
  opcoes,
  ...props
}: PropsComuns & ComponentProps<'select'> & { opcoes: readonly OpcaoSelecao[] }) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo} dica={dica} erro={erro} className={classeContainer}>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        className={clsx(CLASSE_CAMPO, 'h-9', className)}
        {...props}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </Campo>
  );
}
