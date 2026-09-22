'use client';

import { type FormEvent, useState } from 'react';
import type { ResponsavelDTO } from '@contratos/responsaveis.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { useResponsaveisStore } from '../store/use-responsaveis-store';

interface PropsFormularioResponsavel {
  aberto: boolean;
  /** Ausente: cadastro. Presente: edição. */
  responsavel?: ResponsavelDTO;
  aoFechar: () => void;
}

export function FormularioResponsavel(props: PropsFormularioResponsavel) {
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo={props.responsavel ? 'Editar responsável' : 'Novo responsável'}
      largura="sm"
    >
      <ConteudoFormulario {...props} />
    </Modal>
  );
}

function ConteudoFormulario({ responsavel, aoFechar }: PropsFormularioResponsavel) {
  const criar = useResponsaveisStore((estado) => estado.criar);
  const atualizar = useResponsaveisStore((estado) => estado.atualizar);

  const [nome, setNome] = useState(responsavel?.nome ?? '');
  const [funcao, setFuncao] = useState(responsavel?.funcao ?? '');
  const [email, setEmail] = useState(responsavel?.email ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const dados = { nome, funcao: funcao || null, email: email || null };
      if (responsavel) await atualizar({ id: responsavel.id, ...dados });
      else await criar(dados);
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
        placeholder="Ex.: Ana Souza"
        maxLength={120}
        required
      />
      <CampoTexto
        rotulo="Função"
        value={funcao}
        onChange={(e) => setFuncao(e.target.value)}
        placeholder="Ex.: Engenharia de processos (opcional)"
        maxLength={80}
      />
      <CampoTexto
        rotulo="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="opcional"
      />
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Salvando…' : responsavel ? 'Salvar alterações' : 'Cadastrar'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
