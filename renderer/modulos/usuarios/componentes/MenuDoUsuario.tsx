'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { ROTULO_PERFIL, TOM_PERFIL } from '../rotulos';
import { useMeuPerfilStore } from '../store/use-meu-perfil-store';
import { useSessaoStore, useUsuarioAtual } from '../store/use-sessao-store';
import { AvatarDoUsuario } from './AvatarDoUsuario';

/** Identificação de quem está logado, na barra de título: foto e nome levam ao "Meu perfil"; a saída ao lado. */
export function MenuDoUsuario() {
  const usuario = useUsuarioAtual();
  const sair = useSessaoStore((estado) => estado.sair);
  const perfil = useMeuPerfilStore((estado) => estado.perfil);
  const carregarPerfil = useMeuPerfilStore((estado) => estado.carregar);
  const limparPerfil = useMeuPerfilStore((estado) => estado.limpar);
  const [saindo, setSaindo] = useState(false);
  const usuarioId = usuario?.id;

  // A foto vem do perfil pessoal: relê ao trocar de usuário.
  useEffect(() => {
    if (usuarioId) carregarPerfil().catch(() => undefined);
  }, [usuarioId, carregarPerfil]);

  if (!usuario) return null;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/perfil/"
        title="Meu perfil"
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-xs font-medium text-texto-secundario transition-colors hover:bg-texto/6 hover:text-texto"
      >
        <AvatarDoUsuario nome={usuario.nome} foto={perfil?.id === usuario.id ? perfil.foto : null} tamanho="size-6" />
        <span className="hidden sm:inline">{usuario.nome}</span>
      </Link>
      <Etiqueta tom={TOM_PERFIL[usuario.perfil]}>{ROTULO_PERFIL[usuario.perfil]}</Etiqueta>
      <BotaoIcone
        icone={LogOut}
        rotulo="Sair"
        disabled={saindo}
        onClick={() => {
          setSaindo(true);
          limparPerfil();
          void sair().finally(() => setSaindo(false));
        }}
      />
    </div>
  );
}
