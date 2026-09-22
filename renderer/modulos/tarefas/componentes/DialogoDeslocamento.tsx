'use client';

import { useState } from 'react';
import type { ImpactoDeAtrasoDTO } from '@contratos/tarefas.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarDias } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';

interface PropsDialogoDeslocamento {
  impacto: ImpactoDeAtrasoDTO | null;
  aoConfirmar: (dias: number) => Promise<void>;
  aoFechar: () => void;
}

/**
 * Atraso não é automático: nem sempre ele se propaga, porque pode ser compensado
 * em outras tarefas. Aqui a pessoa decide se empurra a cadeia inteira.
 */
export function DialogoDeslocamento({ impacto, aoConfirmar, aoFechar }: PropsDialogoDeslocamento) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
    if (!impacto) return;
    setProcessando(true);
    setErro(null);
    try {
      await aoConfirmar(impacto.diasDeAtraso);
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setProcessando(false);
    }
  };

  const quantidade = impacto?.sucessoras.length ?? 0;

  return (
    <Modal
      aberto={impacto !== null}
      titulo="Deslocar as tarefas seguintes?"
      aoFechar={aoFechar}
      largura="sm"
    >
      <p className="text-sm text-texto-secundario">
        O término mudou em <strong className="text-texto">{formatarDias(impacto?.diasDeAtraso ?? 0)}</strong>.
        Deseja empurrar as {quantidade} tarefa{quantidade === 1 ? '' : 's'} seguinte
        {quantidade === 1 ? '' : 's'} pelo mesmo período?
      </p>

      <ul className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-borda/70 p-2 text-sm">
        {impacto?.sucessoras.map((sucessora) => (
          <li key={sucessora.id} className="truncate px-1 py-0.5 text-texto-secundario">
            {sucessora.titulo}
          </li>
        ))}
      </ul>

      {erro && <MensagemErro mensagem={erro} className="mt-4" />}

      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={processando}>
          Manter as datas
        </Botao>
        <Botao variante="primario" onClick={confirmar} disabled={processando}>
          {processando ? 'Deslocando…' : 'Deslocar'}
        </Botao>
      </RodapeModal>
    </Modal>
  );
}
