'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { NotificacaoDTO } from '@contratos/notificacoes.contrato';
import { useNotificacoesStore } from '../store/use-notificacoes-store';

/** Intervalo da consulta ao banco compartilhado. */
const INTERVALO_MS = 20_000;

/**
 * Aviso nativo do Windows para o que acabou de chegar (só com o app aberto). Clicar traz a janela para
 * frente e abre a tela da notificação.
 * @param novas notificações recém-chegadas
 * @param abrir navega até o link da notificação
 */
function avisarNoWindows(novas: NotificacaoDTO[], abrir: (n: NotificacaoDTO) => void): void {
  if (typeof Notification === 'undefined' || novas.length === 0) return;
  const exibir = novas.length > 3 ? [{ ...novas[0]!, titulo: `${novas.length} novas notificações`, mensagem: novas[0]!.titulo }] : novas;
  for (const notificacao of exibir) {
    const aviso = new Notification(notificacao.titulo, { body: notificacao.mensagem, silent: false });
    aviso.onclick = () => {
      window.focus();
      abrir(notificacao);
    };
  }
}

/**
 * Sino da barra superior: só sinaliza (um ponto vermelho quando há não lidas) e leva ao menu Notificações,
 * onde fica a lista. Também consulta o banco periodicamente e dispara o aviso do Windows.
 */
export function SinoDeNotificacoes() {
  const router = useRouter();
  const { naoLidas, atualizar, marcarLida } = useNotificacoesStore();

  const abrir = (notificacao: NotificacaoDTO) => {
    if (!notificacao.lida) void marcarLida(notificacao.id).catch(() => undefined);
    router.push(notificacao.link ?? '/notificacoes/');
  };
  // Referência estável para o intervalo usar sempre a navegação atual.
  const abrirRef = useRef(abrir);
  useEffect(() => {
    abrirRef.current = abrir;
  });

  useEffect(() => {
    const consultar = () =>
      atualizar()
        .then((novas) => avisarNoWindows(novas, (n) => abrirRef.current(n)))
        .catch(() => undefined); // sem rede/banco ocupado: tenta de novo no próximo ciclo
    void consultar();
    const timer = window.setInterval(consultar, INTERVALO_MS);
    return () => window.clearInterval(timer);
  }, [atualizar]);

  return (
    <Link
      href="/notificacoes/"
      data-tour="sino"
      aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
      title={naoLidas > 0 ? `${naoLidas} notificação(ões) não lida(s)` : 'Notificações'}
      className="relative grid size-8 place-items-center rounded-lg text-texto-secundario transition-colors hover:bg-texto/6 hover:text-texto"
    >
      <Bell aria-hidden className="size-4" />
      {naoLidas > 0 && (
        <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-perigo ring-2 ring-superficie-solida" />
      )}
    </Link>
  );
}
