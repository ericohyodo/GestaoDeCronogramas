'use client';

import clsx from 'clsx';
import type { FotoDoUsuarioDTO } from '@contratos/usuarios.contrato';

/**
 * Foto do usuário ou, sem foto, as iniciais do nome num círculo.
 * @param nome nome completo (para as iniciais e o texto alternativo)
 * @param foto foto em base64, ou `null`
 * @param tamanho classe de tamanho do Tailwind (ex.: `size-7`)
 */
export function AvatarDoUsuario({
  nome,
  foto,
  tamanho = 'size-7',
}: {
  nome: string;
  foto: FotoDoUsuarioDTO | null;
  tamanho?: string;
}) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]!.toUpperCase())
    .join('');
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- data: URI pequena (256 px), sem loader de otimização
    <img
      src={`data:${foto.mime};base64,${foto.base64}`}
      alt={`Foto de ${nome}`}
      className={clsx(tamanho, 'shrink-0 rounded-full object-cover ring-1 ring-borda')}
    />
  ) : (
    <span
      aria-hidden
      className={clsx(tamanho, 'grid shrink-0 place-items-center rounded-full bg-primaria/12 text-[11px] font-semibold text-primaria')}
    >
      {iniciais || '?'}
    </span>
  );
}
