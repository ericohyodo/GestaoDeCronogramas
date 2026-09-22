import clsx from 'clsx';
import type { ComponentProps } from 'react';

type Props = ComponentProps<'section'> & {
  /** Mais opaco e com mais desfoque (modais, menus). */
  forte?: boolean;
};

export function PainelVidro({ forte = false, className, ...props }: Props) {
  return (
    <section className={clsx(forte ? 'vidro-forte' : 'vidro', 'rounded-2xl', className)} {...props} />
  );
}
