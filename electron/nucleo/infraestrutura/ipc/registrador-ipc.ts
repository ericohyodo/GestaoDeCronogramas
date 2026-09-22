import { ipcMain } from 'electron';
import type { z } from 'zod';
import type { Resultado } from '@contratos/resultado';
import type {
  ControleDeAcesso,
  PermissaoIpc,
} from '../../aplicacao/portas/controle-de-acesso';
import { ErroDeDominio } from '../../dominio/erro-de-dominio';

export interface RegistradorIpc {
  /**
   * Registra um canal `invoke`: valida a origem, a permissão do usuário logado e a entrada,
   * e embrulha a resposta em `Resultado`.
   */
  registrar<Esquema extends z.ZodType, Saida>(
    canal: string,
    permissao: PermissaoIpc,
    esquema: Esquema,
    tratador: (entrada: z.output<Esquema>) => Promise<Saida>,
  ): void;
}

export interface OpcoesRegistradorIpc {
  ehOrigemConfiavel(url: string): boolean;
  controleDeAcesso: ControleDeAcesso;
}

export function criarRegistradorIpc(opcoes: OpcoesRegistradorIpc): RegistradorIpc {
  return {
    registrar(canal, permissao, esquema, tratador) {
      ipcMain.handle(canal, async (evento, bruto): Promise<Resultado<unknown>> => {
        if (!opcoes.ehOrigemConfiavel(evento.senderFrame?.url ?? '')) {
          return falha('ORIGEM_NAO_PERMITIDA', 'Chamada de origem não permitida.');
        }

        if (permissao !== 'publico') {
          if (!opcoes.controleDeAcesso.autenticado()) {
            return falha('NAO_AUTENTICADO', 'Faça login para continuar.');
          }
          if (!opcoes.controleDeAcesso.possuiPermissao(permissao)) {
            return falha('SEM_PERMISSAO', 'Seu perfil não permite esta ação.');
          }
        }

        const analise = esquema.safeParse(bruto);
        if (!analise.success) {
          const detalhe = analise.error.issues
            .map((problema) => [problema.path.join('.'), problema.message].filter(Boolean).join(': '))
            .join('; ');
          return falha('ENTRADA_INVALIDA', `Dados inválidos: ${detalhe}`);
        }

        try {
          return { ok: true, dados: await tratador(analise.data) };
        } catch (erro) {
          if (erro instanceof ErroDeDominio) return falha(erro.codigo, erro.message);
          console.error(`[ipc] erro inesperado em "${canal}":`, erro);
          return falha('ERRO_INTERNO', 'Ocorreu um erro inesperado. Tente novamente.');
        }
      });
    },
  };
}

function falha(codigo: string, mensagem: string): Resultado<never> {
  return { ok: false, erro: { codigo, mensagem } };
}
