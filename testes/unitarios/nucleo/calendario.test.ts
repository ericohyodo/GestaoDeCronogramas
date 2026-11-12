import { describe, expect, it } from 'vitest';
import { diasUteisEntre, somarDiasCorridos, somarDiasUteis } from '../../../electron/nucleo/dominio/calendario';

describe('calendário', () => {
  it('soma dias úteis pulando sábado e domingo (feriados ainda não contam)', () => {
    expect(somarDiasUteis('2026-09-25', 3)).toBe('2026-09-30'); // sexta + 3 = quarta
    expect(somarDiasUteis('2026-09-26', 1)).toBe('2026-09-28'); // sábado + 1 = segunda
    expect(somarDiasUteis('2026-12-31', 3)).toBe('2027-01-05'); // virada de ano
    expect(somarDiasUteis('2026-10-30', 3)).toBe('2026-11-04'); // virada de mês
  });

  it('soma dias corridos', () => {
    expect(somarDiasCorridos('2026-11-12', 180)).toBe('2027-05-11');
    expect(somarDiasCorridos('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('conta dias úteis entre duas datas (início exclusivo, fim inclusivo)', () => {
    expect(diasUteisEntre('2026-09-30', '2026-10-05')).toBe(3); // qui, sex, seg
    expect(diasUteisEntre('2026-09-30', '2026-09-30')).toBe(0);
    expect(diasUteisEntre('2026-10-05', '2026-09-30')).toBe(0);
  });
});
