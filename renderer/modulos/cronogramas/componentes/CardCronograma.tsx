'use client';

import { ArrowRight, CalendarDays, Pencil, Timer, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import { formatarDias, formatarPeriodo } from '@/compartilhado/formatacao';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ROTULO_SITUACAO, TOM_SITUACAO } from '../rotulos';

interface PropsCardCronograma {
  cronograma: CronogramaDTO;
  podeEditar: boolean;
  aoEditar: () => void;
  aoExcluir: () => void;
}

export function CardCronograma({
  cronograma,
  podeEditar,
  aoEditar,
  aoExcluir,
}: PropsCardCronograma) {
  return (
    <PainelVidro className="group flex flex-col p-5 transition-shadow hover:shadow-[0_12px_40px_rgb(15_27_45/0.14)]">
      <div className="flex items-start justify-between gap-3">
        <Etiqueta tom={TOM_SITUACAO[cronograma.situacao]}>
          {ROTULO_SITUACAO[cronograma.situacao]}
        </Etiqueta>
        {podeEditar && (
          <div className="-mr-2 -mt-1.5 flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <BotaoIcone icone={Pencil} rotulo={`Editar ${cronograma.nome}`} onClick={aoEditar} />
            <BotaoIcone icone={Trash2} rotulo={`Excluir ${cronograma.nome}`} onClick={aoExcluir} />
          </div>
        )}
      </div>

      <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug">{cronograma.nome}</h2>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-texto-secundario">
        {cronograma.descricao ?? <span className="text-texto-sutil">Sem descrição</span>}
      </p>

      <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-secundario">
        <div className="flex items-center gap-1.5">
          <CalendarDays aria-hidden className="size-3.5 text-texto-sutil" />
          <dt className="sr-only">Período</dt>
          <dd className="tabular-nums">{formatarPeriodo(cronograma.dataInicio, cronograma.dataFim)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Timer aria-hidden className="size-3.5 text-texto-sutil" />
          <dt className="sr-only">Duração</dt>
          <dd className="tabular-nums">{formatarDias(cronograma.duracaoEmDias)}</dd>
        </div>
      </dl>

      <Link
        href={{ pathname: '/cronograma/', query: { id: cronograma.id } }}
        className="mt-5 inline-flex items-center gap-1.5 self-start rounded-md text-sm font-medium text-primaria hover:text-primaria-hover"
      >
        Abrir cronograma
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </PainelVidro>
  );
}
