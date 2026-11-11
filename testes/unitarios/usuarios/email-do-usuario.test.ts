import { describe, expect, it } from 'vitest';
import { Usuario } from '../../../electron/modulos/usuarios/dominio/usuario';

describe('e-mail do usuário', () => {
  const agora = new Date('2026-11-11T12:00:00Z');
  const base = { id: 'u1', nome: 'Maria', login: 'maria', senhaHash: 'h', perfil: 'usuario', agora };

  it('é opcional e fica em minúsculas', () => {
    expect(Usuario.criar(base).email).toBeNull();
    expect(Usuario.criar({ ...base, email: '  Maria.Silva@Ferkoda.com.br ' }).email).toBe('maria.silva@ferkoda.com.br');
  });

  it('recusa formato inválido e pode ser apagado', () => {
    expect(() => Usuario.criar({ ...base, email: 'maria@' })).toThrow(/E-mail inválido/);
    const usuario = Usuario.criar({ ...base, email: 'maria@ferkoda.com.br' });
    usuario.alterarEmail('', agora);
    expect(usuario.email).toBeNull();
  });
});
