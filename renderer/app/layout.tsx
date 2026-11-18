import '@fontsource-variable/inter';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from './app-shell';

export const metadata: Metadata = {
  title: 'Gestão de Novos Desenvolvimentos (AV-SD-PRO)',
  description: 'Gestão de novos desenvolvimentos: AV → SD → Projeto',
};

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    // O preload adiciona `data-vidro-nativo` ao <html> antes da hidratação.
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
