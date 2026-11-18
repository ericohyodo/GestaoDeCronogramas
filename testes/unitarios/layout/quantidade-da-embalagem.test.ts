import { describe, expect, it } from 'vitest';
import {
  formatarQuantidade,
  pecasValidas,
  quantidadeDasPecas,
} from '../../../renderer/modulos/avs/quantidade-da-embalagem';

describe('quantidade da embalagem na estrutura', () => {
  it('só aceita peças inteiras e positivas', () => {
    expect(pecasValidas('50')).toBe(50);
    for (const texto of ['', ' ', '0', '-3', '2.5', 'abc']) expect(pecasValidas(texto)).toBeNull();
  });

  it('a quantidade é 1/peças', () => {
    expect(Number(quantidadeDasPecas('50'))).toBeCloseTo(0.02, 12);
    expect(Number(quantidadeDasPecas('1'))).toBe(1);
    expect(quantidadeDasPecas('0')).toBe('');
  });

  it('formata com até 6 casas em pt-BR', () => {
    expect(formatarQuantidade(quantidadeDasPecas('50'))).toBe('0,02');
    expect(formatarQuantidade(quantidadeDasPecas('30'))).toBe('0,033333');
    expect(formatarQuantidade('')).toBe('');
  });
});
