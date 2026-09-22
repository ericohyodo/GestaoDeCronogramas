'use client';

import { GanttChartSquare, Layers, ListTodo, Maximize2, Plus } from 'lucide-react';
import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { ResponsavelDTO } from '@contratos/responsaveis.contrato';
import type {
  AtualizarTarefaEntrada,
  ImpactoDeAtrasoDTO,
  LinhaEstruturaDTO,
} from '@contratos/tarefas.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { somarDias } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useEstruturaStore } from '../store/use-estrutura-store';
import { DialogoDeslocamento } from './DialogoDeslocamento';
import { FormularioFase } from './FormularioFase';
import { GraficoGantt } from './GraficoGantt';
import { TabelaEstrutura } from './TabelaEstrutura';

const ALTURA_DA_LINHA = 28;
const ALTURA_DO_CABECALHO = 56;
/** Divisão entre lista e Gantt, em % da largura; arrastável pelo divisor. */
const DIVISAO_PADRAO = 50;
const DIVISAO_MINIMA = 28;
const DIVISAO_MAXIMA = 72;

interface PropsPainelEstrutura {
  cronogramaId: string;
  periodo: { inicio: string; fim: string };
  responsaveis: ResponsavelDTO[];
  podeEditarTarefas: boolean;
  podeEditarFases: boolean;
}

/** Lista de atividades à esquerda e Gantt à direita, com a mesma rolagem vertical. */
export function PainelEstrutura({
  cronogramaId,
  periodo,
  responsaveis,
  podeEditarTarefas,
  podeEditarFases,
}: PropsPainelEstrutura) {
  const estrutura = useEstruturaStore((estado) => estado.estrutura);
  const carregando = useEstruturaStore((estado) => estado.carregando);
  const erro = useEstruturaStore((estado) => estado.erro);
  const carregar = useEstruturaStore((estado) => estado.carregar);
  const criarTarefa = useEstruturaStore((estado) => estado.criarTarefa);
  const atualizarTarefa = useEstruturaStore((estado) => estado.atualizarTarefa);
  const excluirTarefa = useEstruturaStore((estado) => estado.excluirTarefa);
  const deslocarSucessoras = useEstruturaStore((estado) => estado.deslocarSucessoras);
  const renomearFase = useEstruturaStore((estado) => estado.renomearFase);
  const excluirFase = useEstruturaStore((estado) => estado.excluirFase);
  const reordenarTarefas = useEstruturaStore((estado) => estado.reordenarTarefas);
  const definirErro = useEstruturaStore((estado) => estado.definirErro);

  const [criandoFase, setCriandoFase] = useState(false);
  const [impacto, setImpacto] = useState<ImpactoDeAtrasoDTO | null>(null);
  const [tarefaDoImpacto, setTarefaDoImpacto] = useState<string | null>(null);
  const [paraExcluir, setParaExcluir] = useState<LinhaEstruturaDTO | null>(null);
  const [divisao, setDivisao] = useState(DIVISAO_PADRAO);
  const refScroll = useRef<HTMLDivElement>(null);

  const enquadrar = () => {
    setDivisao(DIVISAO_PADRAO);
    refScroll.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    void carregar(cronogramaId);
  }, [carregar, cronogramaId]);

  const arrastarDivisor = (evento: PointerEvent<HTMLDivElement>) => {
    const painel = evento.currentTarget.parentElement;
    if (!painel) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);

    const mover = (movimento: globalThis.PointerEvent) => {
      const caixa = painel.getBoundingClientRect();
      const porcentagem = ((movimento.clientX - caixa.left) / caixa.width) * 100;
      const limitada = Math.min(DIVISAO_MAXIMA, Math.max(DIVISAO_MINIMA, porcentagem));
      setDivisao(limitada);
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  };

  const editarTarefa = useCallback(
    (entrada: AtualizarTarefaEntrada) => {
      atualizarTarefa(entrada)
        .then((resultado) => {
          if (resultado) {
            setImpacto(resultado);
            setTarefaDoImpacto(entrada.id);
          }
        })
        .catch((falha: unknown) => definirErro(mensagemDeErro(falha)));
    },
    [atualizarTarefa, definirErro],
  );

  const adicionarTarefa = (faseId: string | null) => {
    const fim = somarDias(periodo.inicio, 6);
    criarTarefa({
      cronogramaId,
      faseId,
      titulo: 'Nova tarefa',
      dataInicio: periodo.inicio,
      dataFim: fim < periodo.fim ? fim : periodo.fim,
    }).catch((falha: unknown) => definirErro(mensagemDeErro(falha)));
  };

  const linhas = estrutura?.linhas ?? [];
  const podeEditarAlgo = podeEditarTarefas || podeEditarFases;

  return (
    <PainelVidro className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Atividades e Gantt</h2>
          <p className="flex items-center gap-3 text-xs text-texto-sutil">
            <span className="tabular-nums">
              {linhas.filter((linha) => linha.tipo === 'tarefa').length} tarefas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-perigo" />
              caminho crítico
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Botao icone={Maximize2} onClick={enquadrar}>
            Enquadrar
          </Botao>
          {podeEditarAlgo && (
            <>
              {podeEditarFases && (
                <Botao icone={Layers} onClick={() => setCriandoFase(true)}>
                  Nova fase
                </Botao>
              )}
              {podeEditarTarefas && (
                <Botao variante="primario" icone={Plus} onClick={() => adicionarTarefa(null)}>
                  Nova tarefa
                </Botao>
              )}
            </>
          )}
        </div>
      </header>

      {erro && <MensagemErro mensagem={erro} aoFechar={() => definirErro(null)} className="mx-5 mb-4" />}

      {linhas.length === 0 ? (
        !carregando && (
          <EstadoVazio
            icone={ListTodo}
            titulo="Sem atividades por enquanto"
            descricao="Crie uma fase com suas subtarefas ou adicione tarefas soltas. O Gantt aparece aqui ao lado."
            acao={
              podeEditarFases && (
                <Botao icone={GanttChartSquare} onClick={() => setCriandoFase(true)}>
                  Criar primeira fase
                </Botao>
              )
            }
            className="border-t border-borda/60"
          />
        )
      ) : (
        <div ref={refScroll} className="flex min-h-0 flex-1 overflow-y-auto border-t border-borda/60">
          <div style={{ width: `${divisao}%` }} className="min-w-0 shrink-0">
            <TabelaEstrutura
              linhas={linhas}
              responsaveis={responsaveis}
              podeEditarTarefas={podeEditarTarefas}
              podeEditarFases={podeEditarFases}
              alturaDaLinha={ALTURA_DA_LINHA}
              alturaDoCabecalho={ALTURA_DO_CABECALHO}
              aoEditarTarefa={editarTarefa}
              aoExcluirTarefa={setParaExcluir}
              aoRenomearFase={(id, nome) =>
                renomearFase(id, nome).catch((falha: unknown) => definirErro(mensagemDeErro(falha)))
              }
              aoExcluirFase={setParaExcluir}
              aoAdicionarTarefa={adicionarTarefa}
              aoReordenarTarefas={(ordens) =>
                reordenarTarefas({ cronogramaId, ordens }).catch(
                  (falha: unknown) => definirErro(mensagemDeErro(falha)),
                )
              }
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Ajustar a divisão entre a lista e o Gantt"
            onPointerDown={arrastarDivisor}
            className="w-1.5 shrink-0 cursor-col-resize bg-borda/60 transition-colors hover:bg-primaria/60"
          />

          {/* `flex-1` em vez de porcentagem: o divisor ocupa 6px e não pode estourar a largura. */}
          <div className="min-w-0 flex-1 pr-2">
            <GraficoGantt
              linhas={linhas}
              inicio={estrutura?.inicio ?? periodo.inicio}
              fim={estrutura?.fim ?? periodo.fim}
              alturaDaLinha={ALTURA_DA_LINHA}
              alturaDoCabecalho={ALTURA_DO_CABECALHO}
            />
          </div>
        </div>
      )}

      <FormularioFase
        aberto={criandoFase}
        cronogramaId={cronogramaId}
        aoFechar={() => setCriandoFase(false)}
      />
      <DialogoDeslocamento
        impacto={impacto}
        aoConfirmar={(dias) => deslocarSucessoras(tarefaDoImpacto!, dias)}
        aoFechar={() => {
          setImpacto(null);
          setTarefaDoImpacto(null);
        }}
      />
      <DialogoConfirmacao
        aberto={paraExcluir !== null}
        titulo={paraExcluir?.tipo === 'fase' ? 'Excluir fase' : 'Excluir tarefa'}
        mensagem={
          paraExcluir?.tipo === 'fase'
            ? `A fase "${paraExcluir.titulo}" e todas as suas subtarefas serão excluídas.`
            : `A tarefa "${paraExcluir?.titulo ?? ''}" será excluída definitivamente.`
        }
        aoConfirmar={() =>
          paraExcluir?.tipo === 'fase' ? excluirFase(paraExcluir.id) : excluirTarefa(paraExcluir!.id)
        }
        aoFechar={() => setParaExcluir(null)}
      />
    </PainelVidro>
  );
}
