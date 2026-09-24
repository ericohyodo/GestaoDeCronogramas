'use client';

import { type FormEvent, useState } from 'react';
import type { LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoData } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { useEstruturaStore } from '../store/use-estrutura-store';

interface PropsFormularioDatasDaFase {
  /** `null` mantém o modal fechado. */
  fase: LinhaEstruturaDTO | null;
  quantidadeDeTarefas: number;
  aoFechar: () => void;
}

/** Dá a todas as tarefas da fase o mesmo início e término; o ajuste fino é feito depois, tarefa a tarefa. */
export function FormularioDatasDaFase(props: PropsFormularioDatasDaFase) {
  return (
    <Modal
      aberto={props.fase !== null}
      aoFechar={props.aoFechar}
      titulo="Ajustar as datas da fase"
      descricao="Todas as tarefas da fase passam a começar e a terminar nas datas abaixo. Depois, ajuste cada tarefa à mão."
    >
      {props.fase && <ConteudoFormulario {...props} fase={props.fase} />}
    </Modal>
  );
}

function ConteudoFormulario({
  fase,
  quantidadeDeTarefas,
  aoFechar,
}: PropsFormularioDatasDaFase & { fase: LinhaEstruturaDTO }) {
  const ajustarDatasDaFase = useEstruturaStore((estado) => estado.ajustarDatasDaFase);
  const [inicio, setInicio] = useState(fase.dataInicio ?? '');
  const [fim, setFim] = useState(fase.dataFim ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await ajustarDatasDaFase({ faseId: fase.id, dataInicio: inicio, dataFim: fim });
      aoFechar();
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm">
        Fase: <strong>{fase.titulo}</strong>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <CampoData rotulo="Início da fase" value={inicio} onChange={(evento) => setInicio(evento.target.value)} required />
        <CampoData
          rotulo="Término da fase"
          value={fim}
          min={inicio || undefined}
          onChange={(evento) => setFim(evento.target.value)}
          required
        />
      </div>
      <p className="text-xs text-texto-sutil">
        {quantidadeDeTarefas === 0
          ? 'A fase não tem tarefas.'
          : `As datas atuais de início e término das ${quantidadeDeTarefas} tarefas serão substituídas. Percentual, responsável, dependências e data efetiva não mudam.`}
      </p>
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando || quantidadeDeTarefas === 0}>
          {salvando ? 'Aplicando…' : 'Aplicar às tarefas'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
