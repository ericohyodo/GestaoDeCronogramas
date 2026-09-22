'use client';

import clsx from 'clsx';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

interface PropsCelulaEditavel {
  valor: string;
  tipo?: 'texto' | 'numero' | 'data';
  editavel?: boolean;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  /** Como o valor aparece fora do modo de edição. */
  formatar?: (valor: string) => string;
  aoSalvar: (valor: string) => void | Promise<void>;
}

/**
 * Célula que vira campo ao clicar. Enter ou sair do campo salva; Esc cancela.
 * É o fluxo para preencher em sequência as subtarefas criadas por uma fase.
 */
export function CelulaEditavel({
  valor,
  tipo = 'texto',
  editavel = true,
  placeholder,
  className,
  min,
  max,
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

  const aoTeclar = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      confirmar();
    }
    if (evento.key === 'Escape') {
      evento.preventDefault();
      setRascunho(null);
    }
  };

  if (!editavel) {
    return (
      <span className={clsx('block truncate px-1 py-1 text-sm', className)}>
        {formatar ? formatar(valor) : valor || '—'}
      </span>
    );
  }

  if (editando) {
    return (
      <input
        ref={campo}
        type={tipo === 'texto' ? 'text' : tipo === 'numero' ? 'number' : 'date'}
        value={rascunho ?? valor}
        min={min}
        max={max}
        onChange={(evento) => setRascunho(evento.target.value)}
        onBlur={confirmar}
        onKeyDown={aoTeclar}
        className={clsx(
          'w-full rounded-md border border-primaria bg-superficie-solida px-1.5 py-0.5 text-sm text-texto',
          'outline-none ring-3 ring-primaria/20',
          tipo !== 'texto' && 'tabular-nums',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRascunho(valor)}
      // Texto truncado na coluna estreita: o título mostra o conteúdo inteiro ao passar o mouse.
      title={valor ? (formatar ? formatar(valor) : valor) : 'Clique para editar'}
      className={clsx(
        'block w-full truncate rounded-md px-1 py-1 text-left text-sm transition-colors',
        'hover:bg-texto/6 focus-visible:bg-texto/6',
        !valor && 'text-texto-sutil',
        className,
      )}
    >
      {valor ? (formatar ? formatar(valor) : valor) : (placeholder ?? '—')}
    </button>
  );
}
