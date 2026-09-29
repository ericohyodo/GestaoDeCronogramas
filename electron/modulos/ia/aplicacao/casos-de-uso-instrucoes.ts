import type { EscopoIaDTO, InstrucoesIaDTO, SalvarInstrucoesIaEntrada } from '@contratos/ia.contrato';
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
import { CHECKLIST_PADRAO_AVS, INSTRUCOES_FIXAS_DA_ANALISE_AVS } from './instrucoes-avs';
import type { RepositorioDeInstrucoesIa } from './portas';

/** Instruções em vigor: as salvas pela equipe ou, antes da primeira gravação, o padrão. */
const checklistPadrao = (escopo: EscopoIaDTO) => (escopo === 'avs' ? CHECKLIST_PADRAO_AVS : CHECKLIST_PADRAO);

export async function lerInstrucoes(
  repositorio: RepositorioDeInstrucoesIa,
  escopo: EscopoIaDTO = 'projetos',
): Promise<{ checklist: ItemDaChecklist[]; orientacoes: string; atualizadoEm: Date | null }> {
  const salvas = await repositorio.obterInstrucoes(escopo);
  return (
    salvas ?? {
      checklist: checklistPadrao(escopo).map((item) => ({ ...item })),
      orientacoes: '',
      atualizadoEm: null,
    }
  );
}

async function paraDTO(repositorio: RepositorioDeInstrucoesIa, escopo: EscopoIaDTO): Promise<InstrucoesIaDTO> {
  const atuais = await lerInstrucoes(repositorio, escopo);
  return {
    checklist: atuais.checklist,
    orientacoes: atuais.orientacoes,
    atualizadoEm: atuais.atualizadoEm?.toISOString() ?? null,
    instrucoesFixas: escopo === 'avs' ? INSTRUCOES_FIXAS_DA_ANALISE_AVS : INSTRUCOES_FIXAS,
  };
}

export class ObterInstrucoesIa implements CasoDeUso<void, InstrucoesIaDTO> {
  constructor(
    private readonly repositorio: RepositorioDeInstrucoesIa,
    private readonly escopo: EscopoIaDTO = 'projetos',
  ) {}

  executar(): Promise<InstrucoesIaDTO> {
    return paraDTO(this.repositorio, this.escopo);
  }
}

export class SalvarInstrucoesIa implements CasoDeUso<SalvarInstrucoesIaEntrada, InstrucoesIaDTO> {
  constructor(
    private readonly repositorio: RepositorioDeInstrucoesIa,
    private readonly relogio: Relogio,
    private readonly escopo: EscopoIaDTO = 'projetos',
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

    await this.repositorio.salvarInstrucoes(
      { checklist, orientacoes, atualizadoEm: this.relogio.agora() },
      this.escopo,
    );
    return paraDTO(this.repositorio, this.escopo);
  }
}

/** Volta a checklist ao padrão do módulo (APQP nos projetos, viabilidade nas AVs), mantendo as orientações. */
export class RestaurarChecklistIa implements CasoDeUso<void, InstrucoesIaDTO> {
  constructor(
    private readonly repositorio: RepositorioDeInstrucoesIa,
    private readonly relogio: Relogio,
    private readonly escopo: EscopoIaDTO = 'projetos',
  ) {}

  async executar(): Promise<InstrucoesIaDTO> {
    const atuais = await lerInstrucoes(this.repositorio, this.escopo);
    await this.repositorio.salvarInstrucoes(
      {
        checklist: checklistPadrao(this.escopo).map((item) => ({ ...item })),
        orientacoes: atuais.orientacoes,
        atualizadoEm: this.relogio.agora(),
      },
      this.escopo,
    );
    return paraDTO(this.repositorio, this.escopo);
  }
}
