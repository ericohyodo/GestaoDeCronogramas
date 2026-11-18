import { diaLocal } from '../../../../nucleo/dominio/calendario';
import type { Notificador } from '../../../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { obterEtapaAv } from '../../dominio/etapa-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import { linkDaAv, resumoDaAv, ROTULO_DA_AREA } from '../notificacoes-av';

/** Quantos dias antes do prazo do cliente a AV em andamento gera aviso. */
export const DIAS_PARA_AVISAR_PRAZO_DO_CLIENTE = 5;


/**
 * Rotina automática: AVs em andamento cujo prazo do cliente vence em até 5 dias (ou já venceu) avisam o
 * responsável da área da etapa atual. Uma vez por AV e prazo (se o prazo mudar, avisa de novo).
 */
export class VerificarPrazosDoCliente {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly notificador: Notificador,
    private readonly relogio: Relogio,
  ) {}

  /** @returns quantas AVs geraram aviso */
  async executar(): Promise<number> {
    const hoje = diaLocal(this.relogio.agora());
    const limite = new Date(`${hoje}T00:00:00Z`);
    limite.setUTCDate(limite.getUTCDate() + DIAS_PARA_AVISAR_PRAZO_DO_CLIENTE);
    const ate = limite.toISOString().slice(0, 10);
    let avisadas = 0;
    for (const av of await this.repositorio.listar()) {
      const etapa = obterEtapaAv(av.etapaAtual);
      const prazo = av.prazoCliente?.slice(0, 10);
      if (etapa.terminal || !etapa.area || !prazo || prazo > ate) continue;
      const vencido = prazo < hoje;
      await this.notificador.notificar({
        usuarioIds: [av.membros[etapa.area]],
        tipo: vencido ? 'av.prazo_vencido' : 'av.prazo_proximo',
        chave: `${av.id}:${prazo}`,
        titulo: vencido
          ? `${av.numero}: prazo do cliente vencido`
          : `${av.numero}: prazo do cliente em ${prazo.split('-').reverse().join('/')}`,
        mensagem: `${resumoDaAv(av)}. Etapa atual: ${etapa.nome} (${ROTULO_DA_AREA[etapa.area]}).`,
        link: linkDaAv(av.id),
      });
      avisadas += 1;
    }
    return avisadas;
  }
}
