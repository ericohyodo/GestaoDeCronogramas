export type ModuloApp = 'projetos' | 'avs' | 'sds';

// Relatórios, análises, chat, instruções e configurações da IA de Projetos ficam fora de /projetos, mas são
// só do módulo de Projetos; o de AVs tem as suas próprias telas sob /avs.
const ROTAS_DE_PROJETOS = [
  '/projetos',
  '/cronograma',
  '/recursos',
  '/relatorios',
  '/analises',
  '/chat',
  '/instrucoes-ia',
  '/configuracoes',
];

const correspondeA = (rota: string, prefixo: string) => rota === prefixo || rota.startsWith(`${prefixo}/`);

/**
 * Páginas realmente compartilhadas (hoje, só Usuários) não pertencem a um módulo: o menu é o do último
 * módulo visitado, para que abri-las não "expulse" a pessoa do módulo atual.
 */
export function moduloDaRota(rota: string, anterior: ModuloApp | null): ModuloApp {
  if (correspondeA(rota, '/avs')) return 'avs';
  if (correspondeA(rota, '/sds')) return 'sds';
  if (ROTAS_DE_PROJETOS.some((prefixo) => correspondeA(rota, prefixo))) return 'projetos';
  return anterior ?? 'projetos';
}
