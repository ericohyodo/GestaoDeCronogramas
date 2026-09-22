'use client';

import clsx from 'clsx';
import { CheckCircle2, CircleAlert, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ResponsavelDTO } from '@contratos/responsaveis.contrato';
import type { AtualizarTarefaEntrada, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { formatarDataCurta, formatarDias, somarDias } from '@/compartilhado/formatacao';
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
  aoEditarTarefa: (entrada: AtualizarTarefaEntrada) => void;
  aoExcluirTarefa: (linha: LinhaEstruturaDTO) => void;
  aoRenomearFase: (id: string, nome: string) => void;
  aoExcluirFase: (linha: LinhaEstruturaDTO) => void;
  aoAdicionarTarefa: (faseId: string) => void;
  aoReordenarTarefas: (ordens: { id: string; ordem: number }[]) => void;
}

export function TabelaEstrutura({
  linhas,
  responsaveis,
  podeEditarTarefas,
  podeEditarFases,
  alturaDaLinha,
  alturaDoCabecalho,
  aoEditarTarefa,
  aoExcluirTarefa,
  aoRenomearFase,
  aoExcluirFase,
  aoAdicionarTarefa,
  aoReordenarTarefas,
}: PropsTabelaEstrutura) {
  const tarefas = linhas.filter((linha) => linha.tipo === 'tarefa');
  const ativos = responsaveis.filter((responsavel) => responsavel.ativo);

  // ---------------------------------------------------------------------------
  // Drag-and-drop state
  // ---------------------------------------------------------------------------
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobreId, setSobreId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!arrastando || arrastando === targetId) {
      setArrastando(null);
      setSobreId(null);
      return;
    }
    const origem = linhas.find((l) => l.id === arrastando);
    const destino = linhas.find((l) => l.id === targetId);
    if (!origem || !destino || origem.faseId !== destino.faseId) {
      setArrastando(null);
      setSobreId(null);
      return;
    }

    // Tarefas da mesma fase, na ordem atual de exibição.
    const faseLinhas = linhas.filter(
      (l) => l.tipo === 'tarefa' && l.faseId === origem.faseId,
    );
    const sem = faseLinhas.filter((l) => l.id !== arrastando);
    const idx = sem.findIndex((l) => l.id === targetId);
    sem.splice(idx, 0, origem);
    const ordens = sem.map((t, i) => ({ id: t.id, ordem: i + 1 }));
    aoReordenarTarefas(ordens);
    setArrastando(null);
    setSobreId(null);
  };

  return (
    // Colunas: ⠿ | N | % | ✓ | Descrição | Responsável | Dep. | Início | Dur. | Conclusão | Ações
    <table className="w-full min-w-[480px] table-fixed border-separate border-spacing-0 text-sm">
      <colgroup>
        <col className="w-5" />
        <col className="w-14" />
        <col className="w-[60px]" />
        <col className="w-9" />
        <col className="min-w-24" />
        <col className="w-[88px]" />
        <col className="w-12" />
        <col className="w-[88px]" />
        <col className="w-[72px]" />
        <col className="w-[88px]" />
        <col className="w-8" />
      </colgroup>
      <thead>
        <tr>
          <CabecalhoColuna altura={alturaDoCabecalho}>
            <span className="sr-only">Ordem</span>
          </CabecalhoColuna>
          {['N', '%'].map((titulo) => (
            <CabecalhoColuna key={titulo} altura={alturaDoCabecalho}>
              {titulo}
            </CabecalhoColuna>
          ))}
          <CabecalhoColuna altura={alturaDoCabecalho}>
            <CheckCircle2 aria-hidden className="mx-auto size-3.5 text-texto-sutil" />
            <span className="sr-only">Concluir</span>
          </CabecalhoColuna>
          {['Descrição', 'Responsável', 'Dep.', 'Início', 'Dur.', 'Conclusão'].map((titulo) => (
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
        {linhas.map((linha) => {
          const ehFase = linha.tipo === 'fase';
          // Renomear fase: liberado para quem pode editar tarefas.
          const editavelNome = ehFase ? podeEditarTarefas : podeEditarTarefas;
          const arrastandoEsta = arrastando === linha.id;
          const sobreEsta = sobreId === linha.id && arrastando !== null && arrastando !== linha.id;

          return (
            <tr
              key={linha.id}
              style={{ height: alturaDaLinha }}
              draggable={!ehFase && podeEditarTarefas}
              onDragStart={() => setArrastando(linha.id)}
              onDragEnd={() => { setArrastando(null); setSobreId(null); }}
              onDragOver={(e) => { e.preventDefault(); setSobreId(linha.id); }}
              onDrop={() => handleDrop(linha.id)}
              className={clsx(
                'group/linha transition-colors',
                ehFase ? 'bg-texto/4 font-semibold' : 'hover:bg-primaria/4',
                arrastandoEsta && 'opacity-40',
                sobreEsta && 'border-t-2 border-primaria',
              )}
            >
              {/* Handle de arrasto */}
              <Celula className="pl-1">
                {!ehFase && podeEditarTarefas && (
                  <GripVertical
                    aria-hidden
                    className="mx-auto size-3.5 cursor-grab text-texto-sutil/40 opacity-0 transition-opacity group-hover/linha:opacity-100"
                  />
                )}
              </Celula>

              {/* N */}
              <Celula className="pl-1 text-xs tabular-nums text-texto-sutil">{linha.numero}</Celula>

              {/* % */}
              <Celula className="tabular-nums">
                {ehFase ? (
                  <span className="px-1 text-xs text-texto-secundario">
                    {linha.percentualConcluido}%
                  </span>
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

              {/* ✓ Concluir */}
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
                    className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-texto/6"
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

              {/* Descrição */}
              <Celula style={{ paddingLeft: linha.nivel * 16 }}>
                <div className="flex items-center gap-1">
                  {linha.critico && (
                    <span
                      aria-label="No caminho crítico"
                      title="No caminho crítico"
                      className="size-1.5 shrink-0 rounded-full bg-perigo"
                    />
                  )}
                  <CelulaEditavel
                    valor={linha.titulo}
                    editavel={editavelNome}
                    className={ehFase ? 'font-semibold' : undefined}
                    aoSalvar={(valor) =>
                      ehFase
                        ? aoRenomearFase(linha.id, valor)
                        : aoEditarTarefa({ id: linha.id, titulo: valor })
                    }
                  />
                  {linha.conflitoDeDependencia && (
                    <CircleAlert
                      aria-label="Começa antes do fim de uma predecessora"
                      className="size-3.5 shrink-0 text-alerta"
                    />
                  )}
                </div>
              </Celula>

              {/* Responsável */}
              <Celula>
                {ehFase ? (
                  <span className="px-1 text-texto-sutil">—</span>
                ) : (
                  <select
                    value={linha.responsavelId ?? ''}
                    disabled={!podeEditarTarefas}
                    onChange={(evento) =>
                      aoEditarTarefa({ id: linha.id, responsavelId: evento.target.value || null })
                    }
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

              {/* Dep. */}
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

              {/* Início */}
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

              {/* Duração */}
              <Celula className="tabular-nums">
                {ehFase ? (
                  <span className="px-1 text-xs text-texto-secundario">
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
                      aoEditarTarefa({
                        id: linha.id,
                        dataFim: somarDias(linha.dataInicio!, dias - 1),
                      });
                    }}
                  />
                )}
              </Celula>

              {/* Conclusão */}
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

              {/* Ações */}
              <Celula className="pr-2">
                <div className="flex justify-end opacity-0 transition-opacity group-focus-within/linha:opacity-100 group-hover/linha:opacity-100">
                  {ehFase
                    ? podeEditarFases && (
                        <>
                          <BotaoIcone
                            icone={Plus}
                            rotulo={`Adicionar tarefa em ${linha.titulo}`}
                            onClick={() => aoAdicionarTarefa(linha.id)}
                          />
                          <BotaoIcone
                            icone={Trash2}
                            rotulo={`Excluir a fase ${linha.titulo}`}
                            onClick={() => aoExcluirFase(linha)}
                          />
                        </>
                      )
                    : podeEditarTarefas && (
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={`Excluir ${linha.titulo}`}
                          onClick={() => aoExcluirTarefa(linha)}
                        />
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

function CabecalhoColuna({ children, altura }: { children: React.ReactNode; altura: number }) {
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

function Celula({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td style={style} className={clsx('border-b border-borda/60 px-1 align-middle', className)}>
      {children}
    </td>
  );
}
