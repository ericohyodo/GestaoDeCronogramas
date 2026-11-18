import type {
  AndamentoReporteEntrada,
  ConteudoImagemReporteDTO,
  CriarReporteEntrada,
  EventoReporteDTO,
  ReporteDetalheDTO,
  ReporteResumoDTO,
  StatusReporteDTO,
} from '@contratos/reportes.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Notificador } from '../../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio, ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import {
  type EventoReporte,
  type ImagemReporte,
  LIMITE_IMAGENS_REPORTE,
  type Reporte,
  type ReporteListado,
  tipoDoAndamento,
  validarComentario,
  validarImagemDoReporte,
  validarTextoDoReporte,
} from '../dominio/reporte';
import type { RepositorioReportes } from '../dominio/repositorio-reportes';
import type {
  AcessoDosReportes,
  ArmazenamentoDeImagensReporte,
  CodificadorBase64,
  UsuarioAtualReporte,
} from './portas';

// =====================================================================================================
// Casos de uso dos reportes de erro e sugestões
// =====================================================================================================

export interface DependenciasReportes {
  repositorio: RepositorioReportes;
  acesso: AcessoDosReportes;
  armazenamento: ArmazenamentoDeImagensReporte;
  base64: CodificadorBase64;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  notificador: Notificador;
  /** Versão do app em execução (gravada no reporte para saber em que versão o erro apareceu). */
  versaoDoApp: string;
}

const ROTULO_DO_STATUS: Record<StatusReporteDTO, string> = {
  aberto: 'Aberto',
  em_analise: 'Em análise',
  resolvido: 'Resolvido',
  descartado: 'Descartado',
};

/** Rota do app para abrir um reporte na página do administrador. */
const linkDoReporte = (id: string) => `/reportes/?id=${encodeURIComponent(id)}`;

/**
 * Exige alguém logado.
 * @throws ErroDeDominio `NAO_AUTENTICADO`
 */
function exigirUsuario(acesso: AcessoDosReportes): UsuarioAtualReporte {
  const usuario = acesso.usuarioAtual();
  if (!usuario) throw new ErroDeDominio('NAO_AUTENTICADO', 'Entre no aplicativo para continuar.');
  return usuario;
}

/**
 * Exige administrador (o canal IPC já confere; aqui é a segunda barreira).
 * @throws ErroDeDominio `SEM_PERMISSAO`
 */
function exigirAdministrador(acesso: AcessoDosReportes): UsuarioAtualReporte {
  const usuario = exigirUsuario(acesso);
  if (!usuario.administrador) {
    throw new ErroDeDominio('SEM_PERMISSAO', 'Só administradores acompanham os reportes.');
  }
  return usuario;
}

/**
 * Converte o reporte para a tela.
 * @param reporte reporte com a quantidade de prints
 * @param nomes id → nome dos usuários
 */
function paraResumoDTO(reporte: ReporteListado, nomes: Map<string, string>): ReporteResumoDTO {
  return {
    id: reporte.id,
    numero: reporte.numero,
    tipo: reporte.tipo,
    status: reporte.status,
    texto: reporte.texto,
    autor: reporte.usuarioId ? (nomes.get(reporte.usuarioId) ?? null) : null,
    rota: reporte.rota,
    versaoApp: reporte.versaoApp,
    quantidadeImagens: reporte.quantidadeImagens,
    criadoEm: reporte.criadoEm.toISOString(),
    atualizadoEm: reporte.atualizadoEm.toISOString(),
  };
}

function paraEventoDTO(evento: EventoReporte, nomes: Map<string, string>): EventoReporteDTO {
  return {
    id: evento.id,
    tipo: evento.tipo,
    statusDe: evento.statusDe,
    statusPara: evento.statusPara,
    comentario: evento.comentario,
    autor: evento.usuarioId ? (nomes.get(evento.usuarioId) ?? null) : null,
    criadoEm: evento.criadoEm.toISOString(),
  };
}

async function mapaDeNomes(acesso: AcessoDosReportes): Promise<Map<string, string>> {
  return new Map((await acesso.listarNomes()).map((usuario) => [usuario.id, usuario.nome]));
}

/** Monta o detalhe (reporte, prints e log) para a tela do administrador. */
async function detalhar(deps: DependenciasReportes, reporte: Reporte): Promise<ReporteDetalheDTO> {
  const [imagens, eventos, nomes] = await Promise.all([
    deps.repositorio.listarImagens(reporte.id),
    deps.repositorio.listarEventos(reporte.id),
    mapaDeNomes(deps.acesso),
  ]);
  return {
    ...paraResumoDTO({ ...reporte, quantidadeImagens: imagens.length }, nomes),
    imagens: imagens.map((imagem) => ({
      id: imagem.id,
      nomeArquivo: imagem.nomeArquivo,
      tipoMime: imagem.tipoMime,
      tamanhoBytes: imagem.tamanhoBytes,
    })),
    eventos: eventos.map((evento) => paraEventoDTO(evento, nomes)),
  };
}

/** Qualquer pessoa logada envia um erro ou sugestão, com até 3 prints. Os administradores são avisados. */
export class CriarReporte implements CasoDeUso<CriarReporteEntrada, { id: string; numero: number }> {
  constructor(private readonly deps: DependenciasReportes) {}

  /**
   * @param entrada tipo, texto, rota de origem e prints em base64
   * @returns id e número do reporte criado
   * @throws ErroDeValidacao para texto vazio, prints demais ou arquivo que não é imagem aceita
   */
  async executar(entrada: CriarReporteEntrada): Promise<{ id: string; numero: number }> {
    const { repositorio, armazenamento, relogio, geradorDeId } = this.deps;
    const usuario = exigirUsuario(this.deps.acesso);
    const texto = validarTextoDoReporte(entrada.texto);
    if (entrada.imagens.length > LIMITE_IMAGENS_REPORTE) {
      throw new ErroDeValidacao(`Anexe no máximo ${LIMITE_IMAGENS_REPORTE} imagens.`);
    }
    // Valida todos os prints antes de gravar o primeiro.
    const prints = entrada.imagens.map((imagem) => {
      const bytes = this.deps.base64.decodificar(imagem.base64);
      return { nomeArquivo: imagem.nomeArquivo.slice(0, 200), bytes, ...validarImagemDoReporte(imagem.nomeArquivo, bytes) };
    });

    const agora = relogio.agora();
    const reporte: Omit<Reporte, 'numero'> = {
      id: geradorDeId.gerar(),
      tipo: entrada.tipo,
      texto,
      status: 'aberto',
      usuarioId: usuario.id,
      rota: entrada.rota?.trim().slice(0, 300) || null,
      versaoApp: this.deps.versaoDoApp,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    const gravadas: ImagemReporte[] = [];
    let numero: number;
    try {
      for (const [ordem, print] of prints.entries()) {
        const nomeArmazenado = await armazenamento.gravar(reporte.id, print.nomeSeguro, print.bytes);
        gravadas.push({
          id: geradorDeId.gerar(),
          reporteId: reporte.id,
          ordem,
          nomeArquivo: print.nomeArquivo,
          nomeArmazenado,
          tipoMime: print.tipoMime,
          tamanhoBytes: print.bytes.length,
        });
      }
      numero = await repositorio.criar({
        reporte,
        imagens: gravadas,
        evento: {
          id: geradorDeId.gerar(),
          reporteId: reporte.id,
          tipo: 'criado',
          statusDe: null,
          statusPara: 'aberto',
          comentario: null,
          usuarioId: usuario.id,
          criadoEm: agora,
        },
      });
    } catch (falha) {
      // Sem o registro no banco, os prints já gravados ficariam órfãos na pasta compartilhada.
      for (const imagem of gravadas) {
        await armazenamento.excluir(reporte.id, imagem.nomeArmazenado).catch(() => undefined);
      }
      throw falha;
    }

    const tipo = reporte.tipo === 'erro' ? 'Erro' : 'Sugestão';
    await this.deps.notificador.notificar({
      usuarioIds: await this.deps.acesso.listarAdministradores(),
      excetoUsuarioId: usuario.id,
      tipo: 'reporte.novo',
      titulo: `${tipo} reportado #${numero}`,
      mensagem: `${usuario.nome}: ${texto.length > 140 ? `${texto.slice(0, 137)}…` : texto}`,
      link: linkDoReporte(reporte.id),
    });
    return { id: reporte.id, numero };
  }
}

/** Lista para o administrador, mais recentes primeiro. */
export class ListarReportes implements CasoDeUso<{ status?: StatusReporteDTO } | undefined, ReporteResumoDTO[]> {
  constructor(private readonly deps: DependenciasReportes) {}

  async executar(filtro?: { status?: StatusReporteDTO }): Promise<ReporteResumoDTO[]> {
    exigirAdministrador(this.deps.acesso);
    const [reportes, nomes] = await Promise.all([
      this.deps.repositorio.listar(filtro?.status ? { status: filtro.status } : undefined),
      mapaDeNomes(this.deps.acesso),
    ]);
    return reportes.map((reporte) => paraResumoDTO(reporte, nomes));
  }
}

/** Detalhe com prints e log de alterações (administrador). */
export class ObterReporte implements CasoDeUso<string, ReporteDetalheDTO> {
  constructor(private readonly deps: DependenciasReportes) {}

  async executar(id: string): Promise<ReporteDetalheDTO> {
    exigirAdministrador(this.deps.acesso);
    const reporte = await this.deps.repositorio.obter(id);
    if (!reporte) throw new ErroNaoEncontrado('Reporte');
    return detalhar(this.deps, reporte);
  }
}

/**
 * Administrador muda o status (ex.: dar baixa = "Resolvido") ou comenta. Tudo vai para o log com quem e
 * quando; quem reportou é avisado quando o reporte é resolvido ou descartado.
 */
export class RegistrarAndamentoReporte implements CasoDeUso<AndamentoReporteEntrada, ReporteDetalheDTO> {
  constructor(private readonly deps: DependenciasReportes) {}

  async executar(entrada: AndamentoReporteEntrada): Promise<ReporteDetalheDTO> {
    const usuario = exigirAdministrador(this.deps.acesso);
    const reporte = await this.deps.repositorio.obter(entrada.id);
    if (!reporte) throw new ErroNaoEncontrado('Reporte');
    const comentario = validarComentario(entrada.comentario);
    const tipo = tipoDoAndamento(reporte.status, entrada.status, comentario);
    const agora = this.deps.relogio.agora();

    await this.deps.repositorio.registrarAndamento({
      reporteId: reporte.id,
      status: entrada.status,
      atualizadoEm: agora,
      evento: {
        id: this.deps.geradorDeId.gerar(),
        reporteId: reporte.id,
        tipo,
        statusDe: tipo === 'status' ? reporte.status : null,
        statusPara: tipo === 'status' ? entrada.status : null,
        comentario,
        usuarioId: usuario.id,
        criadoEm: agora,
      },
    });

    if (tipo === 'status' && (entrada.status === 'resolvido' || entrada.status === 'descartado')) {
      await this.deps.notificador.notificar({
        usuarioIds: [reporte.usuarioId],
        excetoUsuarioId: usuario.id,
        tipo: 'reporte.status',
        titulo: `Seu reporte #${reporte.numero}: ${ROTULO_DO_STATUS[entrada.status].toLowerCase()}`,
        mensagem: comentario ?? `${usuario.nome} marcou o reporte como ${ROTULO_DO_STATUS[entrada.status].toLowerCase()}.`,
        link: null,
      });
    }

    return detalhar(this.deps, { ...reporte, status: entrada.status, atualizadoEm: agora });
  }
}

/** Conteúdo de um print para exibir na tela do administrador. */
export class ObterImagemReporte implements CasoDeUso<string, ConteudoImagemReporteDTO> {
  constructor(private readonly deps: DependenciasReportes) {}

  async executar(imagemId: string): Promise<ConteudoImagemReporteDTO> {
    exigirAdministrador(this.deps.acesso);
    const imagem = await this.deps.repositorio.obterImagem(imagemId);
    if (!imagem) throw new ErroNaoEncontrado('Imagem');
    const bytes = await this.deps.armazenamento.ler(imagem.reporteId, imagem.nomeArmazenado);
    return { nomeArquivo: imagem.nomeArquivo, tipoMime: imagem.tipoMime, base64: this.deps.base64.codificar(bytes) };
  }
}
