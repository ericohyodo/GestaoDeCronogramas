import type { CaixaDeNotificacoesDTO, NotificacaoDTO } from '@contratos/notificacoes.contrato';
import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { NovaNotificacao, Notificador } from '../../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import {
  limitarMensagem,
  limitarTitulo,
  type Notificacao,
  type RepositorioNotificacoes,
} from '../dominio/notificacao';

// =====================================================================================================
// Notificações internas: gravação (chamada pelos outros módulos) e a caixa do usuário logado (sino).
// =====================================================================================================

const LIMITE_DA_CAIXA = 50;

/** Quem está logado (vem do módulo de usuários). */
export interface QuemEstaLogado {
  usuarioAtualId(): string | null;
}

const paraDTO = (n: Notificacao): NotificacaoDTO => ({
  id: n.id,
  tipo: n.tipo,
  titulo: n.titulo,
  mensagem: n.mensagem,
  link: n.link,
  criadaEm: n.criadaEm.toISOString(),
  lida: n.lidaEm !== null,
});

/** Implementação do `Notificador` usado pelos módulos de AV, SD e usuários. */
export class NotificadorInterno implements Notificador {
  constructor(
    private readonly repositorio: RepositorioNotificacoes,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  /**
   * Grava uma notificação para cada destinatário (sem repetir e sem o autor do evento).
   * @param nova evento a notificar
   */
  async notificar(nova: NovaNotificacao): Promise<void> {
    const destinatarios = [...new Set(nova.usuarioIds.filter((id): id is string => !!id))].filter(
      (id) => id !== nova.excetoUsuarioId,
    );
    if (destinatarios.length === 0) return;
    const agora = this.relogio.agora();
    await this.repositorio.inserir(
      destinatarios.map((usuarioId) => ({
        id: this.geradorDeId.gerar(),
        usuarioId,
        tipo: nova.tipo,
        titulo: limitarTitulo(nova.titulo),
        mensagem: limitarMensagem(nova.mensagem),
        link: nova.link ?? null,
        criadaEm: agora,
        lidaEm: null,
      })),
    );
  }
}

abstract class CasoDaCaixa {
  constructor(
    protected readonly repositorio: RepositorioNotificacoes,
    protected readonly logado: QuemEstaLogado,
    protected readonly relogio: Relogio,
  ) {}

  protected exigirUsuario(): string {
    const id = this.logado.usuarioAtualId();
    if (!id) throw new ErroDeDominio('NAO_AUTENTICADO', 'Faça login para continuar.');
    return id;
  }

  protected async caixa(usuarioId: string): Promise<CaixaDeNotificacoesDTO> {
    const [itens, naoLidas] = await Promise.all([
      this.repositorio.listarDoUsuario(usuarioId, LIMITE_DA_CAIXA),
      this.repositorio.contarNaoLidas(usuarioId),
    ]);
    return { naoLidas, itens: itens.map(paraDTO) };
  }
}

/** Caixa do usuário logado: contador de não lidas e as 50 mais recentes. */
export class ObterCaixaDeNotificacoes extends CasoDaCaixa {
  async executar(): Promise<CaixaDeNotificacoesDTO> {
    return this.caixa(this.exigirUsuario());
  }
}

/** Marca uma notificação como lida (só do próprio usuário) e devolve a caixa atualizada. */
export class MarcarNotificacaoLida extends CasoDaCaixa {
  async executar(id: string): Promise<CaixaDeNotificacoesDTO> {
    const usuarioId = this.exigirUsuario();
    await this.repositorio.marcarLida(id, usuarioId, this.relogio.agora());
    return this.caixa(usuarioId);
  }
}

export class MarcarTodasNotificacoesLidas extends CasoDaCaixa {
  async executar(): Promise<CaixaDeNotificacoesDTO> {
    const usuarioId = this.exigirUsuario();
    await this.repositorio.marcarTodasLidas(usuarioId, this.relogio.agora());
    return this.caixa(usuarioId);
  }
}
