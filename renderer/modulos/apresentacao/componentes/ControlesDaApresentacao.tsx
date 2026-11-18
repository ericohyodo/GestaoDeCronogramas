'use client';

import { MonitorPlay, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '@/compartilhado/ui/Botao';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
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

/** Botão para entrar no modo apresentação (painel inicial e Tutoriais; qualquer usuário). */
export function BotaoEntrarNaApresentacao({ rotulo = 'Modo apresentação' }: { rotulo?: string }) {
  const ativo = useApresentacaoStore((estado) => estado.estado?.ativo ?? false);
  const entrar = useApresentacaoStore((estado) => estado.entrar);
  const [confirmando, setConfirmando] = useState(false);
  if (ativo) return null;
  return (
    <>
      <Botao icone={MonitorPlay} onClick={() => setConfirmando(true)}>
        {rotulo}
      </Botao>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Entrar no modo apresentação"
        mensagem="O app vai reiniciar com dados fictícios, numa pasta separada, e um roteiro guiado pelas telas. Pode testar à vontade: os dados reais não são abertos nem alterados. Ao sair, o app reinicia e pede o login de novo."
        rotuloConfirmar="Reiniciar em apresentação"
        rotuloProcessando="Reiniciando…"
        aoConfirmar={() => entrar()}
        aoFechar={() => setConfirmando(false)}
      />
    </>
  );
}

/** Convite para o tour guiado, no topo dos Tutoriais (some quando já está no modo apresentação). */
export function CartaoDoTourGuiado() {
  const ativo = useApresentacaoStore((estado) => estado.estado?.ativo ?? false);
  if (ativo) return null;
  return (
    <PainelVidro className="flex flex-wrap items-center justify-between gap-4 border-primaria/30 p-5">
      <div className="max-w-2xl">
        <h2 className="text-sm font-semibold">Tour guiado com dados fictícios</h2>
        <p className="mt-0.5 text-sm text-texto-secundario">
          O app reinicia num ambiente de treino, com AVs, SDs e um projeto de exemplo, e um roteiro mostra cada tela
          passo a passo. Pode clicar e testar à vontade: nada do que for feito lá chega aos dados reais.
        </p>
      </div>
      <BotaoEntrarNaApresentacao rotulo="Fazer o tour guiado" />
    </PainelVidro>
  );
}
