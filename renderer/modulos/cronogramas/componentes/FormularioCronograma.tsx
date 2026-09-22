'use client';

import { type FormEvent, useState } from 'react';
import type { CronogramaDTO, SituacaoCronogramaDTO } from '@contratos/cronogramas.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { hojeIso, somarDias } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto, CampoData, CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { OPCOES_SITUACAO } from '../rotulos';
import { useCronogramasStore } from '../store/use-cronogramas-store';

interface PropsFormularioCronograma {
  aberto: boolean;
  /** Ausente: criação. Presente: edição. */
  cronograma?: CronogramaDTO;
  aoFechar: () => void;
}

export function FormularioCronograma(props: PropsFormularioCronograma) {
  const edicao = Boolean(props.cronograma);
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo={edicao ? 'Editar cronograma' : 'Novo cronograma'}
      descricao={edicao ? undefined : 'Defina o nome e o período previsto. As tarefas vêm depois.'}
    >
      <ConteudoFormulario {...props} />
    </Modal>
  );
}

function ConteudoFormulario({ cronograma, aoFechar }: PropsFormularioCronograma) {
  const criar = useCronogramasStore((estado) => estado.criar);
  const atualizar = useCronogramasStore((estado) => estado.atualizar);

  const hoje = hojeIso();
  const [nome, setNome] = useState(cronograma?.nome ?? '');
  const [descricao, setDescricao] = useState(cronograma?.descricao ?? '');
  const [dataInicio, setDataInicio] = useState(cronograma?.dataInicio ?? hoje);
  const [dataFim, setDataFim] = useState(cronograma?.dataFim ?? somarDias(hoje, 30));
  const [situacao, setSituacao] = useState<SituacaoCronogramaDTO>(cronograma?.situacao ?? 'planejado');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const dados = { nome, descricao: descricao || null, dataInicio, dataFim };
      await (cronograma
        ? atualizar({ id: cronograma.id, ...dados, situacao })
        : criar(dados));
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
        rotulo="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex.: Implantação do ERP — Fase 1"
        maxLength={120}
        required
      />
      <AreaTexto
        rotulo="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Objetivo, escopo ou observações (opcional)"
        maxLength={2000}
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoData
          rotulo="Início"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          required
        />
        <CampoData
          rotulo="Término previsto"
          value={dataFim}
          min={dataInicio}
          onChange={(e) => setDataFim(e.target.value)}
          required
        />
      </div>
      {cronograma && (
        <Selecao
          rotulo="Situação"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as SituacaoCronogramaDTO)}
          opcoes={OPCOES_SITUACAO}
        />
      )}
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Salvando…' : cronograma ? 'Salvar alterações' : 'Criar cronograma'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
