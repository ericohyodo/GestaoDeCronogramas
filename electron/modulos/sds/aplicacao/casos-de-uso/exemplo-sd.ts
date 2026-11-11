import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { ControleDeVersao } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import type { RepositorioSds } from '../../dominio/repositorio-sds';
import { abrirSd, atualizarFormulario } from '../../dominio/sd';
import { chaveDaSd } from '../mapeador-dto';
import type { AceitarSd } from './fluxo-sd';

const DIA_EM_MS = 86_400_000;

/**
 * Leva a SD de uma AV de exemplo até "aberta" ou "fechada" (com projeto), para a demonstração ter SDs
 * em todos os estados. Usado só pelo gerador de dados de exemplo (administrador). A evidência de PO é
 * dispensada: exemplos não têm arquivo de cliente.
 */
export class AvancarSdDeExemplo {
  constructor(
    private readonly repositorio: RepositorioSds,
    private readonly versoes: ControleDeVersao,
    private readonly relogio: Relogio,
    private readonly aceitar: Pick<AceitarSd, 'executar'>,
    /** Anexa uma evidência fictícia de PO (e-mail do cliente) à SD de exemplo. */
    private readonly anexarEvidenciaDeExemplo?: (sd: { id: string; numero: string }, usuarioId: string) => Promise<void>,
  ) {}

  /**
   * @param avId AV de exemplo que já tem Pré-SD
   * @param ate estado final desejado da SD
   * @param usuarioId quem consta como tendo aberto a SD
   */
  async executar(avId: string, ate: 'aberta' | 'fechada', usuarioId: string): Promise<void> {
    const atual = await this.repositorio.obterPorAv(avId);
    if (!atual) throw new ErroNaoEncontrado('SD');
    const agora = this.relogio.agora();
    const preenchida = atualizarFormulario(atual.sd, {
      dataEnvioCotacao: new Date(agora.getTime() - 10 * DIA_EM_MS).toISOString().slice(0, 10),
      numeroPo: `PO-${atual.sd.numero.replace(/\D/g, '')}`,
      observacoes: 'Pedido confirmado pelo cliente por e-mail (exemplo).',
    });
    await this.anexarEvidenciaDeExemplo?.({ id: atual.sd.id, numero: atual.sd.numero }, usuarioId);
    await this.repositorio.salvar(abrirSd(preenchida, usuarioId, agora, 1));
    this.versoes.confirmar(chaveDaSd(atual.sd.id));
    if (ate === 'fechada') {
      // Projeto de exemplo já em andamento (começou há 45 dias): dá para mostrar tarefas concluídas e atrasadas.
      const inicio = new Date(agora.getTime() - 45 * DIA_EM_MS).toISOString().slice(0, 10);
      const fim = new Date(agora.getTime() + 135 * DIA_EM_MS).toISOString().slice(0, 10);
      await this.aceitar.executar({ id: atual.sd.id, dataInicio: inicio, dataFim: fim });
    }
  }
}
