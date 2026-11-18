import { describe, expect, it } from 'vitest';
import {
  capacidadeDaLinha,
  cargaFuturaMensal,
  linhaDeCargaCompleta,
  turnosNecessarios,
} from '../../../renderer/modulos/avs/capacidade';
import { validarConfigCapacidade } from '../../../electron/modulos/avs/dominio/capacidade';

const PARAMETROS = { horasPorTurno: 8, diasProdutivosMes: 22 };

describe('capacidade do PCP', () => {
  it('carga futura = volume anual ÷ 12 ÷ conversão', () => {
    expect(cargaFuturaMensal(48_000, '1')).toBe(4_000);
    expect(cargaFuturaMensal(48_000, '')).toBe(4_000);
    // Fundição: uma placa vira 8 peças → 500 placas/mês.
    expect(cargaFuturaMensal(48_000, '8')).toBe(500);
    expect(cargaFuturaMensal(null, '1')).toBeNull();
    expect(cargaFuturaMensal(48_000, '0')).toBeNull();
  });

  it('turnos = carga ÷ (pçs/h × horas por turno × dias)', () => {
    // 100 pç/h × 8 h × 22 dias = 17.600 pç por turno no mês.
    expect(turnosNecessarios(17_600, '100', PARAMETROS)).toBe(1);
    expect(turnosNecessarios(8_800, '100', PARAMETROS)).toBe(0.5);
    expect(turnosNecessarios(1_000, '0', PARAMETROS)).toBeNull();
    expect(turnosNecessarios(1_000, '', PARAMETROS)).toBeNull();
  });

  it('turnos de hoje e com o item somam a carga atual e a futura', () => {
    const resultado = capacidadeDaLinha({ pecasHora: '100', conversao: '2', cargaAtual: '8800' }, 211_200, PARAMETROS);
    // 211.200 ÷ 12 ÷ 2 = 8.800/mês → 0,5 turno a mais.
    expect(resultado).toEqual({ cargaFutura: 8_800, turnosAtuais: 0.5, turnosComItem: 1 });
    expect(capacidadeDaLinha({ pecasHora: '100', conversao: '1', cargaAtual: '' }, 12_000, PARAMETROS)).toEqual({
      cargaFutura: 1_000,
      turnosAtuais: null,
      turnosComItem: null,
    });
  });

  it('linha completa exige pçs/h > 0, conversão > 0 e carga atual', () => {
    expect(linhaDeCargaCompleta({ pecasHora: '100', conversao: '1', cargaAtual: '0' })).toBe(true);
    expect(linhaDeCargaCompleta({ pecasHora: '100', conversao: '', cargaAtual: '10' })).toBe(true);
    expect(linhaDeCargaCompleta({ pecasHora: '0', conversao: '1', cargaAtual: '10' })).toBe(false);
    expect(linhaDeCargaCompleta({ pecasHora: '100', conversao: '0', cargaAtual: '10' })).toBe(false);
    expect(linhaDeCargaCompleta({ pecasHora: '100', conversao: '1', cargaAtual: '' })).toBe(false);
  });

  it('parâmetros: horas de 0 a 24 e dias inteiros de 1 a 31', () => {
    expect(validarConfigCapacidade({ horasPorTurno: 8.8, diasProdutivosMes: 21 })).toEqual({
      horasPorTurno: 8.8,
      diasProdutivosMes: 21,
    });
    expect(() => validarConfigCapacidade({ horasPorTurno: 0, diasProdutivosMes: 22 })).toThrow(/horas/);
    expect(() => validarConfigCapacidade({ horasPorTurno: 8, diasProdutivosMes: 22.5 })).toThrow(/dias/);
  });
});
