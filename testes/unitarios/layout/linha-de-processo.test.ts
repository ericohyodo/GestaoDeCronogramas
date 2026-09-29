import { describe, expect, it } from 'vitest';
import {
  alterarLinhaProcesso,
  custoAutomatico,
  custoEhManual,
  novaLinhaProcesso,
} from '../../../renderer/modulos/avs/linha-de-processo';

describe('custo total da mão de obra por processo', () => {
  it('é (MOD + MOI + GGF) ÷ peças por hora, e só existe com peças/hora e alguma taxa', () => {
    const linha = { ...novaLinhaProcesso('a'), taxaMod: '45', taxaMoi: '18', taxaGgf: '60', pecasHora: '600' };
    expect(custoAutomatico(linha)).toBe('0.205'); // 123 ÷ 600
    expect(custoAutomatico({ ...linha, pecasHora: '' })).toBe('');
    expect(custoAutomatico({ ...linha, pecasHora: '0' })).toBe('');
    expect(custoAutomatico({ ...linha, taxaMod: '', taxaMoi: '', taxaGgf: '' })).toBe('');
    expect(custoAutomatico({ ...linha, taxaMoi: '', taxaGgf: '' })).toBe('0.075');
  });

  it('acompanha as taxas e as peças/hora enquanto não for editado', () => {
    let linha = novaLinhaProcesso('a');
    linha = alterarLinhaProcesso(linha, 'pecasHora', '100');
    expect(linha.custoTotal).toBe('');
    linha = alterarLinhaProcesso(linha, 'taxaMod', '50');
    expect(linha.custoTotal).toBe('0.5');
    linha = alterarLinhaProcesso(linha, 'taxaGgf', '25');
    expect(linha.custoTotal).toBe('0.75');
    linha = alterarLinhaProcesso(linha, 'pecasHora', '300');
    expect(linha.custoTotal).toBe('0.25');
    expect(linha.custoManual).toBe(false);
  });

  it('um valor digitado à mão é mantido; apagá-lo volta ao cálculo automático', () => {
    let linha = alterarLinhaProcesso(
      alterarLinhaProcesso(novaLinhaProcesso('a'), 'pecasHora', '100'),
      'taxaMod',
      '50',
    );
    linha = alterarLinhaProcesso(linha, 'custoTotal', '9.9');
    expect(linha).toMatchObject({ custoTotal: '9.9', custoManual: true });

    linha = alterarLinhaProcesso(linha, 'taxaMod', '80'); // não sobrescreve o manual
    expect(linha.custoTotal).toBe('9.9');

    linha = alterarLinhaProcesso(linha, 'custoTotal', '');
    expect(linha).toMatchObject({ custoTotal: '0.8', custoManual: false });
  });

  it('ao reabrir, só é manual o custo salvo diferente do cálculo', () => {
    const base = { ...novaLinhaProcesso('a'), taxaMod: '45', taxaMoi: '18', taxaGgf: '60', pecasHora: '600' };
    expect(custoEhManual({ ...base, custoTotal: '0.205' })).toBe(false);
    expect(custoEhManual({ ...base, custoTotal: '1.15' })).toBe(true);
    expect(custoEhManual({ ...base, custoTotal: '' })).toBe(false);
  });
});
