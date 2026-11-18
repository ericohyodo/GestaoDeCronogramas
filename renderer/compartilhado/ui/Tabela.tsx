import clsx from 'clsx';
import type { ComponentProps, KeyboardEvent } from 'react';
import { Ajuda } from './Ajuda';

/** Campos de célula que o Enter percorre: texto, número, data e seleção (caixas de marcar ficam de fora). */
const CAMPO_DA_CELULA =
  'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not(:disabled), select:not(:disabled)';

/**
 * Enter numa célula editável vai para o campo da mesma coluna na linha de baixo (Shift+Enter, na de cima),
 * como numa planilha. Também evita que o Enter envie o formulário da aba sem querer.
 * @param evento tecla pressionada dentro da tabela
 */
function moverComEnter(evento: KeyboardEvent<HTMLTableElement>): void {
  if (evento.key !== 'Enter' || evento.altKey || evento.ctrlKey || evento.metaKey || evento.nativeEvent.isComposing) return;
  const campo = evento.target;
  if (!(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement) || !campo.matches(CAMPO_DA_CELULA)) return;
  const celula = campo.closest('td');
  const linha = celula?.parentElement;
  if (!celula || !(linha instanceof HTMLTableRowElement)) return;

  evento.preventDefault();
  let destino: Element | null = linha;
  while ((destino = evento.shiftKey ? destino.previousElementSibling : destino.nextElementSibling)) {
    if (!(destino instanceof HTMLTableRowElement)) continue;
    const alvo = destino.cells[celula.cellIndex]?.querySelector<HTMLInputElement | HTMLSelectElement>(CAMPO_DA_CELULA);
    if (alvo) {
      alvo.focus();
      if (alvo instanceof HTMLInputElement) alvo.select();
      return;
    }
  }
}

/** Primitivas de tabela. Linhas sem blur (desempenho): o vidro fica no painel que envolve a tabela. */
export function Tabela({ className, onKeyDown, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={clsx('w-full border-separate border-spacing-0 text-sm', className)}
        onKeyDown={(evento) => {
          onKeyDown?.(evento);
          if (!evento.defaultPrevented) moverComEnter(evento);
        }}
        {...props}
      />
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
