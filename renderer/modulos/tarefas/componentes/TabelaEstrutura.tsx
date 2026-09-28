'use client';

import clsx from 'clsx';
import {
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CopyPlus,
  FileCheck2,
  FileText,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import type { ResponsavelDTO } from '@contratos/responsaveis.contrato';
import type { AtualizarTarefaEntrada, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { diasEntreDatas, formatarDataCurta, formatarDias, somarDias } from '@/compartilhado/formatacao';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaEditavel } from './CelulaEditavel';
import { SeletorDependencias } from './SeletorDependencias';

export interface PropsTabelaEstrutura {
  linhas: LinhaEstruturaDTO[];
  responsaveis: ResponsavelDTO[];
  podeEditarTarefas: boolean;
  podeEditarFases: boolean;
  alturaDaLinha: number;
  alturaDoCabecalho: number;
  /** Sem Gantt ao lado: colunas mais largas e linhas que crescem com o texto. */
  modoEdicao: boolean;
  aoEditarTarefa: (entrada: AtualizarTarefaEntrada) => void;
  aoExcluirTarefa: (linha: LinhaEstruturaDTO) => void;
  aoDuplicarTarefa: (id: string) => void;
  aoRenomearFase: (id: string, nome: string) => void;
  aoExcluirFase: (linha: LinhaEstruturaDTO) => void;
  aoAjustarDatasDaFase: (linha: LinhaEstruturaDTO) => void;
  aoAdicionarTarefa: (faseId: string) => void;
  aoReordenarTarefas: (ordens: { id: string; ordem: number }[]) => void;
  aoAbrirEvidencia: (linha: LinhaEstruturaDTO) => void;
  /** Só exibição: as tarefas dessas fases somem da lista (e do Gantt, que usa o mesmo filtro). */
  fasesRecolhidas: ReadonlySet<string>;
  aoAlternarFase: (faseId: string) => void;
}

// ⠿ | N | % | ✓ | Descrição | Responsável | Dep. | Início | Dur. | Fim | Efetiva | Evid. | Ações
const LARGURAS_PADRAO = ['w-5', 'w-10', 'w-[60px]', 'w-9', '', 'w-[88px]', 'w-12', 'w-20', 'w-16', 'w-20', 'w-20', 'w-10', 'w-[76px]'];
const LARGURAS_EDICAO = ['w-6', 'w-16', 'w-[72px]', 'w-10', '', 'w-44', 'w-24', 'w-32', 'w-24', 'w-32', 'w-32', 'w-20', 'w-20'];

/** Soma das colunas fixas + ~170px para a Descrição. Abaixo disso a Descrição sumiria. */
export const LARGURA_MINIMA_TABELA = 884;
const LARGURA_MINIMA_TABELA_EDICAO = 1188;

export function linhasExibidas(
  linhas: LinhaEstruturaDTO[],
  fasesRecolhidas: ReadonlySet<string>,
): LinhaEstruturaDTO[] {
  if (fasesRecolhidas.size === 0) return linhas;
  return linhas.filter((linha) => !(linha.faseId && fasesRecolhidas.has(linha.faseId)));
}

export function TabelaEstrutura({
  linhas,
  responsaveis,
  podeEditarTarefas,
  podeEditarFases,
  alturaDaLinha,
  alturaDoCabecalho,
  modoEdicao,
  aoEditarTarefa,
  aoExcluirTarefa,
  aoDuplicarTarefa,
  aoRenomearFase,
  aoExcluirFase,
  aoAjustarDatasDaFase,
  aoAdicionarTarefa,
  aoReordenarTarefas,
  aoAbrirEvidencia,
  fasesRecolhidas,
  aoAlternarFase,
}: PropsTabelaEstrutura) {
  const tarefas = linhas.filter((linha) => linha.tipo === 'tarefa');
  const ativos = responsaveis.filter((responsavel) => responsavel.ativo);
  const porId = new Map(linhas.map((linha) => [linha.id, linha]));

  /**
   * Resolve o alerta de dependência: começa no dia seguinte ao fim da predecessora que termina
   * por último, mantendo a duração. Se o término atrasar, o painel oferece deslocar as sucessoras.
   */
  const ajusteDoConflito = (linha: LinhaEstruturaDTO) => {
    const predecessoras = linha.dependencias.flatMap((id) => porId.get(id) ?? []);
    const ultima = predecessoras.reduce<LinhaEstruturaDTO | null>(
      (maisTardia, atual) =>
        atual.dataFim && (!maisTardia?.dataFim || atual.dataFim > maisTardia.dataFim) ? atual : maisTardia,
      null,
    );
    if (!ultima?.dataFim || !linha.dataInicio || !linha.dataFim) return null;
    const novoInicio = somarDias(ultima.dataFim, 1);
    const novoFim = somarDias(linha.dataFim, diasEntreDatas(linha.dataInicio, novoInicio));
    return { predecessora: ultima, novoInicio, novoFim };
  };

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobreId, setSobreId] = useState<string | null>(null);

  const encerrarArrasto = () => {
    setArrastando(null);
    setSobreId(null);
  };

  const soltarSobre = (alvoId: string) => {
    const origem = linhas.find((linha) => linha.id === arrastando);
    const alvo = linhas.find((linha) => linha.id === alvoId);
    encerrarArrasto();
    if (!origem || !alvo || origem.id === alvo.id || alvo.tipo !== 'tarefa') return;
    if (origem.faseId !== alvo.faseId) return;

    const daFase = linhas.filter((linha) => linha.tipo === 'tarefa' && linha.faseId === origem.faseId);
    const reordenadas = daFase.filter((linha) => linha.id !== origem.id);
    reordenadas.splice(
      reordenadas.findIndex((linha) => linha.id === alvo.id),
      0,
      origem,
    );
    aoReordenarTarefas(reordenadas.map((linha, indice) => ({ id: linha.id, ordem: indice + 1 })));
  };

  const larguras = modoEdicao ? LARGURAS_EDICAO : LARGURAS_PADRAO;
  // Fora do modo edição a altura é fixa: cada linha precisa bater pixel a pixel com a do Gantt.
  const alturas = {
    '--altura-celula': modoEdicao ? 'auto' : `${alturaDaLinha - 1}px`,
    '--altura-minima-celula': `${alturaDaLinha - 1}px`,
    '--respiro-celula': modoEdicao ? '4px' : '0px',
    minWidth: modoEdicao ? LARGURA_MINIMA_TABELA_EDICAO : LARGURA_MINIMA_TABELA,
  } as CSSProperties;

  return (
    <table style={alturas} className="w-full table-fixed border-separate border-spacing-0 text-sm">
      <colgroup>
        {larguras.map((largura, indice) => (
          <col key={indice} className={largura || undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <CabecalhoColuna altura={alturaDoCabecalho}>
            <span className="sr-only">Ordem</span>
          </CabecalhoColuna>
          <CabecalhoColuna altura={alturaDoCabecalho}>N</CabecalhoColuna>
          <CabecalhoColuna altura={alturaDoCabecalho}>%</CabecalhoColuna>
          <CabecalhoColuna altura={alturaDoCabecalho}>
            <CheckCircle2 aria-hidden className="mx-auto size-3.5 text-texto-sutil" />
            <span className="sr-only">Concluir</span>
          </CabecalhoColuna>
          {[
            'Descrição',
            modoEdicao ? 'Responsável' : 'Resp.',
            'Dep.',
            'Início',
            'Dur.',
            modoEdicao ? 'Término' : 'Fim',
            modoEdicao ? 'Data efetiva' : 'Efet.',
            modoEdicao ? 'Evidência' : 'Evid.',
          ].map((titulo) => (
            <CabecalhoColuna key={titulo} altura={alturaDoCabecalho}>
              {titulo}
            </CabecalhoColuna>
          ))}
          <CabecalhoColuna altura={alturaDoCabecalho}>
            <span className="sr-only">Ações</span>
          </CabecalhoColuna>
        </tr>
      </thead>
      <tbody>
        {linhasExibidas(linhas, fasesRecolhidas).map((linha) => {
          const ehFase = linha.tipo === 'fase';
          const recolhida = ehFase && fasesRecolhidas.has(linha.id);
          const arrastavel = !ehFase && podeEditarTarefas;
          const alvoDoArrasto = sobreId === linha.id && arrastando !== null && arrastando !== linha.id;

          return (
            <tr
              key={linha.id}
              draggable={arrastavel}
              onDragStart={arrastavel ? () => setArrastando(linha.id) : undefined}
              onDragEnd={encerrarArrasto}
              onDragOver={(evento) => {
                if (!arrastando) return;
                evento.preventDefault();
                setSobreId(linha.id);
              }}
              onDrop={() => soltarSobre(linha.id)}
              className={clsx(
                'group/linha transition-colors',
                ehFase ? 'bg-texto/4 font-semibold' : 'hover:bg-primaria/4',
                arrastando === linha.id && 'opacity-40',
                // Borda em <tr> some no modelo `border-separate`; a sombra nas células faz o papel.
                alvoDoArrasto && '[&>td]:shadow-[inset_0_2px_0_var(--primaria)]',
              )}
            >
              <Celula>
                {arrastavel && (
                  <GripVertical
                    aria-hidden
                    className="mx-auto size-3.5 cursor-grab text-texto-sutil opacity-0 transition-opacity group-hover/linha:opacity-100"
                  />
                )}
              </Celula>

              <Celula className="text-xs tabular-nums text-texto-sutil">{linha.numero}</Celula>

              <Celula className="tabular-nums">
                {ehFase ? (
                  <span className="px-1 text-xs text-texto-secundario">{linha.percentualConcluido}%</span>
                ) : (
                  <CelulaEditavel
                    valor={String(linha.percentualConcluido)}
                    tipo="numero"
                    min={0}
                    max={100}
                    editavel={podeEditarTarefas}
                    formatar={(valor) => `${valor}%`}
                    aoSalvar={(valor) =>
                      aoEditarTarefa({ id: linha.id, percentualConcluido: Number(valor) })
                    }
                  />
                )}
              </Celula>

              <Celula>
                {!ehFase && podeEditarTarefas && (
                  <button
                    type="button"
                    aria-label={
                      linha.percentualConcluido === 100 ? 'Marcar como pendente' : 'Marcar como concluída'
                    }
                    title={
                      linha.percentualConcluido === 100 ? 'Marcar como pendente' : 'Marcar como concluída'
                    }
                    onClick={() =>
                      aoEditarTarefa({
                        id: linha.id,
                        percentualConcluido: linha.percentualConcluido === 100 ? 0 : 100,
                      })
                    }
                    className="mx-auto flex size-6 items-center justify-center rounded-md transition-colors hover:bg-texto/6"
                  >
                    <CheckCircle2
                      aria-hidden
                      className={clsx(
                        'size-4 transition-colors',
                        linha.percentualConcluido === 100 ? 'text-sucesso' : 'text-texto-sutil/40',
                      )}
                    />
                  </button>
                )}
              </Celula>

              {/* Subtarefas recuadas o bastante para o título ficar sob o da fase (depois da seta). */}
              <Celula style={{ paddingLeft: 4 + linha.nivel * 20 }}>
                <div className="flex w-full min-w-0 items-center gap-1">
                  {ehFase && (
                    <button
                      type="button"
                      aria-expanded={!recolhida}
                      aria-label={`${recolhida ? 'Expandir' : 'Recolher'} ${linha.titulo}`}
                      title={recolhida ? 'Expandir fase' : 'Recolher fase'}
                      onClick={() => aoAlternarFase(linha.id)}
                      className="flex size-4 shrink-0 items-center justify-center rounded text-texto-sutil hover:bg-texto/8 hover:text-texto"
                    >
                      <ChevronRight
                        aria-hidden
                        className={clsx('size-3.5 transition-transform', !recolhida && 'rotate-90')}
                      />
                    </button>
                  )}
                  {linha.critico && (
                    <span
                      aria-label="No caminho crítico"
                      title="No caminho crítico"
                      className="size-1.5 shrink-0 rounded-full bg-perigo"
                    />
                  )}
                  <CelulaEditavel
                    valor={linha.titulo}
                    editavel={podeEditarTarefas}
                    quebrarTexto={modoEdicao}
                    className={ehFase ? 'font-semibold' : undefined}
                    aoSalvar={(valor) =>
                      ehFase
                        ? aoRenomearFase(linha.id, valor)
                        : aoEditarTarefa({ id: linha.id, titulo: valor })
                    }
                  />
                  {linha.conflitoDeDependencia && (
                    <AlertaDeDependencia
                      ajuste={ajusteDoConflito(linha)}
                      podeAjustar={podeEditarTarefas}
                      aoAjustar={(ajuste) =>
                        aoEditarTarefa({
                          id: linha.id,
                          dataInicio: ajuste.novoInicio,
                          dataFim: ajuste.novoFim,
                        })
                      }
                    />
                  )}
                </div>
              </Celula>

              <Celula>
                {ehFase ? (
                  <span className="px-1 text-texto-sutil">—</span>
                ) : (
                  <select
                    value={linha.responsavelId ?? ''}
                    disabled={!podeEditarTarefas}
                    onChange={(evento) => {
                      aoEditarTarefa({ id: linha.id, responsavelId: evento.target.value || null });
                      evento.currentTarget.blur();
                    }}
                    className={clsx(
                      'w-full truncate rounded-md bg-transparent px-1 py-0.5 text-sm',
                      'hover:bg-texto/6 focus:outline-none focus-visible:bg-texto/6',
                      !linha.responsavelId && 'text-texto-sutil',
                    )}
                  >
                    <option value="">Sem responsável</option>
                    {ativos.map((responsavel) => (
                      <option key={responsavel.id} value={responsavel.id}>
                        {responsavel.nome}
                      </option>
                    ))}
                    {linha.responsavelId &&
                      !ativos.some((responsavel) => responsavel.id === linha.responsavelId) && (
                        <option value={linha.responsavelId}>{linha.responsavelNome} (inativo)</option>
                      )}
                  </select>
                )}
              </Celula>

              <Celula>
                {ehFase ? (
                  <span className="px-1 text-texto-sutil">—</span>
                ) : (
                  <SeletorDependencias
                    linha={linha}
                    candidatas={tarefas.filter((candidata) => candidata.id !== linha.id)}
                    editavel={podeEditarTarefas}
                    aoAlterar={(dependencias) => aoEditarTarefa({ id: linha.id, dependencias })}
                  />
                )}
              </Celula>

              <Celula className="tabular-nums">
                {ehFase || !linha.dataInicio ? (
                  <span className="px-1 text-xs text-texto-secundario">
                    {linha.dataInicio ? formatarDataCurta(linha.dataInicio) : '—'}
                  </span>
                ) : (
                  <CelulaEditavel
                    valor={linha.dataInicio}
                    tipo="data"
                    editavel={podeEditarTarefas}
                    formatar={formatarDataCurta}
                    className="text-xs"
                    aoSalvar={(valor) => {
                      const entrada: AtualizarTarefaEntrada = { id: linha.id, dataInicio: valor };
                      if (linha.dataFim && valor > linha.dataFim) entrada.dataFim = valor;
                      aoEditarTarefa(entrada);
                    }}
                  />
                )}
              </Celula>

              <Celula className="tabular-nums">
                {ehFase ? (
                  <span className="whitespace-nowrap px-1 text-xs text-texto-secundario">
                    {formatarDias(linha.duracaoEmDias)}
                  </span>
                ) : (
                  <CelulaEditavel
                    valor={String(linha.duracaoEmDias)}
                    tipo="numero"
                    min={1}
                    editavel={podeEditarTarefas && !!linha.dataInicio}
                    formatar={(valor) => formatarDias(parseInt(valor, 10) || 1)}
                    className="text-xs"
                    aoSalvar={(valor) => {
                      const dias = Math.max(1, parseInt(valor, 10) || 1);
                      aoEditarTarefa({ id: linha.id, dataFim: somarDias(linha.dataInicio!, dias - 1) });
                    }}
                  />
                )}
              </Celula>

              <Celula className="tabular-nums">
                {ehFase || !linha.dataFim ? (
                  <span className="px-1 text-xs text-texto-secundario">
                    {linha.dataFim ? formatarDataCurta(linha.dataFim) : '—'}
                  </span>
                ) : (
                  <CelulaEditavel
                    valor={linha.dataFim}
                    tipo="data"
                    editavel={podeEditarTarefas}
                    formatar={formatarDataCurta}
                    className="text-xs"
                    aoSalvar={(valor) => aoEditarTarefa({ id: linha.id, dataFim: valor })}
                  />
                )}
              </Celula>

              <Celula className="tabular-nums">
                {ehFase ? (
                  <span className="px-1 text-xs text-texto-sutil">—</span>
                ) : (
                  <CelulaEditavel
                    valor={linha.dataEfetiva ?? ''}
                    tipo="data"
                    editavel={podeEditarTarefas}
                    formatar={formatarDataCurta}
                    className="text-xs"
                    aoSalvar={(valor) => aoEditarTarefa({ id: linha.id, dataEfetiva: valor || null })}
                  />
                )}
              </Celula>

              <Celula className="justify-center">
                {!ehFase &&
                  (linha.evidencia || podeEditarTarefas ? (
                    <button
                      type="button"
                      aria-label={
                        linha.evidencia ? `Ver evidência de ${linha.titulo}` : `Registrar evidência de ${linha.titulo}`
                      }
                      title={linha.evidencia ?? 'Registrar evidência'}
                      onClick={() => aoAbrirEvidencia(linha)}
                      className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-texto/6"
                    >
                      {linha.evidencia ? (
                        <FileCheck2 aria-hidden className="size-4 text-primaria" />
                      ) : (
                        <FileText aria-hidden className="size-4 text-texto-sutil/40" />
                      )}
                    </button>
                  ) : (
                    <span className="text-texto-sutil">—</span>
                  ))}
              </Celula>

              <Celula className="justify-end pr-1">
                <div className="flex opacity-0 transition-opacity group-focus-within/linha:opacity-100 group-hover/linha:opacity-100">
                  {ehFase
                    ? podeEditarFases && (
                        <>
                          <BotaoIcone
                            icone={Plus}
                            tamanho="xs"
                            rotulo={`Adicionar tarefa em ${linha.titulo}`}
                            onClick={() => aoAdicionarTarefa(linha.id)}
                          />
                          <BotaoIcone
                            icone={CalendarRange}
                            tamanho="xs"
                            rotulo={`Ajustar as datas das tarefas de ${linha.titulo}`}
                            onClick={() => aoAjustarDatasDaFase(linha)}
                          />
                          <BotaoIcone
                            icone={Trash2}
                            tamanho="xs"
                            rotulo={`Excluir a fase ${linha.titulo}`}
                            onClick={() => aoExcluirFase(linha)}
                          />
                        </>
                      )
                    : podeEditarTarefas && (
                        <>
                          <BotaoIcone
                            icone={CopyPlus}
                            tamanho="xs"
                            rotulo={`Duplicar ${linha.titulo}`}
                            onClick={() => aoDuplicarTarefa(linha.id)}
                          />
                          <BotaoIcone
                            icone={Trash2}
                            tamanho="xs"
                            rotulo={`Excluir ${linha.titulo}`}
                            onClick={() => aoExcluirTarefa(linha)}
                          />
                        </>
                      )}
                </div>
              </Celula>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface AjusteDoConflito {
  predecessora: LinhaEstruturaDTO;
  novoInicio: string;
  novoFim: string;
}

function AlertaDeDependencia({
  ajuste,
  podeAjustar,
  aoAjustar,
}: {
  ajuste: AjusteDoConflito | null;
  podeAjustar: boolean;
  aoAjustar: (ajuste: AjusteDoConflito) => void;
}) {
  const motivo = ajuste
    ? `Começa antes do fim da ${ajuste.predecessora.numero}, que termina em ${formatarDataCurta(ajuste.predecessora.dataFim!)}.`
    : 'Começa antes do fim de uma predecessora.';

  if (!ajuste || !podeAjustar) {
    return <CircleAlert aria-label={motivo} className="size-3.5 shrink-0 text-alerta" />;
  }

  const acao = `Clique para começar em ${formatarDataCurta(ajuste.novoInicio)}, mantendo a duração.`;
  return (
    <button
      type="button"
      aria-label={`${motivo} ${acao}`}
      title={`${motivo}\n${acao}`}
      onClick={() => aoAjustar(ajuste)}
      className="flex size-5 shrink-0 items-center justify-center rounded-md text-alerta transition-colors hover:bg-alerta/15"
    >
      <CircleAlert aria-hidden className="size-3.5" />
    </button>
  );
}

function CabecalhoColuna({ children, altura }: { children: ReactNode; altura: number }) {
  return (
    <th
      scope="col"
      style={{ height: altura }}
      className="vidro-forte sticky top-0 z-20 border-b border-borda px-2 text-left text-[11px] font-semibold uppercase tracking-wider text-texto-sutil"
    >
      {children}
    </th>
  );
}

/**
 * A altura vem de variáveis CSS definidas na tabela. Com altura fixa, um controle mais alto que a
 * linha transborda visualmente em vez de esticá-la (e desalinhar o Gantt).
 */
function Celula({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <td style={style} className="border-b border-borda/60 px-1 py-0 align-middle">
      <div
        className={clsx(
          'flex h-(--altura-celula) min-h-(--altura-minima-celula) items-center py-(--respiro-celula)',
          className,
        )}
      >
        {children}
      </div>
    </td>
  );
}
