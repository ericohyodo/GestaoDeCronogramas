import type { GeradorDeId } from '../../electron/nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../electron/nucleo/aplicacao/portas/relogio';
import type { Cronograma } from '../../electron/modulos/cronogramas/dominio/cronograma';
import type { RepositorioCronogramas } from '../../electron/modulos/cronogramas/dominio/repositorio-cronogramas';
import type { AplicadorDeTema } from '../../electron/modulos/preferencias/aplicacao/portas/aplicador-de-tema';
import type { RepositorioPreferencias } from '../../electron/modulos/preferencias/dominio/repositorio-preferencias';
import type { Tema } from '../../electron/modulos/preferencias/dominio/tema';
import type { RepositorioResponsaveis } from '../../electron/modulos/responsaveis/dominio/repositorio-responsaveis';
import type { Responsavel } from '../../electron/modulos/responsaveis/dominio/responsavel';
import type { ConsultaDeCronogramas } from '../../electron/modulos/tarefas/aplicacao/portas/consulta-de-cronogramas';
import type { ConsultaDeResponsaveis } from '../../electron/modulos/tarefas/aplicacao/portas/consulta-de-responsaveis';
import type { Fase } from '../../electron/modulos/tarefas/dominio/fase';
import type { RepositorioFases } from '../../electron/modulos/tarefas/dominio/repositorio-fases';
import type { RepositorioTarefas } from '../../electron/modulos/tarefas/dominio/repositorio-tarefas';
import type { Tarefa } from '../../electron/modulos/tarefas/dominio/tarefa';
import type { HashDeSenha } from '../../electron/modulos/usuarios/aplicacao/portas/hash-de-senha';
import type { RepositorioUsuarios } from '../../electron/modulos/usuarios/dominio/repositorio-usuarios';
import type { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';

export class RelogioFixo implements Relogio {
  constructor(public instante = new Date('2026-09-22T12:00:00.000Z')) {}
  agora(): Date {
    return this.instante;
  }
}

export class GeradorDeIdSequencial implements GeradorDeId {
  private contador = 0;
  constructor(private readonly prefixo = 'id') {}
  gerar(): string {
    this.contador += 1;
    return `${this.prefixo}-${this.contador}`;
  }
}

export class RepositorioCronogramasEmMemoria implements RepositorioCronogramas {
  readonly itens = new Map<string, Cronograma>();

  async listar() {
    return [...this.itens.values()];
  }
  async obterPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async existe(id: string) {
    return this.itens.has(id);
  }
  async salvar(cronograma: Cronograma) {
    this.itens.set(cronograma.id, cronograma);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

export class RepositorioTarefasEmMemoria implements RepositorioTarefas {
  readonly itens = new Map<string, Tarefa>();

  async listarPorCronograma(cronogramaId: string) {
    return [...this.itens.values()]
      .filter((tarefa) => tarefa.cronogramaId === cronogramaId)
      .sort((a, b) => a.ordem - b.ordem);
  }
  async obterPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async proximaOrdem(cronogramaId: string, faseId: string | null) {
    const ordens = (await this.listarPorCronograma(cronogramaId))
      .filter((tarefa) => tarefa.faseId === faseId)
      .map((tarefa) => tarefa.ordem);
    return Math.max(0, ...ordens) + 1;
  }
  async salvar(tarefa: Tarefa) {
    this.itens.set(tarefa.id, tarefa);
  }
  async salvarVarias(tarefas: readonly Tarefa[]) {
    for (const tarefa of tarefas) this.itens.set(tarefa.id, tarefa);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

export class RepositorioFasesEmMemoria implements RepositorioFases {
  readonly itens = new Map<string, Fase>();

  async listarPorCronograma(cronogramaId: string) {
    return [...this.itens.values()]
      .filter((fase) => fase.cronogramaId === cronogramaId)
      .sort((a, b) => a.ordem - b.ordem);
  }
  async obterPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async proximaOrdemDeTopo(cronogramaId: string) {
    const ordens = (await this.listarPorCronograma(cronogramaId)).map((fase) => fase.ordem);
    return Math.max(0, ...ordens) + 1;
  }
  async salvar(fase: Fase) {
    this.itens.set(fase.id, fase);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

export class RepositorioResponsaveisEmMemoria implements RepositorioResponsaveis {
  readonly itens = new Map<string, Responsavel>();

  async listar() {
    return [...this.itens.values()];
  }
  async obterPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async salvar(responsavel: Responsavel) {
    this.itens.set(responsavel.id, responsavel);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

export class RepositorioPreferenciasEmMemoria implements RepositorioPreferencias {
  tema: Tema | null = null;
  async obterTema() {
    return this.tema;
  }
  async salvarTema(tema: Tema) {
    this.tema = tema;
  }
}

export class AplicadorDeTemaFalso implements AplicadorDeTema {
  readonly aplicados: Tema[] = [];
  aplicar(tema: Tema): void {
    this.aplicados.push(tema);
  }
}

export class RepositorioUsuariosEmMemoria implements RepositorioUsuarios {
  readonly itens = new Map<string, Usuario>();

  async listar() {
    return [...this.itens.values()];
  }
  async obterPorId(id: string) {
    return this.itens.get(id) ?? null;
  }
  async obterPorLogin(login: string) {
    return [...this.itens.values()].find((usuario) => usuario.login === login) ?? null;
  }
  async contar() {
    return this.itens.size;
  }
  async contarAdministradoresAtivos(exceto = '') {
    return [...this.itens.values()].filter(
      (usuario) => usuario.perfil === 'administrador' && usuario.ativo && usuario.id !== exceto,
    ).length;
  }
  async salvar(usuario: Usuario) {
    this.itens.set(usuario.id, usuario);
  }
  async excluir(id: string) {
    this.itens.delete(id);
  }
}

/** Hash reversível e instantâneo: os testes não precisam do custo do scrypt. */
export class HashDeSenhaFalso implements HashDeSenha {
  async gerar(senha: string) {
    return `falso:${senha}`;
  }
  async conferir(senha: string, hash: string) {
    return hash === `falso:${senha}`;
  }
}

export class ConsultaDeCronogramasFalsa implements ConsultaDeCronogramas {
  constructor(
    private readonly periodos = new Map<string, { inicio: string; fim: string }>([
      ['cron-1', { inicio: '2026-10-01', fim: '2026-12-31' }],
    ]),
  ) {}
  async existe(cronogramaId: string) {
    return this.periodos.has(cronogramaId);
  }
  async obterPeriodo(cronogramaId: string) {
    return this.periodos.get(cronogramaId) ?? null;
  }
}

export class ConsultaDeResponsaveisFalsa implements ConsultaDeResponsaveis {
  constructor(private readonly nomes = new Map<string, string>([['resp-1', 'Ana Souza']])) {}
  async obterNomes(ids: string[]) {
    return new Map([...this.nomes].filter(([id]) => ids.includes(id)));
  }
  async existe(responsavelId: string) {
    return this.nomes.has(responsavelId);
  }
}
