/**
 * API pública do módulo Preferências. Outros módulos e a raiz de composição
 * só podem importar deste arquivo, nunca das camadas internas.
 */
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { AplicarTemaSalvo } from './aplicacao/casos-de-uso/aplicar-tema-salvo';
import { DefinirTema } from './aplicacao/casos-de-uso/definir-tema';
import { ObterPreferencias } from './aplicacao/casos-de-uso/obter-preferencias';
import type { AplicadorDeTema } from './aplicacao/portas/aplicador-de-tema';
import { registrarIpcPreferencias } from './apresentacao/controlador-ipc-preferencias';
import { AplicadorDeTemaElectron } from './infraestrutura/aplicador-de-tema-electron';
import { RepositorioPreferenciasSqlite } from './infraestrutura/repositorio-preferencias-sqlite';

export interface DependenciasModuloPreferencias {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  aplicadorDeTema?: AplicadorDeTema;
}

export interface ModuloPreferencias {
  aplicarTemaSalvo(): Promise<void>;
}

export function montarModuloPreferencias(deps: DependenciasModuloPreferencias): ModuloPreferencias {
  const repositorio = new RepositorioPreferenciasSqlite(deps.db);
  const aplicadorDeTema = deps.aplicadorDeTema ?? new AplicadorDeTemaElectron();

  registrarIpcPreferencias(deps.ipc, {
    obter: new ObterPreferencias(repositorio),
    definirTema: new DefinirTema(repositorio, aplicadorDeTema),
  });

  const aplicarTemaSalvo = new AplicarTemaSalvo(repositorio, aplicadorDeTema);
  return { aplicarTemaSalvo: () => aplicarTemaSalvo.executar() };
}
