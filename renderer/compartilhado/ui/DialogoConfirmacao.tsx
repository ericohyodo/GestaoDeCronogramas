'use client';

import { useState } from 'react';
import { mensagemDeErro } from '../api/cliente-desktop';
import { Botao } from './Botao';
import { MensagemErro } from './MensagemErro';
import { Modal, RodapeModal } from './Modal';

interface PropsDialogoConfirmacao {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  aoConfirmar: () => Promise<void>;
  aoFechar: () => void;
}

export function DialogoConfirmacao({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = 'Excluir',
  aoConfirmar,
  aoFechar,
}: PropsDialogoConfirmacao) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fechar = () => {
    setErro(null);
    aoFechar();
  };

  const confirmar = async () => {
    setProcessando(true);
    setErro(null);
    try {
      await aoConfirmar();
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Modal aberto={aberto} titulo={titulo} aoFechar={fechar} largura="sm">
      <p className="text-sm text-texto-secundario">{mensagem}</p>
      {erro && <MensagemErro mensagem={erro} className="mt-4" />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={fechar} disabled={processando}>
          Cancelar
        </Botao>
        <Botao variante="perigo" onClick={confirmar} disabled={processando}>
          {processando ? 'Excluindo…' : rotuloConfirmar}
        </Botao>
      </RodapeModal>
    </Modal>
  );
}
