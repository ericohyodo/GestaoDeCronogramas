import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';
type Tamanho = 'sm' | 'md';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primaria text-sobre-primaria shadow-sm hover:bg-primaria-hover',
  secundario:
    'border border-borda bg-superficie-solida/70 text-texto hover:bg-superficie-solida hover:border-texto-sutil/40',
  fantasma: 'text-texto-secundario hover:bg-texto/6 hover:text-texto',
  perigo: 'bg-perigo text-sobre-primaria shadow-sm hover:bg-perigo/90',
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
};

const TAMANHOS_ICONE: Record<Tamanho, string> = {
  sm: 'size-8',
  md: 'size-9',
};

const BASE =
  'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50';

/** Classes do botão, para aplicar em links (`<Link>`) sem aninhar <button> dentro de <a>. */
export function classeBotao(variante: Variante = 'secundario', tamanho: Tamanho = 'md'): string {
  return clsx(BASE, VARIANTES[variante], TAMANHOS[tamanho]);
}

type PropsBotao = ComponentProps<'button'> & {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: LucideIcon;
};

export function Botao({
  variante = 'secundario',
  tamanho = 'md',
  icone: Icone,
  type = 'button',
  className,
  children,
  ...props
}: PropsBotao) {
  return (
    <button
      type={type}
      className={clsx(BASE, VARIANTES[variante], TAMANHOS[tamanho], className)}
      {...props}
    >
      {Icone && <Icone aria-hidden className={tamanho === 'sm' ? 'size-3.5' : 'size-4'} />}
      {children}
    </button>
  );
}

type PropsBotaoIcone = Omit<ComponentProps<'button'>, 'children'> & {
  icone: LucideIcon;
  /** Obrigatório: é o nome acessível do botão. */
  rotulo: string;
  variante?: Variante;
  tamanho?: Tamanho;
};

export function BotaoIcone({
  icone: Icone,
  rotulo,
  variante = 'fantasma',
  tamanho = 'sm',
  type = 'button',
  className,
  ...props
}: PropsBotaoIcone) {
  return (
    <button
      type={type}
      aria-label={rotulo}
      title={rotulo}
      className={clsx(BASE, VARIANTES[variante], TAMANHOS_ICONE[tamanho], className)}
      {...props}
    >
      <Icone aria-hidden className="size-4" />
    </button>
  );
}
