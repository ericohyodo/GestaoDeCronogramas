import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import type { Periodo } from '../../../nucleo/dominio/periodo';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';
import { type SituacaoTarefa, validarSituacaoTarefa } from './situacao-tarefa';

const TAMANHO_MAXIMO_TITULO = 160;
const TAMANHO_MAXIMO_DESCRICAO = 2000;

export interface PropsTarefa {
  id: string;
  cronogramaId: string;
  /** `null` quando a tarefa está solta, fora de qualquer fase. */
  faseId: string | null;
  titulo: string;
  descricao: string | null;
  periodo: Periodo;
  percentualConcluido: number;
  situacao: SituacaoTarefa;
  responsavelId: string | null;
  /** Ids das predecessoras (término → início). O ciclo é barrado pelo serviço de cálculo. */
  dependencias: string[];
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DadosNovaTarefa {
  id: string;
  cronogramaId: string;
  faseId?: string | null;
  titulo: string;
  descricao?: string | null;
  periodo: Periodo;
  responsavelId?: string | null;
  ordem: number;
  agora: Date;
}

export class Tarefa {
  private constructor(private props: PropsTarefa) {}

  static criar(dados: DadosNovaTarefa): Tarefa {
    return new Tarefa({
      id: dados.id,
      cronogramaId: dados.cronogramaId,
      faseId: dados.faseId ?? null,
      titulo: validarTitulo(dados.titulo),
      descricao: validarDescricao(dados.descricao),
      periodo: dados.periodo,
      percentualConcluido: 0,
      situacao: 'pendente',
      responsavelId: dados.responsavelId ?? null,
      dependencias: [],
      ordem: dados.ordem,
      criadoEm: dados.agora,
      atualizadoEm: dados.agora,
    });
  }

  /** Recria a entidade a partir de dados já persistidos (sem revalidar). */
  static reconstituir(props: PropsTarefa): Tarefa {
    return new Tarefa({ ...props, dependencias: [...props.dependencias] });
  }

  get id(): string {
    return this.props.id;
  }
  get cronogramaId(): string {
    return this.props.cronogramaId;
  }
  get faseId(): string | null {
    return this.props.faseId;
  }
  get responsavelId(): string | null {
    return this.props.responsavelId;
  }
  get dependencias(): string[] {
    return [...this.props.dependencias];
  }
  get titulo(): string {
    return this.props.titulo;
  }
  get descricao(): string | null {
    return this.props.descricao;
  }
  get periodo(): Periodo {
    return this.props.periodo;
  }
  get percentualConcluido(): number {
    return this.props.percentualConcluido;
  }
  get situacao(): SituacaoTarefa {
    return this.props.situacao;
  }
  get ordem(): number {
    return this.props.ordem;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  renomear(titulo: string, agora: Date): void {
    this.props.titulo = validarTitulo(titulo);
    this.props.atualizadoEm = agora;
  }

  alterarDescricao(descricao: string | null, agora: Date): void {
    this.props.descricao = validarDescricao(descricao);
    this.props.atualizadoEm = agora;
  }

  alterarPeriodo(periodo: Periodo, agora: Date): void {
    this.props.periodo = periodo;
    this.props.atualizadoEm = agora;
  }

  registrarProgresso(percentual: number, agora: Date): void {
    if (!Number.isInteger(percentual) || percentual < 0 || percentual > 100) {
      throw new ErroDeValidacao('O percentual concluído deve ser um número inteiro entre 0 e 100.');
    }
    this.props.percentualConcluido = percentual;
    this.props.atualizadoEm = agora;
  }

  alterarSituacao(situacao: string, agora: Date): void {
    this.props.situacao = validarSituacaoTarefa(situacao);
    this.props.atualizadoEm = agora;
  }

  definirResponsavel(responsavelId: string | null, agora: Date): void {
    this.props.responsavelId = responsavelId;
    this.props.atualizadoEm = agora;
  }

  /** Substitui a lista de predecessoras. O ciclo é validado antes, com o grafo completo. */
  definirDependencias(dependencias: readonly string[], agora: Date): void {
    const unicas = [...new Set(dependencias)];
    if (unicas.includes(this.props.id)) {
      throw new ErroDeValidacao('Uma tarefa não pode depender de si mesma.');
    }
    this.props.dependencias = unicas;
    this.props.atualizadoEm = agora;
  }

  /** Move a tarefa no tempo mantendo a duração (usado ao deslocar sucessoras de um atraso). */
  deslocar(dias: number, agora: Date): void {
    if (dias === 0) return;
    this.props.periodo = this.props.periodo.deslocar(dias);
    this.props.atualizadoEm = agora;
  }
}

function validarTitulo(titulo: string): string {
  return exigirTexto(titulo, 'O título da tarefa', TAMANHO_MAXIMO_TITULO);
}

function validarDescricao(descricao: string | null | undefined): string | null {
  const texto = normalizarTextoOpcional(descricao);
  return texto === null ? null : exigirTexto(texto, 'A descrição', TAMANHO_MAXIMO_DESCRICAO);
}
