import path from 'node:path';
import type { NextConfig } from 'next';

// O Electron carrega o HTML/JS estático gerado em renderer/out (ver electron/protocolo-app.ts).
const nextConfig: NextConfig = {
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
