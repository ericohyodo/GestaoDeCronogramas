'use client';

import { History } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { HistoricoAvItemDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { TituloSecao } from './SecaoAv';

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function HistoricoPanel({ avId }: { avId: string }) {
  const [itens, setItens] = useState<HistoricoAvItemDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    clienteDesktop.avs
      .listarHistorico(avId)
      .then(setItens)
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [avId]);

  return (
    <PainelVidro className="flex flex-col gap-3 p-5">
      <TituloSecao>Histórico de etapas</TituloSecao>
      {erro && <MensagemErro mensagem={erro} />}
      {itens && itens.length === 0 && (
        <EstadoVazio icone={History} titulo="Sem transições ainda" className="py-6" />
      )}
      {itens && itens.length > 0 && (
        <ol className="flex flex-col gap-3">
          {itens.map((item) => (
            <li key={item.id} className="flex gap-3 text-sm">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primaria" aria-hidden />
              <div className="min-w-0 flex-1">
                <p>
                  {item.etapaDe ? (
                    <>
                      <span className="text-texto-secundario">{item.etapaDe.nome}</span> → {item.etapaPara.nome}
                    </>
                  ) : (
                    <span className="font-medium">{item.etapaPara.nome}</span>
                  )}
                </p>
                <p className="text-xs text-texto-sutil">
                  {item.usuarioNome ?? 'Alguém'} · {formatarDataHora(item.data)}
                </p>
                {item.comentario && <p className="mt-0.5 text-xs text-texto-secundario">{item.comentario}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </PainelVidro>
  );
}
