'use client';

import { ModalDeAnalise } from './ModalDeAnalise';

/** Botão "Analisar com IA" do cronograma: abre a última análise salva ou gera uma. */
export function AnaliseComIa({ cronogramaId }: { cronogramaId: string }) {
  return (
    <ModalDeAnalise
      cronogramaId={cronogramaId}
      rotuloDoBotao="Analisar com IA"
      titulo="Análise do cronograma com IA"
      oQueVai="As atividades, datas e responsáveis"
    />
  );
}
