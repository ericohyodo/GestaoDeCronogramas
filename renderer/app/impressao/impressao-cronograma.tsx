'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import type { EstruturaCronogramaDTO } from '@contratos/tarefas.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { hojeIso } from '@/compartilhado/formatacao';
import { ROTULO_SITUACAO } from '@/modulos/cronogramas/rotulos';
import {
  ajustarFolhasAPagina,
  RelatorioImpresso,
} from '@/modulos/impressao/componentes/RelatorioImpresso';

interface Dados {
  cronograma: CronogramaDTO;
  estrutura: EstruturaCronogramaDTO;
}

/**
 * Compõe Cronogramas e Tarefas para o PDF. O processo principal espera `data-impressao` no <html>
 * virar "pronta" (dados na tela e fontes carregadas) ou "erro" antes de imprimir.
 */
export function ImpressaoCronograma() {
  const id = useSearchParams().get('id');
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    if (!id) {
      sinalizar('erro', 'Nenhum cronograma foi informado.');
      return;
    }
    Promise.all([clienteDesktop.cronogramas.obter(id), clienteDesktop.tarefas.obterEstrutura(id)])
      .then(([cronograma, estrutura]) => setDados({ cronograma, estrutura }))
      .catch((falha: unknown) => sinalizar('erro', mensagemDeErro(falha)));
  }, [id]);

  useEffect(() => {
    if (!dados) return;
    void document.fonts.ready.then(() => {
      ajustarFolhasAPagina(document);
      sinalizar('pronta');
    });
  }, [dados]);

  if (!dados) return null;
  return (
    <RelatorioImpresso
      cronograma={dados.cronograma}
      estrutura={dados.estrutura}
      rotuloDaSituacao={ROTULO_SITUACAO[dados.cronograma.situacao]}
      hoje={hojeIso()}
      emitidoEm={new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
    />
  );
}

function sinalizar(estado: 'pronta' | 'erro', motivo?: string) {
  const raiz = document.documentElement;
  if (motivo) raiz.dataset.impressaoErro = motivo;
  raiz.dataset.impressao = estado;
}
