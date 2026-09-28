import type { AtualizarSecaoProcessoEntrada, SecaoProcessoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { validarDescricaoDoInvestimento, type Investimento } from '../../dominio/investimento';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type {
  DadosSecaoProcesso,
  RepositorioSecaoProcesso,
} from '../../dominio/repositorio-secao-processo';
import type { AutorizacaoAv } from '../autorizacao';
import { paraSecaoProcessoDTO } from '../mapeador-produto-processo-dto';

export class SalvarSecaoProcesso implements CasoDeUso<AtualizarSecaoProcessoEntrada, SecaoProcessoDTO> {
  constructor(
    private readonly repositorioAvs: RepositorioAvs,
    private readonly repositorio: RepositorioSecaoProcesso,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: AtualizarSecaoProcessoEntrada): Promise<SecaoProcessoDTO> {
    const av = await this.repositorioAvs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'processo');
    const agora = this.relogio.agora();

    const investimentos: Investimento[] = entrada.investimentos.map((item, indice) => ({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      area: 'processo',
      descricao: validarDescricaoDoInvestimento(item.descricao),
      classificacao: item.classificacao ?? null,
      valor: item.valor ?? null,
      ordem: indice,
    }));

    const dados: DadosSecaoProcesso = {
      secao: {
        avId: av.id,
        prazoProducaoDias: entrada.prazoProducaoDias ?? null,
        atualizadoEm: agora,
        atualizadoPor: usuario.id,
      },
      investimentos,
    };

    await this.repositorio.salvar(dados);
    return paraSecaoProcessoDTO(dados);
  }
}
