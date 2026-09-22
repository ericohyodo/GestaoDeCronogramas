import type { UsuarioDTO } from '@contratos/sessao.contrato';
import type {
  AlterarSenhaEntrada,
  AtualizarUsuarioEntrada,
  CriarUsuarioEntrada,
} from '@contratos/usuarios.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio, ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import { ErroCredenciaisInvalidas, normalizarLogin, validarSenha } from '../../dominio/credenciais';
import type { RepositorioUsuarios } from '../../dominio/repositorio-usuarios';
import { Usuario } from '../../dominio/usuario';
import { paraUsuarioDTO } from '../mapeador-dto';
import type { HashDeSenha } from '../portas/hash-de-senha';
import type { Sessao } from '../sessao';

/** Sempre precisa sobrar um administrador ativo, senão ninguém mais gerencia o app. */
async function exigirOutroAdministradorAtivo(
  repositorio: RepositorioUsuarios,
  usuario: Usuario,
): Promise<void> {
  if (usuario.perfil !== 'administrador' || !usuario.ativo) return;
  if ((await repositorio.contarAdministradoresAtivos(usuario.id)) === 0) {
    throw new ErroDeDominio(
      'ULTIMO_ADMINISTRADOR',
      'Este é o único administrador ativo. Promova ou ative outro antes de alterar este.',
    );
  }
}

export class ListarUsuarios implements CasoDeUso<void, UsuarioDTO[]> {
  constructor(private readonly repositorio: RepositorioUsuarios) {}

  async executar(): Promise<UsuarioDTO[]> {
    return (await this.repositorio.listar()).map(paraUsuarioDTO);
  }
}

export class CriarUsuario implements CasoDeUso<CriarUsuarioEntrada, UsuarioDTO> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly hashDeSenha: HashDeSenha,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarUsuarioEntrada): Promise<UsuarioDTO> {
    const login = normalizarLogin(entrada.login);
    if (await this.repositorio.obterPorLogin(login)) {
      throw new ErroDeValidacao(`O usuário "${login}" já existe.`);
    }

    const usuario = Usuario.criar({
      id: this.geradorDeId.gerar(),
      nome: entrada.nome,
      login,
      senhaHash: await this.hashDeSenha.gerar(validarSenha(entrada.senha)),
      perfil: entrada.perfil,
      agora: this.relogio.agora(),
    });
    await this.repositorio.salvar(usuario);
    return paraUsuarioDTO(usuario);
  }
}

export class AtualizarUsuario implements CasoDeUso<AtualizarUsuarioEntrada, UsuarioDTO> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: AtualizarUsuarioEntrada): Promise<UsuarioDTO> {
    const usuario = await this.repositorio.obterPorId(entrada.id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário');

    const rebaixandoOuDesativando =
      (entrada.perfil !== undefined && entrada.perfil !== 'administrador') || entrada.ativo === false;
    if (rebaixandoOuDesativando) await exigirOutroAdministradorAtivo(this.repositorio, usuario);

    const agora = this.relogio.agora();
    if (entrada.nome !== undefined) usuario.renomear(entrada.nome, agora);
    if (entrada.perfil !== undefined) usuario.alterarPerfil(entrada.perfil, agora);
    if (entrada.ativo !== undefined) usuario.definirAtivo(entrada.ativo, agora);

    await this.repositorio.salvar(usuario);
    return paraUsuarioDTO(usuario);
  }
}

export class AlterarSenha implements CasoDeUso<AlterarSenhaEntrada, null> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly hashDeSenha: HashDeSenha,
    private readonly sessao: Sessao,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: AlterarSenhaEntrada): Promise<null> {
    const usuario = await this.repositorio.obterPorId(entrada.id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário');

    // Trocando a própria senha: exige a senha atual. Administrador redefine a de outros sem ela.
    const ehPropriaSenha = this.sessao.usuarioAtual?.id === usuario.id;
    if (ehPropriaSenha) {
      const confere =
        entrada.senhaAtual !== undefined &&
        (await this.hashDeSenha.conferir(entrada.senhaAtual, usuario.senhaHash));
      if (!confere) throw new ErroCredenciaisInvalidas();
    } else if (!this.sessao.usuarioAtual?.possuiPermissao('administracao')) {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Só um administrador redefine a senha de outra pessoa.');
    }

    usuario.definirSenhaHash(
      await this.hashDeSenha.gerar(validarSenha(entrada.novaSenha)),
      this.relogio.agora(),
    );
    await this.repositorio.salvar(usuario);
    return null;
  }
}

export class ExcluirUsuario implements CasoDeUso<string, null> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly sessao: Sessao,
  ) {}

  async executar(id: string): Promise<null> {
    const usuario = await this.repositorio.obterPorId(id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário');
    if (this.sessao.usuarioAtual?.id === id) {
      throw new ErroDeDominio('USUARIO_EM_USO', 'Você não pode excluir o próprio usuário.');
    }
    await exigirOutroAdministradorAtivo(this.repositorio, usuario);
    await this.repositorio.excluir(id);
    return null;
  }
}
