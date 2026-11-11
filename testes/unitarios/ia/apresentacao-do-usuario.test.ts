import { describe, expect, it } from 'vitest';
import { comApresentacao, montarApresentacaoDoUsuario } from '../../../electron/modulos/ia/aplicacao/instrucoes';

describe('apresentação de quem conversa com a IA', () => {
  it('descreve a pessoa e como ela aparece nos dados', () => {
    const texto = montarApresentacaoDoUsuario({
      nome: 'Luciana',
      departamento: 'Comercial',
      perfil: 'usuario',
      papeis: ['competência Comercial'],
      nomeDoRecurso: null,
    });
    expect(texto).toContain('Quem está conversando com você: Luciana (Comercial; perfil usuário; competência Comercial).');
    expect(texto).toContain('responsável "Luciana"');
  });

  it('usa o nome do recurso vinculado e não acrescenta nada sem sessão', () => {
    const texto = montarApresentacaoDoUsuario({
      nome: 'Leandro Cruz',
      departamento: null,
      perfil: 'administrador',
      papeis: ['Gerente de Engenharia'],
      nomeDoRecurso: 'Leandro C.',
    });
    expect(texto).toContain('(perfil administrador; Gerente de Engenharia)');
    expect(texto).toContain('"Leandro C."');
    expect(montarApresentacaoDoUsuario(null)).toBe('');
    expect(comApresentacao('base', '')).toBe('base');
    expect(comApresentacao('base', 'extra')).toBe('base\n\nextra');
  });
});
