import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CancelarFechamento,
  type DependenciasDaAtualizacao,
  ListarAppsAbertos,
  ObterEstadoDaAtualizacao,
  SolicitarFechamento,
  VigiaDaAtualizacao,
} from '../../electron/modulos/atualizacao/aplicacao/casos-de-uso';
import type { EsteApp } from '../../electron/modulos/atualizacao/aplicacao/portas';
import {
  NOME_DA_PASTA_DE_CONTROLE,
  QuadroDaAtualizacaoEmArquivo,
} from '../../electron/modulos/atualizacao/infraestrutura/quadro-da-atualizacao-em-arquivo';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

let pasta: string;
let relogio: RelogioFixo;

const app = (dados: Partial<EsteApp> = {}): EsteApp => ({
  instanciaId: 'app-erico',
  computador: 'PC-01',
  usuarioDoWindows: 'erico',
  versao: '0.2.1',
  modo: 'normal',
  desde: new Date('2026-11-11T14:00:00Z'),
  ...dados,
});

/** Um "app" ligado à mesma pasta compartilhada, com relógio comum. */
function deps(esteApp: EsteApp, logado: string | null = 'Erico'): DependenciasDaAtualizacao {
  return {
    quadro: new QuadroDaAtualizacaoEmArquivo(pasta),
    esteApp,
    logado: { nomeDoUsuarioAtual: () => logado },
    relogio,
    geradorDeId: new GeradorDeIdSequencial('aviso'),
  };
}

const avancar = (minutos: number) => {
  relogio.instante = new Date(relogio.instante.getTime() + minutos * 60_000);
};

beforeEach(() => {
  pasta = mkdtempSync(path.join(tmpdir(), 'aviso-atualizacao-'));
  relogio = new RelogioFixo(new Date('2026-11-11T15:00:00Z'));
});

afterEach(() => rmSync(pasta, { recursive: true, force: true }));

describe('aviso de atualização na pasta compartilhada', () => {
  it('o pedido do administrador chega aos outros apps, bloqueia no prazo e vence depois de 30 min', async () => {
    const admin = deps(app());
    const luciana = deps(app({ instanciaId: 'app-luciana', computador: 'PC-02' }), 'Luciana');

    const pedido = await new SolicitarFechamento(admin).executar({ minutos: 5, mensagem: '  Nova versão  ' });
    expect(pedido).toMatchObject({ fase: 'aviso', solicitadoPor: 'Erico', mensagem: 'Nova versão', fecharEm: '2026-11-11T15:05:00.000Z' });

    const vigiaDaLuciana = new VigiaDaAtualizacao(luciana);
    expect(await vigiaDaLuciana.verificar()).toBe('aviso');
    avancar(5);
    expect(await vigiaDaLuciana.verificar()).toBe('bloqueado');
    expect((await new ObterEstadoDaAtualizacao(luciana).executar()).fase).toBe('bloqueado');

    avancar(30);
    expect(await vigiaDaLuciana.verificar()).toBe('normal');
    expect(existsSync(path.join(pasta, NOME_DA_PASTA_DE_CONTROLE, 'aviso.json'))).toBe(false);
  });

  it('a versão nova, ao abrir no período bloqueado, apaga o aviso', async () => {
    await new SolicitarFechamento(deps(app())).executar({ minutos: 2 });
    avancar(3);
    const versaoNova = deps(app({ instanciaId: 'app-novo', versao: '0.2.2' }));
    expect((await new ObterEstadoDaAtualizacao(versaoNova).executar()).fase).toBe('normal');
    expect((await new ObterEstadoDaAtualizacao(deps(app())).executar()).fase).toBe('normal');
  });

  it('o administrador cancela; prazo fora da lista e modo apresentação são recusados', async () => {
    const admin = deps(app());
    await new SolicitarFechamento(admin).executar({ minutos: 10 });
    expect((await new CancelarFechamento(admin).executar()).fase).toBe('normal');

    await expect(new SolicitarFechamento(admin).executar({ minutos: 7 })).rejects.toThrow(/prazo/);
    const apresentacao = deps(app({ instanciaId: 'app-apresentacao', modo: 'apresentacao' }), 'Apresentação');
    await expect(new SolicitarFechamento(apresentacao).executar({ minutos: 5 })).rejects.toThrow(/apresentação/);
    await expect(new CancelarFechamento(apresentacao).executar()).rejects.toThrow(/apresentação/);
    expect((await new ObterEstadoDaAtualizacao(apresentacao).executar()).emApresentacao).toBe(true);
  });

  it('lista os apps abertos (inclusive na tela de login) e esquece os que pararam de dar sinal', async () => {
    const vigiaDoAdmin = new VigiaDaAtualizacao(deps(app()));
    const vigiaDoLogin = new VigiaDaAtualizacao(
      deps(app({ instanciaId: 'app-login', computador: 'PC-03', usuarioDoWindows: 'geovanna', desde: new Date('2026-11-11T13:00:00Z') }), null),
    );
    await vigiaDoAdmin.verificar();
    await vigiaDoLogin.verificar();

    const listar = new ListarAppsAbertos(deps(app()));
    expect((await listar.executar()).map((a) => [a.instanciaId, a.usuario, a.esteApp])).toEqual([
      ['app-login', null, false],
      ['app-erico', 'Erico', true],
    ]);

    // O app da tela de login fecha normalmente: sai da lista na hora.
    vigiaDoLogin.sair();
    expect((await listar.executar()).map((a) => a.instanciaId)).toEqual(['app-erico']);

    // Sem sinal por mais de 90 s, o registro deixa de contar; depois de um dia, o arquivo é apagado.
    avancar(2);
    expect(await listar.executar()).toEqual([]);
    avancar(24 * 60);
    await listar.executar();
    expect(readdirSync(path.join(pasta, NOME_DA_PASTA_DE_CONTROLE, 'apps'))).toEqual([]);
  });

  it('um aviso corrompido não derruba o app', async () => {
    const admin = deps(app());
    await new SolicitarFechamento(admin).executar({ minutos: 5 });
    writeFileSync(path.join(pasta, NOME_DA_PASTA_DE_CONTROLE, 'aviso.json'), '{ quebrado');
    expect((await new ObterEstadoDaAtualizacao(admin).executar()).fase).toBe('normal');
  });
});
