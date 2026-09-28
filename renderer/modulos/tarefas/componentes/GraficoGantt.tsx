'use client';

import clsx from 'clsx';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import type { LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { diasEntreDatas, formatarData, formatarDias, hojeIso, somarDias } from '@/compartilhado/formatacao';

interface PropsGraficoGantt {
  linhas: LinhaEstruturaDTO[];
  /** Janela do gráfico: início do projeto até a última data das tarefas. */
  inicio: string;
  fim: string;
  alturaDaLinha: number;
  alturaDoCabecalho: number;
}

const ALTURA_DA_BARRA = 20;
const ALTURA_DA_FASE = 12;
const DIAS_DE_MARGEM = 7;
const ZOOM_POR_PASSO = 1.25;
/** Limite do zoom: além disso cada dia ocuparia mais que isto e não há o que ganhar. */
const PIXELS_POR_DIA_MAXIMO = 64;
/** Com esta escala cabe o número de cada dia no cabeçalho. */
const PIXELS_POR_DIA_PARA_MOSTRAR_DIAS = 22;

/**
 * Zoom só horizontal: muda a escala do tempo, nunca a altura das linhas, que precisa bater com a
 * lista. O deslocamento é aplicado no desenho (e não com uma barra de rolagem), porque um
 * contêiner com rolagem horizontal quebraria o cabeçalho fixo no topo.
 */
interface Vista {
  zoom: number;
  /** Pixels já rolados para a direita, na escala atual. */
  deslocamento: number;
}

function limitarVista(vista: Vista, largura: number, zoomMaximo: number): Vista {
  const zoom = Math.min(zoomMaximo, Math.max(1, vista.zoom));
  const deslocamento = Math.min(largura * zoom - largura, Math.max(0, vista.deslocamento));
  return { zoom, deslocamento };
}

const zoomMaximoPara = (largura: number, totalDeDias: number) =>
  largura > 0 ? Math.max(1, (PIXELS_POR_DIA_MAXIMO * totalDeDias) / largura) : 1;
const MESES = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/**
 * Gantt em SVG alinhado linha a linha com a tabela: barras, marcos de fase,
 * setas de dependência (término → início), destaque do caminho crítico e a linha mestra
 * (caminho real, pelas datas efetivas de conclusão).
 */
export function GraficoGantt({
  linhas,
  inicio,
  fim,
  alturaDaLinha,
  alturaDoCabecalho,
}: PropsGraficoGantt) {
  const container = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setLargura(entrada.contentRect.width);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const inicioComMargem = somarDias(inicio, -DIAS_DE_MARGEM);
  const fimComMargem = somarDias(fim, DIAS_DE_MARGEM);
  const totalDeDias = Math.max(1, diasEntreDatas(inicioComMargem, fimComMargem) + 1);

  const [vistaDesejada, setVistaDesejada] = useState<Vista>({ zoom: 1, deslocamento: 0 });

  // Ctrl + roda: zoom ancorado no cursor. Shift + roda ou gesto horizontal: desloca.
  // Listener nativo porque o onWheel do React é passivo e não impede o zoom da página.
  useEffect(() => {
    const elemento = container.current;
    if (!elemento) return;
    const aoRolar = (evento: WheelEvent) => {
      const caixa = elemento.getBoundingClientRect();
      if (caixa.width === 0) return;
      const zoomMaximo = zoomMaximoPara(caixa.width, totalDeDias);

      if (evento.ctrlKey) {
        evento.preventDefault();
        const cursor = evento.clientX - caixa.left;
        // Proporcional ao giro: um "clique" da roda (~100px) dá ZOOM_POR_PASSO, e a pinça do
        // touchpad, que manda muitos eventos pequenos, fica suave.
        const fator = Math.exp((-evento.deltaY / 100) * Math.log(ZOOM_POR_PASSO));
        setVistaDesejada((atual) => {
          const vista = limitarVista(atual, caixa.width, zoomMaximo);
          const zoom = Math.min(zoomMaximo, Math.max(1, vista.zoom * fator));
          // O dia que estava sob o cursor continua sob o cursor depois do zoom.
          const deslocamento = ((vista.deslocamento + cursor) / vista.zoom) * zoom - cursor;
          return limitarVista({ zoom, deslocamento }, caixa.width, zoomMaximo);
        });
        return;
      }

      const horizontal = evento.shiftKey ? evento.deltaY : evento.deltaX;
      if (horizontal === 0) return;
      evento.preventDefault();
      setVistaDesejada((atual) =>
        limitarVista(
          { ...atual, deslocamento: atual.deslocamento + horizontal },
          caixa.width,
          zoomMaximo,
        ),
      );
    };
    elemento.addEventListener('wheel', aoRolar, { passive: false });
    return () => elemento.removeEventListener('wheel', aoRolar);
  }, [totalDeDias]);

  // A largura muda com a janela e com o divisor: a vista é sempre reenquadrada nos limites.
  const zoomMaximo = zoomMaximoPara(largura, totalDeDias);
  const { zoom, deslocamento } = limitarVista(vistaDesejada, largura, zoomMaximo);
  const pixelsPorDia = (largura * zoom) / totalDeDias;
  const x = (data: string) => diasEntreDatas(inicioComMargem, data) * pixelsPorDia - deslocamento;
  const xAposOFim = (data: string) => x(data) + pixelsPorDia;

  const arrastar = (evento: PointerEvent<SVGSVGElement>) => {
    if (zoom <= 1 || evento.button !== 0) return;
    const origem = evento.clientX;
    const deslocamentoInicial = deslocamento;
    const mover = (movimento: globalThis.PointerEvent) =>
      setVistaDesejada(
        limitarVista(
          { zoom, deslocamento: deslocamentoInicial - (movimento.clientX - origem) },
          largura,
          zoomMaximo,
        ),
      );
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  };

  const alturaDoCorpo = Math.max(linhas.length * alturaDaLinha, alturaDaLinha);
  const barras = new Map<string, { x1: number; x2: number; y: number }>();
  linhas.forEach((linha, indice) => {
    if (!linha.dataInicio || !linha.dataFim) return;
    barras.set(linha.id, {
      x1: x(linha.dataInicio),
      x2: xAposOFim(linha.dataFim),
      y: indice * alturaDaLinha + alturaDaLinha / 2,
    });
  });

  // A tabela e o gráfico usam as mesmas linhas, então a posição vertical é a da linha da tarefa.
  const pontosDaLinhaMestra = linhas.flatMap((linha, indice) =>
    linha.tipo === 'tarefa' && linha.dataEfetiva
      ? [
          {
            id: linha.id,
            x: xAposOFim(linha.dataEfetiva),
            y: indice * alturaDaLinha + alturaDaLinha / 2,
            descricao: `${linha.titulo}: concluída em ${formatarData(linha.dataEfetiva)}${linha.dataFim ? ` (previsto ${formatarData(linha.dataFim)})` : ''}`,
          },
        ]
      : [],
  );

  const hoje = hojeIso();
  const mostrarHoje = hoje >= inicioComMargem && hoje <= fimComMargem;

  return (
    <div ref={container} className="min-w-0">
      {largura > 0 && (
        <>
          <div
            className="vidro-forte sticky top-0 z-20 border-b border-borda"
            style={{ height: alturaDoCabecalho }}
            title="Ctrl + roda do mouse: zoom na horizontal · arraste ou Shift + roda: mover"
          >
            <CabecalhoDoTempo
              inicio={inicioComMargem}
              fim={fimComMargem}
              largura={largura}
              altura={alturaDoCabecalho}
              pixelsPorDia={pixelsPorDia}
              deslocamento={deslocamento}
            />
            {zoom > 1 && (
              <span className="pointer-events-none absolute right-1.5 top-1 rounded bg-primaria/12 px-1.5 text-[10px] font-semibold tabular-nums text-primaria">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>

          <svg
            width={largura}
            height={alturaDoCorpo}
            onPointerDown={arrastar}
            className={clsx('block', zoom > 1 && 'cursor-grab active:cursor-grabbing')}
            role="img"
            aria-label="Gráfico de Gantt do cronograma"
          >
            {/* Divisões de mês, para leitura das datas */}
            {listarMeses(inicioComMargem, fimComMargem).map((mes) => (
              <line
                key={mes.inicio}
                x1={x(mes.inicio)}
                x2={x(mes.inicio)}
                y1={0}
                y2={alturaDoCorpo}
                stroke="var(--borda)"
                strokeWidth={1}
              />
            ))}

            {linhas.map((_, indice) =>
              indice % 2 === 1 ? (
                <rect
                  key={indice}
                  x={0}
                  y={indice * alturaDaLinha}
                  width={largura}
                  height={alturaDaLinha}
                  fill="var(--texto)"
                  opacity={0.02}
                />
              ) : null,
            )}

            {mostrarHoje && (
              <line
                x1={x(hoje)}
                x2={x(hoje)}
                y1={0}
                y2={alturaDoCorpo}
                stroke="var(--destaque)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              >
                <title>Hoje</title>
              </line>
            )}

            {/* Setas de dependência: saem do fim da predecessora e entram no início da sucessora */}
            {linhas.flatMap((linha) =>
              linha.dependencias.map((idPredecessora) => {
                const origem = barras.get(idPredecessora);
                const destino = barras.get(linha.id);
                if (!origem || !destino) return null;
                const cor = linha.critico ? 'var(--perigo)' : 'var(--texto-sutil)';
                return (
                  <g key={`${idPredecessora}-${linha.id}`} opacity={linha.critico ? 0.9 : 0.55}>
                    <path
                      d={caminhoDaSeta(origem, destino, alturaDaLinha)}
                      fill="none"
                      stroke={cor}
                      strokeWidth={1.25}
                    />
                    <polygon
                      points={`${destino.x1},${destino.y} ${destino.x1 - 5},${destino.y - 3.5} ${destino.x1 - 5},${destino.y + 3.5}`}
                      fill={cor}
                    />
                  </g>
                );
              }),
            )}

            {linhas.map((linha, indice) => {
              const barra = barras.get(linha.id);
              if (!barra) return null;
              const largura2 = Math.max(barra.x2 - barra.x1, 2);
              const y = indice * alturaDaLinha;
              const descricao = `${linha.titulo}: ${formatarData(linha.dataInicio!)} a ${formatarData(linha.dataFim!)} · ${formatarDias(linha.duracaoEmDias)} · ${linha.percentualConcluido}%${linha.critico ? ' · caminho crítico' : ''}`;

              if (linha.tipo === 'fase') {
                return (
                  <g key={linha.id}>
                    <title>{descricao}</title>
                    <rect
                      x={barra.x1}
                      y={y + (alturaDaLinha - ALTURA_DA_FASE) / 2}
                      width={largura2}
                      height={ALTURA_DA_FASE}
                      rx={2}
                      fill="var(--texto-secundario)"
                      opacity={0.55}
                    />
                  </g>
                );
              }

              const cor = linha.critico ? 'var(--perigo)' : 'var(--primaria)';
              return (
                <g key={linha.id}>
                  <title>{descricao}</title>
                  <rect
                    x={barra.x1}
                    y={y + (alturaDaLinha - ALTURA_DA_BARRA) / 2}
                    width={largura2}
                    height={ALTURA_DA_BARRA}
                    rx={3}
                    fill={cor}
                    opacity={0.22}
                  />
                  <rect
                    x={barra.x1}
                    y={y + (alturaDaLinha - ALTURA_DA_BARRA) / 2}
                    width={(largura2 * linha.percentualConcluido) / 100}
                    height={ALTURA_DA_BARRA}
                    rx={3}
                    fill={cor}
                  />
                </g>
              );
            })}

            {/* Linha mestra: liga, de cima para baixo, a data em que cada tarefa foi de fato concluída */}
            {pontosDaLinhaMestra.length > 0 && (
              <g>
                {pontosDaLinhaMestra.length > 1 && (
                  <polyline
                    points={pontosDaLinhaMestra.map((ponto) => `${ponto.x},${ponto.y}`).join(' ')}
                    fill="none"
                    stroke="var(--sucesso)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {pontosDaLinhaMestra.map((ponto) => (
                  <circle key={ponto.id} cx={ponto.x} cy={ponto.y} r={3.5} fill="var(--sucesso)">
                    <title>{ponto.descricao}</title>
                  </circle>
                ))}
              </g>
            )}
          </svg>
        </>
      )}
    </div>
  );
}

function CabecalhoDoTempo({
  inicio,
  fim,
  largura,
  altura,
  pixelsPorDia,
  deslocamento,
}: {
  inicio: string;
  fim: string;
  largura: number;
  altura: number;
  pixelsPorDia: number;
  deslocamento: number;
}) {
  const meses = listarMeses(inicio, fim);
  const x = (data: string) => diasEntreDatas(inicio, data) * pixelsPorDia - deslocamento;
  const visivel = (data: string) => x(data) > -pixelsPorDia * 7 && x(data) < largura;
  // Quanto mais zoom, mais fina a régua: dias, depois semanas, depois só os meses.
  const mostrarDias = pixelsPorDia >= PIXELS_POR_DIA_PARA_MOSTRAR_DIAS;
  const dias = mostrarDias ? listarDias(inicio, fim).filter(visivel) : [];
  const semanas = !mostrarDias && pixelsPorDia * 7 >= 26 ? listarSemanas(inicio, fim).filter(visivel) : [];

  return (
    <svg width={largura} height={altura} aria-hidden className="block">
      {meses.map((mes) => {
        const inicioDoMes = Math.max(x(mes.inicio), 0);
        const fimDoMes = Math.min(x(mes.fimExclusivo), largura);
        if (fimDoMes <= 0 || inicioDoMes >= largura) return null;
        return (
          <g key={mes.inicio}>
            {x(mes.inicio) >= 0 && (
              <line
                x1={inicioDoMes}
                x2={inicioDoMes}
                y1={0}
                y2={altura}
                stroke="var(--borda)"
                strokeWidth={1}
              />
            )}
            {fimDoMes - inicioDoMes > 34 && (
              <text
                x={(inicioDoMes + fimDoMes) / 2}
                y={20}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="var(--texto-secundario)"
              >
                {mes.rotulo}
              </text>
            )}
          </g>
        );
      })}

      {semanas.map((semana) => (
        <text
          key={semana}
          x={x(semana) + pixelsPorDia * 3.5}
          y={altura - 12}
          textAnchor="middle"
          fontSize={10}
          fill="var(--texto-sutil)"
          className="tabular-nums"
        >
          {semana.slice(8, 10)}
        </text>
      ))}

      {dias.map((dia) => {
        const fimDeSemana = [0, 6].includes(new Date(`${dia}T00:00:00Z`).getUTCDay());
        return (
          <text
            key={dia}
            x={x(dia) + pixelsPorDia / 2}
            y={altura - 12}
            textAnchor="middle"
            fontSize={10}
            fill={fimDeSemana ? 'var(--texto-sutil)' : 'var(--texto-secundario)'}
            opacity={fimDeSemana ? 0.6 : 1}
            className="tabular-nums"
          >
            {dia.slice(8, 10)}
          </text>
        );
      })}
    </svg>
  );
}

function listarDias(inicio: string, fim: string): string[] {
  const total = diasEntreDatas(inicio, fim);
  return Array.from({ length: total + 1 }, (_, indice) => somarDias(inicio, indice));
}

/** Cotovelo em "S" quando a sucessora começa antes do fim da predecessora. */
function caminhoDaSeta(
  origem: { x2: number; y: number },
  destino: { x1: number; y: number },
  alturaDaLinha: number,
): string {
  const recuo = 7;
  const entrada = destino.x1 - 5;
  if (entrada > origem.x2 + recuo) {
    return `M ${origem.x2} ${origem.y} H ${origem.x2 + recuo} V ${destino.y} H ${entrada}`;
  }
  const desvio = destino.y > origem.y ? alturaDaLinha / 2 : -alturaDaLinha / 2;
  const meio = origem.y + desvio;
  return `M ${origem.x2} ${origem.y} H ${origem.x2 + recuo} V ${meio} H ${destino.x1 - recuo - 5} V ${destino.y} H ${entrada}`;
}

interface Mes {
  inicio: string;
  fimExclusivo: string;
  rotulo: string;
}

function listarMeses(inicio: string, fim: string): Mes[] {
  const meses: Mes[] = [];
  const atual = new Date(`${inicio}T00:00:00Z`);
  atual.setUTCDate(1);
  const limite = new Date(`${fim}T00:00:00Z`);

  while (atual <= limite) {
    const proximo = new Date(atual);
    proximo.setUTCMonth(proximo.getUTCMonth() + 1);
    meses.push({
      inicio: atual.toISOString().slice(0, 10),
      fimExclusivo: proximo.toISOString().slice(0, 10),
      rotulo: `${MESES[atual.getUTCMonth()]}/${String(atual.getUTCFullYear()).slice(2)}`,
    });
    atual.setUTCMonth(atual.getUTCMonth() + 1);
  }
  return meses;
}

/** Segundas-feiras dentro da janela. */
function listarSemanas(inicio: string, fim: string): string[] {
  const semanas: string[] = [];
  const atual = new Date(`${inicio}T00:00:00Z`);
  atual.setUTCDate(atual.getUTCDate() + ((8 - atual.getUTCDay()) % 7));
  const limite = new Date(`${fim}T00:00:00Z`);

  while (atual <= limite) {
    semanas.push(atual.toISOString().slice(0, 10));
    atual.setUTCDate(atual.getUTCDate() + 7);
  }
  return semanas;
}
