import type { ConcluirPrimeiroAcessoEntrada, SessaoDTO } from '@contratos/sessao.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { ErroUsuarioInativo, normalizarLogin, validarSenha } from '../../dominio/credenciais';
import type { RepositorioUsuarios } from '../../dominio/repositorio-usuarios';
import { paraSessaoDTO } from '../mapeador-dto';
import type { HashDeSenha } from '../portas/hash-de-senha';
import type { Sessao } from '../sessao';

/**
 * Primeiro acesso de quem foi cadastrado sem senha: a pessoa informa o próprio e-mail, cria a senha e já
 * entra. Só vale enquanto o primeiro acesso estiver pendente (depois disso, é login normal).
 */
export class ConcluirPrimeiroAcesso implements CasoDeUso<ConcluirPrimeiroAcessoEntrada, SessaoDTO> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly hashDeSenha: HashDeSenha,
    private readonly sessao: Sessao,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: ConcluirPrimeiroAcessoEntrada): Promise<SessaoDTO> {
    const usuario = await this.repositorio.obterPorLogin(normalizarLogin(entrada.login));
    if (!usuario || !usuario.precisaDefinirSenha) {
      throw new ErroDeDominio('PRIMEIRO_ACESSO_INDISPONIVEL', 'Este usuário não está aguardando primeiro acesso. Faça login normalmente.');
    }
    if (!usuario.ativo) throw new ErroUsuarioInativo();

    const agora = this.relogio.agora();
    usuario.concluirPrimeiroAcesso(entrada.email, await this.hashDeSenha.gerar(validarSenha(entrada.senha)), agora);
    usuario.registrarAcesso(agora);
    await this.repositorio.salvar(usuario);
    this.sessao.abrir(usuario);
    return paraSessaoDTO(this.sessao, false);
  }
}
