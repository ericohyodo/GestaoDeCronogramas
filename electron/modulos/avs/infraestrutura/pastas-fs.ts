import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { shell } from 'electron';
import { ErroDeDominio } from '../../../nucleo/dominio/erro-de-dominio';
import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { GerenciadorDePastas, ItemDaPasta } from '../aplicacao/portas';
import type { ConfigPastaDasAvs, RepositorioConfigPastaDasAvs } from '../dominio/pasta-da-av';

// =====================================================================================================
// Pastas das AVs no Windows (rede ou local) e a configuração da pasta raiz
// =====================================================================================================

/** Arquivos de sistema/temporários que não interessam no visualizador. */
const IGNORADOS = /^(~\$|\.|thumbs\.db$|desktop\.ini$)/i;
const PROFUNDIDADE_MAXIMA = 3;
const LIMITE_DE_ITENS = 500;

export class GerenciadorDePastasFs implements GerenciadorDePastas {
  async criar(raiz: string, nome: string): Promise<string> {
    if (!(await this.existe(raiz))) {
      throw new ErroDeDominio('PASTA_RAIZ_INDISPONIVEL', `A pasta das AVs não está acessível: ${raiz}`);
    }
    const caminho = path.join(raiz, path.basename(nome));
    // `recursive`: não falha se a pasta já existir (reaproveita).
    await mkdir(caminho, { recursive: true });
    return caminho;
  }

  async existe(caminho: string): Promise<boolean> {
    try {
      return (await stat(caminho)).isDirectory();
    } catch {
      return false;
    }
  }

  async listar(caminho: string): Promise<{ itens: ItemDaPasta[]; limitado: boolean }> {
    const itens: ItemDaPasta[] = [];
    let limitado = false;
    const visitar = async (pasta: string, relativa: string, profundidade: number): Promise<void> => {
      const entradas = await readdir(pasta, { withFileTypes: true });
      entradas.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name, 'pt-BR'));
      for (const entrada of entradas) {
        if (IGNORADOS.test(entrada.name)) continue;
        if (itens.length >= LIMITE_DE_ITENS) {
          limitado = true;
          return;
        }
        const caminhoRelativo = relativa ? `${relativa}\\${entrada.name}` : entrada.name;
        const completo = path.join(pasta, entrada.name);
        const info = await stat(completo).catch(() => null);
        if (!info) continue;
        const ehPasta = info.isDirectory();
        itens.push({
          caminhoRelativo,
          nome: entrada.name,
          ehPasta,
          tamanhoBytes: ehPasta ? null : info.size,
          modificadoEm: info.mtime,
          profundidade,
        });
        if (ehPasta && profundidade < PROFUNDIDADE_MAXIMA) await visitar(completo, caminhoRelativo, profundidade + 1);
      }
    };
    await visitar(caminho, '', 0);
    return { itens, limitado };
  }

  async abrir(base: string, relativo: string | null): Promise<void> {
    const raiz = path.resolve(base);
    const alvo = relativo ? path.resolve(raiz, relativo) : raiz;
    if (alvo !== raiz && !alvo.startsWith(raiz + path.sep)) {
      throw new ErroDeDominio('CAMINHO_INVALIDO', 'Arquivo inválido.');
    }
    const falha = await shell.openPath(alvo);
    if (falha) throw new ErroDeDominio('NAO_FOI_POSSIVEL_ABRIR', `Não foi possível abrir: ${falha}`);
  }
}

/** Pasta raiz das AVs (`av_pasta_config`, linha única). */
export class RepositorioConfigPastaDasAvsSqlite implements RepositorioConfigPastaDasAvs {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      obter: db.prepare<[], { pasta_raiz: string | null }>('SELECT pasta_raiz FROM av_pasta_config WHERE id = 1'),
      salvar: db.prepare<[{ raiz: string | null; em: string; por: string }]>(`
        INSERT INTO av_pasta_config (id, pasta_raiz, atualizado_em, atualizado_por) VALUES (1, @raiz, @em, @por)
        ON CONFLICT (id) DO UPDATE SET
          pasta_raiz = excluded.pasta_raiz, atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por
      `),
    };
  }

  async obter(): Promise<ConfigPastaDasAvs> {
    return { pastaRaiz: this.sql.obter.get()?.pasta_raiz ?? null };
  }

  async salvar(config: ConfigPastaDasAvs, usuarioId: string, instante: Date): Promise<void> {
    this.sql.salvar.run({ raiz: config.pastaRaiz, em: instante.toISOString(), por: usuarioId });
  }
}
