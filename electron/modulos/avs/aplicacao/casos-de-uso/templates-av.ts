import type { AreaAvDTO, TemplateAvDTO, TemplateAvEntrada, TipoTemplateAvDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { normalizarMaquinaDaOperacao, validarDescricaoDaOperacao } from '../../dominio/operacao';
import { validarNomeDoTemplate, type RepositorioTemplatesAv, type TemplateAv } from '../../dominio/template-av';
import type { AutorizacaoAv } from '../autorizacao';

/** Cada tipo de template pertence a uma área: só quem pode atuar nela cria templates desse tipo. */
const AREA_DO_TIPO: Record<TipoTemplateAvDTO, AreaAvDTO> = {
  operacoes: 'processo',
  custo_processo: 'custo',
};

function paraDTO(template: TemplateAv): TemplateAvDTO {
  return {
    id: template.id,
    tipo: template.tipo,
    nome: template.nome,
    criadoEm: template.criadoEm.toISOString(),
    itens: template.itens,
  } as TemplateAvDTO;
}

export class ListarTemplatesAv implements CasoDeUso<TipoTemplateAvDTO, TemplateAvDTO[]> {
  constructor(
    private readonly repositorio: RepositorioTemplatesAv,
    private readonly autorizacao: AutorizacaoAv,
  ) {}

  async executar(tipo: TipoTemplateAvDTO): Promise<TemplateAvDTO[]> {
    this.autorizacao.exigirAutenticado();
    return (await this.repositorio.listar(tipo)).map(paraDTO);
  }
}

export class SalvarTemplateAv implements CasoDeUso<TemplateAvEntrada, TemplateAvDTO> {
  constructor(
    private readonly repositorio: RepositorioTemplatesAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: TemplateAvEntrada): Promise<TemplateAvDTO> {
    const usuario = await this.autorizacao.exigirCompetencia(AREA_DO_TIPO[entrada.tipo]);
    const itens =
      entrada.tipo === 'operacoes'
        ? entrada.itens.map((item) => ({
            descricao: validarDescricaoDaOperacao(item.descricao),
            maquina: normalizarMaquinaDaOperacao(item.maquina),
            pecasHora: item.pecasHora ?? null,
          }))
        : entrada.itens;

    const salvo = await this.repositorio.salvar({
      id: this.geradorDeId.gerar(),
      tipo: entrada.tipo,
      nome: validarNomeDoTemplate(entrada.nome),
      itens,
      usuarioId: usuario.id,
      criadoEm: this.relogio.agora(),
    });
    return paraDTO(salvo);
  }
}

export class ExcluirTemplateAv implements CasoDeUso<string, null> {
  constructor(
    private readonly repositorio: RepositorioTemplatesAv,
    private readonly autorizacao: AutorizacaoAv,
  ) {}

  async executar(id: string): Promise<null> {
    // O tipo não é conhecido sem consultar o banco; basta ter competência em uma das duas áreas.
    try {
      await this.autorizacao.exigirCompetencia('processo');
    } catch {
      await this.autorizacao.exigirCompetencia('custo');
    }
    await this.repositorio.excluir(id);
    return null;
  }
}
