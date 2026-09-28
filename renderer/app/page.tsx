'use client';

import { CalendarRange, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';

const MODULOS = [
  {
    href: '/projetos/',
    icone: CalendarRange,
    titulo: 'Gestão de Projetos',
    descricao: 'Cronogramas, fases, tarefas e relatórios de andamento.',
  },
  {
    href: '/avs/',
    icone: ClipboardCheck,
    titulo: 'Gestão de AVs',
    descricao: 'Análises de viabilidade, do intake comercial até a proposta.',
  },
] as const;

export default function Inicio() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-10 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Gestão de Cronogramas</h1>
        <p className="mt-1 text-sm text-texto-secundario">Escolha uma área para continuar.</p>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {MODULOS.map((modulo) => (
          <Link key={modulo.href} href={modulo.href} className="group block">
            <PainelVidro className="flex h-full flex-col items-start gap-4 p-7 transition-shadow group-hover:shadow-[0_12px_40px_rgb(15_27_45/0.14)]">
              <div className="grid size-12 place-items-center rounded-2xl bg-primaria/10 text-primaria">
                <modulo.icone aria-hidden className="size-6" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{modulo.titulo}</h2>
                <p className="mt-1 text-sm text-texto-secundario">{modulo.descricao}</p>
              </div>
            </PainelVidro>
          </Link>
        ))}
      </div>
    </div>
  );
}
