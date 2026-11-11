import type { AvDetalheDTO, CriarAvEntrada } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { Av, gerarNumeroAv } from '../../dominio/av';
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
  ) {}

  async executar(entrada: CriarAvEntrada): Promise<AvDetalheDTO> {
    const usuarioAtual = await this.autorizacao.exigirCompetencia('comercial');
    const ativos = await this.usuarios.listarAtivos();
    validarMembros(entrada.membros, ativos);

    const agora = this.relogio.agora();
    const ano = agora.getFullYear();
    const sequencial = await this.repositorio.proximoSequencial(ano);

    const av = Av.criar({
      id: this.geradorDeId.gerar(),
      numero: gerarNumeroAv(sequencial, ano),
      sequencial,
      ano,
      descricao: entrada.descricao,
      cliente: entrada.cliente,
      codigo: entrada.codigo,
      complexidade: entrada.complexidade,
      solicitante: entrada.solicitante,
      prazoCliente: entrada.prazoCliente,
      membros: entrada.membros,
      criadoPor: usuarioAtual?.id ?? null,
      agora,
    });
    await this.repositorio.salvar(av);
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
