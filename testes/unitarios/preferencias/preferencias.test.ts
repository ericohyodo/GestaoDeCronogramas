import { describe, expect, it } from 'vitest';
import { ErroDeValidacao } from '../../../electron/nucleo/dominio/erro-de-dominio';
import { AplicarTemaSalvo } from '../../../electron/modulos/preferencias/aplicacao/casos-de-uso/aplicar-tema-salvo';
import { DefinirTema } from '../../../electron/modulos/preferencias/aplicacao/casos-de-uso/definir-tema';
import { ObterPreferencias } from '../../../electron/modulos/preferencias/aplicacao/casos-de-uso/obter-preferencias';
import { AplicadorDeTemaFalso, RepositorioPreferenciasEmMemoria } from '../../dubles/dubles';

describe('Preferências de tema', () => {
  it('usa "sistema" enquanto o usuário não escolhe', async () => {
    const repositorio = new RepositorioPreferenciasEmMemoria();
    const aplicador = new AplicadorDeTemaFalso();

    expect(await new ObterPreferencias(repositorio).executar()).toEqual({ tema: 'sistema' });
    await new AplicarTemaSalvo(repositorio, aplicador).executar();
    expect(aplicador.aplicados).toEqual(['sistema']);
  });

  it('salva e aplica o tema escolhido', async () => {
    const repositorio = new RepositorioPreferenciasEmMemoria();
    const aplicador = new AplicadorDeTemaFalso();

    expect(await new DefinirTema(repositorio, aplicador).executar('escuro')).toEqual({ tema: 'escuro' });
    expect(repositorio.tema).toBe('escuro');
    expect(aplicador.aplicados).toEqual(['escuro']);
  });

  it('rejeita tema desconhecido sem salvar nem aplicar', async () => {
    const repositorio = new RepositorioPreferenciasEmMemoria();
    const aplicador = new AplicadorDeTemaFalso();

    await expect(new DefinirTema(repositorio, aplicador).executar('neon')).rejects.toThrow(
      ErroDeValidacao,
    );
    expect(repositorio.tema).toBeNull();
    expect(aplicador.aplicados).toEqual([]);
  });
});
