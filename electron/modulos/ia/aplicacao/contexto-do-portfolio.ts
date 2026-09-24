import type { EstruturaCronogramaDTO, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import type { ResumoDoCronograma } from './portas';

/**
 * Resumo de cada projeto para a visão de portfólio: indicadores e poucos exemplos, não a lista
 * inteira de tarefas. Mantém o pedido pequeno mesmo com muitos projetos.
 */
export interface ContextoDoPortfolio {
  hoje: string;
  projetos: ProjetoDoPortfolio[];
  responsaveis: CargaDoResponsavel[];
}

interface ProjetoDoPortfolio {
  nome: string;
  situacao: string;
  inicio: string;
  terminoPrevisto: string;
  /** Maior término entre as tarefas; depois do término previsto indica atraso do projeto. */
  fimProjetado: string | null;
  pctConcluido: number;
  tarefas: number;
  concluidas: number;
  atrasadas: number;
  semResponsavel: number;
  atrasadasNoCaminhoCritico: string[];
  fases: { nome: string; fim: string | null; pct: number }[];
  proximasEntregas: { n: string; titulo: string; fim: string; responsavel: string | null }[];
}

interface CargaDoResponsavel {
  responsavel: string;
  projetos: string[];
  tarefasAbertas: number;
  atrasadas: number;
  /** Tarefas em aberto com trabalho nos próximos 14 dias. */
  proximos14Dias: number;
}

const LIMITE_DE_ENTREGAS = 4;
const LIMITE_DE_CRITICAS = 6;

const somarDias = (data: string, dias: number) =>
  new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

export function montarContextoDoPortfolio(
  itens: { resumo: ResumoDoCronograma; estrutura: EstruturaCronogramaDTO }[],
  hoje: string,
): ContextoDoPortfolio {
  const daqui14Dias = somarDias(hoje, 14);
  const cargas = new Map<string, CargaDoResponsavel>();

  const projetos = itens.map(({ resumo, estrutura }) => {
    const tarefas = estrutura.linhas.filter((linha) => linha.tipo === 'tarefa');
    const abertas = tarefas.filter((tarefa) => tarefa.percentualConcluido < 100);
    const atrasada = (tarefa: LinhaEstruturaDTO) => !!tarefa.dataFim && tarefa.dataFim < hoje;

    for (const tarefa of abertas) {
      const nome = tarefa.responsavelNome;
      if (!nome) continue;
      const carga = cargas.get(nome) ?? {
        responsavel: nome,
        projetos: [],
        tarefasAbertas: 0,
        atrasadas: 0,
        proximos14Dias: 0,
      };
      if (!carga.projetos.includes(resumo.nome)) carga.projetos.push(resumo.nome);
      carga.tarefasAbertas += 1;
      if (atrasada(tarefa)) carga.atrasadas += 1;
      if (tarefa.dataInicio && tarefa.dataInicio <= daqui14Dias && (!tarefa.dataFim || tarefa.dataFim >= hoje)) {
        carga.proximos14Dias += 1;
      }
      cargas.set(nome, carga);
    }

    const duracao = tarefas.reduce((soma, tarefa) => soma + tarefa.duracaoEmDias, 0);
    const avanco = tarefas.reduce((soma, tarefa) => soma + tarefa.percentualConcluido * tarefa.duracaoEmDias, 0);

    return {
      nome: resumo.nome,
      situacao: resumo.situacao,
      inicio: resumo.dataInicio,
      terminoPrevisto: resumo.dataFim,
      fimProjetado: tarefas.reduce<string | null>(
        (maior, tarefa) => (tarefa.dataFim && (!maior || tarefa.dataFim > maior) ? tarefa.dataFim : maior),
        null,
      ),
      pctConcluido: duracao > 0 ? Math.round(avanco / duracao) : 0,
      tarefas: tarefas.length,
      concluidas: tarefas.length - abertas.length,
      atrasadas: abertas.filter(atrasada).length,
      semResponsavel: abertas.filter((tarefa) => !tarefa.responsavelNome).length,
      atrasadasNoCaminhoCritico: abertas
        .filter((tarefa) => tarefa.critico && atrasada(tarefa))
        .slice(0, LIMITE_DE_CRITICAS)
        .map((tarefa) => `${tarefa.numero} ${tarefa.titulo}`),
      fases: estrutura.linhas
        .filter((linha) => linha.tipo === 'fase')
        .map((fase) => ({ nome: fase.titulo, fim: fase.dataFim, pct: fase.percentualConcluido })),
      proximasEntregas: abertas
        .filter((tarefa) => tarefa.dataFim && tarefa.dataFim >= hoje)
        .sort((a, b) => a.dataFim!.localeCompare(b.dataFim!))
        .slice(0, LIMITE_DE_ENTREGAS)
        .map((tarefa) => ({
          n: tarefa.numero,
          titulo: tarefa.titulo,
          fim: tarefa.dataFim!,
          responsavel: tarefa.responsavelNome,
        })),
    };
  });

  return {
    hoje,
    projetos,
    responsaveis: [...cargas.values()].sort((a, b) => b.tarefasAbertas - a.tarefasAbertas),
  };
}
