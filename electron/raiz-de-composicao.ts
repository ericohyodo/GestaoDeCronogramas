import path from 'node:path';
import { ipcMain } from 'electron';
import type { AparenciaDTO } from '@contratos/aparencia.contrato';
import { CANAIS } from '@contratos/canais';
import { suportaVidroNativo } from './janela/aparencia';
import { montarModuloAvs } from './modulos/avs';
import { montarModuloCronogramas } from './modulos/cronogramas';
import { montarModuloIa } from './modulos/ia';
import { montarModuloImpressao } from './modulos/impressao';
import { montarModuloPreferencias } from './modulos/preferencias';
import { montarModuloResponsaveis } from './modulos/responsaveis';
import { montarModuloSds } from './modulos/sds';
import { montarModuloTarefas } from './modulos/tarefas';
import { montarModuloUsuarios } from './modulos/usuarios';
import type { ControleDeAcesso } from './nucleo/aplicacao/portas/controle-de-acesso';
import {
  garantirPastaGravavel,
  NOME_ARQUIVO_BANCO,
  resolverPastaDoBanco,
} from './nucleo/infraestrutura/banco/caminho-do-banco';
import { abrirConexao } from './nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from './nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from './nucleo/infraestrutura/banco/migracoes';
import { GeradorUuid } from './nucleo/infraestrutura/gerador-uuid';
import { criarRegistradorIpc } from './nucleo/infraestrutura/ipc/registrador-ipc';
import { RelogioDoSistema } from './nucleo/infraestrutura/relogio-do-sistema';

export interface Aplicacao {
  caminhoDoBanco: string;
  aparencia: AparenciaDTO;
  encerrar(): void;
}

/**
 * Raiz de composição: o único lugar que conhece todas as implementações concretas.
 * Abre o banco, aplica migrações, monta os módulos e liga as portas entre eles.
 */
export async function montarAplicacao(opcoes: {
  ehUrlConfiavel(url: string): boolean;
  /** Origem do renderer, sem barra final (`app://-` ou o servidor de desenvolvimento). */
  urlDoRenderer: string;
  caminhoDoPreload: string;
}): Promise<Aplicacao> {
  const pasta = resolverPastaDoBanco();
  garantirPastaGravavel(pasta);
  const caminhoDoBanco = path.join(pasta, NOME_ARQUIVO_BANCO);

  const db = abrirConexao(caminhoDoBanco);
  const aplicadas = executarMigracoes(db, MIGRACOES);
  if (aplicadas.length > 0) console.info(`[banco] migrações aplicadas: ${aplicadas.join(', ')}`);
  console.info(`[banco] ${caminhoDoBanco}`);

  // O controle de acesso vem do módulo de usuários, que por sua vez precisa do registrador de
  // canais: a indireção abaixo resolve essa dependência circular.
  let controleDeAcesso: ControleDeAcesso = {
    autenticado: () => false,
    possuiPermissao: () => false,
  };
  const ipc = criarRegistradorIpc({
    ehOrigemConfiavel: opcoes.ehUrlConfiavel,
    controleDeAcesso: {
      autenticado: () => controleDeAcesso.autenticado(),
      possuiPermissao: (permissao) => controleDeAcesso.possuiPermissao(permissao),
    },
  });

  const relogio = new RelogioDoSistema();
  const geradorDeId = new GeradorUuid();

  const usuarios = montarModuloUsuarios({ db, ipc, relogio, geradorDeId });
  controleDeAcesso = usuarios.controleDeAcesso;

  const responsaveis = montarModuloResponsaveis({ db, ipc, relogio, geradorDeId });
  const cronogramas = montarModuloCronogramas({ db, ipc, relogio, geradorDeId });
  const tarefas = montarModuloTarefas({
    db,
    ipc,
    relogio,
    geradorDeId,
    consultaDeCronogramas: {
      existe: (id) => cronogramas.consultas.existe(id),
      obterPeriodo: (id) => cronogramas.consultas.obterPeriodo(id),
      listar: () => cronogramas.consultas.listar(),
    },
    consultaDeResponsaveis: {
      obterNomes: (ids) => responsaveis.consultas.obterNomes(ids),
      existe: (id) => responsaveis.consultas.existe(id),
    },
  });

  const sds = montarModuloSds({ db, ipc, relogio, geradorDeId });

  const avs = montarModuloAvs({
    db,
    ipc,
    relogio,
    geradorDeId,
    consultaDeUsuarios: {
      usuarioAtual: () => usuarios.consultas.usuarioAtual(),
      listarAtivos: () => usuarios.consultas.listarAtivos(),
      obterPerfilGlobal: (id) => usuarios.consultas.obterPerfilGlobal(id),
    },
    criadorDePreSd: { criar: (entrada) => sds.comandos.criarPreSd(entrada) },
  });

  const ia = montarModuloIa({
    db,
    ipc,
    relogio,
    geradorDeId,
    consultaDeCronograma: {
      obterResumo: (id) => cronogramas.consultas.obterResumo(id),
      listarIdsAtivos: async () =>
        (await cronogramas.consultas.listar()).filter((c) => !c.arquivado).map((c) => c.id),
    },
    consultaDeEstrutura: { obterEstrutura: (id) => tarefas.consultas.obterEstrutura(id) },
    consultaDeAvs: { relatorio: () => avs.consultas.relatorio() },
    quemEstaUsando: { nomeDoUsuarioAtual: () => usuarios.consultas.nomeDoUsuarioAtual() },
  });

  montarModuloImpressao({
    ipc,
    urlBase: opcoes.urlDoRenderer,
    caminhoDoPreload: opcoes.caminhoDoPreload,
    consultaDeCronogramas: { obterNome: (id) => cronogramas.consultas.obterNome(id) },
    consultaDeAnalises: { obterResumo: (id) => ia.consultas.obterResumoDaAnalise(id) },
  });

  const preferencias = montarModuloPreferencias({ db, ipc });
  // Tema aplicado antes de a janela existir: sem troca de cores visível na abertura.
  await preferencias.aplicarTemaSalvo();

  const aparencia: AparenciaDTO = { vidroNativo: suportaVidroNativo() };
  ipcMain.on(CANAIS.aparencia.obter, (evento) => {
    evento.returnValue = aparencia;
  });

  return {
    caminhoDoBanco,
    aparencia,
    encerrar: () => {
      // Sai da lista de usuários online antes de fechar o banco (falha aqui não deve impedir o fechamento).
      void usuarios.encerrar().catch(() => undefined);
      db.close();
    },
  };
}
