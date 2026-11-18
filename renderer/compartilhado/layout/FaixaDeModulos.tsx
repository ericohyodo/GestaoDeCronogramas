'use client';

import clsx from 'clsx';
import { CalendarRange, ClipboardCheck, FileText, type LucideIcon, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { type ModuloApp, ROTAS_DE_LISTA } from './modulo-da-rota';

interface OpcaoDeModulo {
  modulo: ModuloApp;
  sigla: string;
  nome: string;
  icone: LucideIcon;
}

// Mesmos ícones dos cards da tela inicial, na ordem do fluxo AV → SD → PRO (a AV de portfólio ao lado da AV).
const OPCOES: readonly OpcaoDeModulo[] = [
  { modulo: 'avs', sigla: 'AV', nome: 'Análises de Viabilidade', icone: ClipboardCheck },
  { modulo: 'portfolio', sigla: 'AVP', nome: 'AV de Item de Portfólio', icone: PackageCheck },
  { modulo: 'sds', sigla: 'SD', nome: 'Solicitações de Desenvolvimento', icone: FileText },
  { modulo: 'projetos', sigla: 'PRO', nome: 'Projetos', icone: CalendarRange },
];

/**
 * Faixa de uma linha no topo das listas para trocar de módulo sem passar pela tela inicial.
 * @param atual módulo da rota atual, destacado na faixa
 */
export function FaixaDeModulos({ atual }: { atual: ModuloApp }) {
  return (
    <nav aria-label="Trocar de módulo" className="px-6 pt-4">
      <ul className="vidro inline-flex items-center gap-0.5 rounded-xl p-1">
        {OPCOES.map((opcao) => {
          const ativo = opcao.modulo === atual;
          return (
            <li key={opcao.modulo}>
              <Link
                href={ROTAS_DE_LISTA[opcao.modulo]}
                aria-current={ativo ? 'page' : undefined}
                title={opcao.nome}
                className={clsx(
                  'flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors',
                  ativo ? 'bg-primaria/12 text-primaria' : 'text-texto-secundario hover:bg-texto/6 hover:text-texto',
                )}
              >
                <opcao.icone aria-hidden className="size-3.5" />
                <span className="font-semibold">{opcao.sigla}</span>
                <span className="hidden text-texto-sutil lg:inline">{opcao.nome}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
