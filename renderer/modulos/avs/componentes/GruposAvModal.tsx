'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { QUANTIDADE_MAXIMA_DO_GRUPO, QUANTIDADE_MINIMA_DO_GRUPO } from '@contratos/avs.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { useAvsStore } from '../store/use-avs-store';

export function GruposAvModal({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo grupo de AVs"
      descricao="Cria várias AVs de uma vez, vinculadas entre si. Ao editar uma, dá para aplicar os dados às demais do grupo."
      largura="md"
    >
      <Conteudo aoFechar={aoFechar} />
    </Modal>
  );
}

/** Montado só com o modal aberto (o `Modal` só renderiza os filhos abertos), então o formulário
 * sempre começa em branco. */
function Conteudo({ aoFechar }: { aoFechar: () => void }) {
  const router = useRouter();
  const criarGrupo = useAvsStore((estado) => estado.criarGrupo);

  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('2');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setCriando(true);
    setErro(null);
    try {
      const grupo = await criarGrupo({ nome, quantidade: Number(quantidade) });
      const primeira = grupo.avs[0];
      aoFechar();
      if (primeira) router.push(`/avs/detalhe/?id=${primeira.id}`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setCriando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        rotulo="Descrição do grupo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex.: AVs Projeto Chaplin - Whirlpool"
        maxLength={80}
        required
        autoFocus
      />
      <CampoTexto
        rotulo="Quantidade de AVs (N)"
        type="number"
        min={QUANTIDADE_MINIMA_DO_GRUPO}
        max={QUANTIDADE_MAXIMA_DO_GRUPO}
        step={1}
        classeContainer="max-w-48"
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
        dica={`De ${QUANTIDADE_MINIMA_DO_GRUPO} a ${QUANTIDADE_MAXIMA_DO_GRUPO}. Você vai direto para a primeira AV.`}
        required
      />
      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao onClick={aoFechar} disabled={criando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={criando || !nome.trim()}>
          {criando ? 'Criando…' : 'Criar grupo e AVs'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
