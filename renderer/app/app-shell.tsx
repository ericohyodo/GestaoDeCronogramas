'use client';

import { PanelLeftOpen } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { BarraDeTitulo } from '@/compartilhado/layout/BarraDeTitulo';
import { BarraLateral } from '@/compartilhado/layout/BarraLateral';
import { FundoDecorativo } from '@/compartilhado/layout/FundoDecorativo';
import { SeletorTema } from '@/modulos/preferencias/componentes/SeletorTema';
import { MenuDoUsuario } from '@/modulos/usuarios/componentes/MenuDoUsuario';
import { useSessaoStore } from '@/modulos/usuarios/store/use-sessao-store';

const ROTA_DE_LOGIN = '/login/';
const ROTA_DE_IMPRESSAO = '/impressao';

/**
 * Guarda de sessão e moldura do aplicativo. Quem decide de fato é o processo principal
 * (cada canal IPC exige permissão); aqui só evitamos mostrar telas sem sessão.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const rota = usePathname();
  const sessao = useSessaoStore((estado) => estado.sessao);
  const carregando = useSessaoStore((estado) => estado.carregando);
  const carregar = useSessaoStore((estado) => estado.carregar);
  const [lateralRetraida, setLateralRetraida] = useState(false);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const autenticado = sessao?.usuario != null;
  const naTelaDeLogin = rota === ROTA_DE_LOGIN;

  useEffect(() => {
    if (carregando || !sessao) return;
    if (!autenticado && !naTelaDeLogin) router.replace(ROTA_DE_LOGIN);
    if (autenticado && naTelaDeLogin) router.replace('/');
  }, [autenticado, carregando, naTelaDeLogin, router, sessao]);

  const permissoes = sessao?.permissoes ?? [];

  // A rota de impressão é aberta numa janela invisível para virar PDF: sem moldura nem fundo.
  if (rota.startsWith(ROTA_DE_IMPRESSAO)) return autenticado ? children : null;

  return (
    <>
      <FundoDecorativo />
      <div className="flex h-screen flex-col">
        <BarraDeTitulo
          acoes={
            <>
              {autenticado && <MenuDoUsuario />}
              <SeletorTema />
            </>
          }
        />
        {autenticado ? (
          <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
            {lateralRetraida ? (
              <div className="vidro flex w-9 shrink-0 flex-col items-center rounded-2xl py-3">
                <BotaoIcone
                  icone={PanelLeftOpen}
                  rotulo="Mostrar menu lateral"
                  onClick={() => setLateralRetraida(false)}
                />
              </div>
            ) : (
              <BarraLateral permissoes={permissoes} aoRetrair={() => setLateralRetraida(true)} />
            )}
            <main className="min-w-0 flex-1 overflow-y-auto rounded-2xl">{children}</main>
          </div>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto">{naTelaDeLogin ? children : null}</main>
        )}
      </div>
    </>
  );
}
