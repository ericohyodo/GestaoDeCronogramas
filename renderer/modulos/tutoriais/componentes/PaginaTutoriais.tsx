'use client';

import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { TOPICOS } from '../conteudo';

/** Tutoriais: um índice à esquerda e o passo a passo do tópico escolhido. */
export function PaginaTutoriais() {
  const [ativo, setAtivo] = useState(TOPICOS[0]!.id);
  const topico = TOPICOS.find((item) => item.id === ativo) ?? TOPICOS[0]!;

  return (
    <div data-tour="tutoriais" className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Tutoriais"
        descricao="Como o app funciona no dia a dia: primeiro acesso, AVs, SDs, projetos e avisos."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <PainelVidro className="h-fit p-2">
          <nav aria-label="Tópicos dos tutoriais" className="flex flex-col">
            {TOPICOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAtivo(item.id)}
                aria-current={item.id === ativo ? 'page' : undefined}
                className={clsx(
                  'rounded-lg px-3 py-2.5 text-left transition-colors',
                  item.id === ativo ? 'bg-primaria/10 text-primaria' : 'hover:bg-texto/5',
                )}
              >
                <span className="block text-sm font-semibold">{item.titulo}</span>
                <span className="block text-xs text-texto-secundario">{item.resumo}</span>
              </button>
            ))}
          </nav>
        </PainelVidro>

        <PainelVidro className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{topico.titulo}</h2>
              <p className="text-sm text-texto-secundario">{topico.resumo}</p>
            </div>
            {topico.rota && (
              <Link
                href={topico.rota}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primaria hover:text-primaria-hover"
              >
                Ir para a tela
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </div>
          <ol className="flex flex-col gap-4">
            {topico.passos.map((passo, indice) => (
              <li key={passo.titulo} className="flex gap-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primaria/10 text-xs font-semibold text-primaria tabular-nums">
                  {indice + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{passo.titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-texto-secundario">{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </PainelVidro>
      </div>
    </div>
  );
}
