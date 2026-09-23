'use client';

import clsx from 'clsx';
import { CalendarRange, ClipboardList, FolderKanban, type LucideIcon, RefreshCw, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ItemAgendaDTO } from '@contratos/tarefas.contrato';
import { hojeIso } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { faixaDoPrazo, proximasSemanas, proximosMeses, rotuloDoDia } from '../periodos';
import { useAgendaStore } from '../store/use-agenda-store';
import { ChecklistTarefas, type Contexto, type GrupoChecklist } from './ChecklistTarefas';

type Visao = 'responsavel' | 'projeto' | 'periodo';
type Granularidade = 'semana' | 'mes';

interface Entrada {
  chave: string;
  rotulo: string;
  detalhe?: string;
  filtro: (item: ItemAgendaDTO) => boolean;
}

const ABAS: { visao: Visao; rotulo: string; icone: LucideIcon }[] = [
  { visao: 'responsavel', rotulo: 'Por responsável', icone: UserRound },
  { visao: 'projeto', rotulo: 'Por projeto', icone: FolderKanban },
  { visao: 'periodo', rotulo: 'Por período', icone: CalendarRange },
];

const CONTEXTO: Record<Visao, Contexto> = {
  responsavel: 'projeto-e-fase',
  projeto: 'fase-e-responsavel',
  periodo: 'projeto-e-responsavel',
};

const ORDEM_DAS_FAIXAS = ['Atrasadas', 'Hoje', 'Esta semana', 'Próxima semana', 'Mais adiante', 'Concluídas'];
const SEM_RESPONSAVEL = 'sem-responsavel';

export function PaginaRelatorios({ podeMarcar }: { podeMarcar: boolean }) {
  const { itens, carregando, erro, alteradasAgora, carregar, alternarConclusao, limparErro } =
    useAgendaStore();
  const [visao, setVisao] = useState<Visao>('responsavel');
  const [granularidade, setGranularidade] = useState<Granularidade>('semana');
  const [selecao, setSelecao] = useState<Partial<Record<Visao, string>>>({});
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const hoje = hojeIso();

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const pendente = (item: ItemAgendaDTO) => item.percentualConcluido < 100;
  // Um item marcado agora continua visível (riscado) até a próxima atualização da lista.
  const visivel = (item: ItemAgendaDTO) =>
    mostrarConcluidas || pendente(item) || alteradasAgora.has(item.tarefaId);

  const entradas = useMemo<Entrada[]>(() => {
    if (visao === 'responsavel') {
      const nomes = new Map<string, string>();
      for (const item of itens) {
        nomes.set(item.responsavelId ?? SEM_RESPONSAVEL, item.responsavelNome ?? 'Sem responsável');
      }
      return [...nomes]
        .sort(([idA, a], [idB, b]) =>
          idA === SEM_RESPONSAVEL ? 1 : idB === SEM_RESPONSAVEL ? -1 : a.localeCompare(b, 'pt-BR'),
        )
        .map(([chave, rotulo]) => ({
          chave,
          rotulo,
          filtro: (item) => (item.responsavelId ?? SEM_RESPONSAVEL) === chave,
        }));
    }
    if (visao === 'projeto') {
      const nomes = new Map(itens.map((item) => [item.cronogramaId, item.cronogramaNome]));
      return [...nomes]
        .sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))
        .map(([chave, rotulo]) => ({ chave, rotulo, filtro: (item) => item.cronogramaId === chave }));
    }
    const periodos = granularidade === 'semana' ? proximasSemanas(hoje, 8) : proximosMeses(hoje, 6);
    return [
      {
        chave: 'atrasadas',
        rotulo: 'Atrasadas',
        detalhe: 'Venceram e não foram concluídas',
        filtro: (item) => item.dataFim < hoje && (pendente(item) || alteradasAgora.has(item.tarefaId)),
      },
      ...periodos.map((periodo) => ({
        chave: periodo.chave,
        rotulo: periodo.rotulo,
        detalhe: periodo.detalhe,
        filtro: (item: ItemAgendaDTO) => item.dataFim >= periodo.inicio && item.dataFim <= periodo.fim,
      })),
    ];
  }, [visao, granularidade, itens, hoje, alteradasAgora]);

  // Sem escolha ainda: "Esta semana"/"Este mês", ou a primeira pessoa/projeto com algo em aberto.
  // Conta também o que foi marcado agora, senão a seleção pularia ao concluir a última tarefa.
  const padrao =
    visao === 'periodo'
      ? entradas[1]
      : (entradas.find((entrada) =>
          itens.some(
            (item) => entrada.filtro(item) && (pendente(item) || alteradasAgora.has(item.tarefaId)),
          ),
        ) ?? entradas[0]);
  const selecionada = entradas.find((entrada) => entrada.chave === selecao[visao]) ?? padrao;

  const grupos = useMemo<GrupoChecklist[]>(() => {
    if (!selecionada) return [];
    const doFiltro = itens.filter((item) => selecionada.filtro(item) && visivel(item));
    const porGrupo = new Map<string, ItemAgendaDTO[]>();
    for (const item of doFiltro) {
      const titulo =
        visao === 'periodo'
          ? rotuloDoDia(item.dataFim, hoje)
          : pendente(item) || alteradasAgora.has(item.tarefaId)
            ? faixaDoPrazo(item.dataFim, hoje)
            : 'Concluídas';
      porGrupo.set(titulo, [...(porGrupo.get(titulo) ?? []), item]);
    }
    const lista = [...porGrupo].map(([titulo, itensDoGrupo]) => ({ titulo, itens: itensDoGrupo }));
    // Por período os dias já vêm em ordem (a agenda chega ordenada pelo término).
    return visao === 'periodo'
      ? lista
      : lista.sort((a, b) => ORDEM_DAS_FAIXAS.indexOf(a.titulo) - ORDEM_DAS_FAIXAS.indexOf(b.titulo));
    // `visivel` e `pendente` dependem só de estado já listado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada, itens, visao, hoje, mostrarConcluidas, alteradasAgora]);

  const contagem = (entrada: Entrada) => {
    const abertas = itens.filter((item) => entrada.filtro(item) && pendente(item));
    return { abertas: abertas.length, atrasadas: abertas.filter((item) => item.dataFim < hoje).length };
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-6">
      <CabecalhoPagina
        titulo="Relatórios"
        descricao="Checklist das próximas entregas de todos os projetos em andamento."
        acoes={
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-texto-secundario">
              <input
                type="checkbox"
                checked={mostrarConcluidas}
                onChange={(evento) => setMostrarConcluidas(evento.target.checked)}
                className="size-4 accent-[var(--primaria)]"
              />
              Mostrar concluídas
            </label>
            <Botao icone={RefreshCw} onClick={() => void carregar()} disabled={carregando}>
              Atualizar
            </Botao>
          </>
        }
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={limparErro} />}

      <div role="tablist" aria-label="Agrupar por" className="vidro inline-flex self-start rounded-xl p-1">
        {ABAS.map(({ visao: aba, rotulo, icone: Icone }) => (
          <button
            key={aba}
            type="button"
            role="tab"
            aria-selected={visao === aba}
            onClick={() => setVisao(aba)}
            className={clsx(
              'flex h-8 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors',
              visao === aba
                ? 'bg-primaria text-sobre-primaria shadow-sm'
                : 'text-texto-secundario hover:bg-texto/6 hover:text-texto',
            )}
          >
            <Icone aria-hidden className="size-4" />
            {rotulo}
          </button>
        ))}
      </div>

      {itens.length === 0 && !carregando ? (
        <PainelVidro>
          <EstadoVazio
            icone={ClipboardList}
            titulo="Nenhuma tarefa ainda"
            descricao="Os relatórios reúnem as tarefas dos cronogramas não arquivados. Crie tarefas em um cronograma para vê-las aqui."
          />
        </PainelVidro>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">
          <PainelVidro className="flex w-72 shrink-0 flex-col overflow-hidden">
            {visao === 'periodo' && (
              <div className="flex gap-1 border-b border-borda/60 p-2">
                {(['semana', 'mes'] as const).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    aria-pressed={granularidade === opcao}
                    onClick={() => {
                      setGranularidade(opcao);
                      setSelecao((atual) => ({ ...atual, periodo: undefined }));
                    }}
                    className={clsx(
                      'h-7 flex-1 rounded-lg text-xs font-medium transition-colors',
                      granularidade === opcao
                        ? 'bg-primaria/12 text-primaria'
                        : 'text-texto-secundario hover:bg-texto/6',
                    )}
                  >
                    {opcao === 'semana' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>
            )}
            <ul className="flex-1 overflow-y-auto p-2">
              {entradas.map((entrada) => {
                const { abertas, atrasadas } = contagem(entrada);
                const ativa = entrada.chave === selecionada?.chave;
                return (
                  <li key={entrada.chave}>
                    <button
                      type="button"
                      aria-current={ativa ? 'true' : undefined}
                      onClick={() => setSelecao((atual) => ({ ...atual, [visao]: entrada.chave }))}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
                        ativa ? 'bg-primaria/12 text-primaria' : 'hover:bg-texto/6',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block truncate text-sm', ativa && 'font-medium')}>
                          {entrada.rotulo}
                        </span>
                        {entrada.detalhe && (
                          <span className="block truncate text-xs text-texto-sutil">{entrada.detalhe}</span>
                        )}
                      </span>
                      {atrasadas > 0 && (
                        <span
                          title={`${atrasadas} atrasada(s)`}
                          className="rounded-full bg-perigo/12 px-1.5 text-[11px] font-semibold tabular-nums text-perigo"
                        >
                          {atrasadas}
                        </span>
                      )}
                      <span
                        title={`${abertas} em aberto`}
                        className={clsx('w-6 text-right text-xs tabular-nums', abertas === 0 ? 'text-texto-sutil/60' : 'text-texto-sutil')}
                      >
                        {abertas}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </PainelVidro>

          <PainelVidro className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {selecionada && (
              <header className="border-b border-borda/60 px-5 py-4">
                <h2 className="text-base font-semibold">{selecionada.rotulo}</h2>
                <p className="text-xs text-texto-sutil">
                  {resumo(contagem(selecionada))}
                  {selecionada.detalhe && ` · ${selecionada.detalhe}`}
                </p>
              </header>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChecklistTarefas
                grupos={grupos}
                contexto={CONTEXTO[visao]}
                hoje={hoje}
                podeMarcar={podeMarcar}
                aoAlternar={(tarefaId) => void alternarConclusao(tarefaId)}
              />
            </div>
          </PainelVidro>
        </div>
      )}
    </div>
  );
}

function resumo({ abertas, atrasadas }: { abertas: number; atrasadas: number }): string {
  const texto = abertas === 1 ? '1 em aberto' : `${abertas} em aberto`;
  return atrasadas > 0 ? `${texto}, ${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : texto;
}
