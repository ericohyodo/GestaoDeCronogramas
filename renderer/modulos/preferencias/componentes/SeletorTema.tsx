'use client';

import clsx from 'clsx';
import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import type { TemaDTO } from '@contratos/preferencias.contrato';
import { usePreferenciasStore } from '../store/use-preferencias-store';

const OPCOES: { tema: TemaDTO; rotulo: string; icone: LucideIcon }[] = [
  { tema: 'sistema', rotulo: 'Seguir o Windows', icone: Monitor },
  { tema: 'claro', rotulo: 'Tema claro', icone: Sun },
  { tema: 'escuro', rotulo: 'Tema escuro', icone: Moon },
];

export function SeletorTema() {
  const tema = usePreferenciasStore((estado) => estado.tema);
  const carregado = usePreferenciasStore((estado) => estado.carregado);
  const carregar = usePreferenciasStore((estado) => estado.carregar);
  const definirTema = usePreferenciasStore((estado) => estado.definirTema);

  useEffect(() => {
    if (!carregado) void carregar();
  }, [carregado, carregar]);

  return (
    <div
      role="group"
      aria-label="Tema da interface"
      className="flex items-center gap-0.5 rounded-lg border border-borda-vidro bg-texto/4 p-0.5"
    >
      {OPCOES.map(({ tema: opcao, rotulo, icone: Icone }) => (
        <button
          key={opcao}
          type="button"
          title={rotulo}
          aria-label={rotulo}
          aria-pressed={tema === opcao}
          onClick={() => void definirTema(opcao)}
          className={clsx(
            'grid size-6 place-items-center rounded-md transition-colors',
            tema === opcao
              ? 'bg-superficie-solida text-primaria shadow-sm'
              : 'text-texto-sutil hover:text-texto',
          )}
        >
          <Icone aria-hidden className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
