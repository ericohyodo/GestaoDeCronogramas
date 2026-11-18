'use client';

import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import type { RoteiroDaApresentacaoDTO } from '@contratos/apresentacao.contrato';
import { Botao } from '@/compartilhado/ui/Botao';
import { montarRoteiro, type PassoDoRoteiro } from '../roteiro';

const CHAVE_PASSO = 'apresentacao:passo';
const LARGURA_CARTAO = 380;
const MARGEM = 12;
/** Altura aproximada do cartão (título, texto e botões), para decidir onde ele cabe. */
const ALTURA_ESTIMADA_CARTAO = 260;

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/** Procura o alvo do passo por alguns segundos (a tela pode estar carregando). */
async function encontrarAlvo(alvo: string): Promise<HTMLElement | null> {
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    const elemento = document.querySelector<HTMLElement>(`[data-tour="${alvo}"]`);
    if (elemento && elemento.getBoundingClientRect().height > 0) return elemento;
    await esperar(150);
  }
  return null;
}

/**
 * Digita o texto num campo controlado pelo React (usa o setter nativo e dispara o evento de input),
 * letra a letra, para a plateia ver o preenchimento.
 */
async function digitar(campo: HTMLInputElement | HTMLTextAreaElement, texto: string, cancelado: () => boolean) {
  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const definirValor = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set;
  if (!definirValor) return;
  campo.focus();
  definirValor.call(campo, '');
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  for (const letra of texto) {
    if (cancelado()) return;
    definirValor.call(campo, campo.value + letra);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await esperar(28);
  }
}

/** Rota atual com a query string, para comparar com a rota do passo. */
function rotaCompleta(caminho: string, busca: string): string {
  const base = caminho.endsWith('/') ? caminho : `${caminho}/`;
  return busca ? `${base}?${busca}` : base;
}

/**
 * Roteiro guiado do modo apresentação: destaca um elemento por vez (o resto da tela escurece) e explica
 * o que ele faz. Pode ser pausado para interagir livremente com a tela.
 */
export function TourDaApresentacao({ roteiro }: { roteiro: RoteiroDaApresentacaoDTO }) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams().toString();
  const passos = useMemo(() => montarRoteiro(roteiro), [roteiro]);
  const [indice, setIndice] = useState(() => {
    try {
      return Math.min(Number(window.sessionStorage.getItem(CHAVE_PASSO) ?? 0) || 0, passos.length - 1);
    } catch {
      return 0;
    }
  });
  const [pausado, setPausado] = useState(false);
  const [retangulo, setRetangulo] = useState<DOMRect | null>(null);
  const passo: PassoDoRoteiro | undefined = passos[indice];

  const irPara = useCallback(
    (novo: number) => {
      const limitado = Math.max(0, Math.min(passos.length - 1, novo));
      setIndice(limitado);
      setRetangulo(null);
      try {
        window.sessionStorage.setItem(CHAVE_PASSO, String(limitado));
      } catch {
        // sem sessionStorage: o roteiro só não lembra o passo ao recarregar
      }
    },
    [passos.length],
  );

  // Abre a tela do passo, encontra o alvo, rola até ele e (se houver) digita o texto de demonstração.
  useEffect(() => {
    if (!passo || pausado) return;
    let cancelado = false;
    if (passo.rota && rotaCompleta(caminho, busca) !== passo.rota) {
      router.push(passo.rota);
      return;
    }
    if (!passo.alvo) return;
    void (async () => {
      const elemento = await encontrarAlvo(passo.alvo!);
      if (cancelado || !elemento) return;
      elemento.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await esperar(350);
      if (cancelado) return;
      setRetangulo(elemento.getBoundingClientRect());
      if (passo.digitar) {
        const campo = elemento.querySelector<HTMLInputElement | HTMLTextAreaElement>(passo.digitar.seletor);
        if (campo && !campo.disabled) {
          await digitar(campo, passo.digitar.texto, () => cancelado);
          // Solta o campo: as setas voltam a avançar o roteiro.
          campo.blur();
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [passo, pausado, caminho, busca, router]);

  // Acompanha rolagem e redimensionamento para o destaque não se descolar do alvo.
  useEffect(() => {
    if (!passo?.alvo || pausado) return;
    const atualizar = () => {
      const elemento = document.querySelector<HTMLElement>(`[data-tour="${passo.alvo}"]`);
      if (elemento) setRetangulo(elemento.getBoundingClientRect());
    };
    window.addEventListener('scroll', atualizar, true);
    window.addEventListener('resize', atualizar);
    return () => {
      window.removeEventListener('scroll', atualizar, true);
      window.removeEventListener('resize', atualizar);
    };
  }, [passo, pausado]);

  // Atalhos: setas avançam/voltam, Esc pausa.
  useEffect(() => {
    if (pausado) return;
    const teclas = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return;
      if (evento.key === 'ArrowRight') irPara(indice + 1);
      if (evento.key === 'ArrowLeft') irPara(indice - 1);
      if (evento.key === 'Escape') setPausado(true);
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, [indice, irPara, pausado]);

  if (!passo) return null;

  if (pausado) {
    return (
      <button
        type="button"
        onClick={() => setPausado(false)}
        className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-primaria px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgb(15_27_45/0.3)] hover:bg-primaria-hover"
      >
        <Play aria-hidden className="size-4" />
        Retomar roteiro ({indice + 1}/{passos.length})
      </button>
    );
  }

  // Cartão abaixo do alvo, ou acima; se o alvo for alto demais para os dois, no canto inferior direito.
  // Sem alvo, no centro da tela.
  const estiloDoCartao: CSSProperties = (() => {
    if (!retangulo) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    const left = Math.min(Math.max(MARGEM, retangulo.left), window.innerWidth - LARGURA_CARTAO - MARGEM);
    const abaixo = retangulo.bottom + MARGEM;
    if (abaixo + ALTURA_ESTIMADA_CARTAO < window.innerHeight) return { left, top: abaixo };
    if (retangulo.top - MARGEM - ALTURA_ESTIMADA_CARTAO > 0) {
      return { left, bottom: window.innerHeight - retangulo.top + MARGEM };
    }
    return { right: MARGEM * 2, bottom: MARGEM * 2 };
  })();

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      {retangulo ? (
        <div
          aria-hidden
          className="absolute rounded-xl ring-2 ring-primaria transition-all duration-300"
          style={{
            left: retangulo.left - 6,
            top: retangulo.top - 6,
            width: retangulo.width + 12,
            height: retangulo.height + 12,
            boxShadow: '0 0 0 9999px rgb(10 20 35 / 0.55)',
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[rgb(10_20_35/0.55)]" />
      )}

      <div
        role="dialog"
        aria-label={passo.titulo}
        className="pointer-events-auto absolute flex flex-col gap-3 rounded-2xl border border-borda bg-superficie-solida p-5 shadow-[0_16px_48px_rgb(15_27_45/0.35)]"
        style={{ ...estiloDoCartao, width: LARGURA_CARTAO }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primaria tabular-nums">
              Apresentação · {indice + 1} de {passos.length}
            </p>
            <h2 className="mt-1 text-base font-semibold">{passo.titulo}</h2>
          </div>
          <button
            type="button"
            onClick={() => setPausado(true)}
            aria-label="Pausar o roteiro"
            title="Pausar (Esc): use a tela livremente"
            className="rounded-md p-1 text-texto-secundario hover:bg-texto/6 hover:text-texto"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-texto-secundario">{passo.texto}</p>
        <div className="h-1 overflow-hidden rounded-full bg-borda" aria-hidden>
          <div
            className="h-full rounded-full bg-primaria transition-[width] duration-300"
            style={{ width: `${((indice + 1) / passos.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Botao tamanho="sm" variante="fantasma" icone={Pause} onClick={() => setPausado(true)}>
            Pausar
          </Botao>
          <div className="flex gap-2">
            <Botao tamanho="sm" icone={ChevronLeft} onClick={() => irPara(indice - 1)} disabled={indice === 0}>
              Anterior
            </Botao>
            {indice < passos.length - 1 ? (
              <Botao tamanho="sm" variante="primario" icone={ChevronRight} onClick={() => irPara(indice + 1)}>
                Próximo
              </Botao>
            ) : (
              <Botao
                tamanho="sm"
                variante="primario"
                onClick={() => {
                  irPara(0);
                  setPausado(true);
                }}
              >
                Concluir
              </Botao>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
