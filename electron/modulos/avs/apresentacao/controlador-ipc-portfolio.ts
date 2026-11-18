import { z } from 'zod';
import { TIPOS_NO_ESTRUTURA } from '@contratos/avs.contrato';
import { CANAIS } from '@contratos/canais';
import { AREAS_DE_CHECAGEM, RESULTADOS_DE_CHECAGEM } from '@contratos/portfolio.contrato';
import { esquemaId } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type {
  AbrirDesenhoPortfolio,
  AnexarDesenhoPortfolio,
  ConcluirAvPortfolio,
  DefinirAtivoItemPortfolio,
  ExcluirDesenhoPortfolio,
  ListarItensPortfolio,
  ObterConteudoDesenhoPortfolio,
  ObterItemPortfolio,
  ObterPortfolioDaAv,
  SalvarChecagemPortfolio,
  SalvarItemPortfolio,
} from '../aplicacao/casos-de-uso/portfolio';

export interface CasosDeUsoPortfolio {
  listarItens: ListarItensPortfolio;
  obterItem: ObterItemPortfolio;
  salvarItem: SalvarItemPortfolio;
  definirAtivo: DefinirAtivoItemPortfolio;
  anexarDesenho: AnexarDesenhoPortfolio;
  excluirDesenho: ExcluirDesenhoPortfolio;
  obterConteudoDesenho: ObterConteudoDesenhoPortfolio;
  abrirDesenho: AbrirDesenhoPortfolio;
  obterDaAv: ObterPortfolioDaAv;
  salvarChecagem: SalvarChecagemPortfolio;
  concluirAv: ConcluirAvPortfolio;
}

const custo = z.number().min(0).nullable();
const esquemaCustos = z.object({ materiaPrima: custo, insumos: custo, embalagem: custo, processo: custo });

/**
 * Canais da AV de Item de Portfólio. Consultar é para qualquer pessoa logada; o cadastro de itens exige
 * "planejamento" (gestor e administrador); as checagens seguem a permissão por área da AV.
 */
export function registrarIpcPortfolio(ipc: RegistradorIpc, casos: CasosDeUsoPortfolio): void {
  ipc.registrar(
    CANAIS.portfolio.listarItens,
    'leitura',
    z.object({ apenasAtivos: z.boolean().optional() }).optional(),
    (filtro) => casos.listarItens.executar(filtro),
  );
  ipc.registrar(CANAIS.portfolio.obterItem, 'leitura', esquemaId, (id) => casos.obterItem.executar(id));
  ipc.registrar(
    CANAIS.portfolio.salvarItem,
    'planejamento',
    z.object({
      id: z.string().min(1).nullish(),
      codigo: z.string().max(60),
      descricao: z.string().max(200),
      cliente: z.string().max(200).nullish(),
      linha: z.string().max(100).nullish(),
      familia: z.string().max(100).nullish(),
      programa: z.string().max(100).nullish(),
      revisaoDesenho: z.string().max(30).nullish(),
      observacoes: z.string().max(2000).nullish(),
      custos: esquemaCustos,
      custosAtualizadosEm: z.string().nullish(),
      estrutura: z
        .array(
          z.object({
            chave: z.string().min(1).max(100),
            paiChave: z.string().max(100).nullable(),
            tipo: z.enum(TIPOS_NO_ESTRUTURA),
            codigo: z.string().nullish(),
            descricao: z.string(),
            quantidade: z.number().nullish(),
            unidade: z.string().nullish(),
            pecasPorEmbalagem: z.number().int().min(1).max(10_000_000).nullish(),
          }),
        )
        .max(500),
      operacoes: z
        .array(z.object({ descricao: z.string(), maquina: z.string().nullish(), pecasHora: z.number().min(0).nullish() }))
        .max(100),
    }),
    (entrada) => casos.salvarItem.executar(entrada),
  );
  ipc.registrar(
    CANAIS.portfolio.definirAtivo,
    'planejamento',
    z.object({ id: esquemaId, ativo: z.boolean() }),
    (entrada) => casos.definirAtivo.executar(entrada),
  );
  ipc.registrar(CANAIS.portfolio.anexarDesenho, 'planejamento', esquemaId, (id) => casos.anexarDesenho.executar(id));
  ipc.registrar(CANAIS.portfolio.excluirDesenho, 'planejamento', esquemaId, (id) => casos.excluirDesenho.executar(id));
  ipc.registrar(CANAIS.portfolio.obterConteudoDesenho, 'leitura', esquemaId, (id) =>
    casos.obterConteudoDesenho.executar(id),
  );
  ipc.registrar(CANAIS.portfolio.abrirDesenho, 'leitura', esquemaId, (id) => casos.abrirDesenho.executar(id));
  ipc.registrar(CANAIS.portfolio.obterDaAv, 'leitura', esquemaId, (avId) => casos.obterDaAv.executar(avId));
  ipc.registrar(
    CANAIS.portfolio.salvarChecagem,
    'tarefas',
    z.object({
      avId: esquemaId,
      area: z.enum(AREAS_DE_CHECAGEM),
      resultado: z.enum(RESULTADOS_DE_CHECAGEM),
      observacao: z.string().max(2000).nullish(),
      custosNovos: esquemaCustos.optional(),
    }),
    (entrada) => casos.salvarChecagem.executar(entrada),
  );
  ipc.registrar(
    CANAIS.portfolio.concluirAv,
    'tarefas',
    z.object({ avId: esquemaId, comentario: z.string().max(500).nullish() }),
    (entrada) => casos.concluirAv.executar(entrada),
  );
}
