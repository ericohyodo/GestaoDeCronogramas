import type { ItemDaPropostaDTO, PropostaDeAlteracaoDTO } from '@contratos/ia.contrato';
import type { EstadoEsperadoDaTarefaDTO, LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import { ehDataValida } from '../../../nucleo/dominio/periodo';
import type {
  ConsultaDeCronograma,
  ConsultaDeEstrutura,
  ConsultaDeRecursos,
  EditorDeCronogramas,
  EsquemasDoAgente,
  FerramentaDoChat,
  PermissoesDeQuemUsa,
  PropostaGuardada,
  QuemEstaUsando,
  RepositorioDePropostas,
} from './portas';

// =====================================================================================================
// Agente do Chat com IA (Projetos). A IA consulta um cronograma com ids (ver_cronograma) e registra uma
// proposta de alterações (propor_alteracoes). Nada é gravado no cronograma aqui: a pessoa vê a lista no
// chat e decide. "Aplicar" passa pelo módulo de Tarefas, numa transação, com as mesmas regras da tela.
// =====================================================================================================

export interface DependenciasDoAgente {
  consultaDeCronograma: ConsultaDeCronograma;
  consultaDeEstrutura: ConsultaDeEstrutura;
  recursos: ConsultaDeRecursos;
  propostas: RepositorioDePropostas;
  editor: EditorDeCronogramas;
  permissoes: PermissoesDeQuemUsa;
  /** Esquemas e validação das entradas das ferramentas (a entrada vem do modelo). */
  esquemas: EsquemasDoAgente;
  quemEstaUsando: QuemEstaUsando;
  geradorDeId: GeradorDeId;
  relogio: Relogio;
}

// -----------------------------------------------------------------------------------------------------
// Formatação para o cartão da proposta
// -----------------------------------------------------------------------------------------------------

/** "2026-08-01" → "01/08/2026". */
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const periodoBr = (inicio: string, fim: string) => `${dataBr(inicio)} → ${dataBr(fim)}`;
const ROTULO_SITUACAO: Record<string, string> = { pendente: 'pendente', em_andamento: 'em andamento', concluida: 'concluída' };
const tarefaBr = (linha: LinhaEstruturaDTO) => `${linha.numero} ${linha.titulo}`;
const hojeLocal = (relogio: Relogio) => relogio.agora().toLocaleDateString('sv-SE');

/** Converte a proposta guardada no formato da tela. */
export function paraPropostaDTO(proposta: PropostaGuardada): PropostaDeAlteracaoDTO {
  return {
    id: proposta.id,
    cronogramaId: proposta.cronogramaId,
    cronogramaNome: proposta.cronogramaNome,
    resumo: proposta.resumo,
    itens: proposta.itens,
    situacao: proposta.situacao,
    criadaEm: proposta.criadaEm.toISOString(),
    decididaEm: proposta.decididaEm?.toISOString() ?? null,
    motivo: proposta.motivo,
  };
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const erro = (conteudo: string) => ({ conteudo, erro: true });

// -----------------------------------------------------------------------------------------------------
// O agente de um turno do chat
// -----------------------------------------------------------------------------------------------------

/**
 * Ferramentas de um turno do chat. Guarda a proposta registrada no turno (a última vale; uma anterior do
 * mesmo turno é descartada).
 */
export class AgenteDeCronogramas {
  private proposta: PropostaGuardada | null = null;

  constructor(
    private readonly deps: DependenciasDoAgente,
    private readonly usuarioId: string,
  ) {}

  get propostaDoTurno(): PropostaGuardada | null {
    return this.proposta;
  }

  ferramentas(): FerramentaDoChat[] {
    return [
      {
        nome: 'ver_cronograma',
        descricao:
          'Abre um projeto ativo com os ids das fases, tarefas e recursos. Use antes de propor alterações: os ' +
          'ids não aparecem nos dados resumidos.',
        esquema: this.deps.esquemas.verCronograma.jsonSchema,
        executar: (entrada) => this.verCronograma(entrada),
      },
      {
        nome: 'propor_alteracoes',
        descricao:
          'Registra UMA proposta com todas as alterações pedidas num projeto. Nada é gravado: a pessoa vê a ' +
          'lista e clica em Aplicar ou Descartar. Se houver erro, corrija e chame de novo.',
        esquema: this.deps.esquemas.proporAlteracoes.jsonSchema,
        executar: (entrada) => this.propor(entrada),
      },
    ];
  }

  // -------------------------------------------------------------------------------------------------
  // ver_cronograma
  // -------------------------------------------------------------------------------------------------

  private async projetosAtivos() {
    const projetos = [];
    for (const projetoId of await this.deps.consultaDeCronograma.listarIdsAtivos()) {
      const resumo = await this.deps.consultaDeCronograma.obterResumo(projetoId);
      if (resumo) projetos.push({ id: projetoId, ...resumo });
    }
    return projetos;
  }

  private async verCronograma(entrada: unknown) {
    const lido = this.deps.esquemas.verCronograma.ler(entrada);
    if (!lido.ok) return erro(`Entrada inválida: ${lido.erro}. Informe o nome ou o código do projeto em "projeto".`);

    const procurado = normalizar(lido.dados.projeto);
    const projetos = await this.projetosAtivos();
    const exatos = projetos.filter((p) => normalizar(p.nome) === procurado || (p.codigo && normalizar(p.codigo) === procurado));
    const parecidos = projetos.filter((p) => normalizar(p.nome).includes(procurado) || (p.codigo && normalizar(p.codigo).includes(procurado)));
    const encontrados = exatos.length > 0 ? exatos : parecidos;
    if (encontrados.length !== 1) {
      const nomes = (encontrados.length > 1 ? encontrados : projetos).map((p) => (p.codigo ? `${p.codigo} — ${p.nome}` : p.nome));
      return erro(
        `${encontrados.length > 1 ? 'Mais de um projeto' : 'Nenhum projeto ativo'} corresponde a "${lido.dados.projeto}". ` +
          `Projetos ativos: ${nomes.join('; ') || 'nenhum'}. Pergunte à pessoa qual é, se não estiver claro.`,
      );
    }

    const projeto = encontrados[0]!;
    const [estrutura, recursos] = await Promise.all([
      this.deps.consultaDeEstrutura.obterEstrutura(projeto.id),
      this.deps.recursos.listar(),
    ]);
    const numeroPorId = new Map(estrutura.linhas.map((linha) => [linha.id, linha.numero]));
    return {
      conteudo: JSON.stringify({
        hoje: hojeLocal(this.deps.relogio),
        projeto: { id: projeto.id, nome: projeto.nome, codigo: projeto.codigo ?? null, inicio: projeto.dataInicio, fim: projeto.dataFim },
        fases: estrutura.linhas
          .filter((linha) => linha.tipo === 'fase')
          .map((linha) => ({ id: linha.id, numero: linha.numero, titulo: linha.titulo, inicio: linha.dataInicio, fim: linha.dataFim })),
        tarefas: estrutura.linhas
          .filter((linha) => linha.tipo === 'tarefa')
          .map((linha) => ({
            id: linha.id,
            numero: linha.numero,
            faseId: linha.faseId,
            titulo: linha.titulo,
            inicio: linha.dataInicio,
            fim: linha.dataFim,
            pct: linha.percentualConcluido,
            situacao: linha.situacao,
            efetiva: linha.dataEfetiva,
            responsavel: linha.responsavelNome,
            predecessoras: linha.dependencias.map((dep) => numeroPorId.get(dep) ?? dep),
          })),
        recursos,
      }),
    };
  }

  // -------------------------------------------------------------------------------------------------
  // propor_alteracoes
  // -------------------------------------------------------------------------------------------------

  private async propor(entrada: unknown) {
    const lido = this.deps.esquemas.proporAlteracoes.ler(entrada);
    if (!lido.ok) return erro(`Entrada inválida: ${lido.erro}`);
    const { projetoId, resumo, alteracoes } = lido.dados;

    const ativos = new Set(await this.deps.consultaDeCronograma.listarIdsAtivos());
    const projeto = ativos.has(projetoId) ? await this.deps.consultaDeCronograma.obterResumo(projetoId) : null;
    if (!projeto) return erro('Projeto não encontrado entre os ativos. Use o id devolvido por ver_cronograma.');

    const [estrutura, recursos] = await Promise.all([
      this.deps.consultaDeEstrutura.obterEstrutura(projetoId),
      this.deps.recursos.listar(),
    ]);
    const tarefas = new Map(estrutura.linhas.filter((l) => l.tipo === 'tarefa').map((l) => [l.id, l]));
    const fases = new Map(estrutura.linhas.filter((l) => l.tipo === 'fase').map((l) => [l.id, l]));
    const nomesDosRecursos = new Map(recursos.map((r) => [r.id, r.nome]));
    const hoje = hojeLocal(this.deps.relogio);

    const problemas: string[] = [];
    const itens: ItemDaPropostaDTO[] = [];
    const usadas = new Set<string>();

    const tarefa = (indice: number, tarefaId: string) => {
      const linha = tarefas.get(tarefaId);
      if (!linha) problemas.push(`Alteração ${indice + 1}: tarefa "${tarefaId}" não existe neste projeto.`);
      else usadas.add(tarefaId);
      return linha;
    };
    const conferirPeriodo = (indice: number, inicio: string, fim: string) => {
      if (!ehDataValida(inicio) || !ehDataValida(fim)) problemas.push(`Alteração ${indice + 1}: datas devem ser AAAA-MM-DD válidas.`);
      else if (fim < inicio) problemas.push(`Alteração ${indice + 1}: o término (${fim}) é anterior ao início (${inicio}).`);
    };

    alteracoes.forEach((operacao, indice) => {
      switch (operacao.tipo) {
        case 'concluir_tarefa': {
          const linha = tarefa(indice, operacao.tarefaId);
          if (operacao.dataEfetiva && !ehDataValida(operacao.dataEfetiva)) {
            problemas.push(`Alteração ${indice + 1}: data efetiva inválida (use AAAA-MM-DD).`);
          }
          if (linha) {
            itens.push({
              descricao: `Dar baixa em "${tarefaBr(linha)}"`,
              antes: `${linha.percentualConcluido}% · ${ROTULO_SITUACAO[linha.situacao ?? ''] ?? '-'}`,
              depois: `100% · concluída em ${dataBr(operacao.dataEfetiva ?? hoje)}`,
            });
          }
          return;
        }
        case 'atualizar_progresso': {
          const linha = tarefa(indice, operacao.tarefaId);
          if (linha) {
            itens.push({ descricao: `Progresso de "${tarefaBr(linha)}"`, antes: `${linha.percentualConcluido}%`, depois: `${operacao.percentual}%` });
          }
          return;
        }
        case 'ajustar_datas': {
          const linha = tarefa(indice, operacao.tarefaId);
          conferirPeriodo(indice, operacao.dataInicio, operacao.dataFim);
          if (linha && linha.dataInicio && linha.dataFim) {
            itens.push({
              descricao: `Datas de "${tarefaBr(linha)}"`,
              antes: periodoBr(linha.dataInicio, linha.dataFim),
              depois: periodoBr(operacao.dataInicio, operacao.dataFim),
            });
          }
          return;
        }
        case 'criar_tarefa': {
          conferirPeriodo(indice, operacao.dataInicio, operacao.dataFim);
          const apos = operacao.inserirApos ? tarefa(indice, operacao.inserirApos) : null;
          const faseId = apos ? apos.faseId : operacao.faseId;
          const fase = faseId ? fases.get(faseId) : null;
          if (faseId && !fase) problemas.push(`Alteração ${indice + 1}: fase "${faseId}" não existe neste projeto.`);
          if (operacao.responsavelId && !nomesDosRecursos.has(operacao.responsavelId)) {
            problemas.push(`Alteração ${indice + 1}: responsável "${operacao.responsavelId}" não está na lista de recursos.`);
          }
          const onde = apos ? `logo após "${tarefaBr(apos)}"` : fase ? `no fim da fase "${tarefaBr(fase)}"` : 'fora de fases';
          const responsavel = operacao.responsavelId ? nomesDosRecursos.get(operacao.responsavelId) : null;
          itens.push({
            descricao: `Nova tarefa "${operacao.titulo}" ${onde}`,
            antes: null,
            depois: `${periodoBr(operacao.dataInicio, operacao.dataFim)}${responsavel ? ` · ${responsavel}` : ''}`,
          });
          return;
        }
        case 'ordenar_fase_por_data': {
          const fase = fases.get(operacao.faseId);
          if (!fase) {
            problemas.push(`Alteração ${indice + 1}: fase "${operacao.faseId}" não existe neste projeto.`);
            return;
          }
          const daFase = estrutura.linhas.filter((l) => l.tipo === 'tarefa' && l.faseId === operacao.faseId);
          const ordenadas = [...daFase].sort(
            (a, b) => (a.dataInicio ?? '').localeCompare(b.dataInicio ?? '') || (a.dataFim ?? '').localeCompare(b.dataFim ?? ''),
          );
          const titulos = (linhas: LinhaEstruturaDTO[]) =>
            linhas
              .slice(0, 6)
              .map((l) => l.titulo)
              .join(' · ') + (linhas.length > 6 ? ' …' : '');
          itens.push({
            descricao: `Ordenar por data as tarefas da fase "${tarefaBr(fase)}"`,
            antes: titulos(daFase),
            depois: `${titulos(ordenadas)} (as tarefas criadas nesta proposta entram na ordem pela data)`,
          });
          return;
        }
      }
    });

    if (problemas.length > 0) return erro(`Nada foi registrado. Corrija e chame de novo:\n- ${problemas.join('\n- ')}`);

    const esperado: EstadoEsperadoDaTarefaDTO[] = [...usadas].map((tarefaId) => {
      const linha = tarefas.get(tarefaId)!;
      return {
        tarefaId,
        titulo: tarefaBr(linha),
        faseId: linha.faseId,
        dataInicio: linha.dataInicio ?? '',
        dataFim: linha.dataFim ?? '',
        percentualConcluido: linha.percentualConcluido,
        situacao: linha.situacao ?? 'pendente',
      };
    });

    const agora = this.deps.relogio.agora();
    if (this.proposta) {
      await this.deps.propostas.salvar({
        ...this.proposta,
        situacao: 'descartada',
        decididaEm: agora,
        motivo: 'Substituída por outra proposta na mesma resposta.',
      });
    }
    this.proposta = {
      id: this.deps.geradorDeId.gerar(),
      usuarioId: this.usuarioId,
      cronogramaId: projetoId,
      cronogramaNome: projeto.codigo ? `${projeto.codigo} — ${projeto.nome}` : projeto.nome,
      resumo,
      operacoes: alteracoes,
      esperado,
      itens,
      situacao: 'pendente',
      criadaEm: agora,
      decididaEm: null,
      motivo: null,
    };
    await this.deps.propostas.salvar(this.proposta);
    return {
      conteudo:
        `Proposta registrada com ${itens.length} alteração(ões). Ela aparece para a pessoa como um cartão com ` +
        'Aplicar e Descartar. Explique em poucas linhas o que propôs; não diga que já foi alterado.',
    };
  }
}

// -----------------------------------------------------------------------------------------------------
// Decisão da pessoa: Aplicar ou Descartar
// -----------------------------------------------------------------------------------------------------

type DependenciasDaDecisao = Pick<DependenciasDoAgente, 'propostas' | 'editor' | 'permissoes' | 'quemEstaUsando' | 'relogio'>;

async function propostaPendente(deps: DependenciasDaDecisao, propostaId: string): Promise<PropostaGuardada> {
  const usuario = await deps.quemEstaUsando.perfilDoUsuarioAtual?.();
  if (!usuario) throw new ErroDeDominio('NAO_AUTENTICADO', 'Faça login para continuar.');
  const proposta = await deps.propostas.obter(propostaId, usuario.id);
  if (!proposta) throw new ErroDeDominio('PROPOSTA_NAO_ENCONTRADA', 'Esta proposta não existe mais.');
  if (proposta.situacao !== 'pendente') {
    throw new ErroDeDominio('PROPOSTA_JA_DECIDIDA', 'Esta proposta já foi decidida.');
  }
  return proposta;
}

/** Aplica a proposta (só quem a pediu, com permissão de editar tarefas). */
export class AplicarProposta implements CasoDeUso<string, PropostaDeAlteracaoDTO> {
  constructor(private readonly deps: DependenciasDaDecisao) {}

  async executar(propostaId: string): Promise<PropostaDeAlteracaoDTO> {
    if (!this.deps.permissoes.podeEditarTarefas()) {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Seu perfil não pode alterar tarefas.');
    }
    const proposta = await propostaPendente(this.deps, propostaId);
    try {
      await this.deps.editor.aplicarAlteracoes({
        cronogramaId: proposta.cronogramaId,
        operacoes: proposta.operacoes,
        esperado: proposta.esperado,
      });
    } catch (falha) {
      if (falha instanceof ErroDeDominio && falha.codigo === 'PROPOSTA_DESATUALIZADA') {
        await this.deps.propostas.salvar({
          ...proposta,
          situacao: 'desatualizada',
          decididaEm: this.deps.relogio.agora(),
          motivo: falha.message,
        });
      }
      throw falha;
    }
    const aplicada: PropostaGuardada = { ...proposta, situacao: 'aplicada', decididaEm: this.deps.relogio.agora() };
    await this.deps.propostas.salvar(aplicada);
    return paraPropostaDTO(aplicada);
  }
}

export class DescartarProposta implements CasoDeUso<string, PropostaDeAlteracaoDTO> {
  constructor(private readonly deps: DependenciasDaDecisao) {}

  async executar(propostaId: string): Promise<PropostaDeAlteracaoDTO> {
    const proposta = await propostaPendente(this.deps, propostaId);
    const descartada: PropostaGuardada = { ...proposta, situacao: 'descartada', decididaEm: this.deps.relogio.agora() };
    await this.deps.propostas.salvar(descartada);
    return paraPropostaDTO(descartada);
  }
}
