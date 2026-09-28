'use client';

import { useEffect } from 'react';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useAvsStore } from '../store/use-avs-store';

export function DashboardAvPanel({
  aoFiltrarEtapa,
}: {
  /** Clique numa barra filtra a lista por aquela etapa; passe `undefined` pra desativar o clique. */
  aoFiltrarEtapa?: (chave: string) => void;
}) {
  const dashboard = useAvsStore((estado) => estado.dashboard);
  const carregarDashboard = useAvsStore((estado) => estado.carregarDashboard);

  useEffect(() => {
    void carregarDashboard();
  }, [carregarDashboard]);

  if (!dashboard) return null;

  const maiorContagem = Math.max(1, ...dashboard.porEtapa.map((item) => item.quantidade));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Total" valor={dashboard.total} />
        <Indicador rotulo="Em andamento" valor={dashboard.emAndamento} />
        <Indicador rotulo="Concluídas" valor={dashboard.concluidas} />
        <Indicador rotulo="Declinadas" valor={dashboard.declinadas} />
      </div>
      <PainelVidro className="flex flex-col gap-2 p-5">
        <p className="text-xs font-medium text-texto-sutil">AVs por etapa</p>
        <ul className="flex flex-col gap-2">
          {dashboard.porEtapa.map(({ etapa, quantidade }) => (
            <li key={etapa.numero}>
              <button
                type="button"
                disabled={quantidade === 0 || !aoFiltrarEtapa}
                onClick={() => aoFiltrarEtapa?.(etapa.chave)}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors enabled:hover:bg-texto/5 disabled:cursor-default"
              >
                <span className="w-36 shrink-0 truncate text-xs text-texto-secundario">{etapa.nome}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-texto/8">
                  <span
                    className="block h-full rounded-full bg-linear-to-r from-primaria to-destaque"
                    style={{ width: `${(quantidade / maiorContagem) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums">{quantidade}</span>
              </button>
            </li>
          ))}
        </ul>
      </PainelVidro>
    </div>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <PainelVidro className="px-5 py-4">
      <p className="text-xs font-medium text-texto-sutil">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
    </PainelVidro>
  );
}
