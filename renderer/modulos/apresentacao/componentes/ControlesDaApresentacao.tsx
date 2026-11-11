'use client';

import { MonitorPlay, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { useApresentacaoStore } from '../store/use-apresentacao-store';

/** Selo "Modo apresentação" e o botão de sair, na barra superior (só aparece com o modo ativo). */
export function SeloDoModoApresentacao() {
  const ativo = useApresentacaoStore((estado) => estado.estado?.ativo ?? false);
  const sair = useApresentacaoStore((estado) => estado.sair);
  const [confirmando, setConfirmando] = useState(false);
  if (!ativo) return null;
  return (
    <>
      <span className="rounded-full bg-alerta/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-alerta">
        Modo apresentação · dados fictícios
      </span>
      <Botao tamanho="xs" icone={LogOut} onClick={() => setConfirmando(true)}>
        Sair da apresentação
      </Botao>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Sair do modo apresentação"
        mensagem="O app vai reiniciar com os dados reais. Os dados fictícios são descartados."
        rotuloConfirmar="Sair e reiniciar"
        rotuloProcessando="Reiniciando…"
        aoConfirmar={() => sair()}
        aoFechar={() => setConfirmando(false)}
      />
    </>
  );
}

/** Botão do painel inicial (administrador) para entrar no modo apresentação. */
export function BotaoEntrarNaApresentacao() {
  const ativo = useApresentacaoStore((estado) => estado.estado?.ativo ?? false);
  const entrar = useApresentacaoStore((estado) => estado.entrar);
  const [confirmando, setConfirmando] = useState(false);
  if (ativo) return null;
  return (
    <>
      <Botao icone={MonitorPlay} onClick={() => setConfirmando(true)}>
        Modo apresentação
      </Botao>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Entrar no modo apresentação"
        mensagem="O app vai reiniciar com dados fictícios, numa pasta separada, e um roteiro guiado pelas telas. Os dados reais não são abertos nem alterados."
        rotuloConfirmar="Reiniciar em apresentação"
        rotuloProcessando="Reiniciando…"
        aoConfirmar={() => entrar()}
        aoFechar={() => setConfirmando(false)}
      />
    </>
  );
}
