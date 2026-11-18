import { describe, expect, it } from 'vitest';
import {
  type AvisoDeAtualizacao,
  compararVersoes,
  faseDaAtualizacao,
} from '../../../electron/modulos/atualizacao/dominio/aviso-de-atualizacao';

const JANELA = 30 * 60_000;
const fecharEm = new Date('2026-11-11T15:00:00Z');
const aviso: AvisoDeAtualizacao = {
  id: 'a1',
  fecharEm,
  solicitadoEm: new Date('2026-11-11T14:55:00Z'),
  solicitadoPor: 'Erico',
  mensagem: null,
  versaoNoPedido: '0.2.1',
};
const em = (minutos: number) => new Date(fecharEm.getTime() + minutos * 60_000);

describe('versões do app', () => {
  it('compara maior, menor e correção numericamente', () => {
    expect(compararVersoes('0.2.10', '0.2.9')).toBeGreaterThan(0);
    expect(compararVersoes('0.3.0', '0.2.99')).toBeGreaterThan(0);
    expect(compararVersoes('1.0', '1.0.0')).toBe(0);
    expect(compararVersoes('0.2.1', '0.2.2')).toBeLessThan(0);
  });
});

describe('fase do aviso de atualização', () => {
  it('sem aviso o app segue normal', () => {
    expect(faseDaAtualizacao(null, em(0), '0.2.1', JANELA)).toEqual({ fase: 'normal', encerrado: false });
  });

  it('antes do prazo: aviso; até 30 min depois: bloqueado; depois disso o aviso vence', () => {
    expect(faseDaAtualizacao(aviso, em(-5), '0.2.1', JANELA).fase).toBe('aviso');
    expect(faseDaAtualizacao(aviso, em(0), '0.2.1', JANELA).fase).toBe('bloqueado');
    expect(faseDaAtualizacao(aviso, em(29), '0.2.1', JANELA).fase).toBe('bloqueado');
    expect(faseDaAtualizacao(aviso, em(30), '0.2.1', JANELA)).toEqual({ fase: 'normal', encerrado: true });
  });

  it('a versão nova, ao abrir, encerra o aviso; uma versão antiga continua bloqueada', () => {
    expect(faseDaAtualizacao(aviso, em(1), '0.2.2', JANELA)).toEqual({ fase: 'normal', encerrado: true });
    expect(faseDaAtualizacao(aviso, em(1), '0.2.0', JANELA).fase).toBe('bloqueado');
  });
});
