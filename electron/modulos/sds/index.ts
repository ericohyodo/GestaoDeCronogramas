/**
 * API pública do módulo SDs (Solicitações de Desenvolvimento).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import { transacional } from '../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Notificador } from '../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import { ControleDeVersaoSqlite } from '../../nucleo/infraestrutura/banco/controle-de-versao-sqlite';
import { UnidadeDeTrabalhoSqlite } from '../../nucleo/infraestrutura/banco/unidade-de-trabalho-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { ListarSds, ObterSd, ObterSdPorAv } from './aplicacao/casos-de-uso/consultar-sds';
import { CriarPreSd, type CriarPreSdEntrada } from './aplicacao/casos-de-uso/criar-pre-sd';
import { AvancarSdDeExemplo } from './aplicacao/casos-de-uso/exemplo-sd';
import {
  AbrirEvidenciaSd,
  AbrirSd,
  AceitarSd,
  AnexarEvidenciasSd,
  DevolverSd,
  ExcluirEvidenciaSd,
  ListarEvidenciasSd,
  SalvarSd,
  type DependenciasFluxoSd,
} from './aplicacao/casos-de-uso/fluxo-sd';
import type { AcessoDoFluxoSd, AvsDoFluxoSd, CriadorDeProjeto } from './aplicacao/portas';
import { registrarIpcSds } from './apresentacao/controlador-ipc-sds';
import { ArmazenamentoDeEvidenciasFs, SeletorDeEvidenciasElectron } from './infraestrutura/evidencias-fs';
import { RepositorioAnexosSdSqlite, RepositorioSdsSqlite } from './infraestrutura/repositorio-sds-sqlite';

export type { AcessoDoFluxoSd, AvsDoFluxoSd, CriadorDeProjeto } from './aplicacao/portas';

export interface DependenciasModuloSds {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  acesso: AcessoDoFluxoSd;
  avs: AvsDoFluxoSd;
  projetos: CriadorDeProjeto;
  notificador: Notificador;
}

type SdCriada = Awaited<ReturnType<CriarPreSd['executar']>>;

export interface ModuloSds {
  comandos: {
    /** Cria a SD (status "pré-SD") da AV informada, herdando o número dela. */
    criarPreSd(entrada: CriarPreSdEntrada): Promise<SdCriada>;
    /** Dados de exemplo: leva a SD da AV até "aberta" ou "fechada" (com projeto). */
    avancarSdDeExemplo(avId: string, ate: 'aberta' | 'fechada', usuarioId: string): Promise<void>;
  };
  consultas: {
    obterPorAv(avId: string): Promise<SdCriada | null>;
    listar(): Promise<SdCriada[]>;
  };
}

export function montarModuloSds(deps: DependenciasModuloSds): ModuloSds {
  const repositorio = new RepositorioSdsSqlite(deps.db);
  const versoes = new ControleDeVersaoSqlite(deps.db);
  const transacao = new UnidadeDeTrabalhoSqlite(deps.db);
  const fluxo: DependenciasFluxoSd = {
    repositorio,
    anexos: new RepositorioAnexosSdSqlite(deps.db),
    acesso: deps.acesso,
    versoes,
    relogio: deps.relogio,
    geradorDeId: deps.geradorDeId,
    notificador: deps.notificador,
  };
  const armazenamento = new ArmazenamentoDeEvidenciasFs();
  const obterPorAv = new ObterSdPorAv(repositorio, deps.acesso, versoes);
  const listarSds = new ListarSds(repositorio, deps.acesso, versoes);
  const criarPreSd = new CriarPreSd(repositorio, deps.relogio, deps.geradorDeId);
  const exemplo = new AvancarSdDeExemplo(
    repositorio,
    versoes,
    deps.relogio,
    new AceitarSd(fluxo, deps.projetos, deps.avs, true),
    async (sd, usuarioId) => {
      const nome = `PO do cliente - ${sd.numero}.eml`;
      const guardado = await armazenamento.gravarTexto(
        sd.id,
        nome,
        [
          'From: compras@cliente-exemplo.com.br',
          'To: comercial@ferkoda.com.br',
          `Subject: Pedido de compra - ${sd.numero}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          'Prezados, segue o pedido de compra aprovado conforme a cotação enviada.',
          'Dados fictícios do modo apresentação.',
        ].join(String.fromCharCode(13, 10)),
      );
      await fluxo.anexos.inserir({
        id: deps.geradorDeId.gerar(),
        sdId: sd.id,
        nomeArquivo: nome,
        nomeArmazenado: guardado.nomeArmazenado,
        tipoMime: guardado.tipoMime,
        tamanhoBytes: guardado.tamanhoBytes,
        usuarioId,
        criadoEm: deps.relogio.agora(),
      });
    },
  );

  registrarIpcSds(deps.ipc, {
    listar: listarSds,
    obterPorAv,
    obter: new ObterSd(repositorio, deps.acesso, versoes),
    salvar: new SalvarSd(fluxo),
    abrir: new AbrirSd(fluxo),
    aceitar: transacional(new AceitarSd(fluxo, deps.projetos, deps.avs), transacao),
    devolver: new DevolverSd(fluxo),
    listarEvidencias: new ListarEvidenciasSd(fluxo),
    anexarEvidencias: new AnexarEvidenciasSd(fluxo, new SeletorDeEvidenciasElectron(), armazenamento),
    abrirEvidencia: new AbrirEvidenciaSd(fluxo, armazenamento),
    excluirEvidencia: new ExcluirEvidenciaSd(fluxo, armazenamento),
  });

  return {
    comandos: {
      criarPreSd: (entrada) => criarPreSd.executar(entrada),
      avancarSdDeExemplo: (avId, ate, usuarioId) =>
        transacao.executar(() => exemplo.executar(avId, ate, usuarioId)),
    },
    consultas: { obterPorAv: (avId) => obterPorAv.executar(avId), listar: () => listarSds.executar() },
  };
}
