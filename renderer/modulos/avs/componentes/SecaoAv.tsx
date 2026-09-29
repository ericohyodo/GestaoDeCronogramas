'use client';

import clsx from 'clsx';
import { Eraser } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { Botao } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';

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

/** Cartão de uma seção da aba, com um fundo pastel sutil (a cor vem dos tokens `--pastel-*`). */
export function SecaoAv({
  tom,
  className,
  children,
}: {
  tom: TomSecao;
  className?: string;
  children: ReactNode;
}) {
  return (
    <PainelVidro className={className} style={{ backgroundColor: `var(--pastel-${tom})` }}>
      {children}
    </PainelVidro>
  );
}
