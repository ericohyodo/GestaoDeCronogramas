import { describe, expect, it } from 'vitest';
import {
  estadosDosBlocos,
  investimentosCompletos,
  progressoDosBlocos,
  tabelaObrigatoriaCompleta,
  tabelaOpcionalCompleta,
} from '../../../renderer/modulos/avs/blocos';

describe('liberação fracionada dos blocos da AV', () => {
  it('destaca o primeiro incompleto e esmaece os seguintes, mesmo já preenchidos', () => {
    expect(estadosDosBlocos([false, false, false])).toEqual(['atual', 'pendente', 'pendente']);
    expect(estadosDosBlocos([true, false, true, true])).toEqual(['completo', 'atual', 'pendente', 'pendente']);
    expect(estadosDosBlocos([true, true])).toEqual(['completo', 'completo']);
    expect(progressoDosBlocos(estadosDosBlocos([true, false, true]))).toEqual({ feitos: 1, total: 3 });
  });

  it('tabelas obrigatórias pedem ao menos uma linha completa; opcionais aceitam vazio', () => {
    const iniciada = (l: { d: string; v: string }) => l.d.trim() !== '';
    const completa = (l: { d: string; v: string }) => l.v.trim() !== '';
    expect(tabelaObrigatoriaCompleta([], iniciada, completa)).toBe(false);
    expect(tabelaObrigatoriaCompleta([{ d: 'a', v: '1' }, { d: '', v: '' }], iniciada, completa)).toBe(true);
    expect(tabelaObrigatoriaCompleta([{ d: 'a', v: '1' }, { d: 'b', v: '' }], iniciada, completa)).toBe(false);
    expect(tabelaOpcionalCompleta([], iniciada, completa)).toBe(true);
    expect(tabelaOpcionalCompleta([{ d: 'b', v: '' }], iniciada, completa)).toBe(false);
  });

  it('investimento com descrição exige classificação e valor (zero vale)', () => {
    expect(investimentosCompletos([{ descricao: 'Projeto', classificacao: 'suporte', valor: '0' }])).toBe(true);
    expect(investimentosCompletos([{ descricao: 'Projeto', classificacao: '', valor: '10' }])).toBe(false);
    expect(investimentosCompletos([{ descricao: '', classificacao: '', valor: '' }])).toBe(true);
  });
});
