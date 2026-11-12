'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { AceitarSdEntrada, SdDTO } from '@contratos/sds.contrato';
import { formatarData, hojeIso } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto, CampoData } from '@/compartilhado/ui/Campos';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { LEAD_TIME_PADRAO, estadoDoTermino, terminoCalculado } from '../prazo-do-aceite';

// =====================================================================================================
// Confirmação do aceite da SD pela Engenharia: confere as especificações do produto e o prazo acordado
// com o cliente; o término do PRO vem calculado (início + lead time) e, se for alterado, exige justificativa.
// =====================================================================================================

const MINIMO_JUSTIFICATIVA = 10;

/** Entrada do aceite que o modal decide (o id e o parecer ficam com a página). */
export type EntradaDoModalDeAceite = Omit<AceitarSdEntrada, 'id' | 'parecer'>;

/** Uma linha "rótulo: valor" das especificações; valor vazio aparece como "—". */
function Especificacao({ rotulo, valor }: { rotulo: string; valor: string | number | null }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-texto-sutil">{rotulo}</dt>
      <dd className="text-sm font-medium tabular-nums">{valor === null || valor === '' ? '—' : valor}</dd>
    </div>
  );
}

/**
 * Modal "Confirmar aceite da SD". A página o monta só enquanto está aberto, então cada abertura começa do
 * zero (início = hoje, término calculado, caixa desmarcada).
 * @param sd SD aberta, com especificações e lead time
 * @param aberto se o modal está visível
 * @param operando `true` enquanto o aceite é gravado
 * @param aoFechar fecha sem aceitar
 * @param aoAceitar grava o aceite com o período e a justificativa (se houver)
 */
export function ModalAceiteSd({
  sd,
  aberto,
  operando,
  aoFechar,
  aoAceitar,
}: {
  sd: SdDTO;
  aberto: boolean;
  operando: boolean;
  aoFechar: () => void;
  aoAceitar: (entrada: EntradaDoModalDeAceite) => void;
}) {
  const [inicio, setInicio] = useState(hojeIso());
  const [fim, setFim] = useState(() => terminoCalculado(hojeIso(), sd.leadTimeDias));
  const [fimEditado, setFimEditado] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  /** Mudar o início recalcula o término, a menos que a pessoa já tenha escolhido outro término. */
  const mudarInicio = (valor: string) => {
    setInicio(valor);
    if (!fimEditado && valor) setFim(terminoCalculado(valor, sd.leadTimeDias));
  };

  const periodoValido = !!inicio && !!fim && fim >= inicio;
  const estado = periodoValido ? estadoDoTermino(inicio, fim, sd.leadTimeDias) : null;
  const justificativaOk = !estado?.exigeJustificativa || justificativa.trim().length >= MINIMO_JUSTIFICATIVA;
  const podeConfirmar = periodoValido && confirmado && justificativaOk && !operando;
  const e = sd.especificacoes;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Confirmar aceite da SD"
      descricao={`${sd.numero} · cria o projeto ${sd.numeroProjeto} em Gestão de Projetos.`}
      largura="lg"
    >
      <div className="flex flex-col gap-5">
        {/* ---------- 1. Especificações ---------- */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">1. Especificações</h3>
            <Link
              href={`/avs/detalhe/?id=${sd.avId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primaria"
            >
              Abrir {sd.avNumero}
              <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-borda p-3 sm:grid-cols-3">
            <Especificacao rotulo="Cliente" valor={sd.cliente} />
            <Especificacao rotulo="Código" valor={e.codigo} />
            <Especificacao rotulo="Programa" valor={e.programa} />
            <div className="col-span-2 sm:col-span-3">
              <Especificacao rotulo="Descrição" valor={sd.descricao} />
            </div>
            <Especificacao
              rotulo="Volume anual"
              valor={e.volumeAnual === null ? null : e.volumeAnual.toLocaleString('pt-BR')}
            />
            <Especificacao rotulo="Complexidade" valor={e.complexidade} />
            <Especificacao rotulo="Linha" valor={e.linha} />
            <Especificacao rotulo="Família" valor={e.familia} />
            <Especificacao rotulo="Nº do PO" valor={sd.numeroPo} />
            <Especificacao
              rotulo="Cotação enviada em"
              valor={sd.dataEnvioCotacao ? formatarData(sd.dataEnvioCotacao) : null}
            />
          </dl>
        </section>

        {/* ---------- 2. Prazo acordado ---------- */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">2. Prazo acordado com o cliente</h3>
          {sd.leadTimeDias !== null ? (
            <div className="rounded-lg border border-borda p-3 text-sm">
              <p className="font-medium tabular-nums">{sd.leadTimeDias} dias corridos</p>
              {sd.leadTimeObservacao && (
                <p className="mt-1 whitespace-pre-line text-texto-secundario">{sd.leadTimeObservacao}</p>
              )}
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-lg border border-alerta/40 bg-alerta/10 p-3 text-sm">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-alerta" />
              Lead time não informado; usando {LEAD_TIME_PADRAO} dias.
            </p>
          )}
        </section>

        {/* ---------- 3. Projeto ---------- */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">3. Projeto {sd.numeroProjeto}</h3>
          <div className="grid grid-cols-2 gap-3">
            <CampoData rotulo="Início previsto" value={inicio} onChange={(ev) => mudarInicio(ev.target.value)} />
            <CampoData
              rotulo="Término previsto"
              value={fim}
              min={inicio}
              dica={estado ? `Calculado: ${formatarData(estado.calculado)}` : undefined}
              onChange={(ev) => {
                setFim(ev.target.value);
                setFimEditado(true);
              }}
            />
          </div>
          {inicio && fim && fim < inicio && (
            <p className="text-xs text-perigo">O término não pode ser antes do início.</p>
          )}
          {estado?.exigeJustificativa && (
            <>
              <p className="text-xs font-medium text-alerta tabular-nums">
                {estado.diferencaDias > 0 ? '+' : '−'}
                {Math.abs(estado.diferencaDias)} dias em relação ao acordado com o cliente.
              </p>
              <AreaTexto
                rotulo="Justificativa da alteração do prazo *"
                value={justificativa}
                maxLength={1000}
                placeholder="Ex.: ferramental importado, prazo de entrega do fornecedor +3 semanas."
                erro={
                  justificativa && !justificativaOk ? `Mínimo de ${MINIMO_JUSTIFICATIVA} caracteres.` : undefined
                }
                onChange={(ev) => setJustificativa(ev.target.value)}
              />
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primaria"
              checked={confirmado}
              onChange={(ev) => setConfirmado(ev.target.checked)}
            />
            Confirmo as especificações e o prazo acordado
          </label>
        </section>
      </div>

      <RodapeModal>
        <Botao onClick={aoFechar}>Cancelar</Botao>
        <Botao
          variante="primario"
          disabled={!podeConfirmar}
          onClick={() =>
            aoAceitar({
              dataInicio: inicio,
              dataFim: fim,
              justificativaPrazo: estado?.exigeJustificativa ? justificativa.trim() : null,
            })
          }
        >
          {operando ? 'Registrando…' : 'Confirmar aceite e criar PRO'}
        </Botao>
      </RodapeModal>
    </Modal>
  );
}
