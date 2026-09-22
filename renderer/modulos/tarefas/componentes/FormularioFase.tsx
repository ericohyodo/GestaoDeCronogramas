'use client';

import { type FormEvent, useState } from 'react';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { useEstruturaStore } from '../store/use-estrutura-store';

interface PropsFormularioFase {
  aberto: boolean;
  cronogramaId: string;
  aoFechar: () => void;
}

export function FormularioFase(props: PropsFormularioFase) {
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo="Nova fase"
      descricao="A fase entra na lista com as subtarefas em branco, para você preencher nome e responsável direto na tabela."
    >
      <ConteudoFormulario {...props} />
    </Modal>
  );
}

function ConteudoFormulario({ cronogramaId, aoFechar }: PropsFormularioFase) {
  const criarFase = useEstruturaStore((estado) => estado.criarFase);
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState(8);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await criarFase({ cronogramaId, nome, quantidadeDeSubtarefas: quantidade });
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        rotulo="Nome da fase"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        placeholder="Ex.: Fase 1 APQP"
        maxLength={120}
        required
      />
      <CampoTexto
        rotulo="Quantidade de subtarefas"
        type="number"
        min={0}
        max={50}
        value={quantidade}
        onChange={(evento) => setQuantidade(evento.target.valueAsNumber || 0)}
        dica="De 0 a 50. Elas nascem com o período inicial do cronograma."
        className="tabular-nums"
      />
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar fase'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
