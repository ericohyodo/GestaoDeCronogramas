/** Agente do Chat com IA: consulta com ids, proposta validada e aplicação só depois do "Aplicar". */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Cronograma } from '../../electron/modulos/cronogramas/dominio/cronograma';
import { RepositorioCronogramasSqlite } from '../../electron/modulos/cronogramas/infraestrutura/repositorio-cronogramas-sqlite';
import {
  AgenteDeCronogramas,
  AplicarProposta,
  DescartarProposta,
  type DependenciasDoAgente,
} from '../../electron/modulos/ia/aplicacao/agente-de-cronogramas';
import type { PerfilDeQuemConversa } from '../../electron/modulos/ia/aplicacao/portas';
import { guardarNaConversa, ObterConversa } from '../../electron/modulos/ia/aplicacao/conversas';
import { RepositorioDeConversasSqlite } from '../../electron/modulos/ia/infraestrutura/repositorio-de-conversas-sqlite';
import { ESQUEMAS_DO_AGENTE } from '../../electron/modulos/ia/infraestrutura/esquemas-do-agente';
import { RepositorioDePropostasSqlite } from '../../electron/modulos/ia/infraestrutura/repositorio-de-propostas-sqlite';
import { AplicarAlteracoesEmLote } from '../../electron/modulos/tarefas/aplicacao/casos-de-uso/aplicar-alteracoes-em-lote';
import { AtualizarTarefa } from '../../electron/modulos/tarefas/aplicacao/casos-de-uso/atualizar-tarefa';
import { CriarTarefa } from '../../electron/modulos/tarefas/aplicacao/casos-de-uso/criar-tarefa';
import { ObterEstrutura } from '../../electron/modulos/tarefas/aplicacao/casos-de-uso/obter-estrutura';
import { ReordenarTarefas } from '../../electron/modulos/tarefas/aplicacao/casos-de-uso/reordenar-tarefas';
import { Fase } from '../../electron/modulos/tarefas/dominio/fase';
import { RepositorioFasesSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-fases-sqlite';
import { RepositorioTarefasSqlite } from '../../electron/modulos/tarefas/infraestrutura/repositorio-tarefas-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { transacional } from '../../electron/nucleo/aplicacao/caso-de-uso';
import { Periodo } from '../../electron/nucleo/dominio/periodo';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { UnidadeDeTrabalhoSqlite } from '../../electron/nucleo/infraestrutura/banco/unidade-de-trabalho-sqlite';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

describe('agente do chat de Projetos', () => {
  let db: BancoDeDados;
  let tarefas: RepositorioTarefasSqlite;
  let deps: DependenciasDoAgente;
  let atualizar: AtualizarTarefa;
  let logado: PerfilDeQuemConversa | null;
  let podeEditar: boolean;
  const ids: Record<'A' | 'B' | 'C', string> = { A: '', B: '', C: '' };
  const relogio = new RelogioFixo(new Date('2026-11-12T15:00:00.000Z'));

  const ferramenta = (agente: AgenteDeCronogramas, nome: string) => agente.ferramentas().find((f) => f.nome === nome)!;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const usuarios = new RepositorioUsuariosSqlite(db);
    for (const [id, nome] of [['u1', 'Erico'], ['u2', 'Luciana']] as const) {
      await usuarios.salvar(Usuario.criar({ id, nome, login: `login-${id}`, senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }));
    }
    const cronogramas = new RepositorioCronogramasSqlite(db);
    await cronogramas.salvar(
      Cronograma.criar({ id: 'c1', nome: 'BOSCH - NÚCLEO', periodo: Periodo.criar('2026-11-01', '2026-12-31'), agora: relogio.agora() }),
    );
    const fases = new RepositorioFasesSqlite(db);
    await fases.salvar(Fase.criar({ id: 'f1', cronogramaId: 'c1', nome: 'Ferramental', ordem: 1, agora: relogio.agora() }));
    tarefas = new RepositorioTarefasSqlite(db);

    const consultaDeCronogramas = {
      existe: async () => true,
      obterPeriodo: async () => ({ inicio: '2026-11-01', fim: '2026-12-31' }),
      listar: async () => [],
    };
    const consultaDeResponsaveis = {
      existe: async () => true,
      obterNomes: async () => new Map([['r1', 'Allan']]),
      obterUsuarios: async () => new Map(),
    };
    const criar = new CriarTarefa(tarefas, fases, consultaDeCronogramas, consultaDeResponsaveis, relogio, new GeradorDeIdSequencial('t'));
    atualizar = new AtualizarTarefa(tarefas, consultaDeResponsaveis, relogio);
    // Fora da ordem cronológica: A (01/11), C (10/11), B (06/11).
    for (const [titulo, inicio, fim] of [
      ['A', '2026-11-01', '2026-11-05'],
      ['C', '2026-11-10', '2026-11-12'],
      ['B', '2026-11-06', '2026-11-08'],
    ] as const) {
      ids[titulo] = (await criar.executar({ cronogramaId: 'c1', faseId: 'f1', titulo, dataInicio: inicio, dataFim: fim })).id;
    }

    logado = { id: 'u1', nome: 'Erico', departamento: null, perfil: 'administrador', papeis: [], nomeDoRecurso: null };
    podeEditar = true;
    const obterEstrutura = new ObterEstrutura(tarefas, fases, consultaDeCronogramas, consultaDeResponsaveis);
    const lote = transacional(
      new AplicarAlteracoesEmLote(tarefas, fases, criar, atualizar, new ReordenarTarefas(tarefas), relogio),
      new UnidadeDeTrabalhoSqlite(db),
    );
    deps = {
      consultaDeCronograma: {
        listarIdsAtivos: async () => ['c1'],
        obterResumo: async (id) => {
          const c = await cronogramas.obterPorId(id);
          return c ? { nome: c.nome, situacao: c.situacao, dataInicio: c.periodo.inicio, dataFim: c.periodo.fim, descricao: null, codigo: null } : null;
        },
      },
      consultaDeEstrutura: { obterEstrutura: (id) => obterEstrutura.executar(id) },
      recursos: { listar: async () => [{ id: 'r1', nome: 'Allan', funcao: 'Engenharia de Processo' }] },
      propostas: new RepositorioDePropostasSqlite(db),
      editor: { aplicarAlteracoes: (entrada) => lote.executar(entrada) },
      permissoes: { podeEditarTarefas: () => podeEditar },
      quemEstaUsando: { nomeDoUsuarioAtual: () => logado?.nome ?? null, perfilDoUsuarioAtual: async () => logado },
      esquemas: ESQUEMAS_DO_AGENTE,
      geradorDeId: new GeradorDeIdSequencial('p'),
      relogio,
    };
  });

  afterEach(() => db.close());

  const titulosDaFase = async () =>
    (await tarefas.listarPorCronograma('c1'))
      .filter((tarefa) => tarefa.faseId === 'f1')
      .sort((a, b) => a.ordem - b.ordem)
      .map((tarefa) => tarefa.titulo);

  it('mostra o projeto com ids (achado pelo nome sem acento) e recusa nome que não existe', async () => {
    const agente = new AgenteDeCronogramas(deps, 'u1');
    const visto = await ferramenta(agente, 'ver_cronograma').executar({ projeto: 'bosch - nucleo' });
    const dados = JSON.parse(visto.conteudo) as { projeto: { id: string }; fases: { id: string }[]; tarefas: { id: string; titulo: string }[] };
    expect(dados.projeto.id).toBe('c1');
    expect(dados.fases.map((f) => f.id)).toEqual(['f1']);
    expect(dados.tarefas.map((t) => t.titulo)).toEqual(['A', 'C', 'B']);

    const nada = await ferramenta(agente, 'ver_cronograma').executar({ projeto: 'Electrolux' });
    expect(nada.erro).toBe(true);
    expect(nada.conteudo).toContain('BOSCH - NÚCLEO');
  });

  it('proposta inválida não registra nada e devolve o que corrigir', async () => {
    const agente = new AgenteDeCronogramas(deps, 'u1');
    const resposta = await ferramenta(agente, 'propor_alteracoes').executar({
      projetoId: 'c1',
      resumo: 'Teste',
      alteracoes: [
        { tipo: 'concluir_tarefa', tarefaId: 'nao-existe', dataEfetiva: null, evidencia: null },
        { tipo: 'ajustar_datas', tarefaId: ids.A, dataInicio: '2026-11-09', dataFim: '2026-11-02' },
      ],
    });
    expect(resposta.erro).toBe(true);
    expect(resposta.conteudo).toMatch(/não existe/);
    expect(resposta.conteudo).toMatch(/anterior ao início/);
    expect(agente.propostaDoTurno).toBeNull();

    const formatoErrado = await ferramenta(agente, 'propor_alteracoes').executar({ projetoId: 'c1', resumo: 'x', alteracoes: [{ tipo: 'apagar_tudo' }] });
    expect(formatoErrado.erro).toBe(true);
  });

  it('propõe sem mexer no cronograma; "Aplicar" dá baixa, cria na posição e ordena por data', async () => {
    const agente = new AgenteDeCronogramas(deps, 'u1');
    const resposta = await ferramenta(agente, 'propor_alteracoes').executar({
      projetoId: 'c1',
      resumo: 'Baixa em A, nova tarefa D depois de C e fase em ordem cronológica.',
      alteracoes: [
        { tipo: 'concluir_tarefa', tarefaId: ids.A, dataEfetiva: null, evidencia: null },
        {
          tipo: 'criar_tarefa',
          faseId: null,
          inserirApos: ids.C,
          titulo: 'D',
          dataInicio: '2026-11-13',
          dataFim: '2026-11-14',
          responsavelId: null,
        },
        { tipo: 'ordenar_fase_por_data', faseId: 'f1' },
      ],
    });
    expect(resposta.erro).toBeUndefined();
    const proposta = agente.propostaDoTurno!;
    expect(proposta.situacao).toBe('pendente');
    expect(proposta.itens.map((item) => item.descricao)).toEqual([
      'Dar baixa em "1.1 A"',
      'Nova tarefa "D" logo após "1.2 C"',
      'Ordenar por data as tarefas da fase "1 Ferramental"',
    ]);
    expect(proposta.itens[0]!.depois).toBe('100% · concluída em 12/11/2026');
    // Nada mudou ainda.
    expect(await titulosDaFase()).toEqual(['A', 'C', 'B']);

    const aplicada = await new AplicarProposta(deps).executar(proposta.id);
    expect(aplicada.situacao).toBe('aplicada');
    expect(await titulosDaFase()).toEqual(['A', 'B', 'C', 'D']);
    const a = await tarefas.obterPorId(ids.A);
    expect([a?.percentualConcluido, a?.situacao, a?.dataEfetiva]).toEqual([100, 'concluida', '2026-11-12']);

    await expect(new AplicarProposta(deps).executar(proposta.id)).rejects.toThrow(/já foi decidida/);
  });

  it('não aplica se o cronograma mudou depois da proposta', async () => {
    const agente = new AgenteDeCronogramas(deps, 'u1');
    await ferramenta(agente, 'propor_alteracoes').executar({
      projetoId: 'c1',
      resumo: 'Baixa em B',
      alteracoes: [{ tipo: 'concluir_tarefa', tarefaId: ids.B, dataEfetiva: '2026-11-08', evidencia: null }],
    });
    const proposta = agente.propostaDoTurno!;
    await atualizar.executar({ id: ids.B, percentualConcluido: 50 });

    await expect(new AplicarProposta(deps).executar(proposta.id)).rejects.toThrow(/alterada depois da proposta/);
    expect((await deps.propostas.obter(proposta.id, 'u1'))?.situacao).toBe('desatualizada');
    expect((await tarefas.obterPorId(ids.B))?.percentualConcluido).toBe(50);
  });

  it('só quem pediu decide, e só aplica quem pode editar tarefas', async () => {
    const agente = new AgenteDeCronogramas(deps, 'u1');
    await ferramenta(agente, 'propor_alteracoes').executar({
      projetoId: 'c1',
      resumo: 'Progresso de C',
      alteracoes: [{ tipo: 'atualizar_progresso', tarefaId: ids.C, percentual: 40 }],
    });
    const proposta = agente.propostaDoTurno!;

    podeEditar = false;
    await expect(new AplicarProposta(deps).executar(proposta.id)).rejects.toThrow(/não pode alterar/);
    podeEditar = true;

    logado = { ...logado!, id: 'u2', nome: 'Luciana' };
    await expect(new AplicarProposta(deps).executar(proposta.id)).rejects.toThrow(/não existe/);
    await expect(new DescartarProposta(deps).executar(proposta.id)).rejects.toThrow(/não existe/);

    logado = { ...logado, id: 'u1', nome: 'Erico' };
    expect((await new DescartarProposta(deps).executar(proposta.id)).situacao).toBe('descartada');
    expect((await tarefas.obterPorId(ids.C))?.percentualConcluido).toBe(0);
  });

  it('uma segunda proposta no mesmo turno substitui a primeira', async () => {
    const agente = new AgenteDeCronogramas(deps, 'u1');
    const propor = (percentual: number) =>
      ferramenta(agente, 'propor_alteracoes').executar({
        projetoId: 'c1',
        resumo: `C em ${percentual}%`,
        alteracoes: [{ tipo: 'atualizar_progresso', tarefaId: ids.C, percentual }],
      });
    await propor(30);
    const primeira = agente.propostaDoTurno!;
    await propor(60);
    expect(agente.propostaDoTurno!.id).not.toBe(primeira.id);
    expect((await deps.propostas.obter(primeira.id, 'u1'))?.situacao).toBe('descartada');
  });

  it('a fala da IA guarda a proposta e o histórico mostra o cartão com a decisão', async () => {
    const agente = new AgenteDeCronogramas(deps, 'u1');
    await ferramenta(agente, 'propor_alteracoes').executar({
      projetoId: 'c1',
      resumo: 'C em 80%',
      alteracoes: [{ tipo: 'atualizar_progresso', tarefaId: ids.C, percentual: 80 }],
    });
    const historico = {
      conversas: new RepositorioDeConversasSqlite(db),
      quemEstaUsando: deps.quemEstaUsando,
      geradorDeId: new GeradorDeIdSequencial('conversa'),
      relogio,
      propostas: deps.propostas,
    };
    const conversaId = await guardarNaConversa(
      historico,
      'u1',
      'projetos',
      null,
      'Coloque C em 80%',
      { texto: 'Propus C em 80%. Confira e aplique.', modelo: 'claude-opus-5-5' },
      agente.propostaDoTurno!.id,
    );
    await new AplicarProposta(deps).executar(agente.propostaDoTurno!.id);

    const conversa = await new ObterConversa(historico).executar(conversaId!);
    expect(conversa.mensagens.map((m) => m.proposta?.situacao ?? null)).toEqual([null, 'aplicada']);
    expect(conversa.mensagens[1]!.proposta?.itens[0]?.depois).toBe('80%');
  });

  it('as ferramentas vão para a API como objetos com JSON Schema', () => {
    for (const ferramentaDoAgente of new AgenteDeCronogramas(deps, 'u1').ferramentas()) {
      expect(ferramentaDoAgente.esquema).toMatchObject({ type: 'object' });
      expect(ferramentaDoAgente.esquema).not.toHaveProperty('$schema');
    }
  });
});
