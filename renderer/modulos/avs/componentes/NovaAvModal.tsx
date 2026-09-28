'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { AREAS_AV, type AreaAvDTO } from '@contratos/avs.contrato';
import { mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { ROTULO_AREA } from '../rotulos';
import { useAvsStore } from '../store/use-avs-store';

export function NovaAvModal({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Nova AV" descricao="Abertura comercial de uma Análise de Viabilidade." largura="lg">
      <Conteudo aoFechar={aoFechar} />
    </Modal>
  );
}

function Conteudo({ aoFechar }: { aoFechar: () => void }) {
  const router = useRouter();
  const criar = useAvsStore((estado) => estado.criar);
  const membros = useAvsStore((estado) => estado.membros);
  const carregarMembros = useAvsStore((estado) => estado.carregarMembros);

  const [descricao, setDescricao] = useState('');
  const [cliente, setCliente] = useState('');
  const [codigo, setCodigo] = useState('');
  const [complexidade, setComplexidade] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [prazoCliente, setPrazoCliente] = useState('');
  const [equipe, setEquipe] = useState<Partial<Record<AreaAvDTO, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void carregarMembros();
  }, [carregarMembros]);

  const opcoesMembros = [
    { valor: '', rotulo: '— ninguém designado ainda —' },
    ...membros.map((membro) => ({ valor: membro.id, rotulo: membro.nome })),
  ];

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const nova = await criar({
        descricao,
        cliente: cliente || null,
        codigo: codigo || null,
        complexidade: complexidade || null,
        solicitante: solicitante || null,
        prazoCliente: prazoCliente || null,
        membros: equipe,
      });
      aoFechar();
      router.push(`/avs/detalhe/?id=${nova.id}`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        rotulo="Descrição do item/produto"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Ex.: Suporte de queimador para fogão modelo X"
        maxLength={200}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTexto rotulo="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <CampoTexto rotulo="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <CampoTexto
          rotulo="Complexidade"
          value={complexidade}
          onChange={(e) => setComplexidade(e.target.value)}
          placeholder="Ex.: Baixa, média, alta"
        />
        <CampoTexto
          rotulo="Solicitante"
          value={solicitante}
          onChange={(e) => setSolicitante(e.target.value)}
        />
        <CampoTexto
          rotulo="Prazo do cliente"
          type="date"
          classeContainer="col-span-2"
          value={prazoCliente}
          onChange={(e) => setPrazoCliente(e.target.value)}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-texto-secundario">Equipe responsável por área</p>
        <div className="grid grid-cols-2 gap-3">
          {AREAS_AV.map((area) => (
            <Selecao
              key={area}
              rotulo={ROTULO_AREA[area]}
              opcoes={opcoesMembros}
              value={equipe[area] ?? ''}
              onChange={(e) => setEquipe((atual) => ({ ...atual, [area]: e.target.value || undefined }))}
            />
          ))}
        </div>
      </div>

      {erro && <MensagemErro mensagem={erro} />}
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Criando…' : 'Criar AV'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
