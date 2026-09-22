import os from 'node:os';

/** Primeira build do Windows 11 com `backgroundMaterial` (22H2). */
const BUILD_MINIMA_ACRYLIC = 22621;

/**
 * Indica se a janela pode usar o material Acrylic nativo.
 * `GC_SEM_VIDRO_NATIVO=1` força o fallback em CSS (útil para testar o visual do Windows 10).
 */
export function suportaVidroNativo(): boolean {
  if (process.env.GC_SEM_VIDRO_NATIVO === '1') return false;
  if (process.platform !== 'win32') return false;
  const build = Number(os.release().split('.')[2]);
  return Number.isFinite(build) && build >= BUILD_MINIMA_ACRYLIC;
}
