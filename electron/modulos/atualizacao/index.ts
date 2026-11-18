/**
 * API pública do módulo Atualização: aviso de fechamento para trocar o .exe na pasta de rede e a lista de
 * apps abertos. O processo principal vigia o aviso e fecha este app quando o prazo vence.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import {
  CancelarFechamento,
  type DependenciasDaAtualizacao,
  ListarAppsAbertos,
  ObterEstadoDaAtualizacao,
  SolicitarFechamento,
  VigiaDaAtualizacao,
} from './aplicacao/casos-de-uso';
import type { EsteApp, QuemEstaLogado } from './aplicacao/portas';
import { registrarIpcAtualizacao } from './apresentacao/controlador-ipc-atualizacao';
import { QuadroDaAtualizacaoEmArquivo } from './infraestrutura/quadro-da-atualizacao-em-arquivo';

/** O vigia confere o aviso neste intervalo. */
const INTERVALO_DO_VIGIA_EM_MS = 10_000;
/** Na fase bloqueada, tempo para a tela mostrar o aviso antes de o app fechar. */
const TEMPO_PARA_LER_O_AVISO_EM_MS = 12_000;

export interface DependenciasModuloAtualizacao {
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  /** Pasta dos dados reais (na rede), mesmo no modo apresentação. */
  pastaDosDados: string;
  esteApp: EsteApp;
  logado: QuemEstaLogado;
  /** Fecha o app (o fechamento normal, que tira este app da lista e fecha o banco). */
  fecharApp(): void;
}

export interface ModuloAtualizacao {
  /** Começa a vigiar o aviso (a primeira conferência é imediata). */
  iniciar(): void;
  encerrar(): void;
}

export function montarModuloAtualizacao(deps: DependenciasModuloAtualizacao): ModuloAtualizacao {
  const dependencias: DependenciasDaAtualizacao = {
    quadro: new QuadroDaAtualizacaoEmArquivo(deps.pastaDosDados),
    esteApp: deps.esteApp,
    logado: deps.logado,
    relogio: deps.relogio,
    geradorDeId: deps.geradorDeId,
  };
  registrarIpcAtualizacao(deps.ipc, {
    obterEstado: new ObterEstadoDaAtualizacao(dependencias),
    solicitar: new SolicitarFechamento(dependencias),
    cancelar: new CancelarFechamento(dependencias),
    listarAppsAbertos: new ListarAppsAbertos(dependencias),
    fecharEsteApp: deps.fecharApp,
  });

  const vigia = new VigiaDaAtualizacao(dependencias);
  let temporizador: ReturnType<typeof setInterval> | null = null;
  let fechamento: ReturnType<typeof setTimeout> | null = null;

  const conferir = async () => {
    try {
      if ((await vigia.verificar()) === 'bloqueado' && !fechamento) {
        console.info('[atualizacao] prazo do fechamento vencido: o app vai fechar.');
        fechamento = setTimeout(deps.fecharApp, TEMPO_PARA_LER_O_AVISO_EM_MS);
      }
    } catch (erro) {
      console.error('[atualizacao] falha ao conferir o aviso:', erro);
    }
  };

  return {
    iniciar() {
      void conferir();
      temporizador = setInterval(() => void conferir(), INTERVALO_DO_VIGIA_EM_MS);
    },
    encerrar() {
      if (temporizador) clearInterval(temporizador);
      if (fechamento) clearTimeout(fechamento);
      vigia.sair();
    },
  };
}
