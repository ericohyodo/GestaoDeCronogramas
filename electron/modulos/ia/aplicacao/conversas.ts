import {
  type ConversaDTO,
  DIAS_DE_GUARDA_DAS_CONVERSAS,
  type EscopoIaDTO,
  type ResumoDeConversaDTO,
} from '@contratos/ia.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import type { PerfilDeQuemConversa, QuemEstaUsando, RepositorioDeConversas } from './portas';

// =====================================================================================================
// Histórico do Chat com IA: cada usuário guarda as próprias conversas, por escopo (Projetos e AVs).
// Conversas sem uso há mais de 90 dias são apagadas pela rotina do app.
// =====================================================================================================

const TAMANHO_DO_TITULO = 60;

/** Título da conversa: o começo da primeira pergunta, numa linha só. */
export function tituloDaConversa(pergunta: string): string {
  const limpa = pergunta.replace(/\s+/g, ' ').trim();
  return limpa.length <= TAMANHO_DO_TITULO ? limpa : `${limpa.slice(0, TAMANHO_DO_TITULO - 1)}…`;
}

export interface DependenciasDasConversas {
  conversas: RepositorioDeConversas;
  quemEstaUsando: QuemEstaUsando;
  geradorDeId: GeradorDeId;
  relogio: Relogio;
}

async function quemConversa(quem: QuemEstaUsando): Promise<PerfilDeQuemConversa> {
  const perfil = (await quem.perfilDoUsuarioAtual?.()) ?? null;
  if (!perfil) throw new ErroDeDominio('NAO_AUTENTICADO', 'Faça login para continuar.');
  return perfil;
}

/**
 * Antes de perguntar: confere que a conversa continuada é de quem pergunta e do mesmo escopo.
 * @returns o id da conversa existente, ou `null` para criar uma nova depois da resposta
 */
export async function conferirConversa(
  deps: DependenciasDasConversas | null,
  usuarioId: string | null,
  escopo: EscopoIaDTO,
  conversaId: string | null | undefined,
): Promise<string | null> {
  if (!deps || !usuarioId || !conversaId) return null;
  const conversa = await deps.conversas.obter(conversaId, usuarioId);
  if (!conversa || conversa.escopo !== escopo) {
    throw new ErroDeDominio('CONVERSA_NAO_ENCONTRADA', 'Esta conversa não existe mais. Comece uma nova.');
  }
  return conversa.id;
}

/**
 * Depois da resposta: guarda a pergunta e a resposta (criando a conversa, se for nova).
 * @returns id da conversa onde as falas foram guardadas; `null` sem histórico disponível
 */
export async function guardarNaConversa(
  deps: DependenciasDasConversas | null,
  usuarioId: string | null,
  escopo: EscopoIaDTO,
  conversaId: string | null,
  pergunta: string,
  resposta: { texto: string; modelo: string },
): Promise<string | null> {
  if (!deps || !usuarioId) return null;
  const agora = deps.relogio.agora();
  let id = conversaId;
  if (!id) {
    id = deps.geradorDeId.gerar();
    await deps.conversas.criar({ id, usuarioId, escopo, titulo: tituloDaConversa(pergunta), criadaEm: agora, atualizadaEm: agora });
  }
  await deps.conversas.acrescentar(
    id,
    [
      { papel: 'usuario', texto: pergunta, modelo: null },
      { papel: 'ia', texto: resposta.texto, modelo: resposta.modelo },
    ],
    agora,
  );
  return id;
}

/** Barra de histórico: as conversas do usuário logado no escopo. */
export class ListarConversas implements CasoDeUso<EscopoIaDTO, ResumoDeConversaDTO[]> {
  constructor(private readonly deps: DependenciasDasConversas) {}

  async executar(escopo: EscopoIaDTO): Promise<ResumoDeConversaDTO[]> {
    const usuario = await quemConversa(this.deps.quemEstaUsando);
    return (await this.deps.conversas.listar(usuario.id, escopo)).map((conversa) => ({
      id: conversa.id,
      titulo: conversa.titulo,
      atualizadaEm: conversa.atualizadaEm.toISOString(),
    }));
  }
}

/** Abre uma conversa do próprio usuário para continuar. */
export class ObterConversa implements CasoDeUso<string, ConversaDTO> {
  constructor(private readonly deps: DependenciasDasConversas) {}

  async executar(id: string): Promise<ConversaDTO> {
    const usuario = await quemConversa(this.deps.quemEstaUsando);
    const conversa = await this.deps.conversas.obter(id, usuario.id);
    if (!conversa) throw new ErroDeDominio('CONVERSA_NAO_ENCONTRADA', 'Esta conversa não existe mais.');
    return { id: conversa.id, titulo: conversa.titulo, escopo: conversa.escopo, mensagens: conversa.mensagens };
  }
}

export class ExcluirConversa implements CasoDeUso<string, null> {
  constructor(private readonly deps: DependenciasDasConversas) {}

  async executar(id: string): Promise<null> {
    const usuario = await quemConversa(this.deps.quemEstaUsando);
    if (!(await this.deps.conversas.excluir(id, usuario.id))) {
      throw new ErroDeDominio('CONVERSA_NAO_ENCONTRADA', 'Esta conversa não existe mais.');
    }
    return null;
  }
}

/** Rotina: apaga as conversas sem uso há mais de 90 dias. */
export async function limparConversasAntigas(conversas: RepositorioDeConversas, agora: Date): Promise<number> {
  const limite = new Date(agora.getTime() - DIAS_DE_GUARDA_DAS_CONVERSAS * 86_400_000);
  return conversas.apagarSemUsoDesde(limite);
}
