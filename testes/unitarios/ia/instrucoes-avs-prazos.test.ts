import { describe, expect, it } from 'vitest';
import { INSTRUCOES_FIXAS_DA_ANALISE_AVS } from '../../../electron/modulos/ia/aplicacao/instrucoes-avs';

describe('instruções da IA para as AVs', () => {
  it('explicam o prazo da área sem confundir com o prazo do cliente', () => {
    for (const campo of ['areaComPrazo', 'prazoArea', 'situacaoPrazoArea', 'diasUteisDeAtraso']) {
      expect(INSTRUCOES_FIXAS_DA_ANALISE_AVS).toContain(`"${campo}"`);
    }
  });
});
