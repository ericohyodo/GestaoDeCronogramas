'use client';

import clsx from 'clsx';
import { CircleCheck, CircleDot, Eraser, Lock } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { Botao } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import type { EstadoBloco } from '../blocos';

export type TomSecao = 'azul' | 'verde' | 'ambar' | 'lilas' | 'rosa' | 'ciano';

/** Título de seção dentro das abas da AV: maior e em azul-marinho, para se destacar do texto comum. */
export function TituloSecao({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={clsx('text-base font-semibold text-titulo-secao', className)} {...props} />;
}

/**
 * Esvazia os campos da seção, depois de confirmar (nada é gravado até salvar a aba). A confirmação é um
 * diálogo do próprio app: `window.confirm` no Electron deixa os campos da página sem aceitar digitação.
 */
export function BotaoLimparCampos({ aoLimpar, disabled }: { aoLimpar: () => void; disabled?: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <Botao tamanho="xs" icone={Eraser} disabled={disabled} onClick={() => setConfirmando(true)}>
        Limpar Campos
      </Botao>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Limpar Campos"
        mensagem="Limpar todos os campos desta seção? Nada é gravado até você salvar a aba."
        rotuloConfirmar="Limpar"
        rotuloProcessando="Limpando…"
        aoConfirmar={async () => aoLimpar()}
        aoFechar={() => setConfirmando(false)}
      />
    </>
  );
}

/** Título da seção com o botão "Limpar Campos" no canto superior direito. */
export function CabecalhoDaSecao({
  titulo,
  ajuda,
  aoLimpar,
}: {
  titulo: string;
  /** Explicação do que se espera nesta seção (ícone de ajuda ao lado do título). */
  ajuda?: string;
  aoLimpar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <TituloSecao>{titulo}</TituloSecao>
        {ajuda && <Ajuda texto={ajuda} />}
      </div>
      <BotaoLimparCampos aoLimpar={aoLimpar} />
    </div>
  );
}

/** Selo do estado do bloco na liberação fracionada. */
function SeloDoBloco({ estado }: { estado: EstadoBloco }) {
  if (estado === 'completo') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-sucesso">
        <CircleCheck aria-hidden className="size-3.5" />
        Bloco completo
      </span>
    );
  }
  if (estado === 'atual') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primaria">
        <CircleDot aria-hidden className="size-3.5" />
        Preencha agora
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-texto-sutil">
      <Lock aria-hidden className="size-3.5" />
      Complete o bloco anterior
    </span>
  );
}

/**
 * Cartão de uma seção da aba, com um fundo pastel sutil (a cor vem dos tokens `--pastel-*`).
 * Com `estado`, participa da liberação fracionada: o bloco atual fica em destaque, os completos ganham selo
 * e os seguintes ficam esmaecidos (continuam editáveis; ao passar o mouse voltam à opacidade normal).
 */
export function SecaoAv({
  tom,
  className,
  estado,
  children,
}: {
  tom: TomSecao;
  className?: string;
  estado?: EstadoBloco;
  children: ReactNode;
}) {
  return (
    <PainelVidro
      className={clsx(
        className,
        'transition-[opacity,box-shadow] duration-200',
        estado === 'atual' && 'ring-2 ring-primaria/45',
        estado === 'pendente' && 'opacity-55 hover:opacity-100 focus-within:opacity-100',
      )}
      style={{ backgroundColor: `var(--pastel-${tom})` }}
    >
      {estado && (
        <div className="-mb-1">
          <SeloDoBloco estado={estado} />
        </div>
      )}
      {children}
    </PainelVidro>
  );
}

/** Indicador "N de M blocos" no topo da aba. */
export function ProgressoDaAba({ estados }: { estados: readonly EstadoBloco[] }) {
  const feitos = estados.filter((estado) => estado === 'completo').length;
  const total = estados.length;
  return (
    <div className="flex items-center gap-3 text-xs text-texto-secundario" aria-live="polite">
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-borda" aria-hidden>
        <div
          className="h-full rounded-full bg-primaria transition-[width] duration-300"
          style={{ width: `${total ? (feitos / total) * 100 : 0}%` }}
        />
      </div>
      <span className="tabular-nums">
        {feitos} de {total} blocos preenchidos
      </span>
    </div>
  );
}
