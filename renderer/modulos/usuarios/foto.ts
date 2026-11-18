import type { FotoDoUsuarioDTO } from '@contratos/usuarios.contrato';

/** Lado da foto gravada (quadrada): pequena o bastante para ir no banco e aparecer na barra de título. */
const LADO = 256;

/**
 * Lê uma imagem escolhida pelo usuário, recorta o centro em quadrado e reduz para 256 px em JPEG.
 * @param arquivo imagem (JPG, PNG, BMP…)
 * @returns a foto em base64, pronta para enviar
 * @throws Error se o arquivo não for uma imagem que o navegador consiga abrir
 */
export async function prepararFoto(arquivo: File): Promise<FotoDoUsuarioDTO> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha uma imagem (JPG ou PNG).');
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const elemento = new Image();
      elemento.onload = () => resolver(elemento);
      elemento.onerror = () => rejeitar(new Error('Não foi possível abrir esta imagem.'));
      elemento.src = url;
    });
    const lado = Math.min(imagem.naturalWidth, imagem.naturalHeight);
    const tela = document.createElement('canvas');
    tela.width = LADO;
    tela.height = LADO;
    const contexto = tela.getContext('2d');
    if (!contexto) throw new Error('Não foi possível preparar a foto.');
    contexto.drawImage(
      imagem,
      (imagem.naturalWidth - lado) / 2,
      (imagem.naturalHeight - lado) / 2,
      lado,
      lado,
      0,
      0,
      LADO,
      LADO,
    );
    const dataUrl = tela.toDataURL('image/jpeg', 0.85);
    return { mime: 'image/jpeg', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
