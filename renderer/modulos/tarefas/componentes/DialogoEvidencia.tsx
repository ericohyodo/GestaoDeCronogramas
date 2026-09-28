'use client';

import { type FormEvent, useState } from 'react';
import type { LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto } from '@/compartilhado/ui/Campos';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';

interface PropsDialogoEvidencia {
  /** Tarefa cuja evidência está aberta; `null` fecha o modal. */
  tarefa: LinhaEstruturaDTO | null;
  editavel: boolean;
  aoSalvar: (tarefaId: string, evidencia: string | null) => void;
  aoFechar: () => void;
}

export function DialogoEvidencia({ tarefa, editavel, aoSalvar, aoFechar }: PropsDialogoEvidencia) {
  return (
    <Modal aberto={tarefa !== null} aoFechar={aoFechar} titulo="Evidência" descricao={tarefa?.titulo}>
      {tarefa && (
        <Conteudo tarefa={tarefa} editavel={editavel} aoSalvar={aoSalvar} aoFechar={aoFechar} />
      )}
    </Modal>
  );
}

function Conteudo({
  tarefa,
  editavel,
  aoSalvar,
  aoFechar,
}: Omit<PropsDialogoEvidencia, 'tarefa'> & { tarefa: LinhaEstruturaDTO }) {
  const [texto, setTexto] = useState(tarefa.evidencia ?? '');

  const salvar = (evento?: FormEvent) => {
    evento?.preventDefault();
    if (texto.trim() !== (tarefa.evidencia ?? '')) aoSalvar(tarefa.id, texto.trim() || null);
    aoFechar();
  };

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <AreaTexto
        rotulo="O que comprova a entrega desta tarefa"
        dica={editavel ? 'Ctrl+Enter salva. Deixe em branco para remover.' : undefined}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' && evento.ctrlKey) salvar();
        }}
        readOnly={!editavel}
        rows={6}
        maxLength={4000}
        placeholder="Ex.: PPAP aprovado pelo cliente em 12/10 (e-mail do comprador), relatório na pasta do projeto."
      />
      <RodapeModal>
        {editavel ? (
          <>
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario">
              Salvar evidência
            </Botao>
          </>
        ) : (
          <Botao onClick={aoFechar}>Fechar</Botao>
        )}
      </RodapeModal>
    </form>
  );
}
