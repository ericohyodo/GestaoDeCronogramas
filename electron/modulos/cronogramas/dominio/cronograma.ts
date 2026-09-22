import type { Periodo } from '../../../nucleo/dominio/periodo';
import { exigirTexto, normalizarTextoOpcional } from '../../../nucleo/dominio/texto';
import { type SituacaoCronograma, validarSituacaoCronograma } from './situacao-cronograma';

const TAMANHO_MAXIMO_NOME = 120;
const TAMANHO_MAXIMO_DESCRICAO = 2000;

export interface PropsCronograma {
  id: string;
  nome: string;
  descricao: string | null;
  periodo: Periodo;
  situacao: SituacaoCronograma;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DadosNovoCronograma {
  id: string;
  nome: string;
  descricao?: string | null;
  periodo: Periodo;
  agora: Date;
}

export class Cronograma {
  private constructor(private props: PropsCronograma) {}

  static criar(dados: DadosNovoCronograma): Cronograma {
    return new Cronograma({
      id: dados.id,
      nome: validarNome(dados.nome),
      descricao: validarDescricao(dados.descricao),
      periodo: dados.periodo,
      situacao: 'planejado',
      criadoEm: dados.agora,
      atualizadoEm: dados.agora,
    });
  }

  /** Recria a entidade a partir de dados já persistidos (sem revalidar). */
  static reconstituir(props: PropsCronograma): Cronograma {
    return new Cronograma({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get nome(): string {
    return this.props.nome;
  }
  get descricao(): string | null {
    return this.props.descricao;
  }
  get periodo(): Periodo {
    return this.props.periodo;
  }
  get situacao(): SituacaoCronograma {
    return this.props.situacao;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get atualizadoEm(): Date {
    return this.props.atualizadoEm;
  }

  renomear(nome: string, agora: Date): void {
    this.props.nome = validarNome(nome);
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

  alterarSituacao(situacao: string, agora: Date): void {
    this.props.situacao = validarSituacaoCronograma(situacao);
    this.props.atualizadoEm = agora;
  }
}

function validarNome(nome: string): string {
  return exigirTexto(nome, 'O nome do cronograma', TAMANHO_MAXIMO_NOME);
}

function validarDescricao(descricao: string | null | undefined): string | null {
  const texto = normalizarTextoOpcional(descricao);
  return texto === null ? null : exigirTexto(texto, 'A descrição', TAMANHO_MAXIMO_DESCRICAO);
}
