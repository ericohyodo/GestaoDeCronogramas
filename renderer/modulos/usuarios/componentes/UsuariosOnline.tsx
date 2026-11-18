'use client';

import { useEffect, useState } from 'react';
import type { UsuarioOnlineDTO } from '@contratos/sessao.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ROTULO_PERFIL, TOM_PERFIL } from '../rotulos';

const INTERVALO_DE_ATUALIZACAO_EM_MS = 15_000;

/** Quem está com o aplicativo aberto agora (cada instância avisa a cada 30 s; ver `AppShell`). */
export function UsuariosOnline() {
  const [usuarios, setUsuarios] = useState<UsuarioOnlineDTO[] | null>(null);

  useEffect(() => {
    let ativo = true;
    const atualizar = () =>
      clienteDesktop.usuarios
        .listarOnline()
        .then((lista) => ativo && setUsuarios(lista))
        .catch(() => undefined);
    void atualizar();
    const temporizador = setInterval(atualizar, INTERVALO_DE_ATUALIZACAO_EM_MS);
    return () => {
      ativo = false;
      clearInterval(temporizador);
    };
  }, []);

  return (
    <PainelVidro className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-2 rounded-full bg-sucesso" />
        <h2 className="text-sm font-semibold">
          Usuários online{usuarios ? ` (${usuarios.length})` : ''}
        </h2>
      </div>
      {usuarios === null ? (
        <p className="text-sm text-texto-secundario">Carregando…</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-texto-secundario">Ninguém online no momento.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {usuarios.map((usuario) => (
            <li
              key={usuario.id}
              className="flex items-center gap-2.5 rounded-xl border border-borda/60 bg-superficie-solida/60 py-1.5 pl-1.5 pr-3"
            >
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full bg-primaria/12 text-sm font-semibold text-primaria"
              >
                {usuario.nome.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">
                  {usuario.nome}
                  {usuario.instancias > 1 && (
                    <span className="ml-1 text-xs text-texto-sutil">×{usuario.instancias}</span>
                  )}
                </p>
                <p className="text-[11px] leading-tight text-texto-sutil">
                  desde {new Date(usuario.desde).toLocaleTimeString('pt-BR', { timeStyle: 'short' })}
                </p>
              </div>
              <Etiqueta tom={TOM_PERFIL[usuario.perfil]}>{ROTULO_PERFIL[usuario.perfil]}</Etiqueta>
            </li>
          ))}
        </ul>
      )}
    </PainelVidro>
  );
}
