import type { ApiDesktop } from '@contratos/api-desktop';
import type { Resultado } from '@contratos/resultado';

export class ErroDaApi extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.name = 'ErroDaApi';
    this.codigo = codigo;
  }
}

function obterApi(): ApiDesktop {
  if (typeof window === 'undefined' || !window.api) {
    throw new ErroDaApi(
      'FORA_DO_DESKTOP',
      'Esta tela precisa ser aberta pelo aplicativo desktop. Use "npm run dev".',
    );
  }
  return window.api;
}

/** Converte `Resultado` em valor ou exceção (`ErroDaApi`), para as stores usarem async/await. */
async function desembrulhar<T>(resposta: Promise<Resultado<T>>): Promise<T> {
  const resultado = await resposta;
  if (resultado.ok) return resultado.dados;
  throw new ErroDaApi(resultado.erro.codigo, resultado.erro.mensagem);
}

type Grupo = keyof Omit<ApiDesktop, 'aparencia'>;

/** Espelha um grupo de canais trocando `Resultado<T>` por `T`. */
type ClienteDoGrupo<G extends Grupo> = {
  [Metodo in keyof ApiDesktop[G]]: ApiDesktop[G][Metodo] extends (
    ...argumentos: infer Argumentos
  ) => Promise<Resultado<infer Saida>>
    ? (...argumentos: Argumentos) => Promise<Saida>
    : never;
};

function grupo<G extends Grupo>(nome: G): ClienteDoGrupo<G> {
  return new Proxy({} as ClienteDoGrupo<G>, {
    get(_alvo, metodo: string) {
      return (...argumentos: unknown[]) => {
        const canais = obterApi()[nome] as unknown as Record<
          string,
          (...args: unknown[]) => Promise<Resultado<unknown>>
        >;
        return desembrulhar(canais[metodo]!(...argumentos));
      };
    },
  });
}

/** Único ponto do renderer que conversa com o processo principal. */
export const clienteDesktop = {
  sessao: grupo('sessao'),
  usuarios: grupo('usuarios'),
  responsaveis: grupo('responsaveis'),
  cronogramas: grupo('cronogramas'),
  tarefas: grupo('tarefas'),
  impressao: grupo('impressao'),
  ia: grupo('ia'),
  preferencias: grupo('preferencias'),
};

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error && erro.message ? erro.message : 'Ocorreu um erro inesperado.';
}
