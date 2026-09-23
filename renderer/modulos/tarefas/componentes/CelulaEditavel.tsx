'use client';

import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from 'react';

interface PropsCelulaEditavel {
  valor: string;
  tipo?: 'texto' | 'numero' | 'data';
  editavel?: boolean;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  /** Quebra o texto em várias linhas em vez de cortar com reticências (modo edição). */
  quebrarTexto?: boolean;
  /** Como o valor aparece fora do modo de edição. */
  formatar?: (valor: string) => string;
  aoSalvar: (valor: string) => void | Promise<void>;
}

/**
 * Célula que vira campo ao clicar. Enter, ✓ ou sair do campo salva; Esc ou ✕ cancela.
 * O campo flutua sobre a célula para não mudar a altura da linha (que precisa bater com o Gantt).
 */
export function CelulaEditavel({
  valor,
  tipo = 'texto',
  editavel = true,
  placeholder,
  className,
  min,
  max,
  quebrarTexto = false,
  formatar,
  aoSalvar,
}: PropsCelulaEditavel) {
  // O rascunho só existe durante a edição; fora dela, a célula mostra sempre o valor vindo do banco.
  const [rascunho, setRascunho] = useState<string | null>(null);
  const editando = rascunho !== null;
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) campo.current?.focus();
  }, [editando]);

  const confirmar = () => {
    const novo = rascunho;
    setRascunho(null);
    if (novo !== null && novo !== valor) void aoSalvar(novo);
  };

  const cancelar = () => setRascunho(null);

  const aoTeclar = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      confirmar();
    }
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cancelar();
    }
  };

  // Sem isso o campo perde o foco antes do clique e o blur salvaria no lugar do ✕.
  const manterFoco = (evento: MouseEvent) => evento.preventDefault();

  const texto = valor ? (formatar ? formatar(valor) : valor) : null;
  const corte = quebrarTexto ? 'whitespace-normal break-words' : 'truncate';

  if (!editavel) {
    return (
      <span className={clsx('block px-1 py-0.5 text-sm', corte, className)}>{texto ?? '—'}</span>
    );
  }

  return (
    <div className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setRascunho(valor)}
        // Texto truncado na coluna estreita: o título mostra o conteúdo inteiro ao passar o mouse.
        title={texto ?? 'Clique para editar'}
        className={clsx(
          'block w-full rounded-md px-1 py-0.5 text-left text-sm transition-colors',
          'hover:bg-texto/6 focus-visible:bg-texto/6',
          corte,
          !valor && 'text-texto-sutil',
          editando && 'invisible',
          className,
        )}
      >
        {texto ?? placeholder ?? '—'}
      </button>

      {editando && (
        <div
          className={clsx(
            'absolute left-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-0.5 rounded-lg p-0.5',
            'bg-superficie-solida shadow-lg ring-1 ring-borda',
            tipo === 'texto' ? 'right-0' : 'w-max min-w-full',
          )}
        >
          <input
            ref={campo}
            type={tipo === 'texto' ? 'text' : tipo === 'numero' ? 'number' : 'date'}
            value={rascunho ?? ''}
            min={min}
            max={max}
            onChange={(evento) => setRascunho(evento.target.value)}
            onBlur={confirmar}
            onKeyDown={aoTeclar}
            className={clsx(
              'min-w-0 flex-1 rounded-md border border-primaria bg-superficie-solida px-1.5 py-0.5 text-sm text-texto',
              'outline-none ring-3 ring-primaria/20',
              tipo === 'numero' && 'w-16',
              tipo !== 'texto' && 'tabular-nums',
            )}
          />
          <button
            type="button"
            aria-label="Confirmar"
            title="Confirmar (Enter)"
            onMouseDown={manterFoco}
            onClick={confirmar}
            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primaria text-sobre-primaria hover:bg-primaria-hover"
          >
            <Check aria-hidden className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Cancelar"
            title="Cancelar (Esc)"
            onMouseDown={manterFoco}
            onClick={cancelar}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-texto-secundario hover:bg-texto/6"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
