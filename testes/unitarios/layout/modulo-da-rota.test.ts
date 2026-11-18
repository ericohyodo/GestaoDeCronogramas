import { describe, expect, it } from 'vitest';
import { ehRotaDeLista, moduloDaRota } from '../../../renderer/compartilhado/layout/modulo-da-rota';

describe('moduloDaRota', () => {
  it('rotas de AVs, de SDs e de Projetos definem o módulo', () => {
    expect(moduloDaRota('/avs/', null)).toBe('avs');
    expect(moduloDaRota('/avs/detalhe/', 'projetos')).toBe('avs');
    expect(moduloDaRota('/sds/', 'avs')).toBe('sds');
    expect(moduloDaRota('/projetos/', 'avs')).toBe('projetos');
    expect(moduloDaRota('/cronograma/', 'avs')).toBe('projetos');
    expect(moduloDaRota('/recursos/', 'avs')).toBe('projetos');
  });

  it('relatórios, análises, chat e IA de cada módulo ficam no próprio módulo', () => {
    for (const parte of ['relatorios', 'analises', 'chat', 'instrucoes-ia', 'configuracoes']) {
      expect(moduloDaRota(`/avs/${parte}/`, 'projetos')).toBe('avs');
      expect(moduloDaRota(`/${parte}/`, 'avs')).toBe('projetos');
    }
  });

  it('AV de portfólio tem módulo próprio (lista, detalhe e itens)', () => {
    for (const rota of ['/portfolio/', '/portfolio/detalhe/', '/portfolio/itens/', '/portfolio/itens/editar/']) {
      expect(moduloDaRota(rota, 'avs')).toBe('portfolio');
    }
  });

  it('páginas compartilhadas (Usuários) mantêm o último módulo visitado', () => {
    expect(moduloDaRota('/usuarios/', 'avs')).toBe('avs');
    expect(moduloDaRota('/usuarios/', 'projetos')).toBe('projetos');
    expect(moduloDaRota('/usuarios/', 'sds')).toBe('sds');
  });

  it('sem histórico, páginas compartilhadas caem em Projetos', () => {
    expect(moduloDaRota('/usuarios/', null)).toBe('projetos');
  });
});

describe('ehRotaDeLista', () => {
  it('só as listas de AV, SD e PRO mostram a faixa de módulos', () => {
    expect(ehRotaDeLista('/avs/')).toBe(true);
    expect(ehRotaDeLista('/sds/')).toBe(true);
    expect(ehRotaDeLista('/projetos/')).toBe(true);
    expect(ehRotaDeLista('/projetos')).toBe(true);
    expect(ehRotaDeLista('/portfolio/')).toBe(true);
  });

  it('detalhes, telas auxiliares e páginas compartilhadas não mostram', () => {
    for (const rota of ['/avs/detalhe/', '/sds/detalhe/', '/cronograma/', '/avs/relatorios/', '/usuarios/', '/', '/portfolio/itens/', '/portfolio/detalhe/']) {
      expect(ehRotaDeLista(rota)).toBe(false);
    }
  });
});
