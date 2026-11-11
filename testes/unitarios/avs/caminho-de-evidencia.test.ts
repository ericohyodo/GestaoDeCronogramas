import { describe, expect, it } from 'vitest';
import { avaliarCaminhoDeEvidencia } from '../../../electron/modulos/avs/dominio/caminho-de-evidencia';

describe('links de evidência da AV', () => {
  it('abre URLs web, pastas e documentos', () => {
    expect(avaliarCaminhoDeEvidencia('https://intranet/desenho')).toEqual({ tipo: 'web' });
    expect(avaliarCaminhoDeEvidencia(String.raw`\\servidor\eng\AV 26-001`)).toEqual({ tipo: 'arquivo' });
    expect(avaliarCaminhoDeEvidencia(String.raw`C:\Projetos\desenho.pdf`)).toEqual({ tipo: 'arquivo' });
  });

  it('recusa executáveis, scripts e outros esquemas', () => {
    const perigosos = [String.raw`\\srv\x\setup.EXE`, String.raw`C:\a\rodar.bat`, String.raw`D:\s.ps1`, 'atalho.lnk'];
    for (const perigoso of perigosos) {
      expect(avaliarCaminhoDeEvidencia(perigoso)).toHaveProperty('recusa');
    }
    expect(avaliarCaminhoDeEvidencia('file:///C:/Windows/System32/calc.exe')).toHaveProperty('recusa');
    expect(avaliarCaminhoDeEvidencia('javascript:alert(1)')).toHaveProperty('recusa');
    expect(avaliarCaminhoDeEvidencia('   ')).toEqual({ recusa: 'caminho vazio' });
  });
});
