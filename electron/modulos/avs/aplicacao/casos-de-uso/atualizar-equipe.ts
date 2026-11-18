import type { AtualizarEquipeEntrada, AvDetalheDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios } from '../portas';
import { validarMembros } from '../validar-membros';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { chaveDaSecao } from '../versoes';
import { type Notificador, semNotificacao } from '../../../../nucleo/aplicacao/portas/notificador';
import { linkDaAv, novasDesignacoes, resumoDaAv, ROTULO_DA_AREA } from '../notificacoes-av';

/** Só quem responde pela área Comercial (ou administrador) pode designar o time de uma AV. */
export class AtualizarEquipe implements CasoDeUso<AtualizarEquipeEntrada, AvDetalheDTO> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly versoes: ControleDeVersao = versaoSemControle,
    private readonly notificador: Notificador = semNotificacao,
  ) {}

  async executar(entrada: AtualizarEquipeEntrada): Promise<AvDetalheDTO> {
    const av = await this.repositorio.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const autor = await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    const ativos = await this.usuarios.listarAtivos();
    validarMembros(entrada.membros, ativos);

    const antes = { ...av.membros };
    av.atualizarEquipe(entrada.membros);
    await this.repositorio.salvar(av);
    for (const [usuarioId, areas] of novasDesignacoes(antes, av.membros)) {
      await this.notificador.notificar({
        usuarioIds: [usuarioId],
        excetoUsuarioId: autor.id,
        tipo: 'av.designado',
        titulo: `Você é responsável por ${areas.map((area) => ROTULO_DA_AREA[area]).join(', ')} na ${av.numero}`,
        mensagem: resumoDaAv(av),
        link: linkDaAv(av.id),
      });
    }

    return paraAvDetalheDTO(av, construirMapaDeNomes(ativos), this.versoes.obter(chaveDaSecao(av.id, 'comercial')));
  }
}
