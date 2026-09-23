'use client';

import clsx from 'clsx';
import { PartyPopper } from 'lucide-react';
import Link from 'next/link';
import type { ItemAgendaDTO } from '@contratos/tarefas.contrato';
import { formatarDataCurta } from '@/compartilhado/formatacao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { rotuloDoPrazo } from '../periodos';

export interface GrupoChecklist {
  titulo: string;
  itens: ItemAgendaDTO[];
}

/** O que mostrar na segunda linha de cada item depende de como a lista foi filtrada. */
export type Contexto = 'projeto-e-fase' | 'fase-e-responsavel' | 'projeto-e-responsavel';

interface PropsChecklist {
  grupos: GrupoChecklist[];
  contexto: Contexto;
  hoje: string;
  podeMarcar: boolean;
  aoAlternar: (tarefaId: string) => void;
}

export function ChecklistTarefas({ grupos, contexto, hoje, podeMarcar, aoAlternar }: PropsChecklist) {
  if (grupos.length === 0) {
    return (
      <EstadoVazio
        icone={PartyPopper}
        titulo="Nada pendente por aqui"
        descricao="Nenhuma tarefa em aberto neste filtro. Ligue “Mostrar concluídas” para ver o que já foi entregue."
      />
    );
  }

  return (
    <div className="pb-3">
      {grupos.map((grupo) => (
        <section key={grupo.titulo} aria-label={grupo.titulo}>
          <h3
            className={clsx(
              'vidro-forte sticky top-0 z-10 border-b border-borda/60 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider',
              grupo.titulo === 'Atrasadas' ? 'text-perigo' : 'text-texto-sutil',
            )}
          >
            {grupo.titulo}
            <span className="ml-2 font-medium tabular-nums opacity-70">{grupo.itens.length}</span>
          </h3>
          <ul>
            {grupo.itens.map((item) => (
              <ItemChecklist
                key={item.tarefaId}
                item={item}
                contexto={contexto}
                hoje={hoje}
                podeMarcar={podeMarcar}
                aoAlternar={aoAlternar}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ItemChecklist({
  item,
  contexto,
  hoje,
  podeMarcar,
  aoAlternar,
}: {
  item: ItemAgendaDTO;
  contexto: Contexto;
  hoje: string;
  podeMarcar: boolean;
  aoAlternar: (tarefaId: string) => void;
}) {
  const concluida = item.percentualConcluido === 100;
  const atrasada = !concluida && item.dataFim < hoje;
  const idCampo = `tarefa-${item.tarefaId}`;

  const projeto = (
    <Link
      href={`/cronograma/?id=${item.cronogramaId}`}
      className="font-medium text-texto-secundario hover:text-primaria hover:underline"
    >
      {item.cronogramaNome}
    </Link>
  );
  const responsavel = item.responsavelNome ?? 'Sem responsável';
  const partes =
    contexto === 'projeto-e-fase'
      ? [projeto, item.faseNome]
      : contexto === 'fase-e-responsavel'
        ? [item.faseNome, responsavel]
        : [projeto, responsavel];

  return (
    <li className="flex items-start gap-3 border-b border-borda/40 px-5 py-2.5 transition-colors hover:bg-texto/3">
      <input
        id={idCampo}
        type="checkbox"
        checked={concluida}
        disabled={!podeMarcar}
        onChange={() => aoAlternar(item.tarefaId)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--sucesso)] disabled:cursor-default"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={idCampo}
          className={clsx(
            'block text-sm',
            podeMarcar && 'cursor-pointer',
            concluida && 'text-texto-sutil line-through',
          )}
        >
          {item.titulo}
        </label>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-texto-sutil">
          {partes
            .filter((parte) => parte !== null)
            .map((parte, indice) => (
              <span key={indice} className="inline-flex items-center gap-1.5">
                {indice > 0 && <span aria-hidden>·</span>}
                {parte}
              </span>
            ))}
          {item.percentualConcluido > 0 && !concluida && (
            <span className="tabular-nums">· {item.percentualConcluido}%</span>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium tabular-nums">{formatarDataCurta(item.dataFim)}</p>
        <p
          className={clsx(
            'text-xs',
            concluida ? 'text-sucesso' : atrasada ? 'font-medium text-perigo' : 'text-texto-sutil',
          )}
        >
          {concluida ? 'concluída' : rotuloDoPrazo(item.dataFim, hoje)}
        </p>
      </div>
    </li>
  );
}
