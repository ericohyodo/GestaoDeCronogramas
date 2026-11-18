import { describe, expect, it } from 'vitest';
import { situacaoDoPrazo } from '../../../electron/modulos/avs/dominio/prazo-area';

describe('situação do prazo da área', () => {
  const aberto = { dataLimite: '2026-09-30', entregueEm: null };

  it('prazo aberto: no prazo, vencendo (véspera útil ou o próprio dia) e atrasada', () => {
    expect(situacaoDoPrazo(aberto, '2026-09-25')).toBe('no_prazo');
    expect(situacaoDoPrazo(aberto, '2026-09-28')).toBe('no_prazo');
    expect(situacaoDoPrazo(aberto, '2026-09-29')).toBe('vencendo');
    expect(situacaoDoPrazo(aberto, '2026-09-30')).toBe('vencendo');
    expect(situacaoDoPrazo(aberto, '2026-10-01')).toBe('atrasada');
  });

  it('véspera útil atravessa o fim de semana: limite na segunda vence a partir de sexta', () => {
    expect(situacaoDoPrazo({ dataLimite: '2026-10-05', entregueEm: null }, '2026-10-02')).toBe('vencendo');
    expect(situacaoDoPrazo({ dataLimite: '2026-10-05', entregueEm: null }, '2026-10-01')).toBe('no_prazo');
  });

  it('prazo entregue: no prazo até o fim do dia-limite, com atraso depois', () => {
    expect(situacaoDoPrazo({ dataLimite: '2026-09-30', entregueEm: new Date('2026-09-30T20:00:00Z') }, '2026-10-10')).toBe(
      'entregue_no_prazo',
    );
    expect(situacaoDoPrazo({ dataLimite: '2026-09-30', entregueEm: new Date('2026-10-02T12:00:00Z') }, '2026-10-10')).toBe(
      'entregue_com_atraso',
    );
  });
});
