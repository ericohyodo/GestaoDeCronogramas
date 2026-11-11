import type {
  AceitarSdEntrada,
  AnexoSdDTO,
  DevolverSdEntrada,
  SalvarSdEntrada,
  SdDTO,
} from '@contratos/sds.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { ControleDeVersao } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import type { RepositorioAnexosSd, RepositorioSds } from '../../dominio/repositorio-sds';
import {
  abrirSd,
  aceitarSd,
  atualizarFormulario,
  devolverSd,
  trocarPrefixoDoNumero,
  type SdListada,
} from '../../dominio/sd';
import { chaveDaSd, paraAnexoSdDTO, paraSdDTO } from '../mapeador-dto';
import type {
  AcessoDoFluxoSd,
  ArmazenamentoDeEvidencias,
  AvsDoFluxoSd,
  CriadorDeProjeto,
  SeletorDeEvidencias,
  UsuarioAtualSd,
} from '../portas';
import { mapaDeNomes } from './consultar-sds';

// =====================================================================================================
// Fluxo da SD: o Comercial preenche e abre; a Engenharia (Gerente de Engenharia / Gestor de Programa)
// aceita — criando o projeto PRO e concluindo a AV — ou devolve com motivo.
// =====================================================================================================

/** Dependências comuns a todos os casos de uso do fluxo. */
export interface DependenciasFluxoSd {
  repositorio: RepositorioSds;
  anexos: RepositorioAnexosSd;
  acesso: AcessoDoFluxoSd;
  versoes: ControleDeVersao;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
}

abstract class CasoDoFluxo {
  constructor(protected readonly deps: DependenciasFluxoSd) {}

  protected exigirUsuario(): UsuarioAtualSd {
    const usuario = this.deps.acesso.usuarioAtual();
    if (!usuario) throw new ErroDeDominio('NAO_AUTENTICADO', 'Faça login para continuar.');
    return usuario;
  }

  protected async obter(id: string): Promise<SdListada> {
    const sd = await this.deps.repositorio.obterPorId(id);
    if (!sd) throw new ErroNaoEncontrado('SD');
    return sd;
  }

  /** Só o responsável pelo Comercial da AV (ou o administrador) preenche, anexa e abre a SD. */
  protected exigirComercial(sd: SdListada): UsuarioAtualSd {
    const usuario = this.exigirUsuario();
    if (!usuario.administrador && usuario.id !== sd.responsavelComercialId) {
      throw new ErroDeDominio(
        'SEM_PERMISSAO',
        'Só o responsável pelo Comercial desta AV pode preencher e abrir a SD.',
      );
    }
    return usuario;
  }

  protected async exigirEngenharia(): Promise<UsuarioAtualSd> {
    const usuario = this.exigirUsuario();
    if (!(await this.deps.acesso.podeDarAceite(usuario.id))) {
      throw new ErroDeDominio(
        'SEM_PERMISSAO',
        'Só o Gerente de Engenharia ou um Gestor de Programa pode dar o aceite da SD.',
      );
    }
    return usuario;
  }

  /** Relê a SD gravada e monta o DTO (com nomes e versão atual). */
  protected async dto(id: string): Promise<SdDTO> {
    const sd = await this.obter(id);
    return paraSdDTO(sd, await mapaDeNomes(this.deps.acesso), this.deps.versoes.obter(chaveDaSd(id)));
  }
}

/** Grava data de envio da cotação, nº do PO e observações (Comercial, SD ainda não aberta). */
export class SalvarSd extends CasoDoFluxo implements CasoDeUso<SalvarSdEntrada, SdDTO> {
  async executar(entrada: SalvarSdEntrada): Promise<SdDTO> {
    const atual = await this.obter(entrada.id);
    this.exigirComercial(atual);
    const alterada = atualizarFormulario(atual.sd, entrada);
    this.deps.versoes.confirmar(chaveDaSd(entrada.id), entrada.versaoEsperada);
    await this.deps.repositorio.salvar(alterada);
    return this.dto(entrada.id);
  }
}

/** Comercial entrega a SD para a Engenharia. Exige data de envio da cotação e evidência anexada. */
export class AbrirSd extends CasoDoFluxo implements CasoDeUso<string, SdDTO> {
  async executar(id: string): Promise<SdDTO> {
    const atual = await this.obter(id);
    const usuario = this.exigirComercial(atual);
    const aberta = abrirSd(atual.sd, usuario.id, this.deps.relogio.agora(), await this.deps.anexos.contar(id));
    this.deps.versoes.confirmar(chaveDaSd(id));
    await this.deps.repositorio.salvar(aberta);
    return this.dto(id);
  }
}

/** Engenharia devolve ao Comercial, com motivo. */
export class DevolverSd extends CasoDoFluxo implements CasoDeUso<DevolverSdEntrada, SdDTO> {
  async executar(entrada: DevolverSdEntrada): Promise<SdDTO> {
    const atual = await this.obter(entrada.id);
    const usuario = await this.exigirEngenharia();
    const devolvida = devolverSd(atual.sd, usuario.id, this.deps.relogio.agora(), entrada.motivo);
    this.deps.versoes.confirmar(chaveDaSd(entrada.id));
    await this.deps.repositorio.salvar(devolvida);
    return this.dto(entrada.id);
  }
}

/**
 * Aceite da Engenharia: fecha a SD, cria o projeto `PRO AA-SSS` com o período informado e leva a AV
 * para "Projeto Criado". Deve rodar numa transação (ver `index.ts`): ou tudo acontece, ou nada.
 */
export class AceitarSd extends CasoDoFluxo implements CasoDeUso<AceitarSdEntrada, SdDTO> {
  constructor(
    deps: DependenciasFluxoSd,
    private readonly projetos: CriadorDeProjeto,
    private readonly avs: AvsDoFluxoSd,
    /** `true` só para os dados de exemplo: dispensa a checagem do papel de quem aceita. */
    private readonly semChecarPapel = false,
  ) {
    super(deps);
  }

  async executar(entrada: AceitarSdEntrada): Promise<SdDTO> {
    const atual = await this.obter(entrada.id);
    const usuario = this.semChecarPapel ? this.exigirUsuario() : await this.exigirEngenharia();
    if (atual.sd.status !== 'aberta') {
      throw new ErroDeDominio('SD_STATUS_INVALIDO', 'Só uma SD aberta pelo Comercial pode receber o aceite.');
    }
    const codigo = trocarPrefixoDoNumero(atual.avNumero, 'PRO');
    const projeto = await this.projetos.criar({
      nome: atual.descricao,
      descricao: [atual.cliente && `Cliente: ${atual.cliente}`, `Origem: ${atual.sd.numero} (${atual.avNumero})`]
        .filter(Boolean)
        .join(' · '),
      codigo,
      sdId: atual.sd.id,
      dataInicio: entrada.dataInicio,
      dataFim: entrada.dataFim,
    });
    const agora = this.deps.relogio.agora();
    this.deps.versoes.confirmar(chaveDaSd(entrada.id));
    await this.deps.repositorio.salvar(aceitarSd(atual.sd, usuario.id, agora, projeto.id));
    await this.avs.concluirComProjeto({
      avId: atual.sd.avId,
      cronogramaId: projeto.id,
      usuarioId: usuario.id,
      comentario: `Aceite da ${atual.sd.numero} pela Engenharia; projeto ${codigo} criado.`,
    });
    return this.dto(entrada.id);
  }
}

// --- Evidências (PO, e-mail, documento do cliente) ---

export class ListarEvidenciasSd extends CasoDoFluxo implements CasoDeUso<string, AnexoSdDTO[]> {
  async executar(sdId: string): Promise<AnexoSdDTO[]> {
    const nomes = await mapaDeNomes(this.deps.acesso);
    return (await this.deps.anexos.listar(sdId)).map((anexo) => paraAnexoSdDTO(anexo, nomes));
  }
}

/** Abre o seletor, copia os arquivos para a pasta da SD e devolve a lista atualizada (`null` = cancelou). */
export class AnexarEvidenciasSd extends CasoDoFluxo implements CasoDeUso<string, AnexoSdDTO[] | null> {
  constructor(
    deps: DependenciasFluxoSd,
    private readonly seletor: SeletorDeEvidencias,
    private readonly armazenamento: ArmazenamentoDeEvidencias,
  ) {
    super(deps);
  }

  async executar(sdId: string): Promise<AnexoSdDTO[] | null> {
    const sd = await this.obter(sdId);
    const usuario = this.exigirComercial(sd);
    if (sd.sd.status !== 'pre_sd') {
      throw new ErroDeDominio('SD_STATUS_INVALIDO', 'As evidências só podem ser alteradas antes de abrir a SD.');
    }
    const arquivos = await this.seletor.escolher();
    if (!arquivos) return null;
    for (const arquivo of arquivos) {
      const guardado = await this.armazenamento.guardar(sdId, arquivo);
      await this.deps.anexos.inserir({
        id: this.deps.geradorDeId.gerar(),
        sdId,
        nomeArquivo: arquivo.nomeArquivo,
        nomeArmazenado: guardado.nomeArmazenado,
        tipoMime: guardado.tipoMime,
        tamanhoBytes: guardado.tamanhoBytes,
        usuarioId: usuario.id,
        criadoEm: this.deps.relogio.agora(),
      });
    }
    const nomes = await mapaDeNomes(this.deps.acesso);
    return (await this.deps.anexos.listar(sdId)).map((anexo) => paraAnexoSdDTO(anexo, nomes));
  }
}

/** Abre a evidência no programa padrão (Outlook para .msg, leitor de PDF…). */
export class AbrirEvidenciaSd extends CasoDoFluxo implements CasoDeUso<string, null> {
  constructor(
    deps: DependenciasFluxoSd,
    private readonly armazenamento: ArmazenamentoDeEvidencias,
  ) {
    super(deps);
  }

  async executar(anexoId: string): Promise<null> {
    this.exigirUsuario();
    const anexo = await this.deps.anexos.obterPorId(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');
    await this.armazenamento.abrir(anexo.sdId, anexo.nomeArmazenado);
    return null;
  }
}

export class ExcluirEvidenciaSd extends CasoDoFluxo implements CasoDeUso<string, null> {
  constructor(
    deps: DependenciasFluxoSd,
    private readonly armazenamento: ArmazenamentoDeEvidencias,
  ) {
    super(deps);
  }

  async executar(anexoId: string): Promise<null> {
    const anexo = await this.deps.anexos.obterPorId(anexoId);
    if (!anexo) throw new ErroNaoEncontrado('Anexo');
    const sd = await this.obter(anexo.sdId);
    this.exigirComercial(sd);
    if (sd.sd.status !== 'pre_sd') {
      throw new ErroDeDominio('SD_STATUS_INVALIDO', 'As evidências só podem ser alteradas antes de abrir a SD.');
    }
    await this.deps.anexos.excluir(anexoId);
    await this.armazenamento.excluir(anexo.sdId, anexo.nomeArmazenado);
    return null;
  }
}
