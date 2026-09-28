'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AnaliseArquivadaDTO } from '@contratos/ia.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { Modal } from '@/compartilhado/ui/Modal';
import { useIaStore } from '../store/use-ia-store';
import { Analisando, dataEHora, FalhaNaAnalise, IaNaoConfigurada, MolduraDoRelatorio } from './comum';
import { RelatorioDaAnalise } from './RelatorioDaAnalise';

type Situacao =
  | { tipo: 'fechado' }
  | { tipo: 'abrindo' }
  | { tipo: 'nao_configurada' }
  | { tipo: 'analisando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; arquivada: AnaliseArquivadaDTO; recemGerada: boolean };

interface PropsModalDeAnalise {
  /** `null`: análise do portfólio. */
  cronogramaId: string | null;
  rotuloDoBotao: string;
  titulo: string;
  /** O que vai para o provedor, mostrado enquanto a IA trabalha. */
  oQueVai: string;
}

/**
 * Botão + modal. Abre a última análise salva (sem chamar a IA); "Gerar nova análise" pede outra,
 * que também fica no arquivo. A IA só lê: nada nos cronogramas é alterado.
 */
export function ModalDeAnalise({ cronogramaId, rotuloDoBotao, titulo, oQueVai }: PropsModalDeAnalise) {
  const estado = useIaStore((store) => store.estado);
  const carregar = useIaStore((store) => store.carregar);
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'fechado' });

  useEffect(() => {
    void carregar().catch(() => undefined);
  }, [carregar]);

  const analisar = async () => {
    // Sem configuração conhecida, só explica o que fazer; na dúvida, o main decide.
    if (estado && !estado.configurada) {
      setSituacao({ tipo: 'nao_configurada' });
      return;
    }
    setSituacao({ tipo: 'analisando' });
    try {
      const nova =
        cronogramaId === null
          ? await clienteDesktop.ia.analisarPortfolio()
          : await clienteDesktop.ia.analisar(cronogramaId);
      const arquivada = await clienteDesktop.ia.obterAnalise(nova.id);
      setSituacao({ tipo: 'pronto', arquivada, recemGerada: true });
    } catch (falha) {
      setSituacao({ tipo: 'erro', mensagem: mensagemDeErro(falha) });
    }
  };

  const abrir = async () => {
    setSituacao({ tipo: 'abrindo' });
    try {
      const ultima = await clienteDesktop.ia.ultimaAnalise({ cronogramaId });
      if (ultima) setSituacao({ tipo: 'pronto', arquivada: ultima, recemGerada: false });
      else await analisar();
    } catch (falha) {
      setSituacao({ tipo: 'erro', mensagem: mensagemDeErro(falha) });
    }
  };
  const fechar = () => setSituacao({ tipo: 'fechado' });
  const ocupado = situacao.tipo === 'abrindo' || situacao.tipo === 'analisando';

  return (
    <>
      <Botao icone={Sparkles} onClick={() => void abrir()} disabled={ocupado}>
        {rotuloDoBotao}
      </Botao>

      <Modal aberto={situacao.tipo !== 'fechado'} aoFechar={fechar} titulo={titulo} largura="lg">
        {situacao.tipo === 'abrindo' ? (
          <div className="flex justify-center py-12">
            <Loader2 aria-label="Abrindo a última análise" className="size-6 animate-spin text-primaria" />
          </div>
        ) : situacao.tipo === 'nao_configurada' ? (
          <IaNaoConfigurada />
        ) : situacao.tipo === 'analisando' ? (
          <Analisando provedor={estado?.provedor} oQueVai={oQueVai} />
        ) : situacao.tipo === 'erro' ? (
          <FalhaNaAnalise mensagem={situacao.mensagem} aoTentarDeNovo={() => void analisar()} aoFechar={fechar} />
        ) : situacao.tipo === 'pronto' ? (
          <MolduraDoRelatorio
            analiseId={situacao.arquivada.id}
            aviso={
              situacao.recemGerada
                ? null
                : `Última análise salva, de ${dataEHora(situacao.arquivada.geradaEm)}. Se o cronograma mudou desde então, gere uma nova.`
            }
            aoGerarDeNovo={() => void analisar()}
            aoFechar={fechar}
          >
            <RelatorioDaAnalise arquivada={situacao.arquivada} />
          </MolduraDoRelatorio>
        ) : null}
      </Modal>
    </>
  );
}
