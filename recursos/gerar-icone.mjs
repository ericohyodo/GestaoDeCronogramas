// =====================================================================================================
// Gera os ícones do app a partir dos SVGs desta pasta:
//   recursos/icon.ico   → executável e atalhos (16, 24, 32, 48, 64, 128 e 256 px, PNG dentro do ICO)
//   recursos/icon.png   → 512 px (electron-builder e janela do app)
// Uso: node recursos/gerar-icone.mjs
// Depende do `sharp` (já instalado como dependência do Next.js); não usa programas externos.
// =====================================================================================================
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PASTA = path.dirname(fileURLToPath(import.meta.url));
const TAMANHOS_ICO = [16, 24, 32, 48, 64, 128, 256];
/** Até este tamanho usa a versão simplificada (traços grossos, sem detalhe). */
const LIMITE_VERSAO_PEQUENA = 32;

/**
 * Renderiza um SVG em PNG quadrado.
 * @param {Buffer} svg conteúdo do SVG
 * @param {number} tamanho lado em pixels
 * @returns {Promise<Buffer>} PNG
 */
async function renderizar(svg, tamanho) {
  return sharp(svg, { density: Math.max(72, (72 * tamanho) / 256) * 4 })
    .resize(tamanho, tamanho)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Monta um arquivo .ico com imagens PNG embutidas (formato aceito pelo Windows Vista em diante).
 * @param {{ tamanho: number, png: Buffer }[]} imagens
 * @returns {Buffer}
 */
function montarIco(imagens) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0); // reservado
  cabecalho.writeUInt16LE(1, 2); // tipo 1 = ícone
  cabecalho.writeUInt16LE(imagens.length, 4);

  const diretorio = Buffer.alloc(16 * imagens.length);
  let deslocamento = cabecalho.length + diretorio.length;
  imagens.forEach(({ tamanho, png }, indice) => {
    const base = indice * 16;
    diretorio.writeUInt8(tamanho >= 256 ? 0 : tamanho, base); // 0 significa 256
    diretorio.writeUInt8(tamanho >= 256 ? 0 : tamanho, base + 1);
    diretorio.writeUInt8(0, base + 2); // sem paleta
    diretorio.writeUInt8(0, base + 3);
    diretorio.writeUInt16LE(1, base + 4); // planos de cor
    diretorio.writeUInt16LE(32, base + 6); // bits por pixel
    diretorio.writeUInt32LE(png.length, base + 8);
    diretorio.writeUInt32LE(deslocamento, base + 12);
    deslocamento += png.length;
  });
  return Buffer.concat([cabecalho, diretorio, ...imagens.map((imagem) => imagem.png)]);
}

const svgGrande = await readFile(path.join(PASTA, 'icone.svg'));
const svgPequeno = await readFile(path.join(PASTA, 'icone-pequeno.svg'));

const imagens = [];
for (const tamanho of TAMANHOS_ICO) {
  const svg = tamanho <= LIMITE_VERSAO_PEQUENA ? svgPequeno : svgGrande;
  imagens.push({ tamanho, png: await renderizar(svg, tamanho) });
}
await writeFile(path.join(PASTA, 'icon.ico'), montarIco(imagens));
await writeFile(path.join(PASTA, 'icon.png'), await renderizar(svgGrande, 512));
console.log(`icon.ico (${TAMANHOS_ICO.join(', ')} px) e icon.png (512 px) gerados em ${PASTA}`);
