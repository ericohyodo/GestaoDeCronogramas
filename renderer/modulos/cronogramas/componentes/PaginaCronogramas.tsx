'use client';

import clsx from 'clsx';
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
  // Projetos de antes do uso multiusuário ficam numa aba à parte (editáveis), fora dos contadores.
  const [verHistorico, setVerHistorico] = useState(false);
  const atuais = itens.filter((item) => !item.historico);
  const historico = itens.filter((item) => item.historico);
  const visiveis = verHistorico ? historico : atuais;

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const novo = () => setEdicao({ modo: 'criar' });

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Projetos"
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
              {atuais.filter((item) => item.situacao === situacao).length}
            </p>
          </PainelVidro>
        ))}
      </div>

      {historico.length > 0 && (
        <div role="tablist" aria-label="Projetos atuais ou histórico" className="flex w-fit gap-1 rounded-lg bg-texto/5 p-1">
          {(
            [
              [false, `Projetos (${atuais.length})`],
              [true, `Histórico (${historico.length})`],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              role="tab"
              aria-selected={verHistorico === valor}
              onClick={() => setVerHistorico(valor)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                verHistorico === valor ? 'bg-superficie-solida text-texto shadow-sm' : 'text-texto-secundario hover:text-texto',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}
      {verHistorico && (
        <p className="-mt-3 text-sm text-texto-secundario">
          Projetos de antes do uso multiusuário. Ficam fora dos contadores, mas continuam editáveis e seguem no chat com
          IA, nas análises e nos avisos de prazo.
        </p>
      )}

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      {carregando && itens.length === 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
          {[0, 1, 2].map((i) => (
            <PainelVidro key={i} className="h-52 animate-pulse" />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <PainelVidro>
          <EstadoVazio
            icone={CalendarRange}
            titulo="Nenhum projeto ainda"
            descricao="Projetos nascem do aceite de uma SD (com código PRO) ou podem ser criados aqui."
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
          {visiveis.map((cronograma) => (
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
        titulo="Excluir projeto"
        mensagem={`"${paraExcluir?.nome ?? ''}" e todas as suas tarefas serão excluídos definitivamente.`}
        aoConfirmar={() => excluir(paraExcluir!.id)}
        aoFechar={() => setParaExcluir(null)}
      />
    </div>
  );
}
