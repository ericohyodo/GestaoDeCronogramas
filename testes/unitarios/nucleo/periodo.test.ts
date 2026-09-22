import { describe, expect, it } from 'vitest';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import { Periodo } from '../../../electron/nucleo/dominio/periodo';

describe('Periodo', () => {
  it('calcula a duração contando o dia inicial e o final', () => {
    expect(Periodo.criar('2026-09-01', '2026-09-01').duracaoEmDias).toBe(1);
    expect(Periodo.criar('2026-09-01', '2026-09-30').duracaoEmDias).toBe(30);
    expect(Periodo.criar('2026-02-27', '2026-03-02').duracaoEmDias).toBe(4);
  });

  it('rejeita término anterior ao início', () => {
    expect(() => Periodo.criar('2026-09-10', '2026-09-09')).toThrow(ErroDeValidacao);
  });

  it.each(['2026-9-1', '22/09/2026', '2026-02-30', '2026-13-01', ''])(
    'rejeita a data inválida "%s"',
    (data) => {
      expect(() => Periodo.criar(data, '2026-12-31')).toThrow(ErroDeValidacao);
    },
  );

  it('cria um novo período alterando só uma das pontas', () => {
    const periodo = Periodo.criar('2026-09-01', '2026-09-30');
    const alterado = periodo.com({ fim: '2026-10-15' });
    expect(alterado).toMatchObject({ inicio: '2026-09-01', fim: '2026-10-15' });
    expect(periodo.fim).toBe('2026-09-30');
  });
});
