import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { PERFIS } from '@contratos/sessao.contrato';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { ConcluirPrimeiroAcesso } from '../aplicacao/casos-de-uso/concluir-primeiro-acesso';
import type { CriarPrimeiroUsuario } from '../aplicacao/casos-de-uso/criar-primeiro-usuario';
import type { Entrar } from '../aplicacao/casos-de-uso/entrar';
import type {
  AlterarSenha,
  AtualizarUsuario,
  CriarUsuario,
  ExcluirUsuario,
  ListarUsuarios,
} from '../aplicacao/casos-de-uso/gerenciar-usuarios';
import type { ObterMeuPerfil, SalvarMeuPerfil } from '../aplicacao/casos-de-uso/meu-perfil';
import type { BaterPresenca, ListarUsuariosOnline } from '../aplicacao/casos-de-uso/presenca';
import type { ObterSessao, Sair } from '../aplicacao/casos-de-uso/obter-sessao';

export interface CasosDeUsoUsuarios {
  obterSessao: ObterSessao;
  entrar: Entrar;
  sair: Sair;
  primeiroAcesso: CriarPrimeiroUsuario;
  concluirPrimeiroAcesso: ConcluirPrimeiroAcesso;
  listar: ListarUsuarios;
  criar: CriarUsuario;
  atualizar: AtualizarUsuario;
  alterarSenha: AlterarSenha;
  excluir: ExcluirUsuario;
  baterPresenca: BaterPresenca;
  listarOnline: ListarUsuariosOnline;
  obterMeuPerfil: ObterMeuPerfil;
  salvarMeuPerfil: SalvarMeuPerfil;
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
  email: z.string().max(254).nullish(),
  departamento: z.string().max(60).nullish(),
  senha: z.string(),
  perfil: z.enum(PERFIS),
});
const esquemaAtualizar = z.object({
  id: esquemaId,
  nome: z.string().optional(),
  email: z.string().max(254).nullish(),
  departamento: z.string().max(60).nullish(),
  exigirPrimeiroAcesso: z.boolean().optional(),
  perfil: z.enum(PERFIS).optional(),
  ativo: z.boolean().optional(),
});
const esquemaAlterarSenha = z.object({
  id: esquemaId,
  senhaAtual: z.string().optional(),
  novaSenha: z.string(),
});

/** Foto: base64 de JPEG ou PNG de verdade (assinatura binária), até ~300 KB. */
const esquemaFoto = z
  .object({
    base64: z.string().min(1).max(400_000).regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Foto em formato inválido.'),
    mime: z.enum(['image/jpeg', 'image/png']),
  })
  .refine(({ base64, mime }) => {
    const inicio = Buffer.from(base64.slice(0, 16), 'base64');
    return mime === 'image/png'
      ? inicio.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      : inicio.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }, 'O arquivo não é uma imagem JPG ou PNG.');

const esquemaMeuPerfil = z.object({
  email: z.string().max(254).nullish(),
  departamento: z.string().max(60).nullish(),
  cargo: z.string().max(80).nullish(),
  ramal: z.string().max(20).nullish(),
  celular: z.string().max(30).nullish(),
  sobre: z.string().max(1000).nullish(),
  foto: esquemaFoto.nullish(),
});

export function registrarIpcUsuarios(ipc: RegistradorIpc, casos: CasosDeUsoUsuarios): void {
  // Canais públicos: a tela de login precisa deles antes de existir sessão.
  ipc.registrar(CANAIS.sessao.obter, 'publico', esquemaSemEntrada, () => casos.obterSessao.executar());
  ipc.registrar(CANAIS.sessao.entrar, 'publico', esquemaEntrar, (entrada) =>
    casos.entrar.executar(entrada),
  );
  ipc.registrar(CANAIS.sessao.sair, 'publico', esquemaSemEntrada, () => casos.sair.executar());
  ipc.registrar(
    CANAIS.sessao.concluirPrimeiroAcesso,
    'publico',
    z.object({ login: z.string().max(64), email: z.string().max(254), senha: z.string().max(200) }),
    (entrada) => casos.concluirPrimeiroAcesso.executar(entrada),
  );
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
  // Meu perfil: qualquer pessoa autenticada vê e edita os próprios dados (nunca os de outra pessoa).
  ipc.registrar(CANAIS.usuarios.obterMeuPerfil, 'leitura', esquemaSemEntrada, () => casos.obterMeuPerfil.executar());
  ipc.registrar(CANAIS.usuarios.salvarMeuPerfil, 'leitura', esquemaMeuPerfil, (entrada) =>
    casos.salvarMeuPerfil.executar(entrada),
  );
}
