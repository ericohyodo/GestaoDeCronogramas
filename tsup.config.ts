import { defineConfig } from 'tsup';

// Compila o processo principal e o preload do Electron.
// O preload roda em sandbox: precisa ser um único arquivo CJS que só faz require('electron').
export default defineConfig({
  entry: {
    main: 'electron/main.ts',
    preload: 'electron/preload.ts',
  },
  outDir: 'dist-electron',
  format: ['cjs'],
  platform: 'node',
  target: 'node24',
  tsconfig: 'electron/tsconfig.json',
  sourcemap: true,
  clean: true,
  splitting: false,
  // `better-sqlite3` é nativo (fica em node_modules); `electron` é fornecido pelo runtime.
  external: ['electron', 'better-sqlite3'],
});
