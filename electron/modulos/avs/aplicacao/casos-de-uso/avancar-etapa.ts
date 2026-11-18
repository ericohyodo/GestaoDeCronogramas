import type { AvancarEtapaEntrada, AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { obterEtapaAv } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import type { RepositorioPrazosArea } from '../../dominio/prazo-area';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';
import { type Notificador, semNotificacao } from '../../../../nucleo/aplicacao/portas/notificador';
import { linkDaAv, resumoDaAv, ROTULO_DA_AREA } from '../notificacoes-av';

/**
 * Avança a AV exatamente uma etapa, na ordem do catálogo — não existe "liberar fora de ordem"
 * como no app antigo. Só quem responde pela área da etapa atual (ou administrador) pode chamar.
 */
export class AvancarEtapa implements CasoDeUso<AvancarEtapaEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly versoes: ControleDeVersao = versaoSemControle,
    private readonly notificador: Notificador = semNotificacao,
    /** Leitura do prazo aberto da área, para informar a data-limite no aviso de etapa liberada. */
    private readonly prazos: Pick<RepositorioPrazosArea, 'obterAberto'> = { obterAberto: async () => null },
  ) {}

  async executar(entrada: AvancarEtapaEntrada): Promise<AvDetalheDTO> {
    const av = await this.repositorio.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const etapaAtual = obterEtapaAv(av.etapaAtual);
    if (etapaAtual.terminal) {
      throw new ErroDeDominio('AV_JA_FINALIZADA', 'Esta AV já está em uma etapa final.');
    }
    if (etapaAtual.chave === 'sd_aberta') {
      throw new ErroDeDominio(
        'AGUARDANDO_ACEITE_DA_SD',
        'A AV vai para "Projeto Criado" quando a Engenharia der o aceite da SD (módulo de SDs).',
      );
    }
    if (obterEtapaAv(etapaAtual.numero + 1).chave === 'sd_aberta') {
      throw new ErroDeDominio(
        'USE_FINALIZAR_AV',
        'Para abrir a SD, use "Finalizar AV e criar Pré-SD" no Resumo da AV.',
      );
    }
    if (!etapaAtual.area) {
      throw new ErroDeDominio('ETAPA_SEM_AREA', 'Esta etapa não tem uma área responsável definida.');
    }

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, etapaAtual.area);
    const proxima = obterEtapaAv(etapaAtual.numero + 1);
    const agora = this.relogio.agora();

    av.moverParaEtapa(proxima.numero);
    if (proxima.chave === 'proposta_enviada') av.marcarPropostaEnviada(agora);
    await this.repositorio.salvar(av);

    await this.historico.registrar({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      etapaDe: etapaAtual.numero,
      etapaPara: proxima.numero,
      usuarioId: usuario.id,
      comentario: entrada.comentario ?? null,
      data: agora,
    });
    if (proxima.area) {
      const prazo = await this.prazos.obterAberto(av.id, proxima.numero);
      const textoDoPrazo = prazo
        ? ` Prazo: ${prazo.dataLimite.slice(8, 10)}/${prazo.dataLimite.slice(5, 7)} (${prazo.diasUteis} dias úteis).`
        : '';
      await this.notificador.notificar({
        usuarioIds: [av.membros[proxima.area]],
        excetoUsuarioId: usuario.id,
        tipo: 'av.etapa_liberada',
        titulo: `${av.numero} chegou à sua área: ${ROTULO_DA_AREA[proxima.area]}`,
        mensagem: `${resumoDaAv(av)}. Etapa atual: ${proxima.nome}.${textoDoPrazo}`,
        link: linkDaAv(av.id),
      });
    }

    return paraAvDetalheDTO(av, construirMapaDeNomes(await this.usuarios.listarAtivos()), this.versoes.obter(chaveDaSecao(av.id, 'comercial')));
  }
}
