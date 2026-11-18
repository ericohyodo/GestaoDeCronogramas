'use client';

import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { EstadoDaAtualizacaoDTO } from '@contratos/atualizacao.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';

/** O app confere o aviso neste intervalo (o processo principal também vigia e fecha no prazo). */
const INTERVALO_DE_CONSULTA_MS = 10_000;
/** No último minuto o aviso volta para a frente, mesmo minimizado. */
const ULTIMO_MINUTO_MS = 60_000;

/** "4:05" a partir de milissegundos. */
export function formatarContagem(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeStyle: 'short' });

function fecharAgora() {
  void clienteDesktop.atualizacao.fecharAgora().catch(() => undefined);
}

/**
 * Aviso de atualização, por cima de tudo (inclusive na tela de login):
 * - pedido de fechamento: contagem regressiva, "Fechar agora" ou minimizar para salvar o trabalho;
 * - prazo vencido: o app avisa e fecha sozinho (quem fecha é o processo principal).
 */
export function AvisoDeAtualizacao() {
  const [estado, setEstado] = useState<EstadoDaAtualizacaoDTO | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [minimizadoPara, setMinimizadoPara] = useState<string | null>(null);

  const consultar = useCallback(
    () =>
      clienteDesktop.atualizacao
        .obterEstado()
        .then(setEstado)
        .catch(() => undefined),
    [],
  );

  useEffect(() => {
    void consultar();
    const temporizador = setInterval(() => void consultar(), INTERVALO_DE_CONSULTA_MS);
    return () => clearInterval(temporizador);
  }, [consultar]);

  const fase = estado?.fase ?? 'normal';
  useEffect(() => {
    if (fase === 'normal') return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, [fase]);

  if (!estado || fase === 'normal' || !estado.fecharEm) return null;

  const restante = new Date(estado.fecharEm).getTime() - agora;
  // Minimizar vale para este pedido; um pedido novo (outro prazo) volta para a frente.
  const minimizado = minimizadoPara === estado.fecharEm && restante > ULTIMO_MINUTO_MS;

  if (fase === 'bloqueado') {
    return (
      <DialogoFixo titulo="Sistema em atualização" icone={<RefreshCw aria-hidden className="size-5 animate-spin [animation-duration:3s]" />}>
        <p className="text-sm text-texto-secundario">
          O prazo para fechar o app terminou e a versão está sendo trocada. O app vai fechar em instantes.
          Tente abrir de novo em alguns minutos.
        </p>
        <div className="mt-6 flex justify-end">
          <Botao variante="primario" icone={LogOut} onClick={fecharAgora}>
            Fechar agora
          </Botao>
        </div>
      </DialogoFixo>
    );
  }

  if (minimizado) {
    return (
      <div
        role="status"
        className="vidro-forte fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 shadow-lg"
      >
        <Clock aria-hidden className="size-4 text-alerta" />
        <span className="text-sm">
          Atualização: o app fecha em{' '}
          <strong className="tabular-nums">{formatarContagem(restante)}</strong>
        </span>
        <Botao tamanho="sm" variante="primario" onClick={fecharAgora}>
          Fechar agora
        </Botao>
      </div>
    );
  }

  return (
    <DialogoFixo
      titulo="Atualização do sistema"
      icone={<Clock aria-hidden className="size-5" />}
      aoEsc={() => setMinimizadoPara(estado.fecharEm)}
    >
      <p className="text-sm text-texto-secundario">
        <strong className="font-semibold text-texto">{estado.solicitadoPor}</strong> vai atualizar o app e pediu
        que todos o fechem.
      </p>
      {estado.mensagem && (
        <p className="mt-3 whitespace-pre-line rounded-lg border border-borda/70 bg-superficie-solida/60 px-3 py-2 text-sm">
          {estado.mensagem}
        </p>
      )}
      <div className="mt-5 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums text-alerta">{formatarContagem(restante)}</span>
        <span className="text-sm text-texto-secundario">
          Às {hora(estado.fecharEm)} o app fecha sozinho. Salve o que estiver editando antes disso.
        </span>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {restante > ULTIMO_MINUTO_MS && (
          <Botao onClick={() => setMinimizadoPara(estado.fecharEm)}>Salvar meu trabalho primeiro</Botao>
        )}
        <Botao variante="primario" icone={LogOut} onClick={fecharAgora}>
          Fechar agora
        </Botao>
      </div>
    </DialogoFixo>
  );
}

/**
 * <dialog> modal sempre aberto (fica na camada do topo, acima de outros modais). Esc só minimiza quando
 * `aoEsc` é passado; sem ele, o aviso não sai da frente.
 */
function DialogoFixo({
  titulo,
  icone,
  aoEsc,
  children,
}: {
  titulo: string;
  icone: ReactNode;
  aoEsc?: () => void;
  children: ReactNode;
}) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  return (
    <dialog
      ref={referencia}
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault();
        aoEsc?.();
      }}
      className="vidro-forte m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-6 text-texto backdrop:bg-[#0b1220]/45 backdrop:backdrop-blur-[3px]"
    >
      <div className="mb-3 flex items-center gap-2.5 text-alerta">
        {icone}
        <h2 id={idTitulo} className="text-base font-semibold text-texto">
          {titulo}
        </h2>
      </div>
      {children}
    </dialog>
  );
}
