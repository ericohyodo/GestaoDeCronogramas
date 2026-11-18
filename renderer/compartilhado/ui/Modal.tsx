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
  largura?: 'sm' | 'md' | 'lg' | 'visualizador' | 'cheia';
  children: ReactNode;
}

const LARGURAS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  // Visualizador de arquivos (PDF, imagem): janela grande sobre a tela, com o X para fechar.
  visualizador: 'h-[88dvh] w-[92dvw] max-w-none open:flex open:flex-col',
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

  // Os botões só fecham o <dialog>: o aviso ao dono (aoFechar) sai uma vez, pelo evento `close`. Antes o
  // botão avisava, o efeito fechava e o `close` avisava de novo — dois ciclos ao desmontar um PDF pesado.
  const fechar = () => referencia.current?.close();
  // Tela cheia e visualizador: sem vidro (o backdrop-filter sobre a janela toda pesa na GPU e trava com PDFs).
  const fundoSolido = largura === 'cheia' || largura === 'visualizador';

  return (
    <dialog
      ref={referencia}
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      className={clsx(
        'm-auto p-0 text-texto',
        largura === 'cheia'
          ? 'rounded-none border-0 bg-superficie-solida'
          : fundoSolido
            ? 'rounded-2xl border border-borda/70 bg-superficie-solida'
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
              <Botao icone={ArrowLeft} onClick={fechar}>
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
              <BotaoIcone icone={X} rotulo="Fechar" onClick={fechar} className="-mr-2 -mt-1" />
            )}
          </header>
          <div className={clsx('px-6 pb-5 pt-4', fundoSolido && 'min-h-0 flex-1')}>{children}</div>
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
