'use client';

import clsx from 'clsx';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NotificacaoDTO } from '@contratos/notificacoes.contrato';
import { formatarDataHora } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useNotificacoesStore } from '../store/use-notificacoes-store';

/** "agora", "há 5 min", "há 3 h" ou a data. */
function quando(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 24 * 60) return `há ${Math.round(minutos / 60)} h`;
  return formatarDataHora(iso);
}

type Filtro = 'todas' | 'nao_lidas';

/**
 * Menu Notificações: a caixa do usuário logado (as 50 mais recentes). Clicar marca como lida e abre a tela
 * do aviso. O sino da barra superior só sinaliza; a consulta periódica é feita por ele.
 */
export function PaginaNotificacoes() {
  const router = useRouter();
  const { naoLidas, itens, marcarLida, marcarTodasLidas } = useNotificacoesStore();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const visiveis = filtro === 'nao_lidas' ? itens.filter((item) => !item.lida) : itens;

  const abrir = (notificacao: NotificacaoDTO) => {
    if (!notificacao.lida) void marcarLida(notificacao.id).catch(() => undefined);
    if (notificacao.link) router.push(notificacao.link);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Notificações"
        descricao="O que precisa de você nas AVs, SDs e projetos. As 50 mais recentes ficam aqui."
        acoes={
          naoLidas > 0 && (
            <Botao icone={CheckCheck} onClick={() => void marcarTodasLidas().catch(() => undefined)}>
              Marcar todas como lidas
            </Botao>
          )
        }
      />

      <div role="tablist" aria-label="Filtrar notificações" className="flex gap-1">
        {(
          [
            ['todas', `Todas (${itens.length})`],
            ['nao_lidas', `Não lidas (${naoLidas})`],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={filtro === valor}
            onClick={() => setFiltro(valor)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filtro === valor ? 'bg-primaria/12 text-primaria' : 'text-texto-secundario hover:bg-texto/6 hover:text-texto',
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <PainelVidro className="overflow-hidden">
        {visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Bell aria-hidden className="size-6 text-texto-sutil" />
            <p className="text-sm text-texto-secundario">
              {filtro === 'nao_lidas'
                ? 'Nada pendente: todas as notificações já foram lidas.'
                : 'Você será avisado aqui quando uma AV, SD ou tarefa precisar de você.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-borda/60">
            {visiveis.map((notificacao) => (
              <li key={notificacao.id}>
                <button
                  type="button"
                  onClick={() => abrir(notificacao)}
                  className={clsx(
                    'group flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-primaria/5',
                    !notificacao.lida && 'bg-primaria/4',
                  )}
                >
                  <span
                    aria-hidden
                    className={clsx('mt-1.5 size-2 shrink-0 rounded-full', notificacao.lida ? 'bg-transparent' : 'bg-perigo')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block text-sm', !notificacao.lida && 'font-semibold')}>{notificacao.titulo}</span>
                    <span className="mt-0.5 block text-sm text-texto-secundario">{notificacao.mensagem}</span>
                    <span className="mt-1 block text-xs text-texto-sutil">{quando(notificacao.criadaEm)}</span>
                  </span>
                  {notificacao.link && (
                    <ArrowRight
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-texto-sutil transition-colors group-hover:text-primaria"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PainelVidro>
    </div>
  );
}
