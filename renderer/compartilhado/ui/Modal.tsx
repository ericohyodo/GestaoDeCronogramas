'use client';

import clsx from 'clsx';
import { ArrowLeft, X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { Botao, BotaoIcone } from './Botao';

interface PropsModal {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  aoFechar: () => void;
  largura?: 'sm' | 'md' | 'lg' | 'cheia';
  children: ReactNode;
}

const LARGURAS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  // Ocupa a janela inteira (o `open:` evita que o display:flex apareça com o <dialog> fechado).
  cheia: 'h-dvh max-h-none w-dvw max-w-none rounded-none open:flex open:flex-col',
} as const;

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
        'm-auto p-0 text-texto',
        // Em tela cheia o vidro (backdrop-filter sobre a janela toda) pesa na GPU e trava com PDFs: fundo sólido.
        largura === 'cheia'
          ? 'rounded-none border-0 bg-superficie-solida'
          : 'vidro-forte w-[calc(100%-2rem)] rounded-2xl backdrop:backdrop-blur-[3px]',
        'backdrop:bg-[#0b1220]/35',
        LARGURAS[largura],
      )}
    >
      {aberto && (
        <>
          <header
            className={clsx(
              'flex gap-4 px-6 pt-5',
              // Em tela cheia o canto superior direito é dos controles da janela: o retorno fica à esquerda.
              largura === 'cheia' ? 'items-center' : 'items-start justify-between',
            )}
          >
            {largura === 'cheia' && (
              <Botao icone={ArrowLeft} onClick={aoFechar}>
                Voltar
              </Botao>
            )}
            <div className="min-w-0">
              <h2 id={idTitulo} className="truncate text-base font-semibold">
                {titulo}
              </h2>
              {descricao && <p className="mt-1 text-sm text-texto-secundario">{descricao}</p>}
            </div>
            {largura !== 'cheia' && (
              <BotaoIcone icone={X} rotulo="Fechar" onClick={aoFechar} className="-mr-2 -mt-1" />
            )}
          </header>
          <div className={clsx('px-6 pb-5 pt-4', largura === 'cheia' && 'min-h-0 flex-1')}>{children}</div>
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
