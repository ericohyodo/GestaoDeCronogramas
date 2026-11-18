import type { AtualizarSecaoProdutoEntrada, SecaoProdutoDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { normalizarTextoOpcional } from '../../../../nucleo/dominio/texto';
import { montarEstrutura } from '../estrutura-produto';
import { validarDescricaoDoInvestimento, type Investimento } from '../../dominio/investimento';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type {
  DadosSecaoProduto,
  RepositorioSecaoProduto,
} from '../../dominio/repositorio-secao-produto';
import type { AutorizacaoAv } from '../autorizacao';
import { paraSecaoProdutoDTO } from '../mapeador-produto-processo-dto';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';

export class SalvarSecaoProduto implements CasoDeUso<AtualizarSecaoProdutoEntrada, SecaoProdutoDTO> {
  constructor(
    private readonly repositorioAvs: RepositorioAvs,
    private readonly repositorio: RepositorioSecaoProduto,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(entrada: AtualizarSecaoProdutoEntrada): Promise<SecaoProdutoDTO> {
    const av = await this.repositorioAvs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'produto');
    const agora = this.relogio.agora();

    const investimentos: Investimento[] = entrada.investimentos.map((item, indice) => ({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      area: 'produto',
      descricao: validarDescricaoDoInvestimento(item.descricao),
      classificacao: item.classificacao ?? null,
      valor: item.valor ?? null,
      ordem: indice,
    }));

    const dados: DadosSecaoProduto = {
      secao: {
        avId: av.id,
        descritivoTecnicoExistente: entrada.descritivoTecnicoExistente ?? null,
        descritivoTecnicoDisponivel: entrada.descritivoTecnicoDisponivel ?? null,
        descritivoTecnicoNaoAplica: entrada.descritivoTecnicoNaoAplica ?? null,
        desenho2dExistente: entrada.desenho2dExistente ?? null,
        desenho2dDisponivel: entrada.desenho2dDisponivel ?? null,
        desenho2dNaoAplica: entrada.desenho2dNaoAplica ?? null,
        desenho3dExistente: entrada.desenho3dExistente ?? null,
        desenho3dDisponivel: entrada.desenho3dDisponivel ?? null,
        desenho3dNaoAplica: entrada.desenho3dNaoAplica ?? null,
        desenhoInterfacesExistente: entrada.desenhoInterfacesExistente ?? null,
        desenhoInterfacesDisponivel: entrada.desenhoInterfacesDisponivel ?? null,
        desenhoInterfacesNaoAplica: entrada.desenhoInterfacesNaoAplica ?? null,
        normasTecnicasExistente: entrada.normasTecnicasExistente ?? null,
        normasTecnicasDisponivel: entrada.normasTecnicasDisponivel ?? null,
        normasTecnicasNaoAplica: entrada.normasTecnicasNaoAplica ?? null,
        requisitosClienteExistente: entrada.requisitosClienteExistente ?? null,
        requisitosClienteDisponivel: entrada.requisitosClienteDisponivel ?? null,
        requisitosClienteNaoAplica: entrada.requisitosClienteNaoAplica ?? null,
        requisitosGarantiaExistente: entrada.requisitosGarantiaExistente ?? null,
        requisitosGarantiaDisponivel: entrada.requisitosGarantiaDisponivel ?? null,
        requisitosGarantiaNaoAplica: entrada.requisitosGarantiaNaoAplica ?? null,
        descritivoTecnicoLink: entrada.descritivoTecnicoLink ?? null,
        desenho2dLink: entrada.desenho2dLink ?? null,
        desenho3dLink: entrada.desenho3dLink ?? null,
        desenhoInterfacesLink: entrada.desenhoInterfacesLink ?? null,
        normasTecnicasLink: entrada.normasTecnicasLink ?? null,
        requisitosClienteLink: entrada.requisitosClienteLink ?? null,
        requisitosGarantiaLink: entrada.requisitosGarantiaLink ?? null,
        escopoTecnico: entrada.escopoTecnico ?? null,
        riscosProjeto: entrada.riscosProjeto ?? null,
        premissasProjeto: entrada.premissasProjeto ?? null,
        recursosProjeto: entrada.recursosProjeto ?? null,
        restricoesProjeto: entrada.restricoesProjeto ?? null,
        infoComplementar: entrada.infoComplementar ?? null,
        prazoPrototipoDias: entrada.prazoPrototipoDias ?? null,
        complexidade: normalizarTextoOpcional(entrada.complexidade),
        atualizadoEm: agora,
        atualizadoPor: usuario.id,
      },
      estrutura: montarEstrutura(entrada.estrutura, av.id, () => this.geradorDeId.gerar()),
      investimentos,
    };

    const versao = this.versoes.confirmar(chaveDaSecao(av.id, 'produto'), entrada.versaoEsperada);
    await this.repositorio.salvar(dados);
    return paraSecaoProdutoDTO(dados, versao);
  }
}
