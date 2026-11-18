import { describe, expect, it } from 'vitest';
import { custoPorPeca, custosVigentes, diasDesde } from '../../../renderer/modulos/avs/portfolio';
import { validarObservacaoDaChecagem } from '../../../electron/modulos/avs/dominio/portfolio';

const VAZIO = { materiaPrima: null, insumos: null, embalagem: null, processo: null };

describe('AV de portfólio: custos e checagens', () => {
  it('custo por peça soma só as categorias informadas', () => {
    expect(custoPorPeca({ materiaPrima: 4.2, insumos: 0.3, embalagem: null, processo: 1.5 })).toBeCloseTo(6, 10);
    expect(custoPorPeca(VAZIO)).toBeNull();
  });

  it('custos vigentes usam o valor atualizado e mantêm a referência no resto', () => {
    const referencia = { materiaPrima: 4, insumos: 1, embalagem: 0.5, processo: 2 };
    expect(custosVigentes(referencia, { ...VAZIO, materiaPrima: 4.5 })).toEqual({ ...referencia, materiaPrima: 4.5 });
  });

  it('dias desde a atualização dos custos', () => {
    expect(diasDesde('2026-11-08', new Date(2026, 10, 18))).toBe(10);
    expect(diasDesde(null)).toBeNull();
  });

  it('ressalvas e divergências exigem observação', () => {
    expect(validarObservacaoDaChecagem('confere', '  ')).toBeNull();
    expect(validarObservacaoDaChecagem('ressalvas', 'Furo mudou')).toBe('Furo mudou');
    expect(() => validarObservacaoDaChecagem('diverge', '')).toThrow(/Descreva/);
  });
});
