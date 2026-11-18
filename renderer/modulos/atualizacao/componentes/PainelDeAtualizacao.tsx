'use client';

import { Monitor, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  type AppAbertoDTO,
  type EstadoDaAtualizacaoDTO,
  JANELA_DA_ATUALIZACAO_EM_MINUTOS,
  PRAZOS_DE_FECHAMENTO_EM_MINUTOS,
  TAMANHO_DA_MENSAGEM_DE_ATUALIZACAO,
} from '@contratos/atualizacao.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto, Selecao } from '@/compartilhado/ui/Campos';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { formatarContagem } from './AvisoDeAtualizacao';

const INTERVALO_MS = 10_000;
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeStyle: 'short' });

/**
 * Painel inicial (administrador): pedir que todos fechem o app antes de trocar o .exe na pasta de rede,
 * acompanhando quem ainda está com o app aberto (inclusive parado na tela de login ou na apresentação).
 */
export function PainelDeAtualizacao() {
  const [estado, setEstado] = useState<EstadoDaAtualizacaoDTO | null>(null);
  const [apps, setApps] = useState<AppAbertoDTO[] | null>(null);
  const [pedindo, setPedindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  const atualizar = useCallback(
    () =>
      Promise.all([clienteDesktop.atualizacao.obterEstado(), clienteDesktop.atualizacao.listarAppsAbertos()])
        .then(([novoEstado, novosApps]) => {
          setEstado(novoEstado);
          setApps(novosApps);
          setAgora(Date.now());
        })
        .catch((falha: unknown) => setErro(mensagemDeErro(falha))),
    [],
  );

  useEffect(() => {
    void atualizar();
    const temporizador = setInterval(() => void atualizar(), INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [atualizar]);

  const cancelar = async () => {
    try {
      setEstado(await clienteDesktop.atualizacao.cancelar());
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  };

  if (!estado || estado.emApresentacao) return null;
  const outrosApps = apps?.filter((app) => !app.esteApp) ?? [];

  return (
    <PainelVidro className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <RefreshCw aria-hidden className="size-4 text-primaria" />
            <h2 className="text-sm font-semibold">Atualização do sistema</h2>
          </div>
          <p className="mt-1 text-sm text-texto-secundario">
            Para trocar o executável na pasta de rede, todos precisam fechar o app. O pedido aparece na frente da
            tela de cada um, com contagem regressiva; no fim do prazo o app fecha sozinho.
          </p>
        </div>
        {estado.fase === 'normal' ? (
          <Botao variante="primario" icone={RefreshCw} onClick={() => setPedindo(true)}>
            Pedir fechamento para atualizar
          </Botao>
        ) : estado.fase === 'aviso' ? (
          <Botao icone={X} onClick={() => void cancelar()}>
            Cancelar pedido
          </Botao>
        ) : null}
      </div>

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      {estado.fase === 'aviso' && estado.fecharEm && (
        <p className="rounded-lg border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm">
          Pedido de <strong>{estado.solicitadoPor}</strong>: os apps fecham às {hora(estado.fecharEm)} (em{' '}
          <span className="tabular-nums">{formatarContagem(new Date(estado.fecharEm).getTime() - agora)}</span>).
        </p>
      )}
      {estado.fase === 'bloqueado' && (
        <p className="rounded-lg border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm">
          Prazo vencido: os apps estão fechando e não abrem até a versão nova ser aberta (ou por{' '}
          {JANELA_DA_ATUALIZACAO_EM_MINUTOS} min). Já dá para trocar o executável.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-texto-sutil">
          Apps abertos agora{apps ? ` (${apps.length})` : ''}
        </h3>
        {apps === null ? (
          <p className="text-sm text-texto-secundario">Carregando…</p>
        ) : (
          <ul className="flex flex-col divide-y divide-borda/50">
            {apps.map((app) => (
              <li key={app.instanciaId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Monitor aria-hidden className="size-4 text-texto-sutil" />
                <span className="font-medium">{app.usuario ?? 'Tela de login'}</span>
                <span className="text-texto-secundario">
                  {app.computador} · Windows: {app.usuarioDoWindows}
                </span>
                {app.modo === 'apresentacao' && <Etiqueta tom="alerta">apresentação</Etiqueta>}
                {app.esteApp && <Etiqueta tom="primaria">este app</Etiqueta>}
                <span className="ml-auto text-xs text-texto-sutil tabular-nums">
                  v{app.versao} · desde {hora(app.desde)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {estado.fase !== 'normal' && apps !== null && outrosApps.length === 0 && (
          <p className="mt-2 text-sm text-sucesso">
            Só o seu app continua aberto. Feche-o e troque o executável na pasta de rede.
          </p>
        )}
      </div>

      <PedirFechamento
        aberto={pedindo}
        aoFechar={() => setPedindo(false)}
        aoPedir={(novo) => {
          setEstado(novo);
          setPedindo(false);
          void atualizar();
        }}
      />
    </PainelVidro>
  );
}

function PedirFechamento({
  aberto,
  aoFechar,
  aoPedir,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoPedir: (estado: EstadoDaAtualizacaoDTO) => void;
}) {
  const [minutos, setMinutos] = useState('5');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      aoPedir(await clienteDesktop.atualizacao.solicitar({ minutos: Number(minutos), mensagem: mensagem.trim() || null }));
      setMensagem('');
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto={aberto}
      titulo="Pedir fechamento para atualizar"
      descricao="Todos os apps abertos (inclusive o seu) mostram o aviso na frente da tela e fecham sozinhos no fim do prazo."
      aoFechar={aoFechar}
    >
      <div className="flex flex-col gap-4">
        <Selecao
          rotulo="Prazo para fechar"
          value={minutos}
          onChange={(evento) => setMinutos(evento.target.value)}
          opcoes={PRAZOS_DE_FECHAMENTO_EM_MINUTOS.map((valor) => ({ valor: String(valor), rotulo: `${valor} minutos` }))}
        />
        <AreaTexto
          rotulo="Mensagem (opcional)"
          placeholder="Ex.: Nova versão com o histórico do chat. Volta em 10 minutos."
          maxLength={TAMANHO_DA_MENSAGEM_DE_ATUALIZACAO}
          value={mensagem}
          onChange={(evento) => setMensagem(evento.target.value)}
        />
        <p className="text-xs text-texto-sutil">
          Depois do prazo, o app não abre por {JANELA_DA_ATUALIZACAO_EM_MINUTOS} minutos, ou até alguém abrir a versão
          nova (o que acontecer primeiro). Quem estiver editando sem salvar perde o que não salvou.
        </p>
        {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
      </div>
      <RodapeModal>
        <Botao onClick={aoFechar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao variante="primario" onClick={() => void enviar()} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar aviso'}
        </Botao>
      </RodapeModal>
    </Modal>
  );
}
