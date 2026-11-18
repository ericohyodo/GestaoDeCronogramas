import { describe, expect, it } from 'vitest';
import { calcularCustoTotal, novaLinhaMaterial } from '../../../renderer/modulos/avs/linha-de-material';

describe('custo total de item de material', () => {
  it('é quantidade bruta × custo unitário, arredondado a 4 casas', () => {
    const linha = { ...novaLinhaMaterial('a'), qtdeBruta: '1.5', custoUnitario: '2.33333' };
    expect(calcularCustoTotal(linha).custoTotal).toBe('3.5');
    expect(calcularCustoTotal({ ...linha, qtdeBruta: '0.3333', custoUnitario: '3' }).custoTotal).toBe('0.9999');
  });

  it('mantém o custo digitado quando falta quantidade, custo unitário ou o valor não é numérico', () => {
    const linha = { ...novaLinhaMaterial('a'), custoTotal: '9' };
    expect(calcularCustoTotal({ ...linha, qtdeBruta: '', custoUnitario: '2' }).custoTotal).toBe('9');
    expect(calcularCustoTotal({ ...linha, qtdeBruta: '2', custoUnitario: ' ' }).custoTotal).toBe('9');
    expect(calcularCustoTotal({ ...linha, qtdeBruta: 'abc', custoUnitario: '2' }).custoTotal).toBe('9');
  });
});
