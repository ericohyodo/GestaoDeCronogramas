import type {
  MeuPerfilAvDTO,
  PerfilAvDTO,
  SalvarPerfilAvEntrada,
} from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { RepositorioPerfisAv } from '../../dominio/repositorio-perfis-av';
import type { AutorizacaoAv } from '../autorizacao';
import type { ConsultaDeUsuarios } from '../portas';
import { type Notificador, semNotificacao } from '../../../../nucleo/aplicacao/portas/notificador';
import { ROTULO_DA_AREA } from '../notificacoes-av';

// =====================================================================================================
// Perfis do fluxo AV/SD: competências por área (quem pode criar AV / assumir uma área) e papéis
// especiais (Gerente de Engenharia, Gestor de Programa — aceite da SD). Só o administrador altera.
// =====================================================================================================

/** Lista todos os usuários ativos com o perfil AV/SD de cada um (tela de Usuários, administrador). */
export class ListarPerfisAv implements CasoDeUso<void, PerfilAvDTO[]> {
  constructor(
    private readonly perfis: RepositorioPerfisAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
  ) {}

  /** @returns um item por usuário ativo, em ordem alfabética */
  async executar(): Promise<PerfilAvDTO[]> {
    this.autorizacao.exigirAdministrador();
    const porUsuario = new Map((await this.perfis.listarPerfis()).map((perfil) => [perfil.usuarioId, perfil]));
    return (await this.usuarios.listarAtivos())
      .map((usuario) => {
        const perfil = porUsuario.get(usuario.id);
        return {
          usuarioId: usuario.id,
          nome: usuario.nome,
          papelAv: perfil?.papelAv ?? 'padrao',
          competencias: perfil?.competencias ?? [],
          papeisEspeciais: perfil?.papeisEspeciais ?? [],
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}

/** Grava competências e papéis de um usuário (substitui os anteriores). */
export class SalvarPerfilAv implements CasoDeUso<SalvarPerfilAvEntrada, PerfilAvDTO> {
  constructor(
    private readonly perfis: RepositorioPerfisAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly notificador: Notificador = semNotificacao,
  ) {}

  /**
   * @param entrada usuário, papel no módulo, competências e papéis especiais (listas sem repetição)
   * @returns o perfil gravado
   */
  async executar(entrada: SalvarPerfilAvEntrada): Promise<PerfilAvDTO> {
    const admin = this.autorizacao.exigirAdministrador();
    const usuario = (await this.usuarios.listarAtivos()).find((item) => item.id === entrada.usuarioId);
    if (!usuario) throw new ErroNaoEncontrado('Usuário');

    const perfil = {
      usuarioId: usuario.id,
      papelAv: entrada.papelAv,
      competencias: [...new Set(entrada.competencias)],
      papeisEspeciais: [...new Set(entrada.papeisEspeciais)],
    };
    const anterior = await this.perfis.obterPerfil(usuario.id);
    await this.perfis.salvarPerfil(perfil);

    const novosPapeis = perfil.papeisEspeciais.filter((papel) => !anterior?.papeisEspeciais.includes(papel));
    const novasAreas = perfil.competencias.filter((area) => !anterior?.competencias.includes(area));
    const rotulos = [
      ...novosPapeis.map((papel) => (papel === 'gerente_engenharia' ? 'Gerente de Engenharia' : 'Gestor de Programa')),
      ...novasAreas.map((area) => `competência ${ROTULO_DA_AREA[area]}`),
    ];
    if (rotulos.length > 0) {
      await this.notificador.notificar({
        usuarioIds: [usuario.id],
        excetoUsuarioId: admin.id,
        tipo: 'usuario.papel',
        titulo: 'Novas permissões no fluxo AV/SD',
        mensagem: `Você recebeu: ${rotulos.join(', ')}.${novosPapeis.length > 0 ? ' Agora pode dar o aceite das SDs.' : ''}`,
        link: novosPapeis.length > 0 ? '/sds/' : '/avs/',
      });
    }
    return { ...perfil, nome: usuario.nome };
  }
}

/** O que o usuário logado pode fazer no fluxo AV/SD. */
export class ObterMeuPerfilAv implements CasoDeUso<void, MeuPerfilAvDTO> {
  constructor(private readonly autorizacao: AutorizacaoAv) {}

  async executar(): Promise<MeuPerfilAvDTO> {
    const usuario = this.autorizacao.exigirAutenticado();
    const perfil = await this.autorizacao.obterPerfilAv(usuario.id);
    return {
      usuarioId: usuario.id,
      administrador: usuario.perfil === 'administrador',
      papelAv: perfil.papelAv,
      competencias: perfil.competencias,
      papeisEspeciais: perfil.papeisEspeciais,
    };
  }
}
