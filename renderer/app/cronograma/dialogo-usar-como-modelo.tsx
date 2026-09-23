'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { CronogramaDTO } from '@contratos/cronogramas.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { hojeIso, somarDias } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoData, CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { useCronogramasStore } from '@/modulos/cronogramas/store/use-cronogramas-store';
import { useEstruturaStore } from '@/modulos/tarefas/store/use-estrutura-store';

interface PropsDialogo {
  aberto: boolean;
  modelo: CronogramaDTO;
  aoFechar: () => void;
}

/** Cria um cronograma novo com a estrutura de fases e tarefas de outro (módulos Cronogramas + Tarefas). */
export function DialogoUsarComoModelo(props: PropsDialogo) {
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo="Usar como modelo"
      descricao={`Cria um projeto novo com as fases, tarefas e dependências de "${props.modelo.nome}". Responsáveis e progresso não são copiados, e toda tarefa começa no início do novo projeto, com 1 dia, para você preencher as datas.`}
    >
      <Conteudo {...props} />
    </Modal>
  );
}

function Conteudo({ modelo, aoFechar }: PropsDialogo) {
  const router = useRouter();
  const criar = useCronogramasStore((estado) => estado.criar);
  const excluir = useCronogramasStore((estado) => estado.excluir);
  const copiarEstrutura = useEstruturaStore((estado) => estado.copiarEstrutura);

  // O término acompanha o início, mantendo a duração do modelo (e continua editável).
  const fimPara = (inicio: string) => somarDias(inicio, modelo.duracaoEmDias - 1);
  const hoje = hojeIso();
  const [nome, setNome] = useState('');
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(fimPara(hoje));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const novo = await criar({ nome, dataInicio, dataFim });
      try {
        await copiarEstrutura(modelo.id, novo.id);
      } catch (falha) {
        // Sem a estrutura, o projeto recém-criado não serve para nada: desfaz a criação.
        await excluir(novo.id).catch(() => undefined);
        throw falha;
      }
      aoFechar();
      router.push(`/cronograma/?id=${novo.id}`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        rotulo="Nome do novo projeto"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={`Ex.: ${modelo.nome} (novo cliente)`}
        maxLength={120}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoData
          rotulo="Início"
          value={dataInicio}
          onChange={(e) => {
            setDataInicio(e.target.value);
            if (e.target.value) setDataFim(fimPara(e.target.value));
          }}
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
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar projeto'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
