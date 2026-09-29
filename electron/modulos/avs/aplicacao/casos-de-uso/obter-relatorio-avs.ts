import type { LinhaRelatorioAvDTO, SituacaoAvDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { obterEtapaAv } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { RepositorioSecaoCusto } from '../../dominio/repositorio-secao-custo';
import type { RepositorioSecaoProcesso } from '../../dominio/repositorio-secao-processo';
import type { RepositorioSecaoProduto } from '../../dominio/repositorio-secao-produto';
import { construirMapaDeNomes } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';

const DIA_EM_MS = 86_400_000;

const soma = (valores: (number | null | undefined)[]) => valores.reduce<number>((total, v) => total + (v ?? 0), 0);

/**
 * Uma linha por AV com o que os relatórios e a IA precisam: etapa, prazo, atraso, responsável, classificação
 * do produto e os valores consolidados (investimento e custo por peça, os mesmos do Resumo da AV).
 */
export class ObterRelatorioAvs implements CasoDeUso<void, LinhaRelatorioAvDTO[]> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly produto: RepositorioSecaoProduto,
    private readonly processo: RepositorioSecaoProcesso,
    private readonly custo: RepositorioSecaoCusto,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly relogio: Relogio,
  ) {}

  async executar(): Promise<LinhaRelatorioAvDTO[]> {
    const agora = this.relogio.agora();
    const hoje = agora.toLocaleDateString('sv-SE');
    const [avs, ativos] = await Promise.all([this.repositorio.listar(), this.usuarios.listarAtivos()]);
    const nomes = construirMapaDeNomes(ativos);

    const linhas: LinhaRelatorioAvDTO[] = [];
    for (const av of avs) {
      const etapa = obterEtapaAv(av.etapaAtual);
      const situacao: SituacaoAvDTO = etapa.terminal
        ? etapa.chave === 'projeto_criado'
          ? 'concluida'
          : 'declinada'
        : 'em_andamento';

      const [movimentos, dadosProduto, dadosProcesso, dadosCusto] = await Promise.all([
        this.historico.listarPorAv(av.id),
        this.produto.obter(av.id),
        this.processo.obter(av.id),
        this.custo.obter(av.id),
      ]);
      const ultimaMudanca = movimentos.reduce<Date>(
        (maisRecente, item) => (item.data > maisRecente ? item.data : maisRecente),
        av.criadoEm,
      );
      const responsavelId = etapa.area ? av.membros[etapa.area] : undefined;

      linhas.push({
        id: av.id,
        numero: av.numero,
        cliente: av.cliente,
        descricao: av.descricao,
        grupo: av.grupoNome,
        etapa: etapa.nome,
        etapaChave: etapa.chave,
        situacao,
        abertaEm: av.criadoEm.toISOString(),
        prazo: av.prazoCliente,
        atrasada: situacao === 'em_andamento' && !!av.prazoCliente && av.prazoCliente < hoje,
        diasNaEtapa: Math.max(0, Math.floor((agora.getTime() - ultimaMudanca.getTime()) / DIA_EM_MS)),
        responsavelDaEtapa: responsavelId ? (nomes.get(responsavelId) ?? null) : null,
        familia: av.familia,
        linha: av.linha,
        complexidade: dadosProduto?.secao.complexidade ?? null,
        volumeAnual: av.volumeAnual,
        investimentoTotal: soma([
          ...(dadosProduto?.investimentos ?? []).map((item) => item.valor),
          ...(dadosProcesso?.investimentos ?? []).map((item) => item.valor),
        ]),
        custoPorPeca: soma([
          ...(dadosCusto?.materiais ?? []).map((item) => item.custoTotal),
          ...(dadosCusto?.processo ?? []).map((item) => item.custoTotal),
        ]),
      });
    }
    return linhas;
  }
}
