import { somarDiasCorridos } from '../../../../nucleo/dominio/calendario';
import type { RepositorioPrazosArea } from '../../dominio/prazo-area';

/** Dias úteis de atraso do prazo de exemplo atrasado. */
const DIAS_UTEIS_DE_ATRASO = 3;

/**
 * Volta N dias úteis a partir de uma data (sábado e domingo não contam).
 * @returns a data resultante (AAAA-MM-DD)
 */
function voltarDiasUteis(dataIso: string, dias: number): string {
  let data = dataIso;
  let restantes = dias;
  while (restantes > 0) {
    data = somarDiasCorridos(data, -1);
    const diaDaSemana = new Date(`${data}T00:00:00Z`).getUTCDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) restantes -= 1;
  }
  return data;
}

/**
 * Só para o modo Apresentação: as AVs de exemplo são criadas "agora", então todos os prazos nasceriam no
 * prazo. Para a faixa "Prazos das áreas" mostrar os três estados, o primeiro prazo aberto passa a estar
 * atrasado (3 dias úteis) e o segundo vence hoje.
 * @param prazos repositório dos prazos (banco fictício da apresentação)
 * @param hoje dia de referência (AAAA-MM-DD)
 */
export async function ajustarPrazosDeExemplo(
  prazos: Pick<RepositorioPrazosArea, 'listarAbertos' | 'redefinirLimite'>,
  hoje: string,
): Promise<void> {
  const [atrasado, vencendo] = await prazos.listarAbertos();
  if (atrasado) await prazos.redefinirLimite(atrasado.avId, atrasado.etapa, voltarDiasUteis(hoje, DIAS_UTEIS_DE_ATRASO));
  if (vencendo) await prazos.redefinirLimite(vencendo.avId, vencendo.etapa, hoje);
}
