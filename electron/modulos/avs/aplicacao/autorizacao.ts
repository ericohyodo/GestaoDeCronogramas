import type { AreaAvDTO } from '@contratos/avs.contrato';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import type { Av } from '../dominio/av';
import { ErroSemPermissaoNaArea } from '../dominio/erros-av';
import {
  perfilAvPadraoSemCompetencias,
  podeDarAceiteDaSd,
  podeEditarArea,
  type PerfilAvUsuario,
} from '../dominio/papel-av';
import type { RepositorioPerfisAv } from '../dominio/repositorio-perfis-av';
import type { ConsultaDeUsuarios, UsuarioAtualAv } from './portas';

/** Ponto único de autorização do módulo: quem está logado e o que essa pessoa pode editar. */
export class AutorizacaoAv {
  constructor(
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly perfis: RepositorioPerfisAv,
  ) {}

  exigirAutenticado(): UsuarioAtualAv {
    const usuario = this.usuarios.usuarioAtual();
    if (!usuario) throw new ErroDeDominio('NAO_AUTENTICADO', 'Faça login para continuar.');
    return usuario;
  }

  /** Lança `ErroSemPermissaoNaArea` se o usuário logado não puder editar a área informada nesta AV. */
  async exigirEdicaoDaArea(av: Av, area: AreaAvDTO): Promise<UsuarioAtualAv> {
    const usuario = this.exigirAutenticado();
    const perfilAv = await this.obterPerfilAv(usuario.id);
    if (!podeEditarArea(usuario.perfil, perfilAv, av.membros[area])) {
      throw new ErroSemPermissaoNaArea();
    }
    return usuario;
  }

  /**
   * Para ações sem uma AV concreta ainda (ex.: criar uma nova): exige apenas que a pessoa tenha
   * a competência da área, sem checar responsável designado.
   */
  async exigirCompetencia(area: AreaAvDTO): Promise<UsuarioAtualAv> {
    const usuario = this.exigirAutenticado();
    if (usuario.perfil === 'administrador') return usuario;
    const perfilAv = await this.obterPerfilAv(usuario.id);
    if (perfilAv.papelAv === 'visualizador' || !perfilAv.competencias.includes(area)) {
      throw new ErroSemPermissaoNaArea();
    }
    return usuario;
  }

  /** Administrador global (gerencia perfis, papéis e dados de exemplo). */
  exigirAdministrador(): UsuarioAtualAv {
    const usuario = this.exigirAutenticado();
    if (usuario.perfil !== 'administrador') {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Só o administrador pode fazer isto.');
    }
    return usuario;
  }

  /** Aceite/devolução da SD: só quem tem papel de Gerente de Engenharia ou Gestor de Programa. */
  async exigirAceiteDaSd(): Promise<UsuarioAtualAv> {
    const usuario = this.exigirAutenticado();
    if (!podeDarAceiteDaSd(await this.obterPerfilAv(usuario.id))) {
      throw new ErroDeDominio(
        'SEM_PERMISSAO',
        'Só o Gerente de Engenharia ou um Gestor de Programa pode dar o aceite da SD.',
      );
    }
    return usuario;
  }

  /** Perfil AV/SD de alguém (padrão sem competências quando nunca foi configurado). */
  async obterPerfilAv(usuarioId: string): Promise<PerfilAvUsuario> {
    return (await this.perfis.obterPerfil(usuarioId)) ?? perfilAvPadraoSemCompetencias(usuarioId);
  }
}
