import type { AvDetalheDTO, ConteudoDaPastaDTO, PastaConfigDTO } from '@contratos/avs.contrato';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import { ErroDeDominio, ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import type { Av } from '../../dominio/av';
import {
  nomeDaPastaDaAv,
  type RepositorioConfigPastaDasAvs,
  validarCaminhoRelativo,
  validarPastaRaiz,
} from '../../dominio/pasta-da-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes, paraAvDetalheDTO } from '../mapeador-dto';
import type { ConsultaDeUsuarios, GerenciadorDePastas, SeletorDeArquivos } from '../portas';
import { chaveDaSecao } from '../versoes';

// =====================================================================================================
// Pasta da AV no Windows: configuração da raiz, criação (automática e manual), listagem e abertura.
// =====================================================================================================

export interface DependenciasPastaDaAv {
  avs: RepositorioAvs;
  config: RepositorioConfigPastaDasAvs;
  pastas: GerenciadorDePastas;
  autorizacao: AutorizacaoAv;
  usuarios: ConsultaDeUsuarios;
  relogio: Relogio;
  versoes?: ControleDeVersao;
}

/**
 * Cria a pasta da AV dentro da raiz configurada e grava o caminho na AV.
 * @param deps repositórios e gerenciador de pastas
 * @param av AV recém-criada (ou sem pasta)
 * @returns o caminho criado, ou `null` sem raiz configurada
 */
export async function criarPastaDaAv(deps: Pick<DependenciasPastaDaAv, 'avs' | 'config' | 'pastas'>, av: Av): Promise<string | null> {
  const { pastaRaiz } = await deps.config.obter();
  if (!pastaRaiz) return null;
  const caminho = await deps.pastas.criar(pastaRaiz, nomeDaPastaDaAv(av.numero, av.cliente, av.descricao));
  av.definirPasta(caminho);
  await deps.avs.salvar(av);
  return caminho;
}

/** Raiz das pastas das AVs (qualquer usuário logado consulta). */
export class ObterPastaConfig {
  constructor(private readonly deps: DependenciasPastaDaAv) {}

  async executar(): Promise<PastaConfigDTO> {
    return this.deps.config.obter();
  }
}

/** Administrador define a raiz; ela precisa existir e estar acessível deste computador. */
export class SalvarPastaConfig {
  constructor(private readonly deps: DependenciasPastaDaAv) {}

  async executar(entrada: PastaConfigDTO): Promise<PastaConfigDTO> {
    const usuario = this.deps.usuarios.usuarioAtual();
    if (usuario?.perfil !== 'administrador') {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Só administradores definem a pasta das AVs.');
    }
    const pastaRaiz = validarPastaRaiz(entrada.pastaRaiz);
    if (pastaRaiz && !(await this.deps.pastas.existe(pastaRaiz))) {
      throw new ErroDeValidacao(`A pasta não existe ou não está acessível: ${pastaRaiz}`);
    }
    await this.deps.config.salvar({ pastaRaiz }, usuario.id, this.deps.relogio.agora());
    return this.deps.config.obter();
  }
}

/** Seletor nativo de pasta (Configurações). */
export class SelecionarPastaRaiz {
  constructor(private readonly seletor: SeletorDeArquivos) {}

  async executar(): Promise<string | null> {
    const escolhida = await this.seletor.escolher({ modo: 'pasta' });
    return escolhida?.[0]?.caminhoOriginal ?? null;
  }
}

/** Cria (ou recria) a pasta de uma AV que ficou sem ela — AV antiga ou raiz indisponível na criação. */
export class CriarPastaDaAv {
  constructor(private readonly deps: DependenciasPastaDaAv) {}

  async executar(avId: string): Promise<AvDetalheDTO> {
    const av = await this.deps.avs.obterPorId(avId);
    if (!av) throw new ErroNaoEncontrado('AV');
    await this.deps.autorizacao.exigirEdicaoDaArea(av, 'comercial');
    const caminho = await criarPastaDaAv(this.deps, av);
    if (!caminho) {
      throw new ErroDeDominio('PASTA_NAO_CONFIGURADA', 'O administrador ainda não definiu a pasta das AVs em Configurações.');
    }
    const versoes = this.deps.versoes ?? versaoSemControle;
    return paraAvDetalheDTO(av, construirMapaDeNomes(await this.deps.usuarios.listarAtivos()), versoes.obter(chaveDaSecao(av.id, 'comercial')));
  }
}

/** O que há na pasta da AV, para o visualizador (até 3 níveis e 500 itens). */
export class ListarArquivosDaPasta {
  constructor(private readonly deps: DependenciasPastaDaAv) {}

  async executar(avId: string): Promise<ConteudoDaPastaDTO> {
    const av = await this.deps.avs.obterPorId(avId);
    if (!av) throw new ErroNaoEncontrado('AV');
    if (!av.pasta) return { pasta: null, existe: false, itens: [], limitado: false };
    if (!(await this.deps.pastas.existe(av.pasta))) return { pasta: av.pasta, existe: false, itens: [], limitado: false };
    const { itens, limitado } = await this.deps.pastas.listar(av.pasta);
    return {
      pasta: av.pasta,
      existe: true,
      limitado,
      itens: itens.map((item) => ({ ...item, modificadoEm: item.modificadoEm.toISOString() })),
    };
  }
}

/** Abre a pasta da AV no Explorer, ou um arquivo dela no programa padrão do Windows. */
export class AbrirDaPasta {
  constructor(private readonly deps: DependenciasPastaDaAv) {}

  async executar(entrada: { avId: string; caminhoRelativo?: string | null }): Promise<null> {
    const av = await this.deps.avs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');
    if (!av.pasta) throw new ErroDeDominio('AV_SEM_PASTA', 'Esta AV ainda não tem pasta.');
    const relativo = entrada.caminhoRelativo ? validarCaminhoRelativo(entrada.caminhoRelativo) : null;
    await this.deps.pastas.abrir(av.pasta, relativo);
    return null;
  }
}
