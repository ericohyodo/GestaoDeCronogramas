import { CalendarRange } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Barra de título própria (titleBarStyle: 'hidden'). A área toda arrasta a janela;
 * os botões nativos do Windows ficam sobrepostos à direita, e o padding reserva esse espaço
 * usando as variáveis `titlebar-area-*` do Window Controls Overlay.
 */
export function BarraDeTitulo({ acoes }: { acoes?: ReactNode }) {
  return (
    <header
      className="regiao-arrasto flex h-10 shrink-0 select-none items-center gap-3 pl-4"
      style={{ paddingRight: 'calc(100vw - env(titlebar-area-width, 100vw) + 0.75rem)' }}
    >
      <div className="grid size-6 place-items-center rounded-md bg-linear-to-br from-primaria to-destaque text-sobre-primaria">
        <CalendarRange aria-hidden className="size-3.5" />
      </div>
      <span className="text-xs font-semibold tracking-wide text-texto-secundario">
        Gestão de Cronogramas
      </span>
      <div className="flex-1" />
      {acoes && <div className="sem-arrasto flex items-center gap-2">{acoes}</div>}
    </header>
  );
}
