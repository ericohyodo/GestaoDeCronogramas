'use client';

import clsx from 'clsx';
import {
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  FileClock,
  FileText,
  Home,
  type LucideIcon,
  MessageSquareText,
  PanelLeftClose,
  ScrollText,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
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

export interface NavegacaoLateral {
  titulo: string;
  itens: ItemNavegacao[];
}

export const NAV_PROJETOS: NavegacaoLateral = {
  titulo: 'Planejamento',
  itens: [
    { rotulo: 'Cronogramas', icone: CalendarRange, href: '/projetos/', rotas: ['/projetos', '/cronograma'] },
    { rotulo: 'Recursos', icone: Users, href: '/recursos/', rotas: ['/recursos'] },
    { rotulo: 'Usuários', icone: UserCog, href: '/usuarios/', rotas: ['/usuarios'], permissao: 'administracao' },
    { rotulo: 'Relatórios', icone: BarChart3, href: '/relatorios/', rotas: ['/relatorios'] },
    { rotulo: 'Análises', icone: FileClock, href: '/analises/', rotas: ['/analises'] },
    { rotulo: 'Chat com IA', icone: MessageSquareText, href: '/chat/', rotas: ['/chat'] },
    {
      rotulo: 'Instruções da IA',
      icone: ScrollText,
      href: '/instrucoes-ia/',
      rotas: ['/instrucoes-ia'],
      permissao: 'planejamento',
    },
    {
      rotulo: 'Configurações',
      icone: Settings,
      href: '/configuracoes/',
      rotas: ['/configuracoes'],
      permissao: 'administracao',
    },
  ],
};

// Espelha NAV_PROJETOS, menos "Recursos": lá são as pessoas alocadas nas tarefas de um cronograma,
// aqui todo mundo que participa de uma AV já é um usuário do sistema (ver equipe por área na AV).
export const NAV_AVS: NavegacaoLateral = {
  titulo: 'Análises de Viabilidade',
  itens: [
    { rotulo: 'AVs', icone: ClipboardCheck, href: '/avs/', rotas: ['/avs'] },
    { rotulo: 'Usuários', icone: UserCog, href: '/usuarios/', rotas: ['/usuarios'], permissao: 'administracao' },
    // Relatórios, análises, chat, instruções e configurações da IA são próprios do módulo de AVs.
    { rotulo: 'Relatórios', icone: BarChart3, href: '/avs/relatorios/', rotas: ['/avs/relatorios'] },
    { rotulo: 'Análises', icone: FileClock, href: '/avs/analises/', rotas: ['/avs/analises'] },
    { rotulo: 'Chat com IA', icone: MessageSquareText, href: '/avs/chat/', rotas: ['/avs/chat'] },
    {
      rotulo: 'Instruções da IA',
      icone: ScrollText,
      href: '/avs/instrucoes-ia/',
      rotas: ['/avs/instrucoes-ia'],
      permissao: 'planejamento',
    },
    {
      rotulo: 'Configurações',
      icone: Settings,
      href: '/avs/configuracoes/',
      rotas: ['/avs/configuracoes'],
      permissao: 'administracao',
    },
  ],
};

// Só o que é realmente compartilhado (usuários); relatórios, análises e IA de cada módulo são separados.
export const NAV_SDS: NavegacaoLateral = {
  titulo: 'Solicitações de Desenvolvimento',
  itens: [
    { rotulo: 'SDs', icone: FileText, href: '/sds/', rotas: ['/sds'] },
    { rotulo: 'Usuários', icone: UserCog, href: '/usuarios/', rotas: ['/usuarios'], permissao: 'administracao' },
  ],
};

export function BarraLateral({
  navegacao,
  permissoes,
  aoRetrair,
}: {
  navegacao: NavegacaoLateral;
  permissoes: PermissaoDTO[];
  aoRetrair: () => void;
}) {
  const rotaAtual = usePathname();
  const itensVisiveis = navegacao.itens.filter(
    (item) => !item.permissao || permissoes.includes(item.permissao),
  );

  // Vale o item de prefixo mais longo: em /avs/relatorios/ só "Relatórios" fica ativo, não "AVs" (/avs).
  const tamanhoDoMelhorPrefixo = (item: ItemNavegacao) =>
    Math.max(
      -1,
      ...(item.rotas ?? []).map((rota) =>
        (rota === '/' ? rotaAtual === '/' : rotaAtual.startsWith(rota)) ? rota.length : -1,
      ),
    );
  const maiorPrefixo = Math.max(-1, ...itensVisiveis.map(tamanhoDoMelhorPrefixo));
  const ehAtivo = (item: ItemNavegacao) => maiorPrefixo >= 0 && tamanhoDoMelhorPrefixo(item) === maiorPrefixo;

  return (
    <nav aria-label="Navegação principal" className="vidro flex w-56 shrink-0 flex-col rounded-2xl p-3">
      <div className="flex items-center px-3 pb-2 pt-1">
        <Link
          href="/"
          className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-texto-sutil hover:text-texto"
          title="Voltar para o início"
        >
          {navegacao.titulo}
        </Link>
        <Link
          href="/"
          aria-label="Voltar para o início"
          title="Voltar para o início"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-texto-secundario transition-colors hover:bg-texto/6 hover:text-texto"
        >
          <Home aria-hidden className="size-4" />
        </Link>
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
