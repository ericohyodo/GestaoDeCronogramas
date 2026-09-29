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
  validarPercentual,
  type DadosSecaoPcp,
  type RepositorioSecaoPcp,
} from '../../dominio/secao-pcp';
import type { AutorizacaoAv } from '../autorizacao';

function paraSecaoPcpDTO(dados: DadosSecaoPcp | null): SecaoPcpDTO {
  if (!dados) return { observacoes: null, cargas: [], custos: [], atualizadoEm: null };
  return {
    observacoes: dados.secao.observacoes,
    cargas: dados.cargas.map((carga) => ({
      id: carga.id,
      operacao: carga.operacao,
      maquina: carga.maquina,
      pecasHora: carga.pecasHora,
      cargaAtual: carga.cargaAtual,
      cargaFutura: carga.cargaFutura,
    })),
    custos: dados.custos.map((custo) => ({ id: custo.id, descricao: custo.descricao, valor: custo.valor })),
    atualizadoEm: dados.secao.atualizadoEm ? dados.secao.atualizadoEm.toISOString() : null,
  };
}

export class ObterSecaoPcp implements CasoDeUso<string, SecaoPcpDTO> {
  constructor(private readonly repositorio: RepositorioSecaoPcp) {}

  async executar(avId: string): Promise<SecaoPcpDTO> {
    return paraSecaoPcpDTO(await this.repositorio.obter(avId));
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
  ) {}

  async executar(entrada: AtualizarSecaoPcpEntrada): Promise<SecaoPcpDTO> {
    const av = await this.repositorioAvs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');
    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'pcp');

    const dados: DadosSecaoPcp = {
      secao: {
        avId: av.id,
        observacoes: normalizarTextoOpcional(entrada.observacoes),
        atualizadoEm: this.relogio.agora(),
        atualizadoPor: usuario.id,
      },
      cargas: entrada.cargas.map((carga, ordem) => ({
        id: this.geradorDeId.gerar(),
        avId: av.id,
        ordem,
        operacao: validarOperacaoDaCarga(carga.operacao),
        maquina: normalizarMaquinaDaCarga(carga.maquina),
        pecasHora: carga.pecasHora ?? null,
        cargaAtual: validarPercentual(carga.cargaAtual, 'A carga atual'),
        cargaFutura: validarPercentual(carga.cargaFutura, 'A carga futura'),
      })),
      custos: entrada.custos.map((custo, ordem) => ({
        id: this.geradorDeId.gerar(),
        avId: av.id,
        ordem,
        descricao: validarDescricaoDoCusto(custo.descricao),
        valor: custo.valor ?? null,
      })),
    };
    await this.repositorio.salvar(dados);
    return paraSecaoPcpDTO(dados);
  }
}
