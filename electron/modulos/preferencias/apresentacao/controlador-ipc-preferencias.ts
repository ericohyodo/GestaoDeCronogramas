import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { TEMAS } from '@contratos/preferencias.contrato';
import { esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { DefinirTema } from '../aplicacao/casos-de-uso/definir-tema';
import type { ObterPreferencias } from '../aplicacao/casos-de-uso/obter-preferencias';

export interface CasosDeUsoPreferencias {
  obter: ObterPreferencias;
  definirTema: DefinirTema;
}

// Canais públicos: o tema vale também para a tela de login, antes de existir sessão.
export function registrarIpcPreferencias(ipc: RegistradorIpc, casos: CasosDeUsoPreferencias): void {
  ipc.registrar(CANAIS.preferencias.obter, 'publico', esquemaSemEntrada, () =>
    casos.obter.executar(),
  );
  ipc.registrar(CANAIS.preferencias.definirTema, 'publico', z.enum(TEMAS), (tema) =>
    casos.definirTema.executar(tema),
  );
}
