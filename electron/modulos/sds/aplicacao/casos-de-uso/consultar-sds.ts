import type { SdDTO } from '@contratos/sds.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import { type ControleDeVersao, versaoSemControle } from '../../../../nucleo/aplicacao/portas/controle-de-versao';
import type { RepositorioSds } from '../../dominio/repositorio-sds';
import { chaveDaSd, paraSdDTO } from '../mapeador-dto';
import type { AcessoDoFluxoSd } from '../portas';

const semNomes: Pick<AcessoDoFluxoSd, 'listarNomes'> = { listarNomes: async () => [] };

async function mapaDeNomes(acesso: Pick<AcessoDoFluxoSd, 'listarNomes'>): Promise<Map<string, string>> {
  return new Map((await acesso.listarNomes()).map((usuario) => [usuario.id, usuario.nome]));
}

export class ListarSds implements CasoDeUso<void, SdDTO[]> {
  constructor(
    private readonly repositorio: RepositorioSds,
    private readonly acesso: Pick<AcessoDoFluxoSd, 'listarNomes'> = semNomes,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(): Promise<SdDTO[]> {
    const nomes = await mapaDeNomes(this.acesso);
    return (await this.repositorio.listar()).map((sd) => paraSdDTO(sd, nomes, this.versoes.obter(chaveDaSd(sd.sd.id))));
  }
}

export class ObterSdPorAv implements CasoDeUso<string, SdDTO | null> {
  constructor(
    private readonly repositorio: RepositorioSds,
    private readonly acesso: Pick<AcessoDoFluxoSd, 'listarNomes'> = semNomes,
    private readonly versoes: ControleDeVersao = versaoSemControle,
  ) {}

  async executar(avId: string): Promise<SdDTO | null> {
    const encontrada = await this.repositorio.obterPorAv(avId);
    if (!encontrada) return null;
    return paraSdDTO(encontrada, await mapaDeNomes(this.acesso), this.versoes.obter(chaveDaSd(encontrada.sd.id)));
  }
}

export class ObterSd implements CasoDeUso<string, SdDTO> {
  constructor(
    private readonly repositorio: RepositorioSds,
    private readonly acesso: Pick<AcessoDoFluxoSd, 'listarNomes'>,
    private readonly versoes: ControleDeVersao,
  ) {}

  async executar(id: string): Promise<SdDTO> {
    const encontrada = await this.repositorio.obterPorId(id);
    if (!encontrada) throw new ErroNaoEncontrado('SD');
    return paraSdDTO(encontrada, await mapaDeNomes(this.acesso), this.versoes.obter(chaveDaSd(id)));
  }
}

export { mapaDeNomes };
