import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { protocol } from 'electron';

const ESQUEMA = 'app';
export const ORIGEM_APP = `${ESQUEMA}://-`;

// Tipos do que o `next build` com output: 'export' gera. Os `.txt` são os payloads RSC;
// hosts estáticos os servem como text/plain, que é o que o Next.js espera no modo export.
const TIPOS_DE_CONTEUDO: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// O Next.js exportado usa scripts inline para hidratação: 'unsafe-inline' é necessário em script-src.
const POLITICA_DE_CONTEUDO = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Deve ser chamado antes de `app.whenReady()`. */
export function registrarEsquemaApp(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ESQUEMA,
      privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
    },
  ]);
}

/**
 * Serve o export estático do Next.js (renderer/out) em `app://-/`.
 * Um esquema próprio evita os problemas de caminhos absolutos (/_next/...) sob file://.
 */
export function registrarProtocoloApp(pastaEstatica: string): void {
  const raiz = path.resolve(pastaEstatica);

  protocol.handle(ESQUEMA, async (requisicao) => {
    const { host, pathname } = new URL(requisicao.url);
    const arquivo = host === '-' ? resolverArquivo(raiz, decodeURIComponent(pathname)) : null;
    if (!arquivo) return new Response('Não encontrado', { status: 404 });

    // Leitura direta (funciona dentro do app.asar). Não usamos net.fetch(file://): a resposta
    // traz cabeçalhos com o caminho do arquivo, que quebram quando ele tem acentos ("Gestão").
    const conteudo = await readFile(arquivo);
    return new Response(conteudo, {
      headers: {
        'Content-Type':
          TIPOS_DE_CONTEUDO[path.extname(arquivo).toLowerCase()] ?? 'application/octet-stream',
        'Content-Security-Policy': POLITICA_DE_CONTEUDO,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
}

/** `/x/` → `x/index.html`; `/x` → `x`, `x.html` ou `x/index.html`. Bloqueia path traversal. */
function resolverArquivo(raiz: string, caminho: string): string | null {
  const candidatos = caminho.endsWith('/')
    ? [`${caminho}index.html`]
    : [caminho, `${caminho}.html`, `${caminho}/index.html`];

  for (const candidato of candidatos) {
    const absoluto = path.join(raiz, candidato);
    if (!absoluto.startsWith(raiz + path.sep)) continue;
    try {
      if (statSync(absoluto).isFile()) return absoluto;
    } catch {
      // não existe: tenta o próximo candidato
    }
  }
  return null;
}
