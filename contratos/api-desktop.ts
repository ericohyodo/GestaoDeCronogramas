import type { AparenciaDTO } from './aparencia.contrato';
import type {
  AtualizarCronogramaEntrada,
  CriarCronogramaEntrada,
  CronogramaDTO,
} from './cronogramas.contrato';
import type { PreferenciasDTO, TemaDTO } from './preferencias.contrato';
import type {
  AtualizarResponsavelEntrada,
  CriarResponsavelEntrada,
  ResponsavelDTO,
} from './responsaveis.contrato';
import type { Resultado } from './resultado';
import type { EntrarEntrada, PrimeiroAcessoEntrada, SessaoDTO, UsuarioDTO } from './sessao.contrato';
import type {
  AtualizarFaseEntrada,
  AtualizarTarefaEntrada,
  AtualizarTarefaSaida,
  CriarFaseEntrada,
  CriarTarefaEntrada,
  DeslocarSucessorasEntrada,
  EstruturaCronogramaDTO,
  TarefaDTO,
} from './tarefas.contrato';
import type {
  AlterarSenhaEntrada,
  AtualizarUsuarioEntrada,
  CriarUsuarioEntrada,
} from './usuarios.contrato';

/** Formato de `window.api`, exposto pelo preload via contextBridge. */
export interface ApiDesktop {
  sessao: {
    obter(): Promise<Resultado<SessaoDTO>>;
    entrar(entrada: EntrarEntrada): Promise<Resultado<SessaoDTO>>;
    sair(): Promise<Resultado<SessaoDTO>>;
    primeiroAcesso(entrada: PrimeiroAcessoEntrada): Promise<Resultado<SessaoDTO>>;
  };
  usuarios: {
    listar(): Promise<Resultado<UsuarioDTO[]>>;
    criar(entrada: CriarUsuarioEntrada): Promise<Resultado<UsuarioDTO>>;
    atualizar(entrada: AtualizarUsuarioEntrada): Promise<Resultado<UsuarioDTO>>;
    alterarSenha(entrada: AlterarSenhaEntrada): Promise<Resultado<null>>;
    excluir(id: string): Promise<Resultado<null>>;
  };
  responsaveis: {
    listar(): Promise<Resultado<ResponsavelDTO[]>>;
    criar(entrada: CriarResponsavelEntrada): Promise<Resultado<ResponsavelDTO>>;
    atualizar(entrada: AtualizarResponsavelEntrada): Promise<Resultado<ResponsavelDTO>>;
    excluir(id: string): Promise<Resultado<null>>;
  };
  cronogramas: {
    listar(): Promise<Resultado<CronogramaDTO[]>>;
    obter(id: string): Promise<Resultado<CronogramaDTO>>;
    criar(entrada: CriarCronogramaEntrada): Promise<Resultado<CronogramaDTO>>;
    atualizar(entrada: AtualizarCronogramaEntrada): Promise<Resultado<CronogramaDTO>>;
    excluir(id: string): Promise<Resultado<null>>;
  };
  tarefas: {
    obterEstrutura(cronogramaId: string): Promise<Resultado<EstruturaCronogramaDTO>>;
    criar(entrada: CriarTarefaEntrada): Promise<Resultado<TarefaDTO>>;
    atualizar(entrada: AtualizarTarefaEntrada): Promise<Resultado<AtualizarTarefaSaida>>;
    excluir(id: string): Promise<Resultado<null>>;
    deslocarSucessoras(entrada: DeslocarSucessorasEntrada): Promise<Resultado<null>>;
    criarFase(entrada: CriarFaseEntrada): Promise<Resultado<null>>;
    atualizarFase(entrada: AtualizarFaseEntrada): Promise<Resultado<null>>;
    excluirFase(id: string): Promise<Resultado<null>>;
  };
  preferencias: {
    obter(): Promise<Resultado<PreferenciasDTO>>;
    definirTema(tema: TemaDTO): Promise<Resultado<PreferenciasDTO>>;
  };
  aparencia: AparenciaDTO;
}
