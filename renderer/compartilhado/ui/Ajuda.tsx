'use client';

import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import { createPortal } from 'react-dom';

const LARGURA_DA_DICA = 288;
const MARGEM = 8;

/**
 * Ícone de ajuda com explicação ao passar o mouse (ou focar pelo teclado). A dica é desenhada num portal,
 * com posição fixa, para não ser cortada por tabelas rolantes nem deslocada pelo efeito de vidro dos painéis.
 */
export function Ajuda({ texto }: { texto: string }) {
  const id = useId();
  const [posicao, setPosicao] = useState<{ x: number; y: number } | null>(null);

  const mostrar = (elemento: HTMLElement) => {
    const caixa = elemento.getBoundingClientRect();
    const x = Math.min(
      Math.max(MARGEM, caixa.left + caixa.width / 2 - LARGURA_DA_DICA / 2),
      window.innerWidth - LARGURA_DA_DICA - MARGEM,
    );
    setPosicao({ x, y: caixa.bottom + 6 });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Ajuda sobre este campo"
        aria-describedby={posicao ? id : undefined}
        className="inline-grid size-4 shrink-0 place-items-center rounded-full align-middle text-texto-sutil transition-colors hover:text-primaria focus-visible:text-primaria"
        onMouseEnter={(e) => mostrar(e.currentTarget)}
        onFocus={(e) => mostrar(e.currentTarget)}
        onMouseLeave={() => setPosicao(null)}
        onBlur={() => setPosicao(null)}
      >
        <Info aria-hidden className="size-3.5" />
      </button>
      {posicao &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ left: posicao.x, top: posicao.y, width: LARGURA_DA_DICA }}
            className="pointer-events-none fixed z-[100] rounded-lg border border-borda bg-superficie-solida px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-texto shadow-lg"
          >
            {texto}
          </span>,
          document.body,
        )}
    </>
  );
}
