import type { SessaoDTO, UsuarioDTO } from '@contratos/sessao.contrato';
import type { Usuario } from '../dominio/usuario';
import type { Sessao } from './sessao';

export function paraUsuarioDTO(usuario: Usuario): UsuarioDTO {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    criadoEm: usuario.criadoEm.toISOString(),
    ultimoAcessoEm: usuario.ultimoAcessoEm?.toISOString() ?? null,
  };
}

export function paraSessaoDTO(sessao: Sessao, precisaConfigurar: boolean): SessaoDTO {
  const usuario = sessao.usuarioAtual;
  return {
    usuario: usuario ? paraUsuarioDTO(usuario) : null,
    permissoes: usuario ? usuario.permissoes : [],
    precisaConfigurar,
  };
}
