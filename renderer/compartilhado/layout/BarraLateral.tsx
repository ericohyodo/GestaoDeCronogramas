'use client';

import clsx from 'clsx';
import { BarChart3, CalendarRange, type LucideIcon, PanelLeftClose, UserCog, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PermissaoDTO } from '@contratos/sessao.contrato';
import { BotaoIcone } from '@/compartilhado/ui/Botao';

interface ItemNavegacao {
  rotulo: string;
  icone: LucideIcon;
  href?: string;
  /** Prefixos de rota que marcam o item como ativo. */
  rotas?: string[];
  /** Quando definida, o item só aparece para quem tem a permissão. */
  permissao?: PermissaoDTO;
}

const ITENS: ItemNavegacao[] = [
  { rotulo: 'Cronogramas', icone: CalendarRange, href: '/', rotas: ['/', '/cronograma'] },
  { rotulo: 'Recursos', icone: Users, href: '/recursos/', rotas: ['/recursos'] },
  { rotulo: 'Usuários', icone: UserCog, href: '/usuarios/', rotas: ['/usuarios'], permissao: 'administracao' },
  { rotulo: 'Relatórios', icone: BarChart3 },
];

export function BarraLateral({
  permissoes,
  aoRetrair,
}: {
  permissoes: PermissaoDTO[];
  aoRetrair: () => void;
}) {
  const rotaAtual = usePathname();
  const ehAtivo = (item: ItemNavegacao) =>
    item.rotas?.some((rota) => (rota === '/' ? rotaAtual === '/' : rotaAtual.startsWith(rota)));

  const itensVisiveis = ITENS.filter(
    (item) => !item.permissao || permissoes.includes(item.permissao),
  );

  return (
    <nav aria-label="Navegação principal" className="vidro flex w-56 shrink-0 flex-col rounded-2xl p-3">
      <div className="flex items-center px-3 pb-2 pt-1">
        <p className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-texto-sutil">
          Planejamento
        </p>
        <BotaoIcone
          icone={PanelLeftClose}
          rotulo="Recolher menu lateral"
          onClick={aoRetrair}
          className="-mr-1 -mt-0.5"
        />
      </div>
      <ul className="flex flex-col gap-0.5">
        {itensVisiveis.map((item) => (
          <li key={item.rotulo}>
            {item.href ? (
              <Link
                href={item.href}
                aria-current={ehAtivo(item) ? 'page' : undefined}
                className={clsx(
                  'flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors',
                  ehAtivo(item)
                    ? 'bg-primaria/12 text-primaria'
                    : 'text-texto-secundario hover:bg-texto/6 hover:text-texto',
                )}
              >
                <item.icone aria-hidden className="size-4" />
                {item.rotulo}
              </Link>
            ) : (
              <span
                aria-disabled
                className="flex h-9 cursor-default items-center gap-2.5 rounded-lg px-3 text-sm text-texto-sutil"
              >
                <item.icone aria-hidden className="size-4" />
                {item.rotulo}
                <span className="ml-auto rounded-full border border-borda px-1.5 text-[10px] font-medium">
                  em breve
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-auto rounded-xl border border-borda-vidro bg-texto/3 px-3 py-2.5 text-[11px] leading-relaxed text-texto-sutil">
        Versão 0.1.0
        <br />
        Dados salvos ao lado do executável.
      </div>
    </nav>
  );
}
