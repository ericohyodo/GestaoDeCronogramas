'use client';

import { ModalDeAnalise } from './ModalDeAnalise';

/** Visão macro de todos os cronogramas em andamento (gestão de portfólio). Só lê. */
export function AnalisePortfolioComIa() {
  return (
    <ModalDeAnalise
      cronogramaId={null}
      rotuloDoBotao="Analisar portfólio com IA"
      titulo="Análise do portfólio com IA"
      oQueVai="Os indicadores de cada projeto em andamento e a carga dos responsáveis"
    />
  );
}
