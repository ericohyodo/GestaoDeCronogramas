'use client';

import clsx from 'clsx';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { NotificacaoDTO } from '@contratos/notificacoes.contrato';
import { formatarDataHora } from '@/compartilhado/formatacao';
import { useNotificacoesStore } from '../store/use-notificacoes-store';

/** Intervalo da consulta ao banco compartilhado. */
const INTERVALO_MS = 20_000;

/** "agora", "há 5 min", "há 3 h" ou a data, para a lista do sino. */
function quando(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 24 * 60) return `há ${Math.round(minutos / 60)} h`;
  return formatarDataHora(iso);
}

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

/** Sino da barra superior: contador de não lidas e a lista das notificações do usuário logado. */
export function SinoDeNotificacoes() {
  const router = useRouter();
  const { naoLidas, itens, atualizar, marcarLida, marcarTodasLidas } = useNotificacoesStore();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  const abrir = (notificacao: NotificacaoDTO) => {
    setAberto(false);
    if (!notificacao.lida) void marcarLida(notificacao.id).catch(() => undefined);
    if (notificacao.link) router.push(notificacao.link);
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

  // Fecha ao clicar fora ou com Esc.
  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    };
    const esc = (evento: KeyboardEvent) => evento.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  return (
    <div ref={raiz} data-tour="sino" className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={aberto}
        className="relative grid size-8 place-items-center rounded-lg text-texto-secundario transition-colors hover:bg-texto/6 hover:text-texto"
      >
        <Bell aria-hidden className="size-4" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-perigo px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-10 z-50 flex max-h-[480px] w-[380px] flex-col overflow-hidden rounded-xl border border-borda bg-superficie-solida shadow-[0_16px_48px_rgb(15_27_45/0.22)]"
        >
          <div className="flex items-center justify-between border-b border-borda px-4 py-3">
            <p className="text-sm font-semibold">Notificações</p>
            {naoLidas > 0 && (
              <button
                type="button"
                onClick={() => void marcarTodasLidas().catch(() => undefined)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primaria hover:text-primaria-hover"
              >
                <CheckCheck aria-hidden className="size-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>
          {itens.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-texto-sutil">
              Você será avisado aqui quando uma AV ou SD precisar de você.
            </p>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {itens.map((notificacao) => (
                <li key={notificacao.id}>
                  <button
                    type="button"
                    onClick={() => abrir(notificacao)}
                    className={clsx(
                      'flex w-full gap-3 border-b border-borda/60 px-4 py-3 text-left transition-colors hover:bg-primaria/5',
                      !notificacao.lida && 'bg-primaria/4',
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        notificacao.lida ? 'bg-transparent' : 'bg-primaria',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={clsx('block text-sm', !notificacao.lida && 'font-semibold')}>
                        {notificacao.titulo}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-texto-secundario">
                        {notificacao.mensagem}
                      </span>
                      <span className="mt-1 block text-[11px] text-texto-sutil">{quando(notificacao.criadaEm)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
