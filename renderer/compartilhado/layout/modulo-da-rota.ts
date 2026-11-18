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

/** Páginas de lista de cada módulo (com a barra final do `trailingSlash`). Só nelas aparece a faixa de módulos. */
export const ROTAS_DE_LISTA: Readonly<Record<ModuloApp, string>> = {
  avs: '/avs/',
  sds: '/sds/',
  projetos: '/projetos/',
};

/**
 * Diz se a rota é a lista de um módulo. A comparação é exata: o detalhe (`/avs/detalhe/`) e as telas
 * auxiliares (`/avs/relatorios/`) não contam como lista.
 * @param rota caminho atual (`usePathname`)
 * @returns `true` só para `/avs/`, `/sds/` e `/projetos/` (com ou sem a barra final)
 */
export function ehRotaDeLista(rota: string): boolean {
  const normalizada = rota.endsWith('/') ? rota : `${rota}/`;
  return Object.values(ROTAS_DE_LISTA).includes(normalizada);
}
