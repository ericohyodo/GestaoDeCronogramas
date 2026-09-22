'use client';

import clsx from 'clsx';
import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { BotaoIcone } from './Botao';

interface PropsModal {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  aoFechar: () => void;
  largura?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const LARGURAS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/**
 * Modal sobre <dialog> nativo: foco preso, Esc para fechar e ::backdrop com desfoque.
 */
export function Modal({ aberto, titulo, descricao, aoFechar, largura = 'md', children }: PropsModal) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      dialogo.showModal();
      // showModal() foca o primeiro elemento focável (o botão Fechar); o primeiro campo é mais útil.
      dialogo.querySelector<HTMLElement>('input, textarea, select')?.focus();
    }
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={referencia}
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      className={clsx(
        'vidro-forte m-auto w-[calc(100%-2rem)] rounded-2xl p-0 text-texto',
        'backdrop:bg-[#0b1220]/35 backdrop:backdrop-blur-[3px]',
        LARGURAS[largura],
      )}
    >
      {aberto && (
        <>
          <header className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 id={idTitulo} className="text-base font-semibold">
                {titulo}
              </h2>
              {descricao && <p className="mt-1 text-sm text-texto-secundario">{descricao}</p>}
            </div>
            <BotaoIcone icone={X} rotulo="Fechar" onClick={aoFechar} className="-mr-2 -mt-1" />
          </header>
          <div className="px-6 pb-5 pt-4">{children}</div>
        </>
      )}
    </dialog>
  );
}

/** Rodapé padrão de formulários dentro do Modal. */
export function RodapeModal({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 -mb-5 mt-6 flex justify-end gap-2 border-t border-borda/70 px-6 py-4">
      {children}
    </div>
  );
}
