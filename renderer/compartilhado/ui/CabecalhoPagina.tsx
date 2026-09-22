import type { ReactNode } from 'react';

interface PropsCabecalhoPagina {
  titulo: ReactNode;
  descricao?: ReactNode;
  antes?: ReactNode;
  acoes?: ReactNode;
}

export function CabecalhoPagina({ titulo, descricao, antes, acoes }: PropsCabecalhoPagina) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {antes}
        <h1 className="truncate text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <div className="mt-1 text-sm text-texto-secundario">{descricao}</div>}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  );
}
