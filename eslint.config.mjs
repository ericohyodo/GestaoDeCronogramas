import { defineConfig, globalIgnores } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

/**
 * Elementos da arquitetura. O plugin `boundaries` classifica cada arquivo pelo primeiro
 * descritor que casar (a ordem importa: do mais específico para o mais genérico) e
 * valida cada import contra as políticas abaixo (padrão: proibido).
 */
const ELEMENTOS = [
  // Contratos IPC: tipos e constantes puras, compartilhados por main, preload e renderer.
  { type: 'contratos', pattern: 'contratos' },

  // Processo principal — shared kernel
  { type: 'nucleo-dominio', pattern: 'electron/nucleo/dominio' },
  { type: 'nucleo-aplicacao', pattern: 'electron/nucleo/aplicacao' },
  { type: 'nucleo-infraestrutura', pattern: 'electron/nucleo/infraestrutura' },

  // Processo principal — camadas de cada módulo (capturam o nome do módulo)
  { type: 'dominio', pattern: 'electron/modulos/*/dominio', capture: ['modulo'] },
  { type: 'aplicacao', pattern: 'electron/modulos/*/aplicacao', capture: ['modulo'] },
  { type: 'infraestrutura', pattern: 'electron/modulos/*/infraestrutura', capture: ['modulo'] },
  { type: 'apresentacao', pattern: 'electron/modulos/*/apresentacao', capture: ['modulo'] },
  // O que sobra na raiz do módulo é a API pública (index.ts).
  { type: 'modulo', pattern: 'electron/modulos/*', capture: ['modulo'] },

  // Processo principal — "casca" do Electron: main, preload, protocolo, janela, raiz de composição.
  { type: 'casca', pattern: 'electron' },

  // Renderer (Next.js)
  { type: 'renderer-app', pattern: 'renderer/app' },
  { type: 'renderer-modulo', pattern: 'renderer/modulos/*', capture: ['modulo'] },
  { type: 'renderer-compartilhado', pattern: 'renderer/compartilhado' },
];

const tipo = (...tipos) => ({ element: { types: { anyOf: tipos } } });
const mesmoModulo = (...tipos) => ({
  element: { types: { anyOf: tipos }, captured: { modulo: '{{ from.element.captured.modulo }}' } },
});

const POLITICAS = [
  // Bibliotecas externas e módulos do Node são livres nas camadas externas...
  { allow: { to: { module: { origin: ['external', 'core'] } } } },
  // ...mas domínio e aplicação são TypeScript puro: nada de electron, better-sqlite3, zod, node:*.
  {
    from: tipo('dominio', 'aplicacao', 'nucleo-dominio', 'nucleo-aplicacao', 'contratos'),
    disallow: { to: { module: { origin: ['external', 'core'] } } },
  },

  { from: tipo('contratos'), allow: { to: tipo('contratos') } },

  { from: tipo('nucleo-dominio'), allow: { to: tipo('nucleo-dominio') } },
  { from: tipo('nucleo-aplicacao'), allow: { to: tipo('nucleo-dominio', 'nucleo-aplicacao') } },
  {
    from: tipo('nucleo-infraestrutura'),
    allow: { to: tipo('nucleo-dominio', 'nucleo-aplicacao', 'nucleo-infraestrutura', 'contratos') },
  },

  // Dentro de um módulo, as dependências apontam para dentro: apresentacao/infra → aplicacao → dominio.
  {
    from: tipo('dominio'),
    allow: [{ to: tipo('nucleo-dominio') }, { to: mesmoModulo('dominio') }],
  },
  {
    from: tipo('aplicacao'),
    allow: [
      { to: tipo('nucleo-dominio', 'nucleo-aplicacao', 'contratos') },
      { to: mesmoModulo('dominio', 'aplicacao') },
    ],
  },
  {
    from: tipo('infraestrutura'),
    allow: [
      { to: tipo('nucleo-dominio', 'nucleo-aplicacao', 'nucleo-infraestrutura') },
      { to: mesmoModulo('dominio', 'aplicacao', 'infraestrutura') },
    ],
  },
  {
    from: tipo('apresentacao'),
    allow: [
      { to: tipo('nucleo-infraestrutura', 'contratos') },
      { to: mesmoModulo('aplicacao', 'apresentacao') },
    ],
  },
  // A API pública (index.ts) monta o próprio módulo.
  {
    from: tipo('modulo'),
    allow: [
      { to: tipo('nucleo-aplicacao', 'nucleo-infraestrutura') },
      { to: mesmoModulo('dominio', 'aplicacao', 'infraestrutura', 'apresentacao') },
    ],
  },
  // A casca só enxerga os módulos pela API pública; do núcleo, usa as portas e a infraestrutura
  // (banco, IPC) que ela mesma instancia na raiz de composição.
  {
    from: tipo('casca'),
    allow: {
      to: tipo('casca', 'modulo', 'nucleo-aplicacao', 'nucleo-infraestrutura', 'contratos'),
    },
  },

  // Renderer: páginas compõem módulos; módulos não se conhecem; compartilhado não conhece módulos.
  {
    from: tipo('renderer-app'),
    allow: { to: tipo('renderer-app', 'renderer-modulo', 'renderer-compartilhado', 'contratos') },
  },
  {
    from: tipo('renderer-modulo'),
    allow: [{ to: tipo('renderer-compartilhado', 'contratos') }, { to: mesmoModulo('renderer-modulo') }],
  },
  {
    from: tipo('renderer-compartilhado'),
    allow: { to: tipo('renderer-compartilhado', 'contratos') },
  },
];

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'dist-electron/**',
    'dados-dev/**',
    'renderer/.next/**',
    'renderer/out/**',
    'renderer/next-env.d.ts',
  ]),

  { files: ['**/*.{ts,tsx,mts}'], extends: [tseslint.configs.recommended] },

  {
    files: ['renderer/**/*.{ts,tsx}'],
    extends: [nextCoreWebVitals, nextTypescript],
    settings: { next: { rootDir: 'renderer/' } },
  },

  {
    files: ['contratos/**/*.ts', 'electron/**/*.ts', 'renderer/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': ELEMENTOS,
      'import/resolver': {
        typescript: {
          project: ['electron/tsconfig.json', 'renderer/tsconfig.json'],
        },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        { default: 'disallow', checkAllOrigins: true, policies: POLITICAS },
      ],
      'boundaries/no-unknown-dependencies': 'error',
    },
  },
]);
