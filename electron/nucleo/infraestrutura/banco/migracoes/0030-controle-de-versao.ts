import type { Migracao } from '../migrador';

// Gravação otimista: cada trecho editável (seção de uma AV, SD, tarefa…) tem um contador de versão.
// Quem salva informa a versão que leu; se outro usuário salvou antes, a versão mudou e a gravação é
// recusada com aviso, em vez de apagar o trabalho do outro em silêncio. A chave é "<recurso>:<id>".
// Também apaga as chaves de API de provedores de IA que deixaram de existir (Google e OpenRouter).
export const migracao0030: Migracao = {
  versao: 30,
  nome: '0030-controle-de-versao',
  sql: `
    CREATE TABLE controle_de_versao (
      chave  TEXT PRIMARY KEY,
      versao INTEGER NOT NULL CHECK (versao >= 1)
    );

    DELETE FROM ia_configuracao WHERE chave IN ('chave_api_google', 'chave_api_openrouter');
  `,
};
