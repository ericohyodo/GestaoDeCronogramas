/** Notificações das tarefas de projetos: chegam ao usuário vinculado ao recurso responsável. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotificadorInterno } from '../../electron/modulos/notificacoes/aplicacao/casos-de-uso';
import { RepositorioNotificacoesSqlite } from '../../electron/modulos/notificacoes/infraestrutura/repositorio-notificacoes-sqlite';
import { AvisosDeTarefas } from '../../electron/modulos/tarefas/aplicacao/avisos-de-tarefas';
import { Tarefa } from '../../electron/modulos/tarefas/dominio/tarefa';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { Periodo } from '../../electron/nucleo/dominio/periodo';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { ConsultaDeResponsaveisFalsa, GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('avisos das tarefas', () => {
  let db: BancoDeDados;
  let avisos: AvisosDeTarefas;
  const relogio = new RelogioFixo();
  const agora = relogio.agora();

  const tarefa = (id: string, responsavelId: string | null, inicio: string, fim: string, dependencias: string[] = []) => {
    const t = Tarefa.criar({
      id,
      cronogramaId: 'c1',
      faseId: null,
      titulo: `Tarefa ${id}`,
      periodo: Periodo.criar(inicio, fim),
      responsavelId,
      ordem: 1,
      agora,
    });
    if (dependencias.length) t.definirDependencias(dependencias, agora);
    return t;
  };
  const recebidas = (usuarioId: string) =>
    db.prepare('SELECT tipo FROM notificacoes WHERE usuario_id = ? ORDER BY rowid').pluck().all(usuarioId);

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    for (const id of ['ana', 'bia']) {
      await new RepositorioUsuariosSqlite(db).salvar(
        Usuario.criar({ id, nome: id, login: `login-${id}`, senhaHash: 'h', perfil: 'usuario', agora }),
      );
    }
    // resp-ana e resp-bia vinculados; resp-sem não tem usuário.
    const responsaveis = new ConsultaDeResponsaveisFalsa(
      new Map([['resp-ana', 'Ana'], ['resp-bia', 'Bia'], ['resp-sem', 'Sem vínculo']]),
      new Map([['resp-ana', 'ana'], ['resp-bia', 'bia']]),
    );
    avisos = new AvisosDeTarefas(
      new NotificadorInterno(new RepositorioNotificacoesSqlite(db), relogio, new GeradorDeIdSequencial('n')),
      responsaveis,
      { existe: async () => true, obterPeriodo: async () => null, listar: async () => [{ id: 'c1', nome: 'PRO 26-001', arquivado: false }] },
      () => 'bia',
    );
  });

  afterEach(() => db.close());

  it('avisa atribuição só a quem tem vínculo e não a quem está agindo', async () => {
    await avisos.atribuida(tarefa('t1', 'resp-ana', '2026-11-12', '2026-11-20'));
    await avisos.atribuida(tarefa('t2', 'resp-sem', '2026-11-12', '2026-11-20'));
    await avisos.atribuida(tarefa('t3', 'resp-bia', '2026-11-12', '2026-11-20'));
    expect(recebidas('ana')).toEqual(['tarefa.atribuida']);
    expect(recebidas('bia')).toEqual([]);
  });

  it('libera a sucessora só quando todas as predecessoras estão concluídas', async () => {
    const a = tarefa('a', null, '2026-11-01', '2026-11-05');
    const b = tarefa('b', null, '2026-11-01', '2026-11-05');
    const c = tarefa('c', 'resp-ana', '2026-11-06', '2026-11-10', ['a', 'b']);
    a.registrarProgresso(100, agora);
    await avisos.liberouSucessoras(a, [a, b, c]);
    expect(recebidas('ana')).toEqual([]);
    b.registrarProgresso(100, agora);
    await avisos.liberouSucessoras(b, [a, b, c]);
    expect(recebidas('ana')).toEqual(['tarefa.liberada']);
  });

  it('avisa prazos vencendo e atrasados uma única vez por término', async () => {
    const hoje = '2026-11-11';
    const tarefas = [
      tarefa('atrasada', 'resp-ana', '2026-11-01', '2026-11-05'),
      tarefa('vencendo', 'resp-ana', '2026-11-01', '2026-11-13'),
      tarefa('longe', 'resp-ana', '2026-11-01', '2026-12-30'),
    ];
    const concluida = tarefa('feita', 'resp-ana', '2026-11-01', '2026-11-02');
    concluida.registrarProgresso(100, agora);
    const nomes = new Map([['c1', 'PRO 26-001']]);
    await avisos.verificarPrazos([...tarefas, concluida], hoje, nomes);
    await avisos.verificarPrazos([...tarefas, concluida], hoje, nomes);
    expect(recebidas('ana')).toEqual(['tarefa.atrasada', 'tarefa.vencendo']);
  });
});
