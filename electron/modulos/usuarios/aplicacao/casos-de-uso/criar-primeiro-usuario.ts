import type { PrimeiroAcessoEntrada, SessaoDTO } from '@contratos/sessao.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { validarSenha } from '../../dominio/credenciais';
import type { RepositorioUsuarios } from '../../dominio/repositorio-usuarios';
import { Usuario } from '../../dominio/usuario';
import { paraSessaoDTO } from '../mapeador-dto';
import type { HashDeSenha } from '../portas/hash-de-senha';
import type { Sessao } from '../sessao';

/** Primeiro acesso: cria o administrador inicial e já abre a sessão. Só funciona com o banco vazio. */
export class CriarPrimeiroUsuario implements CasoDeUso<PrimeiroAcessoEntrada, SessaoDTO> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly hashDeSenha: HashDeSenha,
    private readonly sessao: Sessao,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: PrimeiroAcessoEntrada): Promise<SessaoDTO> {
    if ((await this.repositorio.contar()) > 0) {
      throw new ErroDeDominio(
        'CONFIGURACAO_CONCLUIDA',
        'Já existe usuário cadastrado. Faça login normalmente.',
      );
    }

    const agora = this.relogio.agora();
    const usuario = Usuario.criar({
      id: this.geradorDeId.gerar(),
      nome: entrada.nome,
      login: entrada.login,
      senhaHash: await this.hashDeSenha.gerar(validarSenha(entrada.senha)),
      perfil: 'administrador',
      agora,
    });
    usuario.registrarAcesso(agora);
    await this.repositorio.salvar(usuario);
    this.sessao.abrir(usuario);

    return paraSessaoDTO(this.sessao, false);
  }
}
