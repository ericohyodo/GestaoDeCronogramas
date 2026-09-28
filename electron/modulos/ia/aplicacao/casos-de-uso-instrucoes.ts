import type { InstrucoesIaDTO, SalvarInstrucoesIaEntrada } from '@contratos/ia.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import {
  CHECKLIST_PADRAO,
  INSTRUCOES_FIXAS,
  type ItemDaChecklist,
  LIMITE_DE_ITENS,
  LIMITE_DE_ORIENTACOES,
  LIMITE_POR_ITEM,
} from './instrucoes';
import type { RepositorioDeInstrucoesIa } from './portas';

/** Instruções em vigor: as salvas pela equipe ou, antes da primeira gravação, o padrão. */
export async function lerInstrucoes(
  repositorio: RepositorioDeInstrucoesIa,
): Promise<{ checklist: ItemDaChecklist[]; orientacoes: string; atualizadoEm: Date | null }> {
  const salvas = await repositorio.obterInstrucoes();
  return salvas ?? { checklist: CHECKLIST_PADRAO.map((item) => ({ ...item })), orientacoes: '', atualizadoEm: null };
}

async function paraDTO(repositorio: RepositorioDeInstrucoesIa): Promise<InstrucoesIaDTO> {
  const atuais = await lerInstrucoes(repositorio);
  return {
    checklist: atuais.checklist,
    orientacoes: atuais.orientacoes,
    atualizadoEm: atuais.atualizadoEm?.toISOString() ?? null,
    instrucoesFixas: INSTRUCOES_FIXAS,
  };
}

export class ObterInstrucoesIa implements CasoDeUso<void, InstrucoesIaDTO> {
  constructor(private readonly repositorio: RepositorioDeInstrucoesIa) {}

  executar(): Promise<InstrucoesIaDTO> {
    return paraDTO(this.repositorio);
  }
}

export class SalvarInstrucoesIa implements CasoDeUso<SalvarInstrucoesIaEntrada, InstrucoesIaDTO> {
  constructor(
    private readonly repositorio: RepositorioDeInstrucoesIa,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: SalvarInstrucoesIaEntrada): Promise<InstrucoesIaDTO> {
    const checklist = entrada.checklist
      .map((item) => ({ texto: item.texto.trim(), ativo: item.ativo }))
      .filter((item) => item.texto);
    if (checklist.length > LIMITE_DE_ITENS) {
      throw new ErroDeValidacao(`A checklist pode ter no máximo ${LIMITE_DE_ITENS} pontos.`);
    }
    const longo = checklist.find((item) => item.texto.length > LIMITE_POR_ITEM);
    if (longo) {
      throw new ErroDeValidacao(`Cada ponto da checklist pode ter até ${LIMITE_POR_ITEM} caracteres.`);
    }
    const orientacoes = entrada.orientacoes.trim();
    if (orientacoes.length > LIMITE_DE_ORIENTACOES) {
      throw new ErroDeValidacao(`As orientações podem ter até ${LIMITE_DE_ORIENTACOES} caracteres.`);
    }

    await this.repositorio.salvarInstrucoes({ checklist, orientacoes, atualizadoEm: this.relogio.agora() });
    return paraDTO(this.repositorio);
  }
}

/** Volta a checklist ao padrão APQP, mantendo as orientações da empresa. */
export class RestaurarChecklistIa implements CasoDeUso<void, InstrucoesIaDTO> {
  constructor(
    private readonly repositorio: RepositorioDeInstrucoesIa,
    private readonly relogio: Relogio,
  ) {}

  async executar(): Promise<InstrucoesIaDTO> {
    const atuais = await lerInstrucoes(this.repositorio);
    await this.repositorio.salvarInstrucoes({
      checklist: CHECKLIST_PADRAO.map((item) => ({ ...item })),
      orientacoes: atuais.orientacoes,
      atualizadoEm: this.relogio.agora(),
    });
    return paraDTO(this.repositorio);
  }
}
