import type { AtualizarSecaoCustoEntrada, SecaoCustoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import type { DadosSecaoCusto, RepositorioSecaoCusto } from '../../dominio/repositorio-secao-custo';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import {
  normalizarTextoDoItem,
  validarDescricaoDoItem,
  type ItemCustoMaterial,
  type ItemCustoProcesso,
} from '../../dominio/secao-custo';
import type { AutorizacaoAv } from '../autorizacao';
import { paraSecaoCustoDTO } from '../mapeador-custo-dto';

/** Substitui a seção inteira (materiais + processo) a cada salvamento — mais simples do que diffar
 * linha a linha, e o comportamento esperado de uma tabela editável no formulário. */
export class SalvarSecaoCusto implements CasoDeUso<AtualizarSecaoCustoEntrada, SecaoCustoDTO> {
  constructor(
    private readonly repositorioAvs: RepositorioAvs,
    private readonly repositorio: RepositorioSecaoCusto,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: AtualizarSecaoCustoEntrada): Promise<SecaoCustoDTO> {
    const av = await this.repositorioAvs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'custo');
    const agora = this.relogio.agora();

    const materiais: ItemCustoMaterial[] = entrada.materiais.map((item, indice) => ({
      id: this.geradorDeId.gerar(),
      secao: item.secao,
      codigoItem: normalizarTextoDoItem(item.codigoItem),
      descricao: validarDescricaoDoItem(item.descricao),
      qtdeBruta: item.qtdeBruta ?? null,
      qtdeNet: item.qtdeNet ?? null,
      unidadeMedida: normalizarTextoDoItem(item.unidadeMedida),
      custoUnitario: item.custoUnitario ?? null,
      custoTotal: item.custoTotal ?? null,
      ordem: indice,
    }));

    const processo: ItemCustoProcesso[] = entrada.processo.map((item, indice) => ({
      id: this.geradorDeId.gerar(),
      ordem: indice,
      processo: normalizarTextoDoItem(item.processo),
      maquina: normalizarTextoDoItem(item.maquina),
      pecasHora: item.pecasHora ?? null,
      qtdeColaboradores: item.qtdeColaboradores ?? null,
      taxaMod: item.taxaMod ?? null,
      taxaMoi: item.taxaMoi ?? null,
      taxaGgf: item.taxaGgf ?? null,
      custoTotal: item.custoTotal ?? null,
    }));

    const dados: DadosSecaoCusto = {
      secao: {
        avId: av.id,
        incoterm: entrada.incoterm ?? null,
        observacoes: normalizarTextoDoItem(entrada.observacoes),
        atualizadoEm: agora,
        atualizadoPor: usuario.id,
      },
      materiais,
      processo,
    };

    await this.repositorio.salvar(dados);
    return paraSecaoCustoDTO(dados);
  }
}
