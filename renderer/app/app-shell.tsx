'use client';

import { PanelLeftOpen } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { type ModuloApp, moduloDaRota } from '@/compartilhado/layout/modulo-da-rota';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { BarraDeTitulo } from '@/compartilhado/layout/BarraDeTitulo';
import { BarraLateral, NAV_AVS, NAV_PROJETOS, NAV_SDS } from '@/compartilhado/layout/BarraLateral';
import { FundoDecorativo } from '@/compartilhado/layout/FundoDecorativo';
import { SeletorTema } from '@/modulos/preferencias/componentes/SeletorTema';
import { MenuDoUsuario } from '@/modulos/usuarios/componentes/MenuDoUsuario';
import { useSessaoStore } from '@/modulos/usuarios/store/use-sessao-store';

const ROTA_DE_LOGIN = '/login/';
const ROTA_DE_IMPRESSAO = '/impressao';
const ROTA_DE_INICIO = '/';
const CHAVE_MODULO = 'modulo-ativo';

const assinarNada = () => () => {};

function lerModuloSalvo(): ModuloApp | null {
  try {
    const valor = window.sessionStorage.getItem(CHAVE_MODULO);
    return valor === 'avs' || valor === 'sds' || valor === 'projetos' ? valor : null;
  } catch {
    return null;
  }
}

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
  // Só é lido em rotas compartilhadas, depois que a rota de um módulo já gravou o valor.
  const ultimoModulo = useSyncExternalStore(assinarNada, lerModuloSalvo, () => null);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const autenticado = sessao?.usuario != null;
  const naTelaDeLogin = rota === ROTA_DE_LOGIN;

  useEffect(() => {
    if (carregando || !sessao) return;
    if (!autenticado && !naTelaDeLogin) router.replace(ROTA_DE_LOGIN);
    if (autenticado && naTelaDeLogin) router.replace(ROTA_DE_INICIO);
  }, [autenticado, carregando, naTelaDeLogin, router, sessao]);

  // Avisa a cada 30 s que este aplicativo continua aberto (alimenta "Usuários online" na tela inicial).
  useEffect(() => {
    if (!autenticado) return;
    const bater = () => void clienteDesktop.sessao.presenca().catch(() => undefined);
    bater();
    const temporizador = setInterval(bater, 30_000);
    return () => clearInterval(temporizador);
  }, [autenticado]);

  const permissoes = sessao?.permissoes ?? [];

  const moduloAtual = moduloDaRota(rota, ultimoModulo);
  useEffect(() => {
    if (rota === ROTA_DE_INICIO || rota === ROTA_DE_LOGIN) return;
    try {
      window.sessionStorage.setItem(CHAVE_MODULO, moduloAtual);
    } catch {
      // sem sessionStorage: o menu cai no padrão do módulo de Projetos
    }
  }, [moduloAtual, rota]);

  // A rota de impressão é aberta numa janela invisível para virar PDF: sem moldura nem fundo.
  if (rota.startsWith(ROTA_DE_IMPRESSAO)) return autenticado ? children : null;

  // O hub (dois cards) é tela cheia, sem menu lateral — não pertence nem a Projetos nem a AVs.
  const naTelaDeInicio = rota === ROTA_DE_INICIO;
  const navegacao = { avs: NAV_AVS, sds: NAV_SDS, projetos: NAV_PROJETOS }[moduloAtual];

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
          naTelaDeInicio ? (
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          ) : (
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
                <BarraLateral
                  navegacao={navegacao}
                  permissoes={permissoes}
                  aoRetrair={() => setLateralRetraida(true)}
                />
              )}
              <main className="min-w-0 flex-1 overflow-y-auto rounded-2xl">{children}</main>
            </div>
          )
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto">{naTelaDeLogin ? children : null}</main>
        )}
      </div>
    </>
  );
}
