import { exigirTexto } from '../../../nucleo/dominio/texto';

const TAMANHO_MAXIMO_NOME = 120;

export interface PropsFase {
  id: string;
  cronogramaId: string;
  nome: string;
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DadosNovaFase {
  id: string;
  cronogramaId: string;
  nome: string;
  ordem: number;
  agora: Date;
}

/** Agrupa tarefas em dois níveis (fase → tarefas). As datas da fase são o resumo das subtarefas. */
export class Fase {
  private constructor(private props: PropsFase) {}

  static criar(dados: DadosNovaFase): Fase {
    return new Fase({
      id: dados.id,
      cronogramaId: dados.cronogramaId,
      nome: validarNome(dados.nome),
      ordem: dados.ordem,
      criadoEm: dados.agora,
      atualizadoEm: dados.agora,
    });
  }

  static reconstituir(props: PropsFase): Fase {
    return new Fase({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get cronogramaId(): string {
    return this.props.cronogramaId;
  }
  get nome(): string {
    return this.props.nome;
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

  renomear(nome: string, agora: Date): void {
    this.props.nome = validarNome(nome);
    this.props.atualizadoEm = agora;
  }
}

function validarNome(nome: string): string {
  return exigirTexto(nome, 'O nome da fase', TAMANHO_MAXIMO_NOME);
}
