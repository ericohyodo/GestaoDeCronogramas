import { nativeTheme } from 'electron';
import type { AplicadorDeTema } from '../aplicacao/portas/aplicador-de-tema';
import type { Tema } from '../dominio/tema';

const FONTE_DO_TEMA: Record<Tema, typeof nativeTheme.themeSource> = {
  sistema: 'system',
  claro: 'light',
  escuro: 'dark',
};

/**
 * Define `nativeTheme.themeSource`. O Chromium passa a reportar `prefers-color-scheme`
 * de acordo, então o CSS do renderer, o Acrylic e os botões da barra de título mudam juntos.
 */
export class AplicadorDeTemaElectron implements AplicadorDeTema {
  aplicar(tema: Tema): void {
    nativeTheme.themeSource = FONTE_DO_TEMA[tema];
  }
}
