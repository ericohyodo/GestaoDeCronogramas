'use client';

import clsx from 'clsx';
import { Link2 } from 'lucide-react';
import type { LinhaEstruturaDTO } from '@contratos/tarefas.contrato';

interface PropsSeletorDependencias {
  linha: LinhaEstruturaDTO;
  /** Candidatas a predecessora: todas as tarefas do cronograma, menos a própria. */
  candidatas: LinhaEstruturaDTO[];
  editavel: boolean;
  aoAlterar: (dependencias: string[]) => void;
}

/** Coluna Dependência: mostra os números das predecessoras e abre a lista para marcar. */
export function SeletorDependencias({
  linha,
  candidatas,
  editavel,
  aoAlterar,
}: PropsSeletorDependencias) {
  const resumo = linha.dependenciasNumeros.join(', ');

  if (!editavel) {
    return <span className="block truncate px-1 text-sm tabular-nums">{resumo || '—'}</span>;
  }

  const alternar = (id: string) => {
    const atuais = new Set(linha.dependencias);
    if (atuais.has(id)) atuais.delete(id);
    else atuais.add(id);
    aoAlterar([...atuais]);
  };

  return (
    <details className="group/dep relative">
      <summary
        className={clsx(
          'flex cursor-pointer list-none items-center gap-1 rounded-md px-1 py-1 text-sm tabular-nums',
          'hover:bg-texto/6 marker:hidden',
          linha.conflitoDeDependencia && 'text-alerta',
          !resumo && 'text-texto-sutil',
        )}
        title={
          linha.conflitoDeDependencia
            ? 'Esta tarefa começa antes do fim de uma predecessora'
            : 'Definir predecessoras'
        }
      >
        <Link2 aria-hidden className="size-3.5 shrink-0 opacity-60" />
        <span className="truncate">{resumo || '—'}</span>
      </summary>

      <div className="vidro-forte absolute right-0 z-30 mt-1 max-h-64 w-64 overflow-y-auto rounded-xl p-1.5">
        {candidatas.length === 0 ? (
          <p className="px-2 py-3 text-xs text-texto-sutil">Nenhuma outra tarefa neste cronograma.</p>
        ) : (
          candidatas.map((candidata) => (
            <label
              key={candidata.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-texto/6"
            >
              <input
                type="checkbox"
                checked={linha.dependencias.includes(candidata.id)}
                onChange={() => alternar(candidata.id)}
                className="size-3.5 accent-[var(--primaria)]"
              />
              <span className="w-8 shrink-0 text-xs tabular-nums text-texto-sutil">
                {candidata.numero}
              </span>
              <span className="truncate">{candidata.titulo}</span>
            </label>
          ))
        )}
      </div>
    </details>
  );
}
