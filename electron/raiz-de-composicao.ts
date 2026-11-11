import path from 'node:path';
import { ipcMain } from 'electron';
import type { AparenciaDTO } from '@contratos/aparencia.contrato';
import { CANAIS } from '@contratos/canais';
import { suportaVidroNativo } from './janela/aparencia';
import { montarModuloAvs } from './modulos/avs';
import { montarModuloCronogramas } from './modulos/cronogramas';
import { montarModuloIa } from './modulos/ia';
import { montarModuloImpressao } from './modulos/impressao';
import { montarModuloNotificacoes } from './modulos/notificacoes';
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
import { fazerBackup } from './nucleo/infraestrutura/banco/backup';
import { executarMigracoes, haMigracoesPendentes } from './nucleo/infraestrutura/banco/migrador';
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
  // Backup antes de mexer no esquema (sempre) ou, fora isso, um por dia. Uma falha no backup não
  // impede o uso do app, mas impede aplicar migrações sem cópia de segurança.
  const pendentes = haMigracoesPendentes(db, MIGRACOES);
  let falhaNoBackup: string | null = null;
  try {
    const backup = await fazerBackup(db, pasta, new Date(), pendentes ? 'pre-migracao' : 'diario');
    if (backup) console.info(`[banco] backup: ${backup}`);
  } catch (erro) {
    console.error('[banco] falha ao fazer backup:', erro);
    falhaNoBackup = erro instanceof Error ? erro.message : String(erro);
    if (pendentes) {
      db.close();
      throw new Error(
        'Não foi possível fazer o backup do banco antes de atualizá-lo. Verifique o espaço e a permissão ' +
          `de escrita na pasta:
${pasta}`,
      );
    }
  }
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

  const notificacoes = montarModuloNotificacoes({
    db,
    ipc,
    relogio,
    geradorDeId,
    logado: { usuarioAtualId: () => usuarios.consultas.usuarioAtual()?.id ?? null },
  });
  const { notificador } = notificacoes;
  if (falhaNoBackup) {
    // Administradores ficam sabendo pelo sino: o app abriu, mas sem a cópia de segurança do dia.
    const ativos = await usuarios.consultas.listarAtivos();
    const perfis = await Promise.all(ativos.map((u) => usuarios.consultas.obterPerfilGlobal(u.id)));
    await notificador.notificar({
      usuarioIds: ativos.filter((_, i) => perfis[i] === 'administrador').map((u) => u.id),
      tipo: 'sistema.backup_falhou',
      titulo: 'Falha no backup automático do banco',
      mensagem: `Verifique espaço e permissão na pasta do aplicativo. Detalhe: ${falhaNoBackup}`,
      link: null,
    });
  }

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
      obterUsuarios: (ids) => responsaveis.consultas.obterUsuarios(ids),
    },
    notificador,
    usuarioAtualId: () => usuarios.consultas.usuarioAtual()?.id ?? null,
  });

  // SDs e AVs dependem um do outro (Pré-SD ↔ aceite): as referências a `avs` só são usadas em tempo de
  // execução, depois de os dois módulos estarem montados.
  const sds = montarModuloSds({
    db,
    ipc,
    relogio,
    geradorDeId,
    acesso: {
      usuarioAtual: () => {
        const usuario = usuarios.consultas.usuarioAtual();
        return usuario ? { id: usuario.id, nome: usuario.nome, administrador: usuario.perfil === 'administrador' } : null;
      },
      podeDarAceite: (usuarioId) => avs.consultas.podeDarAceite(usuarioId),
      listarNomes: () => usuarios.consultas.listarAtivos(),
      listarAprovadores: () => avs.consultas.listarAprovadores(),
    },
    avs: { concluirComProjeto: (entrada) => avs.comandos.concluirComProjeto(entrada) },
    projetos: { criar: (entrada) => cronogramas.comandos.criarProjeto(entrada) },
    notificador,
  });

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
    notificador,
    avancarSdDeExemplo: (avId, ate, usuarioId) => sds.comandos.avancarSdDeExemplo(avId, ate, usuarioId),
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

  // Rotina de prazos (tarefas vencendo/atrasadas e prazo do cliente nas AVs): na abertura e a cada hora.
  // Cada aviso sai uma vez só, mesmo com vários PCs rodando a rotina (deduplicação por chave no banco).
  const verificarPrazos = async () => {
    try {
      const tarefasAvisadas = await tarefas.rotinas.verificarPrazos();
      const avsAvisadas = await avs.rotinas.verificarPrazosDoCliente();
      if (tarefasAvisadas + avsAvisadas > 0) console.info(`[prazos] avisos verificados: ${tarefasAvisadas} tarefa(s), ${avsAvisadas} AV(s)`);
    } catch (erro) {
      console.error('[prazos] falha na verificação de prazos:', erro);
    }
  };
  const primeiraVerificacao = setTimeout(() => void verificarPrazos(), 15_000);
  const rotinaDePrazos = setInterval(() => void verificarPrazos(), 60 * 60 * 1000);

  return {
    caminhoDoBanco,
    aparencia,
    encerrar: () => {
      clearTimeout(primeiraVerificacao);
      clearInterval(rotinaDePrazos);
      // Sai da lista de usuários online antes de fechar o banco (falha aqui não deve impedir o fechamento).
      void usuarios.encerrar().catch(() => undefined);
      db.close();
    },
  };
}
