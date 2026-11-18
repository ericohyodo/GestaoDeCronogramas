'use client';

import clsx from 'clsx';
import { AREAS_AV, type AreaAvDTO, type EtapaAvDTO } from '@contratos/avs.contrato';
import { ROTULO_AREA } from '../rotulos';

export type AbaAv = AreaAvDTO | 'resumo';

const ABAS: readonly AbaAv[] = [...AREAS_AV, 'resumo'];

export function AbasDaAv({
  abaAtiva,
  aoSelecionar,
  etapaAtual,
}: {
  abaAtiva: AbaAv;
  aoSelecionar: (aba: AbaAv) => void;
  etapaAtual: EtapaAvDTO;
}) {
  return (
    <div role="tablist" aria-label="Seções da AV" className="flex flex-wrap gap-1 rounded-lg bg-texto/5 p-1">
      {ABAS.map((area) => (
        <button
          key={area}
          type="button"
          role="tab"
          aria-selected={abaAtiva === area}
          onClick={() => aoSelecionar(area)}
          className={clsx(
            'relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            abaAtiva === area
              ? 'bg-superficie-solida text-texto shadow-sm'
              : 'text-texto-secundario hover:text-texto',
          )}
        >
          {area === 'resumo' ? 'Resumo' : ROTULO_AREA[area]}
          {etapaAtual.area === area && (
            <span
              aria-label="Etapa atual"
              title="Etapa atual"
              className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primaria"
            />
          )}
        </button>
      ))}
    </div>
  );
}
