'use client';

import { ArrowLeft, CalendarDays, Pencil, Timer, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import { formatarDias, formatarPeriodo } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { ROTULO_SITUACAO, TOM_SITUACAO } from '../rotulos';
import { useCronogramasStore } from '../store/use-cronogramas-store';
import { FormularioCronograma } from './FormularioCronograma';

interface PropsCabecalhoCronograma {
  cronograma: CronogramaDTO;
  /** Só o perfil de planejamento edita ou exclui o cronograma. */
  podeEditar: boolean;
}

export function CabecalhoCronograma({ cronograma, podeEditar }: PropsCabecalhoCronograma) {
  const router = useRouter();
  const excluir = useCronogramasStore((estado) => estado.excluir);
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  return (
    <>
      <CabecalhoPagina
        antes={
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-texto-secundario hover:text-texto"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Cronogramas
          </Link>
        }
        titulo={cronograma.nome}
        descricao={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Etiqueta tom={TOM_SITUACAO[cronograma.situacao]}>
              {ROTULO_SITUACAO[cronograma.situacao]}
            </Etiqueta>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <CalendarDays aria-hidden className="size-3.5 text-texto-sutil" />
              {formatarPeriodo(cronograma.dataInicio, cronograma.dataFim)}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Timer aria-hidden className="size-3.5 text-texto-sutil" />
              {formatarDias(cronograma.duracaoEmDias)}
            </span>
          </div>
        }
        acoes={
          podeEditar && (
            <>
              <Botao icone={Pencil} onClick={() => setEditando(true)}>
                Editar
              </Botao>
              <Botao variante="fantasma" icone={Trash2} onClick={() => setExcluindo(true)}>
                Excluir
              </Botao>
            </>
          )
        }
      />
      {cronograma.descricao && (
        <p className="-mt-2 max-w-3xl text-sm text-texto-secundario">{cronograma.descricao}</p>
      )}

      <FormularioCronograma
        aberto={editando}
        cronograma={cronograma}
        aoFechar={() => setEditando(false)}
      />
      <DialogoConfirmacao
        aberto={excluindo}
        titulo="Excluir cronograma"
        mensagem={`"${cronograma.nome}" e todas as suas tarefas serão excluídos definitivamente.`}
        aoConfirmar={async () => {
          await excluir(cronograma.id);
          router.push('/');
        }}
        aoFechar={() => setExcluindo(false)}
      />
    </>
  );
}
