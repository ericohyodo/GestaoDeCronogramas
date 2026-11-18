import type { AnexoAvDTO, SelecionarEAnexarEntrada } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import type { Anexo } from '../../dominio/anexo';
import type { RepositorioAnexos } from '../../dominio/repositorio-anexos';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import { construirMapaDeNomes } from '../mapeador-dto';
import type { ArmazenamentoDeArquivos, ConsultaDeUsuarios, SeletorDeArquivos } from '../portas';
import { paraAnexoDTO } from './listar-anexos';

export class SelecionarEAnexar
  implements CasoDeUso<SelecionarEAnexarEntrada, AnexoAvDTO[] | null>
{
  constructor(
    private readonly repositorioAvs: RepositorioAvs,
    private readonly repositorio: RepositorioAnexos,
    private readonly autorizacao: AutorizacaoAv,
    private readonly seletor: SeletorDeArquivos,
    private readonly armazenamento: ArmazenamentoDeArquivos,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  async executar(entrada: SelecionarEAnexarEntrada): Promise<AnexoAvDTO[] | null> {
    const av = await this.repositorioAvs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');

    const usuario = await this.autorizacao.exigirEdicaoDaArea(av, entrada.secao);

    const arquivos = await this.seletor.escolher();
    if (!arquivos) return null;

    const agora = this.relogio.agora();
    for (const arquivo of arquivos) {
      const armazenado = await this.armazenamento.copiarParaAnexos(av.id, arquivo);
      const anexo: Anexo = {
        id: this.geradorDeId.gerar(),
        avId: av.id,
        secao: entrada.secao,
        nomeArquivo: arquivo.nomeArquivo,
        nomeArmazenado: armazenado.nomeArmazenado,
        tipoMime: armazenado.tipoMime,
        tamanhoBytes: armazenado.tamanhoBytes,
        usuarioId: usuario.id,
        criadoEm: agora,
      };
      await this.repositorio.inserir(anexo);
    }

    const [anexos, ativos] = await Promise.all([
      this.repositorio.listar(av.id),
      this.usuarios.listarAtivos(),
    ]);
    const nomes = construirMapaDeNomes(ativos);
    return anexos.map((anexo) => paraAnexoDTO(anexo, nomes));
  }
}
