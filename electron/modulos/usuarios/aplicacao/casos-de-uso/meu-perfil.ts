import type { MeuPerfilDTO, SalvarMeuPerfilEntrada } from '@contratos/usuarios.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { type PerfilPessoal, type RepositorioPerfilPessoal, validarDadosPessoais, validarFoto } from '../../dominio/perfil-pessoal';
import type { RepositorioUsuarios } from '../../dominio/repositorio-usuarios';
import type { Usuario } from '../../dominio/usuario';
import type { Sessao } from '../sessao';

/**
 * Exige alguém logado.
 * @throws ErroDeDominio `NAO_AUTENTICADO`
 */
function exigirLogado(sessao: Sessao): Usuario {
  const usuario = sessao.usuarioAtual;
  if (!usuario) throw new ErroDeDominio('NAO_AUTENTICADO', 'Entre no aplicativo para continuar.');
  return usuario;
}

function paraDTO(usuario: Usuario, perfil: PerfilPessoal | null): MeuPerfilDTO {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil,
    email: usuario.email,
    departamento: usuario.departamento,
    cargo: perfil?.cargo ?? null,
    ramal: perfil?.ramal ?? null,
    celular: perfil?.celular ?? null,
    sobre: perfil?.sobre ?? null,
    foto: perfil?.foto ?? null,
  };
}

/** Dados de quem está logado para a página "Meu perfil" (e a foto da barra de título). */
export class ObterMeuPerfil implements CasoDeUso<void, MeuPerfilDTO> {
  constructor(
    private readonly sessao: Sessao,
    private readonly perfis: RepositorioPerfilPessoal,
  ) {}

  async executar(): Promise<MeuPerfilDTO> {
    const usuario = exigirLogado(this.sessao);
    return paraDTO(usuario, await this.perfis.obter(usuario.id));
  }
}

/**
 * O próprio usuário atualiza e-mail, departamento, cargo, ramal, celular, "sobre mim" e a foto. Nome, login e
 * perfil de acesso continuam com o administrador. Foto ausente mantém a atual; `null` remove.
 */
export class SalvarMeuPerfil implements CasoDeUso<SalvarMeuPerfilEntrada, MeuPerfilDTO> {
  constructor(
    private readonly sessao: Sessao,
    private readonly usuarios: RepositorioUsuarios,
    private readonly perfis: RepositorioPerfilPessoal,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: SalvarMeuPerfilEntrada): Promise<MeuPerfilDTO> {
    const logado = exigirLogado(this.sessao);
    const usuario = await this.usuarios.obterPorId(logado.id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário');
    const agora = this.relogio.agora();
    const dados = validarDadosPessoais(entrada);
    const anterior = await this.perfis.obter(usuario.id);
    const foto = entrada.foto === undefined ? (anterior?.foto ?? null) : entrada.foto === null ? null : validarFoto(entrada.foto);

    usuario.alterarEmail(entrada.email ?? null, agora);
    usuario.alterarDepartamento(entrada.departamento ?? null, agora);
    await this.usuarios.salvar(usuario);
    const perfil: PerfilPessoal = { usuarioId: usuario.id, ...dados, foto, atualizadoEm: agora };
    await this.perfis.salvar(perfil);
    // A sessão guarda o usuário em memória: troca pela versão atualizada (e-mail e departamento novos).
    this.sessao.abrir(usuario);
    return paraDTO(usuario, perfil);
  }
}
