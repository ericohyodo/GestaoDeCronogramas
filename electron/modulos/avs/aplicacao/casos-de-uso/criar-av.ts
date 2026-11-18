import type { AvDetalheDTO, CriarAvEntrada } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { Av, gerarNumeroAv } from '../../dominio/av';
import type { RepositorioPortfolio } from '../../dominio/portfolio';
import { criarPastaDaAv, type DependenciasPastaDaAv } from './pasta-da-av';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';
import { validarMembros } from '../validar-membros';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';
import { type Notificador, semNotificacao } from '../../../../nucleo/aplicacao/portas/notificador';
import { linkDaAv, novasDesignacoes, resumoDaAv, ROTULO_DA_AREA } from '../notificacoes-av';

/** Abrir uma AV é uma ação da área Comercial: exige a competência 'comercial' (ou administrador). */
export class CriarAv implements CasoDeUso<CriarAvEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly autorizacao: AutorizacaoAv,
    private readonly versoes: ControleDeVersao = versaoSemControle,
    private readonly notificador: Notificador = semNotificacao,
    /** Itens de portfólio: a AV de portfólio herda identificação do item escolhido. */
    private readonly portfolio: Pick<RepositorioPortfolio, 'obter'> | null = null,
    /** Pasta da AV no Windows: criada junto com a AV quando a raiz estiver configurada. */
    private readonly pastas: Pick<DependenciasPastaDaAv, 'avs' | 'config' | 'pastas'> | null = null,
  ) {}

  async executar(entrada: CriarAvEntrada): Promise<AvDetalheDTO> {
    const usuarioAtual = await this.autorizacao.exigirCompetencia('comercial');
    const ativos = await this.usuarios.listarAtivos();
    validarMembros(entrada.membros, ativos);

    // AV de portfólio: descrição, código, cliente, linha, família e programa vêm do item (ativo).
    const tipo = entrada.tipo ?? 'completa';
    let herdado: { descricao: string; codigo: string; cliente: string | null; programa: string | null; linha: string | null; familia: string | null } | null = null;
    if (tipo === 'portfolio') {
      if (!entrada.itemPortfolioId || !this.portfolio) throw new ErroNaoEncontrado('Item de portfólio');
      const dados = await this.portfolio.obter(entrada.itemPortfolioId);
      if (!dados) throw new ErroNaoEncontrado('Item de portfólio');
      if (!dados.item.ativo) throw new ErroDeDominio('ITEM_INATIVO', 'Este item de portfólio está inativo.');
      herdado = dados.item;
    }

    const agora = this.relogio.agora();
    const ano = agora.getFullYear();
    const sequencial = await this.repositorio.proximoSequencial(ano);

    const av = Av.criar({
      id: this.geradorDeId.gerar(),
      numero: gerarNumeroAv(sequencial, ano),
      sequencial,
      ano,
      tipo,
      itemPortfolioId: tipo === 'portfolio' ? (entrada.itemPortfolioId ?? null) : null,
      descricao: herdado ? herdado.descricao : entrada.descricao,
      cliente: entrada.cliente ?? herdado?.cliente ?? null,
      codigo: herdado ? herdado.codigo : entrada.codigo,
      programa: herdado?.programa ?? null,
      linha: herdado?.linha ?? null,
      familia: herdado?.familia ?? null,
      complexidade: entrada.complexidade,
      solicitante: entrada.solicitante,
      prazoCliente: entrada.prazoCliente,
      membros: entrada.membros,
      criadoPor: usuarioAtual?.id ?? null,
      agora,
    });
    await this.repositorio.salvar(av);
    if (this.pastas) {
      // A AV vale mesmo sem a pasta (rede fora do ar, raiz apagada): o Comercial cria depois pelo botão.
      await criarPastaDaAv(this.pastas, av).catch(() => null);
    }
    await this.avisarDesignados(av, usuarioAtual?.id ?? null);

    return paraAvDetalheDTO(av, construirMapaDeNomes(ativos), this.versoes.obter(chaveDaSecao(av.id, 'comercial')));
  }

  /** Cada responsável designado na criação recebe um aviso com as áreas que assumiu. */
  private async avisarDesignados(av: Av, autorId: string | null): Promise<void> {
    for (const [usuarioId, areas] of novasDesignacoes({}, av.membros)) {
      await this.notificador.notificar({
        usuarioIds: [usuarioId],
        excetoUsuarioId: autorId,
        tipo: 'av.designado',
        titulo: `Você é responsável por ${areas.map((area) => ROTULO_DA_AREA[area]).join(', ')} na ${av.numero}`,
        mensagem: resumoDaAv(av),
        link: linkDaAv(av.id),
      });
    }
  }
}
