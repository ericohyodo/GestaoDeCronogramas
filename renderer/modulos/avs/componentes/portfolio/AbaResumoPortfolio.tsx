'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AvDetalheDTO, CapacidadeConfigDTO, SecaoPcpDTO } from '@contratos/avs.contrato';
import { AREAS_DE_CHECAGEM, type AreaChecagemDTO, type PortfolioDaAvDTO } from '@contratos/portfolio.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarDataHora, formatarMoeda } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { capacidadeDaLinha, formatarNumero, TURNOS_MAXIMOS_POR_DIA } from '../../capacidade';
import { CUSTOS_VAZIOS, custoPorPeca, custosVigentes, RESULTADO_VISUAL } from '../../portfolio';
import { ROTULO_AREA } from '../../rotulos';
import { useAvsStore } from '../../store/use-avs-store';
import { TituloSecao } from '../SecaoAv';
import { CartaoDoItem } from './comum';

const PERGUNTA_DA_AREA: Record<AreaChecagemDTO, string> = {
  produto: 'Desenho confere com o item?',
  processo: 'Processo atual atende?',
  pcp: 'Temos capacidade?',
  custo: 'Custos de referência válidos?',
};

interface Dados {
  portfolio: PortfolioDaAvDTO;
  pcp: SecaoPcpDTO;
  capacidade: CapacidadeConfigDTO;
}

/**
 * Resumo da AV de portfólio para a cotação: item, conclusões das áreas, capacidade (turnos) e custo por
 * peça. Na Proposta Enviada, o Comercial conclui a AV (não há SD).
 */
export function AbaResumoPortfolio({ av }: { av: AvDetalheDTO }) {
  const carregarUm = useAvsStore((estado) => estado.carregarUm);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      clienteDesktop.portfolio.obterDaAv(av.id),
      clienteDesktop.avs.obterSecaoPcp(av.id),
      clienteDesktop.avs.obterCapacidadeConfig(),
    ])
      .then(([portfolio, pcp, capacidade]) => !cancelado && setDados({ portfolio, pcp, capacidade }))
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)));
    return () => {
      cancelado = true;
    };
  }, [av.id, av.etapaAtual.numero]);

  if (erro) return <MensagemErro mensagem={erro} />;
  if (!dados) return <PainelVidro className="p-5 text-sm text-texto-secundario">Carregando…</PainelVidro>;

  const { portfolio, pcp, capacidade } = dados;
  const item = portfolio.item;
  const referencia = portfolio.custos?.referencia ?? item ?? CUSTOS_VAZIOS;
  const vigentes = custosVigentes(referencia, portfolio.custos?.novos ?? CUSTOS_VAZIOS);
  const podeConcluir = av.etapaAtual.chave === 'proposta_enviada';

  const concluir = async () => {
    await clienteDesktop.portfolio.concluirAv({ avId: av.id });
    await carregarUm(av.id);
  };

  return (
    <div className="flex flex-col gap-5">
      <PainelVidro className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
        {item && <CartaoDoItem item={item} />}
        <div className="flex flex-col gap-2">
          <TituloSecao>Cotação</TituloSecao>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-texto-sutil">Cliente</dt>
            <dd>{av.cliente ?? '—'}</dd>
            <dt className="text-texto-sutil">Volume anual</dt>
            <dd className="tabular-nums">
              {av.volumeAnual ? `${formatarNumero(av.volumeAnual)} pç (${formatarNumero(av.volumeAnual / 12)} pç/mês)` : '—'}
            </dd>
            <dt className="text-texto-sutil">Prazo para AV</dt>
            <dd>{av.prazoCliente ? new Date(`${av.prazoCliente}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</dd>
          </dl>
        </div>
      </PainelVidro>

      <PainelVidro className="flex flex-col gap-3 p-5">
        <TituloSecao>Conclusões das áreas</TituloSecao>
        <ul className="flex flex-col divide-y divide-borda/60">
          {AREAS_DE_CHECAGEM.map((area) => {
            const checagem = portfolio.checagens.find((c) => c.area === area);
            return (
              <li key={area} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                <div className="w-56 shrink-0">
                  <p className="text-sm font-medium">{ROTULO_AREA[area]}</p>
                  <p className="text-xs text-texto-secundario">{PERGUNTA_DA_AREA[area]}</p>
                </div>
                <div className="min-w-0 flex-1">
                  {checagem ? (
                    <>
                      <Etiqueta tom={RESULTADO_VISUAL[checagem.resultado].tom}>{RESULTADO_VISUAL[checagem.resultado].rotulo}</Etiqueta>
                      {checagem.observacao && <p className="mt-1 whitespace-pre-wrap text-sm text-texto-secundario">{checagem.observacao}</p>}
                      <p className="mt-0.5 text-xs text-texto-sutil">
                        {checagem.atualizadoPor ?? '—'} · {formatarDataHora(checagem.atualizadoEm)}
                      </p>
                    </>
                  ) : (
                    <Etiqueta>Pendente</Etiqueta>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </PainelVidro>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PainelVidro className="flex flex-col gap-2 p-5">
          <TituloSecao>Capacidade (turnos por dia)</TituloSecao>
          {pcp.cargas.length === 0 ? (
            <p className="text-sm text-texto-secundario">O PCP ainda não lançou a carga de máquina.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {pcp.cargas.map((carga) => {
                const { turnosAtuais, turnosComItem } = capacidadeDaLinha(
                  { pecasHora: String(carga.pecasHora ?? ''), conversao: String(carga.conversao), cargaAtual: String(carga.cargaAtualPecas ?? '') },
                  av.volumeAnual,
                  capacidade,
                );
                const estoura = turnosComItem !== null && turnosComItem > TURNOS_MAXIMOS_POR_DIA;
                return (
                  <li key={carga.id} className="flex justify-between gap-3">
                    <span className="truncate">{carga.operacao}{carga.maquina ? ` · ${carga.maquina}` : ''}</span>
                    <span className={estoura ? 'font-semibold tabular-nums text-perigo' : 'tabular-nums text-texto-secundario'}>
                      {formatarNumero(turnosAtuais, 2)} → {formatarNumero(turnosComItem, 2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </PainelVidro>
        <PainelVidro className="flex flex-col gap-2 p-5">
          <TituloSecao>Custo por peça</TituloSecao>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-texto-secundario">Referência do item</dt>
            <dd className="tabular-nums">{formatarMoeda(custoPorPeca(referencia))}</dd>
            <dt className="font-medium">Vigente para a cotação</dt>
            <dd className="font-semibold tabular-nums">{formatarMoeda(custoPorPeca(vigentes))}</dd>
          </dl>
        </PainelVidro>
      </div>

      {podeConcluir && (
        <PainelVidro className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-texto-secundario">
            As áreas concluíram a checagem. Envie a proposta e encerre a AV de portfólio (não gera SD: o item já existe).
          </p>
          <Botao variante="primario" icone={CheckCircle2} onClick={() => setConfirmando(true)}>
            Concluir AV de portfólio
          </Botao>
        </PainelVidro>
      )}

      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Concluir AV de portfólio"
        mensagem={`Encerrar a ${av.numero}? A AV vai para "Concluída (portfólio)" e não pode mais ser editada.`}
        rotuloConfirmar="Concluir"
        rotuloProcessando="Concluindo…"
        aoConfirmar={concluir}
        aoFechar={() => setConfirmando(false)}
      />
    </div>
  );
}
