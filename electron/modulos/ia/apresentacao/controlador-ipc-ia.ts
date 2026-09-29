import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { LIMITE_DE_MENSAGENS_DO_CHAT, MODELOS_IA } from '@contratos/ia.contrato';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { AnalisarAvs, ConversarSobreAvs, UltimaAnaliseAvs } from '../aplicacao/casos-de-uso-avs';
import type {
  AnalisarCronograma,
  AnalisarPortfolio,
  ConfigurarIa,
  ConversarComIa,
  ObterEstadoIa,
  RemoverChaveIa,
} from '../aplicacao/casos-de-uso';
import type {
  ExcluirAnalise,
  ListarAnalises,
  ObterAnalise,
  UltimaAnalise,
} from '../aplicacao/casos-de-uso-arquivo';
import type {
  ObterInstrucoesIa,
  RestaurarChecklistIa,
  SalvarInstrucoesIa,
} from '../aplicacao/casos-de-uso-instrucoes';

export interface CasosDeUsoIa {
  estado: ObterEstadoIa;
  configurar: ConfigurarIa;
  removerChave: RemoverChaveIa;
  analisar: AnalisarCronograma;
  analisarPortfolio: AnalisarPortfolio;
  conversar: ConversarComIa;
  obterInstrucoes: ObterInstrucoesIa;
  salvarInstrucoes: SalvarInstrucoesIa;
  restaurarChecklist: RestaurarChecklistIa;
  // IA do módulo de AVs
  estadoAvs: ObterEstadoIa;
  configurarAvs: ConfigurarIa;
  removerChaveAvs: RemoverChaveIa;
  analisarAvs: AnalisarAvs;
  ultimaAnaliseAvs: UltimaAnaliseAvs;
  conversarAvs: ConversarSobreAvs;
  obterInstrucoesAvs: ObterInstrucoesIa;
  salvarInstrucoesAvs: SalvarInstrucoesIa;
  restaurarChecklistAvs: RestaurarChecklistIa;
  listarAnalises: ListarAnalises;
  obterAnalise: ObterAnalise;
  ultimaAnalise: UltimaAnalise;
  excluirAnalise: ExcluirAnalise;
}

const esquemaUltimaAnalise = z.object({ cronogramaId: esquemaId.nullable() });

const esquemaConfigurar = z.object({
  chave: z.string().max(400).optional(),
  modelo: z.enum(MODELOS_IA),
});

// Além do limite por pergunta (validado no caso de uso), barra respostas absurdas da IA no histórico.
const esquemaConversar = z.object({
  mensagens: z
    .array(z.object({ papel: z.enum(['usuario', 'ia']), texto: z.string().max(50000) }))
    .min(1)
    .max(LIMITE_DE_MENSAGENS_DO_CHAT * 2),
});

// Limites de tamanho reais ficam no caso de uso; aqui só se barra lixo grosseiro.
const esquemaSalvarInstrucoes = z.object({
  checklist: z.array(z.object({ texto: z.string().max(2000), ativo: z.boolean() })).max(200),
  orientacoes: z.string().max(20000),
});

export function registrarIpcIa(ipc: RegistradorIpc, casos: CasosDeUsoIa): void {
  ipc.registrar(CANAIS.ia.estado, 'leitura', esquemaSemEntrada, () => casos.estado.executar());
  // Qualquer perfil que veja o cronograma pode pedir a análise (decisão do produto).
  ipc.registrar(CANAIS.ia.analisar, 'leitura', esquemaId, (cronogramaId) =>
    casos.analisar.executar(cronogramaId),
  );
  ipc.registrar(CANAIS.ia.analisarPortfolio, 'leitura', esquemaSemEntrada, () =>
    casos.analisarPortfolio.executar(),
  );
  // Como as análises, o chat só lê e fica liberado a quem pode ver os cronogramas.
  ipc.registrar(CANAIS.ia.conversar, 'leitura', esquemaConversar, (entrada) =>
    casos.conversar.executar(entrada),
  );
  // A chave e o modelo afetam todos os usuários (e a conta da API): só administrador.
  ipc.registrar(CANAIS.ia.configurar, 'administracao', esquemaConfigurar, (entrada) =>
    casos.configurar.executar(entrada),
  );
  ipc.registrar(CANAIS.ia.removerChave, 'administracao', esquemaSemEntrada, () =>
    casos.removerChave.executar(),
  );
  // O arquivo é de todos que podem pedir análises; apagar fica com quem planeja.
  ipc.registrar(CANAIS.ia.listarAnalises, 'leitura', esquemaSemEntrada, () =>
    casos.listarAnalises.executar(),
  );
  ipc.registrar(CANAIS.ia.obterAnalise, 'leitura', esquemaId, (id) => casos.obterAnalise.executar(id));
  ipc.registrar(CANAIS.ia.ultimaAnalise, 'leitura', esquemaUltimaAnalise, (entrada) =>
    casos.ultimaAnalise.executar(entrada),
  );
  ipc.registrar(CANAIS.ia.excluirAnalise, 'planejamento', esquemaId, (id) =>
    casos.excluirAnalise.executar(id),
  );
  // O que a IA verifica é decisão de quem planeja: administrador e gestor.
  ipc.registrar(CANAIS.ia.obterInstrucoes, 'planejamento', esquemaSemEntrada, () =>
    casos.obterInstrucoes.executar(),
  );
  ipc.registrar(CANAIS.ia.salvarInstrucoes, 'planejamento', esquemaSalvarInstrucoes, (entrada) =>
    casos.salvarInstrucoes.executar(entrada),
  );
  ipc.registrar(CANAIS.ia.restaurarChecklist, 'planejamento', esquemaSemEntrada, () =>
    casos.restaurarChecklist.executar(),
  );
  // IA do módulo de AVs: mesmas permissões dos equivalentes de projetos.
  ipc.registrar(CANAIS.ia.estadoAvs, 'leitura', esquemaSemEntrada, () => casos.estadoAvs.executar());
  ipc.registrar(CANAIS.ia.configurarAvs, 'administracao', esquemaConfigurar, (entrada) =>
    casos.configurarAvs.executar(entrada),
  );
  ipc.registrar(CANAIS.ia.removerChaveAvs, 'administracao', esquemaSemEntrada, () =>
    casos.removerChaveAvs.executar(),
  );
  ipc.registrar(CANAIS.ia.analisarAvs, 'leitura', esquemaSemEntrada, () => casos.analisarAvs.executar());
  ipc.registrar(CANAIS.ia.ultimaAnaliseAvs, 'leitura', esquemaSemEntrada, () =>
    casos.ultimaAnaliseAvs.executar(),
  );
  ipc.registrar(CANAIS.ia.conversarAvs, 'leitura', esquemaConversar, (entrada) =>
    casos.conversarAvs.executar(entrada),
  );
  ipc.registrar(CANAIS.ia.obterInstrucoesAvs, 'planejamento', esquemaSemEntrada, () =>
    casos.obterInstrucoesAvs.executar(),
  );
  ipc.registrar(CANAIS.ia.salvarInstrucoesAvs, 'planejamento', esquemaSalvarInstrucoes, (entrada) =>
    casos.salvarInstrucoesAvs.executar(entrada),
  );
  ipc.registrar(CANAIS.ia.restaurarChecklistAvs, 'planejamento', esquemaSemEntrada, () =>
    casos.restaurarChecklistAvs.executar(),
  );
}
