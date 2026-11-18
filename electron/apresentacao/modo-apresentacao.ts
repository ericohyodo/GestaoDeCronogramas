import { rmSync } from 'node:fs';
import { app } from 'electron';
import type { EstadoApresentacaoDTO, RoteiroDaApresentacaoDTO } from '@contratos/apresentacao.contrato';
import { CANAIS } from '@contratos/canais';
import type { Notificador } from '../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../nucleo/aplicacao/portas/relogio';
import {
  ARGUMENTO_MODO_APRESENTACAO,
  ehModoApresentacao,
} from '../nucleo/infraestrutura/banco/caminho-do-banco';
import { esquemaSemEntrada } from '../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../nucleo/infraestrutura/ipc/registrador-ipc';
import type { ModuloAvs } from '../modulos/avs';
import type { ModuloResponsaveis } from '../modulos/responsaveis';
import type { ModuloSds } from '../modulos/sds';
import type { ModuloTarefas } from '../modulos/tarefas';
import type { ModuloUsuarios } from '../modulos/usuarios';

// =====================================================================================================
// Modo apresentação: o app é reiniciado com `--modo-apresentacao`, que troca a pasta de dados por uma
// subpasta própria (banco, anexos e backups), recriada do zero a cada entrada com dados fictícios.
// Os dados reais nunca são abertos nesse modo. Sair reinicia o app sem o argumento.
// =====================================================================================================

/** Apaga a pasta do modo apresentação antes de abrir o banco: cada apresentação começa igual. */
export function limparPastaDaApresentacao(pasta: string): void {
  if (ehModoApresentacao()) rmSync(pasta, { recursive: true, force: true });
}

export interface ModulosDaApresentacao {
  usuarios: ModuloUsuarios;
  avs: ModuloAvs;
  sds: ModuloSds;
  responsaveis: ModuloResponsaveis;
  tarefas: ModuloTarefas;
  notificador: Notificador;
  relogio: Relogio;
}

const diaLocal = (instante: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${instante.getFullYear()}-${p(instante.getMonth() + 1)}-${p(instante.getDate())}`;
};

/**
 * Cria os dados fictícios e entra como o usuário "Apresentação" (administrador com todos os papéis).
 * @returns os registros em destaque para o roteiro guiado
 */
export async function semearApresentacao(m: ModulosDaApresentacao): Promise<RoteiroDaApresentacaoDTO> {
  const apresentador = await m.usuarios.comandos.entrarComoApresentador();
  await m.avs.apresentacao.prepararApresentador(apresentador.id);

  // Recursos dos projetos ligados a usuários da equipe (para as notificações das tarefas).
  const equipe = await m.usuarios.consultas.listarAtivos();
  const porNome = (nome: string) => equipe.find((u) => u.nome === nome)?.id ?? null;
  const recursos: string[] = [];
  const recursoDoNome = new Map<string, string>();
  const recursoDoUsuario = new Map<string, string>();
  for (const [nome, funcao] of [
    ['Apresentação', 'Gestão de Projetos'],
    ['Allan', 'Engenharia de Processo'],
    ['Wellington', 'Engenharia de Processo'],
    ['Thiago', 'PCP'],
    ['Leandro Cruz', 'Gerente de Engenharia'],
    ['Evandro Farias', 'Qualidade'],
  ] as const) {
    const usuarioId = porNome(nome);
    const id = (await m.responsaveis.comandos.criar({ nome, funcao, usuarioId })).id;
    recursos.push(id);
    recursoDoNome.set(nome, id);
    if (usuarioId) recursoDoUsuario.set(usuarioId, id);
  }

  await m.avs.apresentacao.gerarExemplos();
  const hoje = diaLocal(m.relogio.agora());
  const exemplos = await m.sds.consultas.listar();
  const projetoDeExemplo = exemplos.find((sd) => sd.status === 'fechada' && sd.cronogramaId)?.cronogramaId ?? null;
  if (projetoDeExemplo) await m.tarefas.apresentacao.semearProjeto(projetoDeExemplo, recursos, hoje);

  // Vitrine: uma AV completa → SD fechada → PRO cujas tarefas têm como responsável a equipe da AV.
  const vitrine = await m.avs.apresentacao.gerarVitrine();
  const FUNCAO_DA_AREA = { comercial: 'Comercial', produto: 'Engenharia de Produto', processo: 'Engenharia de Processo', pcp: 'PCP', custo: 'Custos' } as const;
  const responsavelPorArea: Record<string, string> = {};
  for (const [area, usuarioId] of Object.entries(vitrine.membros) as [keyof typeof FUNCAO_DA_AREA, string][]) {
    let recurso = recursoDoUsuario.get(usuarioId);
    if (!recurso) {
      const nome = equipe.find((u) => u.id === usuarioId)?.nome ?? FUNCAO_DA_AREA[area];
      recurso = (await m.responsaveis.comandos.criar({ nome, funcao: FUNCAO_DA_AREA[area], usuarioId })).id;
      recursoDoUsuario.set(usuarioId, recurso);
    }
    responsavelPorArea[area] = recurso;
  }
  responsavelPorArea.gestao = recursoDoNome.get('Apresentação')!;
  responsavelPorArea.qualidade = recursoDoNome.get('Evandro Farias')!;

  const sds = await m.sds.consultas.listar();
  const sdDaVitrine = sds.find((sd) => sd.avId === vitrine.avId) ?? null;
  const projetoDaVitrine = sdDaVitrine?.cronogramaId ?? null;
  if (projetoDaVitrine) await m.tarefas.apresentacao.semearProjetoDeVitrine(projetoDaVitrine, responsavelPorArea, hoje);

  // Prazos das áreas: um atrasado e um vencendo hoje, e os avisos que o sino receberia na rotina horária.
  await m.avs.apresentacao.ajustarPrazosDeExemplo(hoje);
  await m.avs.rotinas.verificarPrazosDasAreas();

  const avs = await m.avs.apresentacao.listar();
  const naEtapa = (etapa: number) => avs.find((av) => av.etapa === etapa)?.id ?? null;
  const projeto = projetoDaVitrine ?? projetoDeExemplo;
  const sdAguardandoAceite = sds.find((sd) => sd.status === 'aberta') ?? null;

  // Sino do apresentador com o que ele "receberia" no dia a dia.
  if (sdAguardandoAceite) {
    await m.notificador.notificar({
      usuarioIds: [apresentador.id],
      tipo: 'sd.aberta',
      titulo: `${sdAguardandoAceite.numero} aguarda o aceite da Engenharia`,
      mensagem: `${sdAguardandoAceite.cliente ?? ''} · ${sdAguardandoAceite.descricao}. Aberta pelo Comercial.`,
      link: `/sds/detalhe/?id=${sdAguardandoAceite.id}`,
    });
  }
  const avProduto = avs.find((av) => av.etapa === 2);
  if (avProduto) {
    await m.notificador.notificar({
      usuarioIds: [apresentador.id],
      tipo: 'av.etapa_liberada',
      titulo: `${avProduto.numero} chegou à sua área: Eng. Produto`,
      mensagem: `${avProduto.descricao}. Etapa atual: Engenharia de Produto.`,
      link: `/avs/detalhe/?id=${avProduto.id}`,
    });
  }

  return {
    avEmProduto: naEtapa(2),
    avNoCusto: naEtapa(5),
    avNaProposta: naEtapa(6),
    sdComComercial: sds.find((sd) => sd.status === 'pre_sd')?.id ?? null,
    sdAguardandoAceite: sdAguardandoAceite?.id ?? null,
    projeto,
  };
}

/**
 * Reinicia o app entrando ou saindo do modo apresentação. No executável portátil reinicia pelo .exe
 * original (o app roda descompactado numa pasta temporária que o lançador apaga ao fechar).
 */
function reiniciar(ativar: boolean): void {
  const argumentos = process.argv.slice(1).filter((arg) => arg !== ARGUMENTO_MODO_APRESENTACAO);
  if (ativar) argumentos.push(ARGUMENTO_MODO_APRESENTACAO);
  const executavelPortatil = process.env.PORTABLE_EXECUTABLE_FILE;
  app.releaseSingleInstanceLock();
  app.relaunch(executavelPortatil ? { execPath: executavelPortatil, args: argumentos } : { args: argumentos });
  // Dá tempo de a resposta do IPC chegar à tela antes de fechar.
  setTimeout(() => app.exit(0), 150);
}

/** Canais do modo apresentação: estado (para a tela) e entrar/sair (reinicia o app). */
export function registrarIpcApresentacao(ipc: RegistradorIpc, roteiro: RoteiroDaApresentacaoDTO | null): void {
  ipc.registrar(CANAIS.apresentacao.obterEstado, 'publico', esquemaSemEntrada, async (): Promise<EstadoApresentacaoDTO> => ({
    ativo: ehModoApresentacao(),
    roteiro,
  }));
  // Qualquer usuário logado pode entrar (serve de tutorial): o modo abre só o banco fictício da pasta local e
  // nunca toca nos dados reais. Lá dentro a pessoa é o administrador "Apresentação" do banco fictício.
  ipc.registrar(CANAIS.apresentacao.entrar, 'leitura', esquemaSemEntrada, async () => {
    reiniciar(true);
    return null;
  });
  ipc.registrar(CANAIS.apresentacao.sair, 'leitura', esquemaSemEntrada, async () => {
    if (ehModoApresentacao()) reiniciar(false);
    return null;
  });
}
