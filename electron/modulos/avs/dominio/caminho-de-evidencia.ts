/**
 * Extensões que executam código ao abrir. Os links de evidência são gravados por qualquer usuário e
 * abertos por outros: abrir um `.exe` ou `.bat` seria execução de código na máquina de quem clica.
 */
const EXTENSOES_EXECUTAVEIS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.msp', '.ps1', '.psm1', '.vbs', '.vbe', '.js', '.jse', '.wsf',
  '.wsh', '.scr', '.lnk', '.hta', '.cpl', '.jar', '.reg', '.pif', '.dll', '.appref-ms', '.url',
]);

export type TipoDeCaminho = 'web' | 'arquivo';

/**
 * Classifica o link de evidência ou explica por que ele não pode ser aberto.
 * @param texto URL http(s), pasta ou arquivo (local ou de rede)
 * @returns `{ tipo }` quando pode abrir; `{ recusa }` com o motivo quando não
 */
export function avaliarCaminhoDeEvidencia(texto: string): { tipo: TipoDeCaminho } | { recusa: string } {
  const caminho = texto.trim();
  if (!caminho) return { recusa: 'caminho vazio' };
  if (/^https?:\/\//i.test(caminho)) return { tipo: 'web' };
  // Outros esquemas (file:, javascript:, ms-*: …) não são aceitos. Letra de unidade ("C:\") tem um
  // caractere só antes dos dois-pontos e não entra aqui.
  if (/^[a-z][a-z0-9+.-]+:/i.test(caminho)) return { recusa: 'tipo de link não permitido' };
  const extensao = /\.[^.\/]+$/.exec(caminho)?.[0].toLowerCase() ?? '';
  if (EXTENSOES_EXECUTAVEIS.has(extensao)) {
    return { recusa: 'por segurança, programas e scripts não podem ser abertos por aqui' };
  }
  return { tipo: 'arquivo' };
}
