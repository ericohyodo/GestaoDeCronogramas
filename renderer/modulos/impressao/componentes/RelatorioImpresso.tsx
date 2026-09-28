import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import type { EstruturaCronogramaDTO, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { formatarData, formatarDataCurta, formatarDias, formatarPeriodo } from '@/compartilhado/formatacao';
import {
  calcularIndicadores,
  escalaDeTempo,
  estaAtrasada,
  mesesEntre,
  proximasEntregas,
  resumirFases,
  resumirResponsaveis,
  rotuloDoPrazo,
} from '../indicadores';

/*
 * Cores fixas (e não os tokens do tema): o PDF sai sempre em papel branco, mesmo no tema escuro.
 * texto #0f1b2d · secundário #4a5a70 · sutil #7a8699 · borda #d9e0ea · primária #1f4e8c
 * destaque #0e9f9a · sucesso #1e8e5a · perigo #c0392b · fundo #f4f6fa
 */

interface PropsRelatorio {
  cronograma: CronogramaDTO;
  estrutura: EstruturaCronogramaDTO;
  rotuloDaSituacao: string;
  hoje: string;
  emitidoEm: string;
}

/*
 * A4 com as margens do GeradorDePdfElectron (0,4" nas laterais e no topo, 0,55" embaixo).
 * O relatório tem exatamente a largura útil, então o layout medido na tela é o mesmo do papel.
 */
const LARGURA_UTIL_PX = (8.27 - 0.8) * 96;
const ALTURA_UTIL_PX = (11.69 - 0.4 - 0.55) * 96 - 8;
/** Abaixo disso o texto fica pequeno demais: o que sobrar segue para a folha seguinte. */
const REDUCAO_MINIMA = 0.6;

export function RelatorioImpresso(props: PropsRelatorio) {
  return (
    <div
      className="bg-white font-sans text-[9pt] leading-snug text-[#0f1b2d]"
      style={{ width: LARGURA_UTIL_PX }}
    >
      <FolhaDashboard {...props} />
      <FolhaAtividades {...props} />
    </div>
  );
}

/**
 * Cada folha cabe numa página A4: se passar da altura útil, é reduzida proporcionalmente.
 * Chamar só depois de `document.fonts.ready`: com a fonte provisória a altura sai menor.
 * Mede de novo após reduzir, porque a escala muda onde os textos quebram de linha.
 */
export function ajustarFolhasAPagina(raiz: ParentNode): void {
  for (const folha of raiz.querySelectorAll<HTMLElement>('[data-folha]')) {
    let escala = 1;
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      const altura = folha.getBoundingClientRect().height;
      if (altura <= ALTURA_UTIL_PX || escala === REDUCAO_MINIMA) break;
      escala = Math.max(REDUCAO_MINIMA, (escala * ALTURA_UTIL_PX) / altura);
      folha.style.zoom = String(escala);
    }
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Folha 1 — dashboard                                                                          */
/* ------------------------------------------------------------------------------------------ */

function FolhaDashboard({ cronograma, estrutura, rotuloDaSituacao, hoje, emitidoEm }: PropsRelatorio) {
  const { linhas } = estrutura;
  const indicadores = calcularIndicadores(linhas, hoje);
  const fases = resumirFases(linhas, hoje);
  const entregas = proximasEntregas(linhas, 9);
  const responsaveis = resumirResponsaveis(linhas, hoje).slice(0, 9);

  const inicio = [cronograma.dataInicio, estrutura.inicio].sort()[0]!;
  const fim = [cronograma.dataFim, estrutura.fim].sort().at(-1)!;
  const escala = escalaDeTempo(inicio, fim);
  const meses = mesesEntre(inicio, fim);
  const hojeNaJanela = hoje >= inicio && hoje <= fim;

  const atrasoDoProjeto =
    indicadores.fimProjetado && indicadores.fimProjetado > cronograma.dataFim
      ? Math.round((Date.parse(indicadores.fimProjetado) - Date.parse(cronograma.dataFim)) / 86_400_000)
      : 0;

  return (
    <section data-folha className="break-after-page">
      <header className="flex items-end justify-between border-b-2 border-[#1f4e8c] pb-2">
        <div className="min-w-0">
          <p className="text-[7.5pt] font-semibold uppercase tracking-wider text-[#1f4e8c]">
            Relatório do projeto
          </p>
          <h1 className="text-[17pt] font-semibold leading-tight tracking-tight">{cronograma.nome}</h1>
          <p className="mt-0.5 text-[8.5pt] text-[#4a5a70]">
            <span className="font-medium text-[#0f1b2d]">{rotuloDaSituacao}</span>
            {' · '}
            {formatarPeriodo(cronograma.dataInicio, cronograma.dataFim)}
            {' · '}
            {formatarDias(cronograma.duracaoEmDias)}
          </p>
        </div>
        <p className="shrink-0 text-right text-[7.5pt] text-[#7a8699]">
          Gestão de Cronogramas
          <br />
          Emitido em {emitidoEm}
        </p>
      </header>

      {cronograma.descricao && (
        <p className="mt-2 line-clamp-3 text-[8.5pt] text-[#4a5a70]">{cronograma.descricao}</p>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Cartao titulo="Concluído">
          <p className="text-[20pt] font-semibold leading-none tabular-nums text-[#1f4e8c]">
            {indicadores.percentual}%
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e3e8f0]">
            <div
              className="h-full rounded-full bg-[#1f4e8c]"
              style={{ width: `${indicadores.percentual}%` }}
            />
          </div>
          <p className="mt-1 text-[7pt] text-[#7a8699]">ponderado pela duração das tarefas</p>
        </Cartao>
        <Cartao titulo="Tarefas">
          <p className="text-[20pt] font-semibold leading-none tabular-nums">{indicadores.total}</p>
          <p className="mt-1.5 text-[7.5pt] leading-tight text-[#4a5a70]">
            <span className="tabular-nums">{indicadores.concluidas}</span> concluídas ·{' '}
            <span className="tabular-nums">{indicadores.emAndamento}</span> em andamento ·{' '}
            <span className="tabular-nums">{indicadores.naoIniciadas}</span> não iniciadas
          </p>
        </Cartao>
        <Cartao titulo="Atrasadas">
          <p
            className={clsx(
              'text-[20pt] font-semibold leading-none tabular-nums',
              indicadores.atrasadas > 0 ? 'text-[#c0392b]' : 'text-[#1e8e5a]',
            )}
          >
            {indicadores.atrasadas}
          </p>
          <p className="mt-1.5 text-[7.5pt] leading-tight text-[#4a5a70]">
            término vencido e não concluídas até {formatarDataCurta(hoje)}
          </p>
        </Cartao>
        <Cartao titulo="Prazo">
          <p className="text-[8pt] leading-tight text-[#4a5a70]">
            Término previsto
            <br />
            <span className="text-[11pt] font-semibold tabular-nums text-[#0f1b2d]">
              {formatarData(cronograma.dataFim)}
            </span>
          </p>
          <p
            className={clsx(
              'mt-1 text-[7.5pt] font-medium leading-tight',
              atrasoDoProjeto > 0 ? 'text-[#c0392b]' : 'text-[#1e8e5a]',
            )}
          >
            {indicadores.fimProjetado === null
              ? 'Sem tarefas planejadas'
              : atrasoDoProjeto > 0
                ? `Última tarefa termina ${formatarDataCurta(indicadores.fimProjetado)} (+${formatarDias(atrasoDoProjeto)})`
                : `Última tarefa termina ${formatarDataCurta(indicadores.fimProjetado)}, dentro do prazo`}
          </p>
        </Cartao>
      </div>

      <Secao titulo="Fases">
        {fases.length === 0 ? (
          <p className="text-[8pt] text-[#7a8699]">Este cronograma ainda não tem fases.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[7pt] uppercase tracking-wider text-[#7a8699]">
                <th className="w-[36%] pb-1 font-semibold">Fase</th>
                <th className="w-[17%] pb-1 font-semibold">Período</th>
                <th className="pb-1 font-semibold">
                  <div className="relative h-3">
                    {meses.map((mes) => (
                      <span
                        key={mes.inicio}
                        className="absolute top-0 whitespace-nowrap text-[6.5pt] font-medium normal-case tracking-normal"
                        style={{ left: `${escala.posicao(mes.inicio)}%` }}
                      >
                        {mes.rotulo}
                      </span>
                    ))}
                  </div>
                </th>
                <th className="w-[13%] pb-1 text-right font-semibold">Concluído</th>
              </tr>
            </thead>
            <tbody>
              {fases.map(({ linha, total, concluidas, atrasadas }) => (
                <tr key={linha.id} className="border-t border-[#e3e8f0]">
                  <td className="py-1 pr-2">
                    <span className="font-medium">
                      {linha.numero}. {linha.titulo}
                    </span>
                    <span className="block text-[7pt] text-[#7a8699]">
                      {concluidas}/{total} tarefas concluídas
                      {atrasadas > 0 && <span className="text-[#c0392b]"> · {atrasadas} atrasada(s)</span>}
                    </span>
                  </td>
                  <td className="py-1 pr-2 text-[8pt] tabular-nums text-[#4a5a70]">
                    {linha.dataInicio && linha.dataFim
                      ? `${formatarDataCurta(linha.dataInicio)} – ${formatarDataCurta(linha.dataFim)}`
                      : '—'}
                  </td>
                  <td className="py-1">
                    <div className="relative h-2.5 rounded-sm bg-[#f0f3f8]">
                      {meses.slice(1).map((mes) => (
                        <div
                          key={mes.inicio}
                          className="absolute inset-y-0 w-px bg-[#dde3ec]"
                          style={{ left: `${escala.posicao(mes.inicio)}%` }}
                        />
                      ))}
                      {linha.dataInicio && linha.dataFim && (
                        <div
                          className="absolute inset-y-0 overflow-hidden rounded-sm bg-[#c7d4e6]"
                          style={{
                            left: `${escala.posicao(linha.dataInicio)}%`,
                            width: `${escala.largura(linha.dataInicio, linha.dataFim)}%`,
                          }}
                        >
                          <div
                            className="h-full bg-[#1f4e8c]"
                            style={{ width: `${linha.percentualConcluido}%` }}
                          />
                        </div>
                      )}
                      {hojeNaJanela && (
                        <div
                          className="absolute -inset-y-0.5 w-0.5 bg-[#0e9f9a]"
                          style={{ left: `${escala.posicao(hoje)}%` }}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-1 text-right font-semibold tabular-nums">
                    {linha.percentualConcluido}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hojeNaJanela && fases.length > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[6.5pt] text-[#7a8699]">
            <span className="inline-block h-2 w-0.5 bg-[#0e9f9a]" /> hoje
            <span className="ml-2 inline-block h-2 w-3 rounded-sm bg-[#1f4e8c]" /> concluído
            <span className="ml-2 inline-block h-2 w-3 rounded-sm bg-[#c7d4e6]" /> a fazer
          </p>
        )}
      </Secao>

      <div className="mt-4 grid grid-cols-[3fr_2fr] gap-4">
        <Secao titulo="Próximas entregas" semMargem>
          {entregas.length === 0 ? (
            <p className="text-[8pt] text-[#7a8699]">Nenhuma tarefa em aberto.</p>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {entregas.map((tarefa) => {
                  const atrasada = estaAtrasada(tarefa, hoje);
                  return (
                    <tr key={tarefa.id} className="border-t border-[#e3e8f0] align-top">
                      <td className="w-[15%] py-1 pr-2 tabular-nums">
                        <span className="font-semibold">{formatarDataCurta(tarefa.dataFim!)}</span>
                        <span
                          className={clsx(
                            'block text-[6.5pt]',
                            atrasada ? 'font-medium text-[#c0392b]' : 'text-[#7a8699]',
                          )}
                        >
                          {rotuloDoPrazo(tarefa.dataFim!, hoje)}
                        </span>
                      </td>
                      <td className="py-1">
                        <span className="line-clamp-2">
                          <span className="text-[#7a8699] tabular-nums">{tarefa.numero}</span> {tarefa.titulo}
                        </span>
                        <span className="block text-[7pt] text-[#7a8699]">
                          {tarefa.responsavelNome ?? 'Sem responsável'}
                          {tarefa.percentualConcluido > 0 && ` · ${tarefa.percentualConcluido}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Secao>

        <Secao titulo="Por responsável" semMargem>
          {responsaveis.length === 0 ? (
            <p className="text-[8pt] text-[#7a8699]">Nenhuma tarefa em aberto.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[6.5pt] uppercase tracking-wider text-[#7a8699]">
                  <th className="pb-1 font-semibold">Responsável</th>
                  <th className="pb-1 text-right font-semibold">Abertas</th>
                  <th className="pb-1 text-right font-semibold">Atras.</th>
                  <th className="pb-1 text-right font-semibold">Próxima</th>
                </tr>
              </thead>
              <tbody>
                {responsaveis.map((resumo) => (
                  <tr key={resumo.nome} className="border-t border-[#e3e8f0]">
                    <td className="max-w-0 truncate py-1 pr-2">{resumo.nome}</td>
                    <td className="py-1 text-right tabular-nums">{resumo.abertas}</td>
                    <td
                      className={clsx(
                        'py-1 text-right tabular-nums',
                        resumo.atrasadas > 0 ? 'font-semibold text-[#c0392b]' : 'text-[#7a8699]',
                      )}
                    >
                      {resumo.atrasadas}
                    </td>
                    <td className="py-1 text-right tabular-nums text-[#4a5a70]">
                      {resumo.proximaEntrega ? formatarDataCurta(resumo.proximaEntrega) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>
      </div>
    </section>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#d9e0ea] bg-[#f7f9fc] px-2.5 py-2">
      <p className="mb-1 text-[6.5pt] font-semibold uppercase tracking-wider text-[#7a8699]">{titulo}</p>
      {children}
    </div>
  );
}

function Secao({
  titulo,
  semMargem = false,
  children,
}: {
  titulo: string;
  semMargem?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={clsx('break-inside-avoid', !semMargem && 'mt-4')}>
      <h2 className="mb-1.5 border-b border-[#d9e0ea] pb-1 text-[9pt] font-semibold text-[#1f4e8c]">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Folha 2 — lista de atividades                                                                */
/* ------------------------------------------------------------------------------------------ */

function FolhaAtividades({ cronograma, estrutura, hoje }: PropsRelatorio) {
  return (
    <section data-folha>
      <header className="mb-2 flex items-end justify-between border-b-2 border-[#1f4e8c] pb-1.5">
        <div>
          <p className="text-[7.5pt] font-semibold uppercase tracking-wider text-[#1f4e8c]">
            Lista de atividades
          </p>
          <h1 className="text-[12pt] font-semibold leading-tight">{cronograma.nome}</h1>
        </div>
        <p className="text-right text-[7pt] text-[#7a8699]">
          <span className="font-semibold text-[#c0392b]">Término em vermelho</span>: vencido e não concluída
        </p>
      </header>

      <table className="w-full border-collapse text-[8pt]">
        <thead>
          <tr className="border-b border-[#9aa8bb] text-left text-[6.5pt] uppercase tracking-wider text-[#4a5a70]">
            <th className="w-[7%] py-1 pl-1 font-semibold">N</th>
            <th className="w-[7%] py-1 text-right font-semibold">%</th>
            <th className="py-1 pl-3 font-semibold">Descrição</th>
            <th className="w-[10%] py-1 font-semibold">Início</th>
            <th className="w-[10%] py-1 font-semibold">Fim</th>
            <th className="w-[20%] py-1 font-semibold">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {estrutura.linhas.map((linha) => (
            <LinhaDaLista key={linha.id} linha={linha} hoje={hoje} />
          ))}
        </tbody>
      </table>
      {estrutura.linhas.length === 0 && (
        <p className="mt-3 text-[8pt] text-[#7a8699]">Este cronograma ainda não tem atividades.</p>
      )}
    </section>
  );
}

function LinhaDaLista({ linha, hoje }: { linha: LinhaEstruturaDTO; hoje: string }) {
  const ehFase = linha.tipo === 'fase';
  const concluida = !ehFase && linha.percentualConcluido === 100;
  return (
    <tr
      className={clsx(
        'break-inside-avoid border-b border-[#e3e8f0]',
        ehFase && 'bg-[#eef2f7] font-semibold',
      )}
    >
      <td className="py-[3px] pl-1 tabular-nums text-[#7a8699]">{linha.numero}</td>
      <td
        className={clsx(
          'py-[3px] text-right tabular-nums',
          concluida && 'text-[#1e8e5a]',
        )}
      >
        {linha.percentualConcluido}%
      </td>
      <td className={clsx('py-[3px] pr-2', ehFase ? 'pl-3' : 'pl-6')}>{linha.titulo}</td>
      <td className="py-[3px] tabular-nums">{linha.dataInicio ? formatarDataCurta(linha.dataInicio) : '—'}</td>
      <td
        className={clsx(
          'py-[3px] tabular-nums',
          estaAtrasada(linha, hoje) && 'font-semibold text-[#c0392b]',
        )}
      >
        {linha.dataFim ? formatarDataCurta(linha.dataFim) : '—'}
      </td>
      <td className="max-w-0 truncate py-[3px] pr-1">
        {ehFase ? '' : (linha.responsavelNome ?? <span className="text-[#9aa8bb]">—</span>)}
      </td>
    </tr>
  );
}
