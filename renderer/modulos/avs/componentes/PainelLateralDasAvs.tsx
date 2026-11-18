'use client';

import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { DashboardAvPanel } from './DashboardAvPanel';
import { TituloSecao } from './SecaoAv';

const CHAVE_RECOLHIDO = 'avs-painel-recolhido';

/** Preferência deste computador (conveniência): sem armazenamento disponível, o painel abre expandido. */
function lerRecolhido(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_RECOLHIDO) === '1';
  } catch {
    return false;
  }
}

function gravarRecolhido(recolhido: boolean): void {
  try {
    window.localStorage.setItem(CHAVE_RECOLHIDO, recolhido ? '1' : '0');
  } catch {
    // sem localStorage: a escolha vale só até sair da página
  }
}

/**
 * Painel das AVs (indicadores, prazos das áreas e AVs por etapa) à direita da lista. Recolhido, some para a
 * direita e deixa só um trilho com o botão para reabrir, como o menu lateral recolhido.
 */
export function PainelLateralDasAvs() {
  const [recolhido, setRecolhido] = useState(lerRecolhido);

  const alternar = () => {
    setRecolhido((atual) => {
      gravarRecolhido(!atual);
      return !atual;
    });
  };

  if (recolhido) {
    return (
      <div className="vidro flex shrink-0 items-center gap-2 self-end rounded-2xl p-1.5 xl:sticky xl:top-0 xl:w-9 xl:flex-col xl:self-start xl:py-3">
        <BotaoIcone icone={PanelRightOpen} rotulo="Mostrar painel das AVs" onClick={alternar} />
      </div>
    );
  }

  return (
    <aside
      aria-label="Painel das AVs"
      className="flex shrink-0 flex-col gap-3 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-7rem)] xl:w-[360px] xl:overflow-y-auto"
    >
      <div className="flex items-center justify-between px-1">
        <TituloSecao>Painel</TituloSecao>
        <BotaoIcone icone={PanelRightClose} rotulo="Recolher painel" onClick={alternar} />
      </div>
      <DashboardAvPanel compacto />
    </aside>
  );
}
