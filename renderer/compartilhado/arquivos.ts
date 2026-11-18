// =====================================================================================================
// Arquivos recebidos do processo principal (base64) exibidos na tela.
// =====================================================================================================

/**
 * Cria uma URL `blob:` a partir do conteúdo em base64, para `<iframe>` (PDF) e `<img>`.
 *
 * Por que não `data:`: o Chromium limita URLs a cerca de 2 MB, e um PDF de desenho maior que ~1,5 MB vira
 * uma URL `data:` vazia (visualizador em branco). A URL `blob:` não tem esse limite.
 * Quem cria deve chamar `URL.revokeObjectURL(url)` quando o arquivo sair da tela.
 * @param base64 conteúdo sem o prefixo `data:`
 * @param tipoMime tipo do arquivo (ex.: `application/pdf`)
 * @returns a URL `blob:` do arquivo
 */
export function urlDeBase64(base64: string, tipoMime: string): string {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let indice = 0; indice < binario.length; indice++) bytes[indice] = binario.charCodeAt(indice);
  return URL.createObjectURL(new Blob([bytes], { type: tipoMime }));
}
