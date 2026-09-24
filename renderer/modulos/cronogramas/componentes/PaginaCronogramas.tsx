'use client';

import { CalendarRange, Plus } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import type { CronogramaDTO, SituacaoCronogramaDTO } from '@contratos/cronogramas.contrato';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ROTULO_SITUACAO } from '../rotulos';
import { useCronogramasStore } from '../store/use-cronogramas-store';
import { CardCronograma } from './CardCronograma';
import { FormularioCronograma } from './FormularioCronograma';

type Edicao = { modo: 'criar' } | { modo: 'editar'; cronograma: CronogramaDTO } | null;

const INDICADORES: SituacaoCronogramaDTO[] = ['planejado', 'em_andamento', 'concluido'];

export function PaginaCronogramas({
  podeEditar,
  acoesExtras,
}: {
  podeEditar: boolean;
  /** Ações de outros módulos, compostas pela página (ex.: análise do portfólio com IA). */
  acoesExtras?: ReactNode;
}) {
  const { itens, carregando, erro, carregar, excluir, limparErro } = useCronogramasStore();
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [paraExcluir, setParaExcluir] = useState<CronogramaDTO | null>(null);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const novo = () => setEdicao({ modo: 'criar' });

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Cronogramas"
        descricao="Planeje períodos, acompanhe a situação e organize as tarefas de cada cronograma."
        acoes={
          <>
            {acoesExtras}
            {podeEditar && (
              <Botao variante="primario" icone={Plus} onClick={novo}>
                Novo cronograma
              </Botao>
            )}
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {INDICADORES.map((situacao) => (
          <PainelVidro key={situacao} className="px-5 py-4">
            <p className="text-xs font-medium text-texto-sutil">{ROTULO_SITUACAO[situacao]}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {itens.filter((item) => item.situacao === situacao).length}
            </p>
          </PainelVidro>
        ))}
      </div>

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      {carregando && itens.length === 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
          {[0, 1, 2].map((i) => (
            <PainelVidro key={i} className="h-52 animate-pulse" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <PainelVidro>
          <EstadoVazio
            icone={CalendarRange}
            titulo="Nenhum cronograma ainda"
            descricao="Crie o primeiro cronograma para começar a planejar as tarefas e prazos."
            acao={
              podeEditar && (
                <Botao variante="primario" icone={Plus} onClick={novo}>
                  Criar cronograma
                </Botao>
              )
            }
          />
        </PainelVidro>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
          {itens.map((cronograma) => (
            <CardCronograma
              key={cronograma.id}
              cronograma={cronograma}
              podeEditar={podeEditar}
              aoEditar={() => setEdicao({ modo: 'editar', cronograma })}
              aoExcluir={() => setParaExcluir(cronograma)}
            />
          ))}
        </div>
      )}

      <FormularioCronograma
        aberto={edicao !== null}
        cronograma={edicao?.modo === 'editar' ? edicao.cronograma : undefined}
        aoFechar={() => setEdicao(null)}
      />
      <DialogoConfirmacao
        aberto={paraExcluir !== null}
        titulo="Excluir cronograma"
        mensagem={`"${paraExcluir?.nome ?? ''}" e todas as suas tarefas serão excluídos definitivamente.`}
        aoConfirmar={() => excluir(paraExcluir!.id)}
        aoFechar={() => setParaExcluir(null)}
      />
    </div>
  );
}
