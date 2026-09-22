'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { ROTULO_PERFIL, TOM_PERFIL } from '../rotulos';
import { useSessaoStore, useUsuarioAtual } from '../store/use-sessao-store';

/** Identificação de quem está logado, na barra de título, com a saída ao lado. */
export function MenuDoUsuario() {
  const usuario = useUsuarioAtual();
  const sair = useSessaoStore((estado) => estado.sair);
  const [saindo, setSaindo] = useState(false);

  if (!usuario) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium text-texto-secundario sm:inline">
        {usuario.nome}
      </span>
      <Etiqueta tom={TOM_PERFIL[usuario.perfil]}>{ROTULO_PERFIL[usuario.perfil]}</Etiqueta>
      <BotaoIcone
        icone={LogOut}
        rotulo="Sair"
        disabled={saindo}
        onClick={() => {
          setSaindo(true);
          void sair().finally(() => setSaindo(false));
        }}
      />
    </div>
  );
}
