import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { Periodo } from '../../../nucleo/dominio/periodo';
import { Fase } from '../dominio/fase';
import type { RepositorioFases } from '../dominio/repositorio-fases';
import type { RepositorioTarefas } from '../dominio/repositorio-tarefas';
import { Tarefa } from '../dominio/tarefa';

/** Soma dias a uma data AAAA-MM-DD. */
const somar = (iso: string, dias: number) => {
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
};

// [fase, tarefa, início (dias após o início do projeto), duração, % concluído, predecessora (índice)]
const ROTEIRO: [string, string, number, number, number, number | null][] = [
  ['Kick-off e planejamento', 'Reunião de kick-off com o cliente', -30, 2, 100, null],
  ['Kick-off e planejamento', 'Plano do projeto e cronograma macro', -28, 5, 100, 0],
  ['Engenharia de produto', 'Desenhos 2D/3D liberados', -22, 10, 100, 1],
  ['Engenharia de produto', 'Análise de tolerâncias', -12, 6, 80, 2],
  ['Engenharia de processo', 'Projeto do ferramental', -10, 15, 40, 2],
  ['Engenharia de processo', 'Fabricação do ferramental', 3, 20, 0, 4],
  ['Engenharia de processo', 'Try-out do ferramental', 24, 4, 0, 5],
  ['Validação', 'Amostras para o cliente (PPAP)', 29, 8, 0, 6],
  ['Validação', 'Aprovação do cliente', 38, 5, 0, 7],
  ['Produção', 'Lote piloto', 44, 6, 0, 8],
  ['Produção', 'Início de produção (SOP)', 51, 1, 0, 9],
];

// Projeto de vitrine: cada tarefa tem a área de quem a executa; o responsável vem da equipe da AV.
export type AreaDaVitrine = 'comercial' | 'produto' | 'processo' | 'pcp' | 'custo' | 'gestao' | 'qualidade';

// [fase, tarefa, início (dias a partir de hoje), duração, % concluído, predecessora (índice), área]
const ROTEIRO_VITRINE: [string, string, number, number, number, number | null, AreaDaVitrine][] = [
  ['Kick-off e planejamento (APQP)', 'Reunião de kick-off interno e com o cliente', -45, 2, 100, null, 'gestao'],
  ['Kick-off e planejamento (APQP)', 'Plano do projeto e cronograma APQP', -43, 4, 100, 0, 'gestao'],
  ['Kick-off e planejamento (APQP)', 'Revisão do contrato e requisitos específicos do cliente', -42, 5, 100, 0, 'comercial'],
  ['Engenharia de produto', 'Análise dos desenhos rev. C e viabilidade técnica', -38, 6, 100, 1, 'produto'],
  ['Engenharia de produto', 'DFMEA e características especiais (SC)', -32, 8, 100, 3, 'produto'],
  ['Engenharia de produto', 'Análise de tolerâncias da furação do coxim', -24, 7, 100, 4, 'produto'],
  ['Engenharia de produto', 'Protótipos (ferramenta provisória) e ensaio de fadiga', -17, 20, 75, 5, 'produto'],
  ['Engenharia de processo', 'Fluxograma e PFMEA do processo', -24, 10, 100, 4, 'processo'],
  ['Engenharia de processo', 'Projeto do ferramental progressivo', -14, 12, 60, 7, 'processo'],
  ['Engenharia de processo', 'Gabaritos de solda e programação do robô', -10, 15, 40, 7, 'processo'],
  ['Engenharia de processo', 'Plano de controle (protótipo e pré-lançamento)', -6, 10, 20, 7, 'qualidade'],
  ['Ferramental', 'Fabricação do ferramental (fornecedor externo)', 1, 40, 0, 8, 'processo'],
  ['Ferramental', 'Try-out e ajuste do ferramental', 41, 10, 0, 11, 'processo'],
  ['Ferramental', 'Medição 3D e calibração das peças de try-out', 51, 6, 0, 12, 'qualidade'],
  ['Suprimentos, PCP e custos', 'Fechamento do custo e da cotação do ferramental', -30, 10, 100, 2, 'custo'],
  ['Suprimentos, PCP e custos', 'Homologação da usina do aço LNE 380 e das buchas', -20, 25, 70, 3, 'pcp'],
  ['Suprimentos, PCP e custos', 'Carga de máquina e plano do 2º turno na solda', 20, 10, 0, 9, 'pcp'],
  ['Suprimentos, PCP e custos', 'Compra das embalagens KLT e acordo do milk run', 35, 15, 0, 15, 'pcp'],
  ['Validação (PPAP)', 'Run@rate na planta', 60, 2, 0, 13, 'qualidade'],
  ['Validação (PPAP)', 'Amostras e documentação PPAP nível 3', 63, 12, 0, 18, 'qualidade'],
  ['Validação (PPAP)', 'Aprovação PPAP pelo cliente (PSW)', 76, 15, 0, 19, 'comercial'],
  ['Produção e SOP', 'Lote piloto (pré-série)', 92, 10, 0, 20, 'pcp'],
  ['Produção e SOP', 'Início de produção (SOP)', 104, 1, 0, 21, 'gestao'],
  ['Produção e SOP', 'Encerramento do projeto e lições aprendidas', 110, 5, 0, 22, 'gestao'],
];

interface LinhaDoRoteiro {
  fase: string;
  titulo: string;
  inicio: number;
  duracao: number;
  percentual: number;
  predecessora: number | null;
  responsavelId: string | null;
}

interface Repositorios {
  tarefas: RepositorioTarefas;
  fases: RepositorioFases;
  ids: GeradorDeId;
  relogio: Relogio;
}

/**
 * Grava as fases e tarefas de um roteiro (datas relativas a `inicioIso`), com dependências encadeadas.
 * @param linhas tarefas na ordem de exibição; a fase é criada na primeira vez que aparece
 */
async function semearRoteiro(r: Repositorios, cronogramaId: string, inicioIso: string, linhas: LinhaDoRoteiro[]): Promise<void> {
  const agora = r.relogio.agora();
  const faseDoNome = new Map<string, Fase>();
  const criadas: Tarefa[] = [];
  let ordemDaFase = 0;
  const ordemNaFase = new Map<string, number>();

  for (const linha of linhas) {
    let fase = faseDoNome.get(linha.fase);
    if (!fase) {
      ordemDaFase += 1;
      fase = Fase.criar({ id: r.ids.gerar(), cronogramaId, nome: linha.fase, ordem: ordemDaFase, agora });
      await r.fases.salvar(fase);
      faseDoNome.set(linha.fase, fase);
    }
    const ordem = (ordemNaFase.get(fase.id) ?? 0) + 1;
    ordemNaFase.set(fase.id, ordem);
    const tarefa = Tarefa.criar({
      id: r.ids.gerar(),
      cronogramaId,
      faseId: fase.id,
      titulo: linha.titulo,
      periodo: Periodo.criar(somar(inicioIso, linha.inicio), somar(inicioIso, linha.inicio + linha.duracao - 1)),
      responsavelId: linha.responsavelId,
      ordem,
      agora,
    });
    if (linha.percentual > 0) tarefa.registrarProgresso(linha.percentual, agora);
    if (linha.predecessora !== null) tarefa.definirDependencias([criadas[linha.predecessora]!.id], agora);
    criadas.push(tarefa);
  }
  await r.tarefas.salvarVarias(criadas);
}

/**
 * Projeto fictício para o modo apresentação: fases, tarefas encadeadas por dependência, uma tarefa
 * atrasada, uma vencendo e o restante no futuro, com responsáveis em rodízio.
 * @param dados.inicioIso dia de referência ("hoje" da apresentação)
 */
export async function semearProjetoDeExemplo(
  tarefas: RepositorioTarefas,
  fases: RepositorioFases,
  ids: GeradorDeId,
  relogio: Relogio,
  dados: { cronogramaId: string; responsavelIds: string[]; inicioIso: string },
): Promise<void> {
  const linhas = ROTEIRO.map(([fase, titulo, inicio, duracao, percentual, predecessora], indice) => ({
    fase,
    titulo,
    inicio,
    duracao,
    percentual,
    predecessora,
    responsavelId: dados.responsavelIds.length ? dados.responsavelIds[indice % dados.responsavelIds.length]! : null,
  }));
  await semearRoteiro({ tarefas, fases, ids, relogio }, dados.cronogramaId, dados.inicioIso, linhas);
}

/**
 * Projeto da AV de vitrine: 7 fases APQP; o responsável de cada tarefa é o recurso de quem cuida daquela
 * área na equipe da AV (prévia do preenchimento automático de recursos).
 * @param dados.responsavelPorArea recurso de cada área; área sem recurso deixa a tarefa sem responsável
 * @param dados.inicioIso dia de referência ("hoje" da apresentação)
 */
export async function semearProjetoDeVitrine(
  tarefas: RepositorioTarefas,
  fases: RepositorioFases,
  ids: GeradorDeId,
  relogio: Relogio,
  dados: { cronogramaId: string; responsavelPorArea: Partial<Record<AreaDaVitrine, string>>; inicioIso: string },
): Promise<void> {
  const linhas = ROTEIRO_VITRINE.map(([fase, titulo, inicio, duracao, percentual, predecessora, area]) => ({
    fase,
    titulo,
    inicio,
    duracao,
    percentual,
    predecessora,
    responsavelId: dados.responsavelPorArea[area] ?? null,
  }));
  await semearRoteiro({ tarefas, fases, ids, relogio }, dados.cronogramaId, dados.inicioIso, linhas);
}
