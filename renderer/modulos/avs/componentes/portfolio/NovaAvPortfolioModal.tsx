'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { AREAS_AV, type AreaAvDTO } from '@contratos/avs.contrato';
import type { ItemPortfolioResumoDTO } from '@contratos/portfolio.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao, classeBotao } from '@/compartilhado/ui/Botao';
import { CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { ROTULO_AREA } from '../../rotulos';
import { useAvsStore } from '../../store/use-avs-store';

/** Abertura da AV de Item de Portfólio: escolhe o item (template), o cliente da cotação e a equipe. */
export function NovaAvPortfolioModal({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Nova AV de Portfólio"
      descricao="Checagem rápida de um item já desenvolvido: escolha o item do portfólio e quem responde por cada área."
      largura="lg"
    >
      <Conteudo aoFechar={aoFechar} />
    </Modal>
  );
}

function Conteudo({ aoFechar }: { aoFechar: () => void }) {
  const router = useRouter();
  const criar = useAvsStore((estado) => estado.criar);
  const membros = useAvsStore((estado) => estado.membros);
  const carregarMembros = useAvsStore((estado) => estado.carregarMembros);

  const [itens, setItens] = useState<ItemPortfolioResumoDTO[] | null>(null);
  const [busca, setBusca] = useState('');
  const [itemId, setItemId] = useState('');
  const [cliente, setCliente] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [prazoCliente, setPrazoCliente] = useState('');
  const [equipe, setEquipe] = useState<Partial<Record<AreaAvDTO, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void carregarMembros();
    clienteDesktop.portfolio
      .listarItens({ apenasAtivos: true })
      .then(setItens)
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [carregarMembros]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (itens ?? []).filter(
      (item) => !termo || [item.codigo, item.descricao, item.cliente].some((campo) => campo?.toLowerCase().includes(termo)),
    );
  }, [itens, busca]);
  const escolhido = itens?.find((item) => item.id === itemId) ?? null;

  const opcoesMembros = [
    { valor: '', rotulo: '— ninguém designado ainda —' },
    ...membros.map((membro) => ({ valor: membro.id, rotulo: membro.nome })),
  ];

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!escolhido) return;
    setSalvando(true);
    setErro(null);
    try {
      const nova = await criar({
        tipo: 'portfolio',
        itemPortfolioId: escolhido.id,
        descricao: escolhido.descricao,
        cliente: cliente.trim() || null,
        solicitante: solicitante || null,
        prazoCliente: prazoCliente || null,
        membros: equipe,
      });
      aoFechar();
      router.push(`/portfolio/detalhe/?id=${nova.id}`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  if (itens !== null && itens.length === 0) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p>Nenhum item de portfólio ativo. Cadastre o item antes de abrir a AV.</p>
        <RodapeModal>
          <Botao onClick={aoFechar}>Fechar</Botao>
          <Link href="/portfolio/itens/" className={classeBotao('primario')} onClick={aoFechar}>
            Ir para Itens de portfólio
          </Link>
        </RodapeModal>
      </div>
    );
  }

  return (
    <form onSubmit={(evento) => void enviar(evento)} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <CampoTexto rotulo="Buscar item" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Código, descrição…" />
        <Selecao
          rotulo="Item de portfólio"
          required
          value={itemId}
          onChange={(e) => {
            setItemId(e.target.value);
            const item = itens?.find((i) => i.id === e.target.value);
            if (item && !cliente) setCliente(item.cliente ?? '');
          }}
          opcoes={[
            { valor: '', rotulo: itens === null ? 'Carregando…' : '— escolha o item —' },
            ...filtrados.map((item) => ({ valor: item.id, rotulo: `${item.codigo} — ${item.descricao}` })),
          ]}
        />
      </div>
      {escolhido && (
        <p className="rounded-lg border border-borda/60 bg-superficie-solida/60 px-3 py-2 text-xs text-texto-secundario">
          A AV herda do item: código <span className="font-medium text-texto">{escolhido.codigo}</span>, descrição, linha,
          família e programa{escolhido.revisaoDesenho ? ` (desenho rev. ${escolhido.revisaoDesenho})` : ''}.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <CampoTexto rotulo="Cliente da cotação" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <CampoTexto rotulo="Solicitante" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
        <CampoTexto
          rotulo="Prazo para AV"
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
        <Botao type="submit" variante="primario" disabled={salvando || !escolhido}>
          {salvando ? 'Criando…' : 'Criar AV de Portfólio'}
        </Botao>
      </RodapeModal>
    </form>
  );
}
