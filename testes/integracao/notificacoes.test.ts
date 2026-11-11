/** Notificações internas (sino): entrega, caixa do usuário logado e marcação de lidas. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MarcarNotificacaoLida,
  MarcarTodasNotificacoesLidas,
  NotificadorInterno,
  ObterCaixaDeNotificacoes,
} from '../../electron/modulos/notificacoes/aplicacao/casos-de-uso';
import { RepositorioNotificacoesSqlite } from '../../electron/modulos/notificacoes/infraestrutura/repositorio-notificacoes-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../../electron/nucleo/infraestrutura/banco/migracoes';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('notificações', () => {
  let db: BancoDeDados;
  let logado: string | null;
  let notificador: NotificadorInterno;
  let repositorio: RepositorioNotificacoesSqlite;
  const relogio = new RelogioFixo();

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    for (const id of ['a', 'b', 'c']) {
      await new RepositorioUsuariosSqlite(db).salvar(
        Usuario.criar({ id, nome: id, login: `login-${id}`, senhaHash: 'h', perfil: 'usuario', agora: relogio.agora() }),
      );
    }
    repositorio = new RepositorioNotificacoesSqlite(db);
    notificador = new NotificadorInterno(repositorio, relogio, new GeradorDeIdSequencial('n'));
    logado = 'b';
  });

  afterEach(() => db.close());

  it('entrega sem repetir, sem o autor e ignorando usuário inexistente', async () => {
    await notificador.notificar({
      usuarioIds: ['a', 'b', 'b', null, 'nao-existe'],
      excetoUsuarioId: 'a',
      tipo: 'sd.aberta',
      titulo: 'SD 26-001 aguarda o aceite',
      mensagem: 'x'.repeat(900),
      link: '/sds/detalhe/?id=1',
    });
    const linhas = db.prepare('SELECT usuario_id, mensagem FROM notificacoes').all() as {
      usuario_id: string;
      mensagem: string;
    }[];
    expect(linhas.map((l) => l.usuario_id)).toEqual(['b']);
    expect(linhas[0]!.mensagem.length).toBeLessThanOrEqual(500);
  });

  it('cada usuário vê e marca só as próprias notificações', async () => {
    await notificador.notificar({ usuarioIds: ['b', 'c'], tipo: 't', titulo: 'Um', mensagem: 'm' });
    await notificador.notificar({ usuarioIds: ['b'], tipo: 't', titulo: 'Dois', mensagem: 'm' });
    const quem = { usuarioAtualId: () => logado };

    const caixa = await new ObterCaixaDeNotificacoes(repositorio, quem, relogio).executar();
    expect(caixa.naoLidas).toBe(2);

    const deC = db.prepare("SELECT id FROM notificacoes WHERE usuario_id = 'c'").pluck().get() as string;
    expect((await new MarcarNotificacaoLida(repositorio, quem, relogio).executar(deC)).naoLidas).toBe(2);

    expect((await new MarcarTodasNotificacoesLidas(repositorio, quem, relogio).executar()).naoLidas).toBe(0);
    logado = 'c';
    expect((await new ObterCaixaDeNotificacoes(repositorio, quem, relogio).executar()).naoLidas).toBe(1);
    logado = null;
    await expect(new ObterCaixaDeNotificacoes(repositorio, quem, relogio).executar()).rejects.toThrow(/login/);
  });
});
