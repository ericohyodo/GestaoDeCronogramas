import type {
  AtualizarResponsavelEntrada,
  CriarResponsavelEntrada,
  ResponsavelDTO,
} from '@contratos/responsaveis.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import type { RepositorioResponsaveis } from '../../dominio/repositorio-responsaveis';
import { Responsavel } from '../../dominio/responsavel';
import { paraResponsavelDTO } from '../mapeador-dto';

/** Um usuário do sistema responde por no máximo um recurso. */
async function exigirUsuarioLivre(
  repositorio: RepositorioResponsaveis,
  usuarioId: string | null | undefined,
  responsavelId: string | null,
): Promise<void> {
  if (!usuarioId) return;
  const outro = await repositorio.obterPorUsuario(usuarioId);
  if (outro && outro.id !== responsavelId) {
    throw new ErroDeValidacao(`Este usuário já está vinculado ao recurso "${outro.nome}".`);
  }
}

export class ListarResponsaveis implements CasoDeUso<void, ResponsavelDTO[]> {
  constructor(private readonly repositorio: RepositorioResponsaveis) {}

  async executar(): Promise<ResponsavelDTO[]> {
    return (await this.repositorio.listar()).map(paraResponsavelDTO);
  }
}

export class CriarResponsavel implements CasoDeUso<CriarResponsavelEntrada, ResponsavelDTO> {
  constructor(
    private readonly repositorio: RepositorioResponsaveis,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarResponsavelEntrada): Promise<ResponsavelDTO> {
    await exigirUsuarioLivre(this.repositorio, entrada.usuarioId, null);
    const responsavel = Responsavel.criar({
      id: this.geradorDeId.gerar(),
      nome: entrada.nome,
      email: entrada.email,
      funcao: entrada.funcao,
      usuarioId: entrada.usuarioId ?? null,
      agora: this.relogio.agora(),
    });
    await this.repositorio.salvar(responsavel);
    return paraResponsavelDTO(responsavel);
  }
}

export class AtualizarResponsavel implements CasoDeUso<AtualizarResponsavelEntrada, ResponsavelDTO> {
  constructor(
    private readonly repositorio: RepositorioResponsaveis,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: AtualizarResponsavelEntrada): Promise<ResponsavelDTO> {
    const responsavel = await this.repositorio.obterPorId(entrada.id);
    if (!responsavel) throw new ErroNaoEncontrado('Responsável');

    const agora = this.relogio.agora();
    if (entrada.nome !== undefined) responsavel.renomear(entrada.nome, agora);
    if (entrada.email !== undefined || entrada.funcao !== undefined) {
      responsavel.alterarContato(
        entrada.email !== undefined ? entrada.email : responsavel.email,
        entrada.funcao !== undefined ? entrada.funcao : responsavel.funcao,
        agora,
      );
    }
    if (entrada.usuarioId !== undefined) {
      await exigirUsuarioLivre(this.repositorio, entrada.usuarioId, responsavel.id);
      responsavel.vincularUsuario(entrada.usuarioId ?? null, agora);
    }
    if (entrada.ativo !== undefined) responsavel.definirAtivo(entrada.ativo, agora);

    await this.repositorio.salvar(responsavel);
    return paraResponsavelDTO(responsavel);
  }
}

/** As tarefas que apontavam para ele ficam sem responsável (ON DELETE SET NULL). */
export class ExcluirResponsavel implements CasoDeUso<string, null> {
  constructor(private readonly repositorio: RepositorioResponsaveis) {}

  async executar(id: string): Promise<null> {
    if (!(await this.repositorio.obterPorId(id))) throw new ErroNaoEncontrado('Responsável');
    await this.repositorio.excluir(id);
    return null;
  }
}
