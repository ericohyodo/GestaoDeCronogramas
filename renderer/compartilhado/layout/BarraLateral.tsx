'use client';

import clsx from 'clsx';
import {
  BarChart3,
  Bell,
  CalendarRange,
  ClipboardCheck,
  FileClock,
  FileText,
  Inbox,
  Package,
  PackageCheck,
  GraduationCap,
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
import type { ReactNode } from 'react';
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
  /** Mostra uma bolinha vermelha com este contador (ex.: notificações não lidas). */
  contador?: keyof ContadoresDoMenu;
}

/** Contadores exibidos nos itens do menu, alimentados pela casca do app. */
export interface ContadoresDoMenu {
  notificacoes?: number;
}

const ITEM_NOTIFICACOES: ItemNavegacao = {
  rotulo: 'Notificações',
  icone: Bell,
  href: '/notificacoes/',
  rotas: ['/notificacoes'],
  contador: 'notificacoes',
};

// Reportes de erro/sugestão: só o administrador acompanha (página compartilhada, mantém o módulo atual).
const ITEM_REPORTES: ItemNavegacao = {
  rotulo: 'Reportes recebidos',
  icone: Inbox,
  href: '/reportes/',
  rotas: ['/reportes'],
  permissao: 'administracao',
};

export interface NavegacaoLateral {
  titulo: string;
  itens: ItemNavegacao[];
}

export const NAV_PROJETOS: NavegacaoLateral = {
  titulo: 'Gestão de Projetos',
  itens: [
    { rotulo: 'Projetos', icone: CalendarRange, href: '/projetos/', rotas: ['/projetos', '/cronograma'] },
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
    { rotulo: 'Tutoriais', icone: GraduationCap, href: '/tutoriais/', rotas: ['/tutoriais'] },
    ITEM_REPORTES,
    ITEM_NOTIFICACOES,
  ],
};

// Espelha NAV_PROJETOS, menos "Recursos": lá são as pessoas alocadas nas tarefas de um cronograma,
// aqui todo mundo que participa de uma AV já é um usuário do sistema (ver equipe por área na AV).
export const NAV_AVS: NavegacaoLateral = {
  titulo: 'Gestão AVs',
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
    { rotulo: 'Tutoriais', icone: GraduationCap, href: '/tutoriais/', rotas: ['/tutoriais'] },
    ITEM_REPORTES,
    ITEM_NOTIFICACOES,
  ],
};

// AV de Item de Portfólio: as AVs light e o cadastro de itens-modelo que elas usam.
export const NAV_PORTFOLIO: NavegacaoLateral = {
  titulo: 'AV de Portfólio',
  itens: [
    { rotulo: 'AVs de portfólio', icone: PackageCheck, href: '/portfolio/', rotas: ['/portfolio'] },
    { rotulo: 'Itens de portfólio', icone: Package, href: '/portfolio/itens/', rotas: ['/portfolio/itens'] },
    { rotulo: 'Usuários', icone: UserCog, href: '/usuarios/', rotas: ['/usuarios'], permissao: 'administracao' },
    { rotulo: 'Tutoriais', icone: GraduationCap, href: '/tutoriais/', rotas: ['/tutoriais'] },
    ITEM_REPORTES,
    ITEM_NOTIFICACOES,
  ],
};

// Só o que é realmente compartilhado (usuários); relatórios, análises e IA de cada módulo são separados.
export const NAV_SDS: NavegacaoLateral = {
  titulo: 'Gestão SDs',
  itens: [
    { rotulo: 'SDs', icone: FileText, href: '/sds/', rotas: ['/sds'] },
    { rotulo: 'Usuários', icone: UserCog, href: '/usuarios/', rotas: ['/usuarios'], permissao: 'administracao' },
    { rotulo: 'Tutoriais', icone: GraduationCap, href: '/tutoriais/', rotas: ['/tutoriais'] },
    ITEM_REPORTES,
    ITEM_NOTIFICACOES,
  ],
};

export function BarraLateral({
  navegacao,
  permissoes,
  contadores = {},
  aoRetrair,
  extras,
}: {
  navegacao: NavegacaoLateral;
  permissoes: PermissaoDTO[];
  contadores?: ContadoresDoMenu;
  aoRetrair: () => void;
  /** Ações logo abaixo dos itens (ex.: "Reportar erro / sugestão"), compostas pela casca do app. */
  extras?: ReactNode;
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
                <Contador valor={item.contador ? contadores[item.contador] : undefined} />
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
      {extras && <div className="mt-0.5 flex flex-col gap-0.5">{extras}</div>}

      <div className="mt-auto rounded-xl border border-borda-vidro bg-texto/3 px-3 py-2.5 text-[11px] leading-relaxed text-texto-sutil">
        Versão {process.env.NEXT_PUBLIC_VERSAO_DO_APP}
        <br />
        Dados salvos ao lado do executável.
      </div>
    </nav>
  );
}

/** Bolinha vermelha com o número, no estilo dos apps de mensagem (some quando é zero). */
function Contador({ valor }: { valor: number | undefined }) {
  if (!valor) return null;
  return (
    <span
      aria-label={`${valor} não lidas`}
      className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-perigo px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums"
    >
      {valor > 99 ? '99+' : valor}
    </span>
  );
}
