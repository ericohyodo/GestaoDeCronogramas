import type { Notificador } from '../../../nucleo/aplicacao/portas/notificador';
import type { Tarefa } from '../dominio/tarefa';
import type { ConsultaDeCronogramas } from './portas/consulta-de-cronogramas';
import type { ConsultaDeResponsaveis } from './portas/consulta-de-responsaveis';

// =====================================================================================================
// Notificações das tarefas de projetos. Chegam ao usuário vinculado ao recurso responsável pela tarefa
// (cadastro de Recursos). Recurso sem vínculo não recebe nada.
// =====================================================================================================

/** Quantos dias antes do término a tarefa entra em "vencendo". */
export const DIAS_PARA_AVISAR_VENCIMENTO = 2;

/** Tarefa concluída: 100% ou situação "concluída". */
export const estaConcluida = (tarefa: Pick<Tarefa, 'percentualConcluido' | 'situacao'>) =>
  tarefa.percentualConcluido === 100 || tarefa.situacao === 'concluida';

/** Dia local (AAAA-MM-DD) de um instante. */
export function diaLocal(instante: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${instante.getFullYear()}-${p(instante.getMonth() + 1)}-${p(instante.getDate())}`;
}

/** dd/mm/aaaa para o texto da notificação. */
const formatar = (iso: string) => iso.split('-').reverse().join('/');

export class AvisosDeTarefas {
  constructor(
    private readonly notificador: Notificador,
    private readonly responsaveis: ConsultaDeResponsaveis,
    private readonly cronogramas: ConsultaDeCronogramas,
    /** Quem está agindo (não recebe a própria notificação); `null` em rotinas automáticas. */
    private readonly usuarioAtualId: () => string | null = () => null,
  ) {}

  /** Rota do projeto, aberta ao clicar. */
  private link(tarefa: Pick<Tarefa, 'cronogramaId'>): string {
    return `/cronograma/?id=${tarefa.cronogramaId}`;
  }

  private async nomeDoProjeto(cronogramaId: string): Promise<string> {
    return (await this.cronogramas.listar()).find((item) => item.id === cronogramaId)?.nome ?? 'Projeto';
  }

  /** Usuário vinculado ao responsável de cada tarefa (sem vínculo fica de fora). */
  private async usuariosDas(tarefas: readonly Pick<Tarefa, 'responsavelId'>[]): Promise<Map<string, string>> {
    const ids = [...new Set(tarefas.map((tarefa) => tarefa.responsavelId).filter((id): id is string => !!id))];
    return ids.length > 0 ? this.responsaveis.obterUsuarios(ids) : new Map();
  }

  /** A tarefa passou a ter este responsável. */
  async atribuida(tarefa: Tarefa): Promise<void> {
    const usuarios = await this.usuariosDas([tarefa]);
    const usuarioId = tarefa.responsavelId ? usuarios.get(tarefa.responsavelId) : undefined;
    if (!usuarioId) return;
    await this.notificador.notificar({
      usuarioIds: [usuarioId],
      excetoUsuarioId: this.usuarioAtualId(),
      tipo: 'tarefa.atribuida',
      titulo: `Tarefa atribuída a você: ${tarefa.titulo}`,
      mensagem: `${await this.nomeDoProjeto(tarefa.cronogramaId)} · ${formatar(tarefa.periodo.inicio)} a ${formatar(tarefa.periodo.fim)}`,
      link: this.link(tarefa),
    });
  }

  /**
   * A tarefa foi concluída: avisa os responsáveis das sucessoras que ficaram com todas as predecessoras concluídas.
   * @param concluida tarefa recém-concluída
   * @param irmas todas as tarefas do mesmo cronograma (estado atual)
   */
  async liberouSucessoras(concluida: Tarefa, irmas: readonly Tarefa[]): Promise<void> {
    const porId = new Map(irmas.map((irma) => [irma.id, irma]));
    porId.set(concluida.id, concluida);
    const liberadas = irmas.filter(
      (irma) =>
        irma.dependencias.includes(concluida.id) &&
        !estaConcluida(irma) &&
        irma.dependencias.every((id) => {
          const predecessora = porId.get(id);
          return !predecessora || estaConcluida(predecessora);
        }),
    );
    if (liberadas.length === 0) return;
    const usuarios = await this.usuariosDas(liberadas);
    const projeto = await this.nomeDoProjeto(concluida.cronogramaId);
    for (const tarefa of liberadas) {
      await this.notificador.notificar({
        usuarioIds: [tarefa.responsavelId ? usuarios.get(tarefa.responsavelId) : null],
        excetoUsuarioId: this.usuarioAtualId(),
        tipo: 'tarefa.liberada',
        titulo: `Pode começar: ${tarefa.titulo}`,
        mensagem: `${projeto} · a predecessora "${concluida.titulo}" foi concluída. Início previsto: ${formatar(tarefa.periodo.inicio)}.`,
        link: this.link(tarefa),
      });
    }
  }

  /** As datas destas tarefas foram deslocadas por atraso de outra. */
  async deslocadas(tarefas: readonly Tarefa[], dias: number, causa: string): Promise<void> {
    const usuarios = await this.usuariosDas(tarefas);
    if (usuarios.size === 0) return;
    const projeto = tarefas[0] ? await this.nomeDoProjeto(tarefas[0].cronogramaId) : 'Projeto';
    const sentido = dias > 0 ? `adiadas em ${dias} dia(s)` : `antecipadas em ${-dias} dia(s)`;
    for (const tarefa of tarefas) {
      await this.notificador.notificar({
        usuarioIds: [tarefa.responsavelId ? usuarios.get(tarefa.responsavelId) : null],
        excetoUsuarioId: this.usuarioAtualId(),
        tipo: 'tarefa.deslocada',
        titulo: `Datas alteradas: ${tarefa.titulo}`,
        mensagem: `${projeto} · ${sentido} por causa de "${causa}". Novo término: ${formatar(tarefa.periodo.fim)}.`,
        link: this.link(tarefa),
      });
    }
  }

  /**
   * Rotina automática: tarefas não concluídas de projetos ativos que vencem em até 2 dias ou já venceram.
   * Cada aviso sai uma única vez por tarefa e prazo (a chave inclui o término: se a data mudar, avisa de novo).
   * @param tarefas tarefas de todos os projetos não arquivados
   * @param hoje dia local de referência (AAAA-MM-DD)
   */
  async verificarPrazos(tarefas: readonly Tarefa[], hoje: string, nomesDosProjetos: Map<string, string>): Promise<number> {
    const abertas = tarefas.filter((tarefa) => !estaConcluida(tarefa) && tarefa.responsavelId);
    const usuarios = await this.usuariosDas(abertas);
    const limite = new Date(`${hoje}T00:00:00Z`);
    limite.setUTCDate(limite.getUTCDate() + DIAS_PARA_AVISAR_VENCIMENTO);
    const ate = limite.toISOString().slice(0, 10);
    let enviadas = 0;
    for (const tarefa of abertas) {
      const usuarioId = usuarios.get(tarefa.responsavelId!);
      if (!usuarioId) continue;
      const fim = tarefa.periodo.fim;
      const atrasada = fim < hoje;
      if (!atrasada && fim > ate) continue;
      const projeto = nomesDosProjetos.get(tarefa.cronogramaId) ?? 'Projeto';
      await this.notificador.notificar({
        usuarioIds: [usuarioId],
        tipo: atrasada ? 'tarefa.atrasada' : 'tarefa.vencendo',
        chave: `${tarefa.id}:${fim}`,
        titulo: atrasada ? `Tarefa atrasada: ${tarefa.titulo}` : `Tarefa vence em breve: ${tarefa.titulo}`,
        mensagem: `${projeto} · término ${atrasada ? 'era' : 'em'} ${formatar(fim)}, ${tarefa.percentualConcluido}% concluída.`,
        link: this.link(tarefa),
      });
      enviadas += 1;
    }
    return enviadas;
  }
}
