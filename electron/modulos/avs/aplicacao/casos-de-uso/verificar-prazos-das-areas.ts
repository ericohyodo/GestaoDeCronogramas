import { diaLocal, somarDiasUteis } from '../../../../nucleo/dominio/calendario';
import type { Notificador } from '../../../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { obterEtapaAv } from '../../dominio/etapa-av';
import { type RepositorioPrazosArea, situacaoDoPrazo } from '../../dominio/prazo-area';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import { linkDaAv, resumoDaAv, ROTULO_DA_AREA } from '../notificacoes-av';

/** dd/mm de uma data AAAA-MM-DD. */
const diaMes = (dataIso: string) => `${dataIso.slice(8, 10)}/${dataIso.slice(5, 7)}`;

/**
 * Rotina: avisa o responsável da área quando o prazo está vencendo (véspera útil ou o próprio dia) e quando
 * entra em atraso. Cada aviso sai uma vez por etapa da AV (chave de deduplicação), mesmo com a rotina
 * rodando em vários PCs. AVs do histórico, encerradas ou sem responsável na área não geram aviso.
 */
export class VerificarPrazosDasAreas {
  /**
   * @param avs repositório das AVs
   * @param prazos prazos das áreas
   * @param notificador sino dos usuários
   * @param relogio data de referência
   */
  constructor(
    private readonly avs: RepositorioAvs,
    private readonly prazos: RepositorioPrazosArea,
    private readonly notificador: Notificador,
    private readonly relogio: Relogio,
  ) {}

  /** @returns quantos avisos foram enviados ao notificador (os repetidos são descartados por ele) */
  async executar(): Promise<number> {
    const hoje = diaLocal(this.relogio.agora());
    const abertos = await this.prazos.listarAbertos();
    if (abertos.length === 0) return 0;
    const avs = new Map((await this.avs.listar()).map((av) => [av.id, av]));
    let avisos = 0;
    for (const prazo of abertos) {
      const av = avs.get(prazo.avId);
      const responsavel = av?.membros[prazo.area];
      if (!av || av.historico || obterEtapaAv(av.etapaAtual).terminal || !responsavel) continue;
      const situacao = situacaoDoPrazo(prazo, hoje);
      if (situacao !== 'vencendo' && situacao !== 'atrasada') continue;
      const area = ROTULO_DA_AREA[prazo.area];
      await this.notificador.notificar({
        usuarioIds: [responsavel],
        tipo: situacao === 'vencendo' ? 'av.area_vencendo' : 'av.area_atrasada',
        titulo:
          situacao === 'vencendo'
            ? `${av.numero} · ${area} vence em ${diaMes(prazo.dataLimite)}`
            : `${av.numero} · ${area} em atraso desde ${diaMes(somarDiasUteis(prazo.dataLimite, 1))}`,
        mensagem: resumoDaAv(av),
        link: linkDaAv(av.id),
        chave: `${av.id}:${prazo.etapa}:${situacao}`,
      });
      avisos += 1;
    }
    return avisos;
  }
}
