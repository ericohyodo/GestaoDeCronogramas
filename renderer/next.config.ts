import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

// O Electron carrega o HTML/JS estático gerado em renderer/out (ver electron/protocolo-app.ts).
// Versão exibida na barra lateral: sempre a do package.json (evita número fixo no código).
const { version } = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')) as { version: string };

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VERSAO_DO_APP: version },
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  turbopack: {
    // Raiz do repositório: permite importar ../contratos e resolver o node_modules da raiz.
    root: path.join(__dirname, '..'),
  },
};

export default nextConfig;
