import type { AnexoAvDTO, AvDetalheDTO } from '@contratos/avs.contrato';
import type {
  ItemPortfolioDTO,
  ItemPortfolioResumoDTO,
  PortfolioDaAvDTO,
  SalvarChecagemPortfolioEntrada,
  SalvarItemPortfolioEntrada,
} from '@contratos/portfolio.contrato';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import { type Notificador, semNotificacao } from '../../../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { ErroDeDominio, ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { validarArquivoDeAnexo } from '../../dominio/anexo';
import { obterEtapaAv, obterEtapaPorChave } from '../../dominio/etapa-av';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import {
  type AnexoPortfolio,
  type ItemPortfolio,
  type ItemPortfolioCompleto,
  type RepositorioChecagensPortfolio,
  type RepositorioPortfolio,
  validarCusto,
  validarDataOpcional,
  validarIdentificacaoDoItem,
  validarObservacaoDaChecagem,
  validarOperacoesDoItem,
} from '../../dominio/portfolio';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { montarEstrutura } from '../estrutura-produto';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import { equipeDaAv, linkDaAv } from '../notificacoes-av';
import type { ArmazenamentoDeArquivos, ConsultaDeUsuarios, SeletorDeArquivos } from '../portas';
import { chaveDaSecao } from '../versoes';

// =====================================================================================================
// AV de Item de Portfólio: cadastro de itens-modelo (gestores e administrador), checagens das áreas e
// conclusão sem SD.
// =====================================================================================================

export interface DependenciasPortfolio {
  repositorio: RepositorioPortfolio;
  checagens: RepositorioChecagensPortfolio;
  avs: RepositorioAvs;
  autorizacao: AutorizacaoAv;
  usuarios: ConsultaDeUsuarios;
  /** Arquivos do desenho de referência (pasta própria, `anexos-portfolio/<itemId>`). */
  armazenamento: ArmazenamentoDeArquivos;
  seletor: SeletorDeArquivos;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
}

/**
 * Cadastro de itens: administrador ou gestor (o canal IPC já exige "planejamento"; aqui é a segunda barreira).
 * @returns id de quem está editando
 */
function exigirEditorDoCatalogo(usuarios: ConsultaDeUsuarios): string {
  const usuario = usuarios.usuarioAtual();
  if (!usuario || (usuario.perfil !== 'administrador' && usuario.perfil !== 'gestor')) {
    throw new ErroDeDominio('SEM_PERMISSAO', 'Só gestores e administradores editam os itens de portfólio.');
  }
  return usuario.id;
}

function paraResumoDTO(item: ItemPortfolio, nomes: Map<string, string>): ItemPortfolioResumoDTO {
  return {
    id: item.id,
    codigo: item.codigo,
    descricao: item.descricao,
    cliente: item.cliente,
    linha: item.linha,
    familia: item.familia,
    programa: item.programa,
    revisaoDesenho: item.revisaoDesenho,
    materiaPrima: item.materiaPrima,
    insumos: item.insumos,
    embalagem: item.embalagem,
    processo: item.processo,
    custosAtualizadosEm: item.custosAtualizadosEm,
    ativo: item.ativo,
    atualizadoEm: item.atualizadoEm.toISOString(),
    atualizadoPor: item.atualizadoPor ? (nomes.get(item.atualizadoPor) ?? null) : null,
  };
}

function paraAnexoDTO(anexo: AnexoPortfolio, nomes: Map<string, string>): AnexoAvDTO {
  return {
    id: anexo.id,
    // Não há seção no catálogo: o desenho de referência é lido pela Eng. Produto.
    secao: 'produto',
    nomeArquivo: anexo.nomeArquivo,
    tipoMime: anexo.tipoMime,
    tamanhoBytes: anexo.tamanhoBytes,
    criadoEm: anexo.criadoEm.toISOString(),
    criadoPor: anexo.usuarioId ? (nomes.get(anexo.usuarioId) ?? null) : null,
  };
}

/** Item completo (estrutura, operações e desenhos) para a tela. */
async function detalharItem(deps: DependenciasPortfolio, dados: ItemPortfolioCompleto): Promise<ItemPortfolioDTO> {
  const [anexos, ativos] = await Promise.all([deps.repositorio.listarAnexos(dados.item.id), deps.usuarios.listarAtivos()]);
  const nomes = construirMapaDeNomes(ativos);
  return {
    ...paraResumoDTO(dados.item, nomes),
    observacoes: dados.item.observacoes,
    estrutura: dados.estrutura.map((no) => ({
      id: no.id,
      paiId: no.paiId,
      tipo: no.tipo,
      codigo: no.codigo,
      descricao: no.descricao,
      quantidade: no.quantidade,
      unidade: no.unidade,
      pecasPorEmbalagem: no.pecasPorEmbalagem,
    })),
    operacoes: dados.operacoes.map((operacao) => ({
      id: operacao.id,
      descricao: operacao.descricao,
      maquina: operacao.maquina,
      pecasHora: operacao.pecasHora,
    })),
    anexos: anexos.map((anexo) => paraAnexoDTO(anexo, nomes)),
  };
}

/** Lista do cadastro (todos) ou só os ativos (escolha na abertura da AV de portfólio). */
export class ListarItensPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(filtro?: { apenasAtivos?: boolean }): Promise<ItemPortfolioResumoDTO[]> {
    const [itens, ativos] = await Promise.all([
      this.deps.repositorio.listar(filtro?.apenasAtivos ?? false),
      this.deps.usuarios.listarAtivos(),
    ]);
    const nomes = construirMapaDeNomes(ativos);
    return itens.map((item) => paraResumoDTO(item, nomes));
  }
}

export class ObterItemPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(id: string): Promise<ItemPortfolioDTO> {
    const dados = await this.deps.repositorio.obter(id);
    if (!dados) throw new ErroNaoEncontrado('Item de portfólio');
    return detalharItem(this.deps, dados);
  }
}

/** Cria ou altera um item (identificação, custos, estrutura e operações), conferindo o código único. */
export class SalvarItemPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(entrada: SalvarItemPortfolioEntrada): Promise<ItemPortfolioDTO> {
    const usuarioId = exigirEditorDoCatalogo(this.deps.usuarios);
    const existente = entrada.id ? await this.deps.repositorio.obter(entrada.id) : null;
    if (entrada.id && !existente) throw new ErroNaoEncontrado('Item de portfólio');

    const identificacao = validarIdentificacaoDoItem(entrada);
    if (await this.deps.repositorio.codigoEmUso(identificacao.codigo, existente?.item.id ?? null)) {
      throw new ErroDeValidacao(`Já existe um item de portfólio com o código ${identificacao.codigo}.`);
    }
    const agora = this.deps.relogio.agora();
    const id = existente?.item.id ?? this.deps.geradorDeId.gerar();
    const gerarId = () => this.deps.geradorDeId.gerar();

    const item: ItemPortfolio = {
      id,
      ...identificacao,
      materiaPrima: validarCusto(entrada.custos.materiaPrima, 'O custo de matéria-prima'),
      insumos: validarCusto(entrada.custos.insumos, 'O custo de insumos'),
      embalagem: validarCusto(entrada.custos.embalagem, 'O custo de embalagem'),
      processo: validarCusto(entrada.custos.processo, 'O custo de processo'),
      custosAtualizadosEm: validarDataOpcional(entrada.custosAtualizadosEm, 'A data dos custos'),
      ativo: existente?.item.ativo ?? true,
      criadoEm: existente?.item.criadoEm ?? agora,
      criadoPor: existente?.item.criadoPor ?? usuarioId,
      atualizadoEm: agora,
      atualizadoPor: usuarioId,
    };
    const dados: ItemPortfolioCompleto = {
      item,
      // Mesmas regras da estrutura da AV (tipos, folhas, peças por embalagem → 1/peças).
      estrutura: montarEstrutura(entrada.estrutura, id, gerarId).map(({ avId, ...no }) => ({ ...no, itemId: avId })),
      operacoes: validarOperacoesDoItem(entrada.operacoes).map((operacao, ordem) => ({
        id: gerarId(),
        itemId: id,
        ordem,
        ...operacao,
      })),
    };
    await this.deps.repositorio.salvar(dados);
    return detalharItem(this.deps, dados);
  }
}

/** Ativa ou desativa o item: inativo some da escolha de novas AVs, mas as antigas continuam abrindo. */
export class DefinirAtivoItemPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(entrada: { id: string; ativo: boolean }): Promise<ItemPortfolioDTO> {
    const usuarioId = exigirEditorDoCatalogo(this.deps.usuarios);
    const dados = await this.deps.repositorio.obter(entrada.id);
    if (!dados) throw new ErroNaoEncontrado('Item de portfólio');
    const atualizado = {
      ...dados,
      item: { ...dados.item, ativo: entrada.ativo, atualizadoEm: this.deps.relogio.agora(), atualizadoPor: usuarioId },
    };
    await this.deps.repositorio.salvar(atualizado);
    return detalharItem(this.deps, atualizado);
  }
}

/** Anexa o desenho de referência do item (mesmas regras dos anexos da AV: tipos e 25 MB). */
export class AnexarDesenhoPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(itemId: string): Promise<AnexoAvDTO[] | null> {
    const usuarioId = exigirEditorDoCatalogo(this.deps.usuarios);
    if (!(await this.deps.repositorio.obter(itemId))) throw new ErroNaoEncontrado('Item de portfólio');
    const arquivos = await this.deps.seletor.escolher();
    if (!arquivos) return null;
    for (const arquivo of arquivos) validarArquivoDeAnexo(arquivo.nomeArquivo, arquivo.tamanhoBytes);

    for (const arquivo of arquivos) {
      const armazenado = await this.deps.armazenamento.copiarParaAnexos(itemId, arquivo);
      try {
        await this.deps.repositorio.inserirAnexo({
          id: this.deps.geradorDeId.gerar(),
          itemId,
          nomeArquivo: arquivo.nomeArquivo,
          nomeArmazenado: armazenado.nomeArmazenado,
          tipoMime: armazenado.tipoMime,
          tamanhoBytes: armazenado.tamanhoBytes,
          usuarioId,
          criadoEm: this.deps.relogio.agora(),
        });
      } catch (falha) {
        await this.deps.armazenamento.excluirArquivo(itemId, armazenado.nomeArmazenado).catch(() => undefined);
        throw falha;
      }
    }
    const nomes = construirMapaDeNomes(await this.deps.usuarios.listarAtivos());
    return (await this.deps.repositorio.listarAnexos(itemId)).map((anexo) => paraAnexoDTO(anexo, nomes));
  }
}

export class ExcluirDesenhoPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(anexoId: string): Promise<null> {
    exigirEditorDoCatalogo(this.deps.usuarios);
    const anexo = await this.deps.repositorio.obterAnexo(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');
    await this.deps.repositorio.excluirAnexo(anexoId);
    await this.deps.armazenamento.excluirArquivo(anexo.itemId, anexo.nomeArmazenado);
    return null;
  }
}

/** Conteúdo do desenho de referência (base64) para a pré-visualização. */
export class ObterConteudoDesenhoPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(anexoId: string): Promise<{ nomeArquivo: string; tipoMime: string | null; base64: string }> {
    const anexo = await this.deps.repositorio.obterAnexo(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');
    const base64 = await this.deps.armazenamento.lerConteudoBase64(anexo.itemId, anexo.nomeArmazenado);
    return { nomeArquivo: anexo.nomeArquivo, tipoMime: anexo.tipoMime, base64 };
  }
}

/** Abre o desenho de referência no programa padrão do Windows (TIFF). */
export class AbrirDesenhoPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(anexoId: string): Promise<null> {
    const anexo = await this.deps.repositorio.obterAnexo(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');
    await this.deps.armazenamento.abrirNoProgramaPadrao(anexo.itemId, anexo.nomeArmazenado);
    return null;
  }
}

// --- AV de portfólio ---------------------------------------------------------------------------------

/** Exige uma AV de portfólio. */
async function obterAvPortfolio(avs: RepositorioAvs, avId: string) {
  const av = await avs.obterPorId(avId);
  if (!av) throw new ErroNaoEncontrado('AV');
  if (!av.ehPortfolio || !av.itemPortfolioId) {
    throw new ErroDeDominio('NAO_E_PORTFOLIO', 'Esta AV não é de item de portfólio.');
  }
  return av;
}

/** O item (template) da AV e as conclusões já gravadas por cada área. */
export class ObterPortfolioDaAv {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(avId: string): Promise<PortfolioDaAvDTO> {
    const av = await obterAvPortfolio(this.deps.avs, avId);
    const [dados, checagens, custos, ativos] = await Promise.all([
      this.deps.repositorio.obter(av.itemPortfolioId!),
      this.deps.checagens.listar(av.id),
      this.deps.checagens.obterCustos(av.id),
      this.deps.usuarios.listarAtivos(),
    ]);
    const nomes = construirMapaDeNomes(ativos);
    return {
      item: dados ? await detalharItem(this.deps, dados) : null,
      checagens: checagens.map((checagem) => ({
        area: checagem.area,
        resultado: checagem.resultado,
        observacao: checagem.observacao,
        atualizadoEm: checagem.atualizadoEm.toISOString(),
        atualizadoPor: checagem.atualizadoPor ? (nomes.get(checagem.atualizadoPor) ?? null) : null,
      })),
      custos: custos
        ? { referencia: custos.referencia, novos: custos.novos, atualizadoEm: custos.atualizadoEm.toISOString() }
        : null,
    };
  }
}

/**
 * Grava a conclusão de uma área (confere / com ressalvas / não confere). Só o responsável da área (ou o
 * administrador). No Custo, guarda também a foto dos custos de referência do item e os valores atualizados.
 */
export class SalvarChecagemPortfolio {
  constructor(private readonly deps: DependenciasPortfolio) {}

  async executar(entrada: SalvarChecagemPortfolioEntrada): Promise<PortfolioDaAvDTO> {
    const av = await obterAvPortfolio(this.deps.avs, entrada.avId);
    const usuario = await this.deps.autorizacao.exigirEdicaoDaArea(av, entrada.area);
    const observacao = validarObservacaoDaChecagem(entrada.resultado, entrada.observacao);
    const agora = this.deps.relogio.agora();

    if (entrada.area === 'custo') {
      const dados = await this.deps.repositorio.obter(av.itemPortfolioId!);
      const novos = entrada.custosNovos ?? { materiaPrima: null, insumos: null, embalagem: null, processo: null };
      await this.deps.checagens.salvarCustos({
        avId: av.id,
        referencia: {
          materiaPrima: dados?.item.materiaPrima ?? null,
          insumos: dados?.item.insumos ?? null,
          embalagem: dados?.item.embalagem ?? null,
          processo: dados?.item.processo ?? null,
          atualizadosEm: dados?.item.custosAtualizadosEm ?? null,
        },
        novos: {
          materiaPrima: validarCusto(novos.materiaPrima, 'O custo de matéria-prima'),
          insumos: validarCusto(novos.insumos, 'O custo de insumos'),
          embalagem: validarCusto(novos.embalagem, 'O custo de embalagem'),
          processo: validarCusto(novos.processo, 'O custo de processo'),
        },
        atualizadoEm: agora,
        atualizadoPor: usuario.id,
      });
    }
    await this.deps.checagens.salvar({
      avId: av.id,
      area: entrada.area,
      resultado: entrada.resultado,
      observacao,
      atualizadoEm: agora,
      atualizadoPor: usuario.id,
    });
    return new ObterPortfolioDaAv(this.deps).executar(av.id);
  }
}

/**
 * Conclui a AV de portfólio na Proposta Enviada (não há SD: o item já existe). Decisão do Comercial.
 */
export class ConcluirAvPortfolio {
  constructor(
    private readonly avs: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly versoes: ControleDeVersao = versaoSemControle,
    private readonly notificador: Notificador = semNotificacao,
  ) {}

  async executar(entrada: { avId: string; comentario?: string | null }): Promise<AvDetalheDTO> {
    const av = await obterAvPortfolio(this.avs, entrada.avId);
    const etapaAtual = obterEtapaAv(av.etapaAtual);
    if (etapaAtual.chave !== 'proposta_enviada') {
      throw new ErroDeDominio('PORTFOLIO_FORA_DA_PROPOSTA', 'A AV de portfólio é concluída depois do Mapa de Custo (Proposta Enviada).');
    }
    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    const destino = obterEtapaPorChave('portfolio_concluida');
    const agora = this.relogio.agora();

    av.moverParaEtapa(destino.numero);
    await this.avs.salvar(av);
    await this.historico.registrar({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      etapaDe: etapaAtual.numero,
      etapaPara: destino.numero,
      usuarioId: usuario.id,
      comentario: entrada.comentario?.trim() || null,
      data: agora,
    });
    await this.notificador.notificar({
      usuarioIds: equipeDaAv(av),
      excetoUsuarioId: usuario.id,
      tipo: 'av.portfolio_concluida',
      titulo: `${av.numero} (portfólio) foi concluída`,
      mensagem: av.descricao,
      link: linkDaAv(av.id),
    });
    return paraAvDetalheDTO(
      av,
      construirMapaDeNomes(await this.usuarios.listarAtivos()),
      this.versoes.obter(chaveDaSecao(av.id, 'comercial')),
    );
  }
}
