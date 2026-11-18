import type { AtualizarSecaoPcpEntrada, SecaoPcpDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { normalizarTextoOpcional } from '../../../../nucleo/dominio/texto';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import {
  normalizarMaquinaDaCarga,
  validarDescricaoDoCusto,
  validarOperacaoDaCarga,
  validarConversao,
  validarDeclaracoesPcp,
  validarQuantidadeDaCarga,
  type DadosSecaoPcp,
  type RepositorioSecaoPcp,
} from '../../dominio/secao-pcp';
import type { AutorizacaoAv } from '../autorizacao';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';

function paraSecaoPcpDTO(dados: DadosSecaoPcp | null, versao: number): SecaoPcpDTO {
  if (!dados) {
    return {
      observacoes: null,
      cargas: [],
      custos: [],
      layoutSemAlteracoes: false,
      custosSemAlteracoes: false,
      observacoesSemAlteracoes: false,
      atualizadoEm: null,
      versao,
    };
  }
  return {
    observacoes: dados.secao.observacoes,
    layoutSemAlteracoes: dados.secao.layoutSemAlteracoes,
    custosSemAlteracoes: dados.secao.custosSemAlteracoes,
    observacoesSemAlteracoes: dados.secao.observacoesSemAlteracoes,
    cargas: dados.cargas.map((carga) => ({
      id: carga.id,
      operacao: carga.operacao,
      maquina: carga.maquina,
      pecasHora: carga.pecasHora,
      conversao: carga.conversao,
      cargaAtualPecas: carga.cargaAtualPecas,
    })),
    custos: dados.custos.map((custo) => ({ id: custo.id, descricao: custo.descricao, valor: custo.valor })),
    atualizadoEm: dados.secao.atualizadoEm ? dados.secao.atualizadoEm.toISOString() : null,
    versao,
  };
}

export class ObterSecaoPcp implements CasoDeUso<string, SecaoPcpDTO> {
  constructor(
    private readonly repositorio: RepositorioSecaoPcp,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(avId: string): Promise<SecaoPcpDTO> {
    return paraSecaoPcpDTO(await this.repositorio.obter(avId), this.versoes.obter(chaveDaSecao(avId, 'pcp')));
  }
}

/** Só quem responde pelo PCP (ou administrador) grava a seção. */
export class SalvarSecaoPcp implements CasoDeUso<AtualizarSecaoPcpEntrada, SecaoPcpDTO> {
  constructor(
    private readonly repositorioAvs: RepositorioAvs,
    private readonly repositorio: RepositorioSecaoPcp,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(entrada: AtualizarSecaoPcpEntrada): Promise<SecaoPcpDTO> {
    const av = await this.repositorioAvs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');
    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'pcp');

    const observacoes = normalizarTextoOpcional(entrada.observacoes);
    const declaracoes = {
      layoutSemAlteracoes: entrada.layoutSemAlteracoes ?? false,
      custosSemAlteracoes: entrada.custosSemAlteracoes ?? false,
      observacoesSemAlteracoes: entrada.observacoesSemAlteracoes ?? false,
    };
    validarDeclaracoesPcp(declaracoes, { quantidadeDeCustos: entrada.custos.length, observacoes });

    const dados: DadosSecaoPcp = {
      secao: {
        avId: av.id,
        observacoes,
        ...declaracoes,
        atualizadoEm: this.relogio.agora(),
        atualizadoPor: usuario.id,
      },
      cargas: entrada.cargas.map((carga, ordem) => ({
        id: this.geradorDeId.gerar(),
        avId: av.id,
        ordem,
        operacao: validarOperacaoDaCarga(carga.operacao),
        maquina: normalizarMaquinaDaCarga(carga.maquina),
        pecasHora: validarQuantidadeDaCarga(carga.pecasHora, 'As peças por hora'),
        conversao: validarConversao(carga.conversao),
        cargaAtualPecas: validarQuantidadeDaCarga(carga.cargaAtualPecas, 'A carga atual'),
      })),
      custos: entrada.custos.map((custo, ordem) => ({
        id: this.geradorDeId.gerar(),
        avId: av.id,
        ordem,
        descricao: validarDescricaoDoCusto(custo.descricao),
        valor: custo.valor ?? null,
      })),
    };
    const versao = this.versoes.confirmar(chaveDaSecao(av.id, 'pcp'), entrada.versaoEsperada);
    await this.repositorio.salvar(dados);
    return paraSecaoPcpDTO(dados, versao);
  }
}
