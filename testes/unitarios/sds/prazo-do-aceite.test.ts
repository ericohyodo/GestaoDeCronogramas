import { describe, expect, it } from 'vitest';
import { estadoDoTermino, leadTimeValido, terminoCalculado } from '../../../renderer/modulos/sds/prazo-do-aceite';

describe('prazo do aceite da SD', () => {
  it('término calculado = início + lead time (180 dias quando a SD não tem lead time)', () => {
    expect(terminoCalculado('2026-11-12', 180)).toBe('2027-05-11');
    expect(terminoCalculado('2026-11-12', 30)).toBe('2026-12-12');
    expect(terminoCalculado('2026-11-12', null)).toBe('2027-05-11');
  });

  it('só exige justificativa quando há lead time e o término difere do calculado', () => {
    expect(estadoDoTermino('2026-11-12', '2027-05-11', 180)).toEqual({
      calculado: '2027-05-11',
      diferencaDias: 0,
      exigeJustificativa: false,
    });
    expect(estadoDoTermino('2026-11-12', '2027-05-23', 180)).toEqual({
      calculado: '2027-05-11',
      diferencaDias: 12,
      exigeJustificativa: true,
    });
    expect(estadoDoTermino('2026-11-12', '2027-05-01', 180).diferencaDias).toBe(-10);
    expect(estadoDoTermino('2026-11-12', '2027-05-23', null).exigeJustificativa).toBe(false); // SD antiga
  });

  it('lead time digitado: só inteiros de 1 a 1825', () => {
    for (const valido of ['1', '180', '1825']) expect(leadTimeValido(valido)).toBe(true);
    for (const invalido of ['', '0', '-5', '12.5', '1e3', '1826', 'abc', ' 90']) expect(leadTimeValido(invalido)).toBe(false);
  });
});
