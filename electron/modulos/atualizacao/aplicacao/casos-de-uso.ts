import {
  type AppAbertoDTO,
  type EstadoDaAtualizacaoDTO,
  JANELA_DA_ATUALIZACAO_EM_MINUTOS,
  PRAZOS_DE_FECHAMENTO_EM_MINUTOS,
  type SolicitarFechamentoEntrada,
  TAMANHO_DA_MENSAGEM_DE_ATUALIZACAO,
} from '@contratos/atualizacao.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import { type AvisoDeAtualizacao, type FaseDaAtualizacao, faseDaAtualizacao } from '../dominio/aviso-de-atualizacao';
import type { EsteApp, QuadroDaAtualizacao, QuemEstaLogado } from './portas';

// =====================================================================================================
// Atualização do sistema: pedido de fechamento (administrador), contagem regressiva em todos os apps e a
// lista de quem ainda está com o app aberto (o que trava a troca do .exe na pasta de rede).
// =====================================================================================================

/** Cada app renova o próprio registro neste intervalo; sem sinal por 90 s, deixa de contar como aberto. */
export const INTERVALO_DO_SINAL_EM_MS = 30_000;
export const VALIDADE_DO_SINAL_EM_MS = 90_000;
/** Registros sem sinal há mais de um dia são apagados (app encerrado à força, queda de energia). */
const LIMPEZA_DE_REGISTROS_EM_MS = 24 * 60 * 60_000;

export interface DependenciasDaAtualizacao {
  quadro: QuadroDaAtualizacao;
  esteApp: EsteApp;
  logado: QuemEstaLogado;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
}

/**
 * Lê o aviso e calcula a fase deste app. Um aviso vencido (ou superado por esta versão) é apagado aqui.
 * Sem acesso à pasta de rede, o app segue normal (não trava o trabalho por falha de leitura).
 */
async function avisoEFase(deps: DependenciasDaAtualizacao): Promise<{ aviso: AvisoDeAtualizacao | null; fase: FaseDaAtualizacao }> {
  let aviso: AvisoDeAtualizacao | null;
  try {
    aviso = await deps.quadro.lerAviso();
  } catch {
    return { aviso: null, fase: 'normal' };
  }
  const { fase, encerrado } = faseDaAtualizacao(aviso, deps.relogio.agora(), deps.esteApp.versao, JANELA_DA_ATUALIZACAO_EM_MINUTOS * 60_000);
  if (encerrado && aviso) {
    await deps.quadro.apagarAviso(aviso.id).catch(() => undefined);
    return { aviso: null, fase };
  }
  return { aviso, fase };
}

/** Estado para a tela: modal de contagem regressiva ou aviso de bloqueio. */
export class ObterEstadoDaAtualizacao implements CasoDeUso<void, EstadoDaAtualizacaoDTO> {
  constructor(private readonly deps: DependenciasDaAtualizacao) {}

  async executar(): Promise<EstadoDaAtualizacaoDTO> {
    const { aviso, fase } = await avisoEFase(this.deps);
    const ativo = fase !== 'normal' && aviso;
    return {
      fase,
      fecharEm: ativo ? aviso.fecharEm.toISOString() : null,
      solicitadoPor: ativo ? aviso.solicitadoPor : null,
      mensagem: ativo ? aviso.mensagem : null,
      emApresentacao: this.deps.esteApp.modo === 'apresentacao',
    };
  }
}

function recusarNaApresentacao(esteApp: EsteApp): void {
  if (esteApp.modo === 'apresentacao') {
    throw new ErroDeDominio(
      'INDISPONIVEL_NA_APRESENTACAO',
      'No modo apresentação não dá para pedir atualização. Saia da apresentação e faça o pedido no app normal.',
    );
  }
}

/** Administrador: pede que todos fechem o app até o prazo (substitui um pedido anterior). */
export class SolicitarFechamento implements CasoDeUso<SolicitarFechamentoEntrada, EstadoDaAtualizacaoDTO> {
  constructor(private readonly deps: DependenciasDaAtualizacao) {}

  async executar(entrada: SolicitarFechamentoEntrada): Promise<EstadoDaAtualizacaoDTO> {
    recusarNaApresentacao(this.deps.esteApp);
    if (!(PRAZOS_DE_FECHAMENTO_EM_MINUTOS as readonly number[]).includes(entrada.minutos)) {
      throw new ErroDeDominio('PRAZO_INVALIDO', `Escolha um prazo de ${PRAZOS_DE_FECHAMENTO_EM_MINUTOS.join(', ')} minutos.`);
    }
    const mensagem = entrada.mensagem?.trim().slice(0, TAMANHO_DA_MENSAGEM_DE_ATUALIZACAO) || null;
    const agora = this.deps.relogio.agora();
    await this.deps.quadro.gravarAviso({
      id: this.deps.geradorDeId.gerar(),
      fecharEm: new Date(agora.getTime() + entrada.minutos * 60_000),
      solicitadoEm: agora,
      solicitadoPor: this.deps.logado.nomeDoUsuarioAtual() ?? 'Administrador',
      mensagem,
      versaoNoPedido: this.deps.esteApp.versao,
    });
    return new ObterEstadoDaAtualizacao(this.deps).executar();
  }
}

/** Administrador: desiste do pedido durante a contagem regressiva. */
export class CancelarFechamento implements CasoDeUso<void, EstadoDaAtualizacaoDTO> {
  constructor(private readonly deps: DependenciasDaAtualizacao) {}

  async executar(): Promise<EstadoDaAtualizacaoDTO> {
    recusarNaApresentacao(this.deps.esteApp);
    await this.deps.quadro.apagarAviso();
    return new ObterEstadoDaAtualizacao(this.deps).executar();
  }
}

/** Administrador: quem está com o app aberto agora, em qualquer computador (mais antigos primeiro). */
export class ListarAppsAbertos implements CasoDeUso<void, AppAbertoDTO[]> {
  constructor(private readonly deps: DependenciasDaAtualizacao) {}

  async executar(): Promise<AppAbertoDTO[]> {
    const agora = this.deps.relogio.agora().getTime();
    await this.deps.quadro.apagarAppsSemSinalDesde(new Date(agora - LIMPEZA_DE_REGISTROS_EM_MS)).catch(() => undefined);
    return (await this.deps.quadro.listarApps())
      .filter((app) => agora - app.ultimoSinal.getTime() <= VALIDADE_DO_SINAL_EM_MS)
      .sort((a, b) => a.desde.getTime() - b.desde.getTime())
      .map((app) => ({
        instanciaId: app.instanciaId,
        computador: app.computador,
        usuarioDoWindows: app.usuarioDoWindows,
        usuario: app.usuario,
        modo: app.modo,
        versao: app.versao,
        desde: app.desde.toISOString(),
        esteApp: app.instanciaId === this.deps.esteApp.instanciaId,
      }));
  }
}

/**
 * Vigia deste app (roda no processo principal, a cada poucos segundos): renova o registro de app aberto e
 * devolve a fase. Na fase `bloqueado` quem chamou fecha o app.
 */
export class VigiaDaAtualizacao {
  private ultimoSinal = 0;

  constructor(private readonly deps: DependenciasDaAtualizacao) {}

  async verificar(): Promise<FaseDaAtualizacao> {
    const agora = this.deps.relogio.agora();
    if (agora.getTime() - this.ultimoSinal >= INTERVALO_DO_SINAL_EM_MS) {
      try {
        await this.deps.quadro.registrarApp({ ...this.deps.esteApp, usuario: this.deps.logado.nomeDoUsuarioAtual(), ultimoSinal: agora });
        this.ultimoSinal = agora.getTime();
      } catch (erro) {
        console.warn('[atualizacao] não foi possível registrar este app na pasta compartilhada:', erro);
      }
    }
    return (await avisoEFase(this.deps)).fase;
  }

  /** No fechamento do app: sai da lista de apps abertos. */
  sair(): void {
    this.deps.quadro.removerApp(this.deps.esteApp.instanciaId);
  }
}
