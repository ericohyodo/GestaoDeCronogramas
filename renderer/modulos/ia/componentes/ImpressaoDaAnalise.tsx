'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AnaliseArquivadaDTO } from '@contratos/ia.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { AVISO_DA_IA } from './comum';
import { RelatorioDaAnalise } from './RelatorioDaAnalise';

/** Largura útil do A4 (8,27in) menos as margens laterais do PDF (0,4in cada), em px CSS. */
const LARGURA_UTIL_PX = (8.27 - 0.8) * 96;

/**
 * Página do PDF de uma análise. O processo principal espera `data-impressao` no <html> virar
 * "pronta" (dados na tela e fontes carregadas) ou "erro" antes de imprimir. As cores do tema
 * viram as do tema claro na impressão (globals.css), então o PDF sai em papel branco.
 */
export function ImpressaoDaAnalise() {
  const id = useSearchParams().get('id');
  const [arquivada, setArquivada] = useState<AnaliseArquivadaDTO | null>(null);

  useEffect(() => {
    if (!id) {
      sinalizar('erro', 'Nenhuma análise foi informada.');
      return;
    }
    clienteDesktop.ia
      .obterAnalise(id)
      .then(setArquivada)
      .catch((falha: unknown) => sinalizar('erro', mensagemDeErro(falha)));
  }, [id]);

  useEffect(() => {
    if (!arquivada) return;
    void document.fonts.ready.then(() => sinalizar('pronta'));
  }, [arquivada]);

  if (!arquivada) return null;
  return (
    <article data-analise-impressa className="bg-white text-texto" style={{ width: LARGURA_UTIL_PX }}>
      <header className="mb-4 border-b-2 border-primaria pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-texto-sutil">
          {arquivada.tipo === 'avs'
            ? 'Análise das AVs com IA'
            : arquivada.tipo === 'portfolio'
              ? 'Análise do portfólio com IA'
              : 'Análise do cronograma com IA'}
        </p>
        <h1 className="text-xl font-semibold">{arquivada.titulo}</h1>
      </header>
      <RelatorioDaAnalise arquivada={arquivada} />
      <p className="mt-6 border-t border-borda pt-2 text-[11px] text-texto-sutil">{AVISO_DA_IA}</p>
    </article>
  );
}

function sinalizar(estado: 'pronta' | 'erro', motivo?: string) {
  const raiz = document.documentElement;
  if (motivo) raiz.dataset.impressaoErro = motivo;
  raiz.dataset.impressao = estado;
}
