'use client';

import clsx from 'clsx';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DIAS_DE_GUARDA_DAS_CONVERSAS, type ResumoDeConversaDTO } from '@contratos/ia.contrato';
import { formatarDataHora } from '@/compartilhado/formatacao';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';

/** "agora", "há 5 min", "há 3 h", "ontem" ou a data. */
function quando(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 24 * 60) return `há ${Math.round(minutos / 60)} h`;
  if (minutos < 48 * 60) return 'ontem';
  return formatarDataHora(iso);
}

/**
 * Barra lateral do chat: as conversas guardadas do usuário logado (só as dele), para retomar ou excluir.
 * @param conversas lista do escopo atual, mais recentes primeiro
 * @param atual conversa aberta no chat (`null` = conversa nova)
 */
export function HistoricoDoChat({
  conversas,
  atual,
  bloqueado,
  aoNova,
  aoAbrir,
  aoExcluir,
}: {
  conversas: ResumoDeConversaDTO[];
  atual: string | null;
  bloqueado: boolean;
  aoNova: () => void;
  aoAbrir: (id: string) => void;
  aoExcluir: (id: string) => Promise<void>;
}) {
  const [excluindo, setExcluindo] = useState<ResumoDeConversaDTO | null>(null);

  return (
    <PainelVidro className="flex min-h-0 w-64 shrink-0 flex-col overflow-hidden">
      <div className="p-3">
        <Botao icone={MessageSquarePlus} onClick={aoNova} disabled={bloqueado} className="w-full">
          Nova conversa
        </Botao>
      </div>
      <nav aria-label="Conversas anteriores" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {conversas.length === 0 ? (
          <p className="px-2 py-4 text-xs text-texto-sutil">Suas conversas aparecem aqui.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversas.map((conversa) => (
              <li key={conversa.id} className="group relative">
                <button
                  type="button"
                  onClick={() => aoAbrir(conversa.id)}
                  disabled={bloqueado}
                  aria-current={conversa.id === atual ? 'true' : undefined}
                  className={clsx(
                    'w-full rounded-lg py-2 pl-3 pr-9 text-left transition-colors disabled:opacity-60',
                    conversa.id === atual ? 'bg-primaria/10 text-primaria' : 'hover:bg-texto/5',
                  )}
                >
                  <span className="line-clamp-2 block text-sm">{conversa.titulo}</span>
                  <span className="block text-[11px] text-texto-sutil">{quando(conversa.atualizadaEm)}</span>
                </button>
                <BotaoIcone
                  icone={Trash2}
                  rotulo={`Excluir a conversa "${conversa.titulo}"`}
                  onClick={() => setExcluindo(conversa)}
                  disabled={bloqueado}
                  className="absolute right-1 top-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                />
              </li>
            ))}
          </ul>
        )}
      </nav>
      <p className="border-t border-borda/60 px-3 py-2 text-[11px] leading-snug text-texto-sutil">
        Só você vê as suas conversas. Conversas sem uso há {DIAS_DE_GUARDA_DAS_CONVERSAS} dias são apagadas.
      </p>
      <DialogoConfirmacao
        aberto={excluindo !== null}
        titulo="Excluir conversa"
        mensagem={`"${excluindo?.titulo ?? ''}" será apagada. Não dá para desfazer.`}
        aoConfirmar={() => aoExcluir(excluindo!.id)}
        aoFechar={() => setExcluindo(null)}
      />
    </PainelVidro>
  );
}
