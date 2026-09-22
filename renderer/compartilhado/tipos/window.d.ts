import type { ApiDesktop } from '@contratos/api-desktop';

declare global {
  interface Window {
    /** Exposta pelo preload do Electron. Ausente quando a página é aberta num navegador comum. */
    api?: ApiDesktop;
  }
}

export {};
