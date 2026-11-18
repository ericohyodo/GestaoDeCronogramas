'use client';

import { ModalDeAnalise } from './ModalDeAnalise';

/** Visão geral de todas as AVs: abre a última análise salva ou gera uma. Só lê. */
export function AnaliseAvsComIa() {
  return (
    <ModalDeAnalise
      cronogramaId={null}
      escopo="avs"
      rotuloDoBotao="Analisar AVs com IA"
      titulo="Análise das AVs com IA"
      oQueVai="O resumo das AVs (etapa, prazo, responsável, classificação e valores consolidados)"
    />
  );
}
