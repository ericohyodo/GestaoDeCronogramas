import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { obterEtapaPorChave } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import { type Notificador, semNotificacao } from '../../../../nucleo/aplicacao/portas/notificador';
import { equipeDaAv, linkDaAv, resumoDaAv } from '../notificacoes-av';

export interface ConcluirComProjetoEntrada {
  avId: string;
  cronogramaId: string;
  usuarioId: string;
  comentario: string;
}

/**
 * Comando interno chamado pelo módulo de SDs no aceite da Engenharia: a AV sai de "SD Aberta" para
 * "Projeto Criado" (etapa final) e passa a apontar para o projeto. A autorização é feita no aceite.
 */
export class ConcluirAvComProjeto {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly notificador: Notificador = semNotificacao,
  ) {}

  async executar(entrada: ConcluirComProjetoEntrada): Promise<void> {
    const av = await this.repositorio.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');
    const sdAberta = obterEtapaPorChave('sd_aberta');
    const projetoCriado = obterEtapaPorChave('projeto_criado');
    if (av.etapaAtual !== sdAberta.numero) {
      throw new ErroDeDominio('AV_FORA_DA_ETAPA_DE_SD', 'A AV desta SD não está na etapa "SD Aberta".');
    }
    av.vincularProjeto(entrada.cronogramaId);
    av.moverParaEtapa(projetoCriado.numero);
    await this.repositorio.salvar(av);
    await this.historico.registrar({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      etapaDe: sdAberta.numero,
      etapaPara: projetoCriado.numero,
      usuarioId: entrada.usuarioId,
      comentario: entrada.comentario,
      data: this.relogio.agora(),
    });
    await this.notificador.notificar({
      usuarioIds: equipeDaAv(av),
      excetoUsuarioId: entrada.usuarioId,
      tipo: 'av.projeto_criado',
      titulo: `${av.numero} concluída: projeto criado`,
      mensagem: `${entrada.comentario} ${resumoDaAv(av)}`,
      link: linkDaAv(av.id),
    });
  }
}
