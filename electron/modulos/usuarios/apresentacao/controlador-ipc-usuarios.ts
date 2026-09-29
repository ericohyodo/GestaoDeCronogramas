import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { PERFIS } from '@contratos/sessao.contrato';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { CriarPrimeiroUsuario } from '../aplicacao/casos-de-uso/criar-primeiro-usuario';
import type { Entrar } from '../aplicacao/casos-de-uso/entrar';
import type {
  AlterarSenha,
  AtualizarUsuario,
  CriarUsuario,
  ExcluirUsuario,
  ListarUsuarios,
} from '../aplicacao/casos-de-uso/gerenciar-usuarios';
import type { BaterPresenca, ListarUsuariosOnline } from '../aplicacao/casos-de-uso/presenca';
import type { ObterSessao, Sair } from '../aplicacao/casos-de-uso/obter-sessao';

export interface CasosDeUsoUsuarios {
  obterSessao: ObterSessao;
  entrar: Entrar;
  sair: Sair;
  primeiroAcesso: CriarPrimeiroUsuario;
  listar: ListarUsuarios;
  criar: CriarUsuario;
  atualizar: AtualizarUsuario;
  alterarSenha: AlterarSenha;
  excluir: ExcluirUsuario;
  baterPresenca: BaterPresenca;
  listarOnline: ListarUsuariosOnline;
}

const esquemaEntrar = z.object({ login: z.string(), senha: z.string() });
const esquemaPrimeiroAcesso = z.object({
  nome: z.string(),
  login: z.string(),
  senha: z.string(),
});
const esquemaCriar = z.object({
  nome: z.string(),
  login: z.string(),
  senha: z.string(),
  perfil: z.enum(PERFIS),
});
const esquemaAtualizar = z.object({
  id: esquemaId,
  nome: z.string().optional(),
  perfil: z.enum(PERFIS).optional(),
  ativo: z.boolean().optional(),
});
const esquemaAlterarSenha = z.object({
  id: esquemaId,
  senhaAtual: z.string().optional(),
  novaSenha: z.string(),
});

export function registrarIpcUsuarios(ipc: RegistradorIpc, casos: CasosDeUsoUsuarios): void {
  // Canais públicos: a tela de login precisa deles antes de existir sessão.
  ipc.registrar(CANAIS.sessao.obter, 'publico', esquemaSemEntrada, () => casos.obterSessao.executar());
  ipc.registrar(CANAIS.sessao.entrar, 'publico', esquemaEntrar, (entrada) =>
    casos.entrar.executar(entrada),
  );
  ipc.registrar(CANAIS.sessao.sair, 'publico', esquemaSemEntrada, () => casos.sair.executar());
  ipc.registrar(CANAIS.sessao.primeiroAcesso, 'publico', esquemaPrimeiroAcesso, (entrada) =>
    casos.primeiroAcesso.executar(entrada),
  );

  // Presença: qualquer pessoa autenticada avisa que está online e vê quem mais está.
  ipc.registrar(CANAIS.sessao.presenca, 'leitura', esquemaSemEntrada, () => casos.baterPresenca.executar());
  ipc.registrar(CANAIS.usuarios.listarOnline, 'leitura', esquemaSemEntrada, () =>
    casos.listarOnline.executar(),
  );

  ipc.registrar(CANAIS.usuarios.listar, 'administracao', esquemaSemEntrada, () =>
    casos.listar.executar(),
  );
  ipc.registrar(CANAIS.usuarios.criar, 'administracao', esquemaCriar, (entrada) =>
    casos.criar.executar(entrada),
  );
  ipc.registrar(CANAIS.usuarios.atualizar, 'administracao', esquemaAtualizar, (entrada) =>
    casos.atualizar.executar(entrada),
  );
  // Qualquer pessoa autenticada troca a própria senha; o caso de uso barra a senha dos outros.
  ipc.registrar(CANAIS.usuarios.alterarSenha, 'leitura', esquemaAlterarSenha, (entrada) =>
    casos.alterarSenha.executar(entrada),
  );
  ipc.registrar(CANAIS.usuarios.excluir, 'administracao', esquemaId, (id) =>
    casos.excluir.executar(id),
  );
}
