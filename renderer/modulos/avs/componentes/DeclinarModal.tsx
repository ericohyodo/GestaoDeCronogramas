'use client';

import { type FormEvent, useState } from 'react';
import type { EtapaDeDeclinioDTO } from '@contratos/avs.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { ROTULO_ETAPA_DECLINIO } from '../rotulos';
import { useAvsStore } from '../store/use-avs-store';

export function DeclinarModal({
  avId,
  aberto,
  aoFechar,
}: {
  avId: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Declinar AV"
      descricao="Encerra a AV como recusada. Só quem responde pela área Comercial (ou administrador) pode fazer isso."
      largura="sm"
    >
      <Conteudo avId={avId} aoFechar={aoFechar} />
    </Modal>
  );
}

function Conteudo({ avId, aoFechar }: { avId: string; aoFechar: () => void }) {
  const declinar = useAvsStore((estado) => estado.declinar);
  const [etapa, setEtapa] = useState<EtapaDeDeclinioDTO>('declinada_cliente');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await declinar({ avId, etapa, motivo });
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Selecao
        rotulo="Motivo"
        value={etapa}
        onChange={(e) => setEtapa(e.target.value as EtapaDeDeclinioDTO)}
        opcoes={Object.entries(ROTULO_ETAPA_DECLINIO).map(([valor, rotulo]) => ({ valor, rotulo }))}
      />
      <AreaTexto
        rotulo="Justificativa"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Por que essa AV está sendo encerrada?"
        required
      />
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="perigo" disabled={salvando}>
          {salvando ? 'Declinando…' : 'Declinar AV'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
