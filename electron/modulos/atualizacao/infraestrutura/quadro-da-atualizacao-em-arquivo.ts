import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { QuadroDaAtualizacao } from '../aplicacao/portas';
import type { AppAberto, AvisoDeAtualizacao } from '../dominio/aviso-de-atualizacao';

// =====================================================================================================
// Quadro da atualização em arquivos JSON na pasta de rede dos dados reais:
//   <pasta>/controle-de-atualizacao/aviso.json         pedido de fechamento (um só)
//   <pasta>/controle-de-atualizacao/apps/<id>.json     um arquivo por app aberto (cada app só grava o seu)
// Gravação atômica (arquivo temporário + rename): quem lê nunca vê um JSON pela metade.
// =====================================================================================================

export const NOME_DA_PASTA_DE_CONTROLE = 'controle-de-atualizacao';

const dataIso = z.iso.datetime().transform((texto) => new Date(texto));
const nomeDeArquivo = /^[A-Za-z0-9-]{1,64}$/;

const esquemaAviso = z.object({
  id: z.string().min(1),
  fecharEm: dataIso,
  solicitadoEm: dataIso,
  solicitadoPor: z.string(),
  mensagem: z.string().nullable(),
  versaoNoPedido: z.string(),
});

const esquemaApp = z.object({
  instanciaId: z.string().regex(nomeDeArquivo),
  computador: z.string(),
  usuarioDoWindows: z.string(),
  usuario: z.string().nullable(),
  modo: z.enum(['normal', 'apresentacao']),
  versao: z.string(),
  desde: dataIso,
  ultimoSinal: dataIso,
});

async function gravarAtomico(arquivo: string, conteudo: unknown): Promise<void> {
  await mkdir(path.dirname(arquivo), { recursive: true });
  const temporario = `${arquivo}.${process.pid}.tmp`;
  await writeFile(temporario, JSON.stringify(conteudo, null, 2), 'utf-8');
  await rename(temporario, arquivo);
}

/** Lê e valida um JSON; ausente ou inválido vira `null` (um arquivo corrompido não derruba o app). */
async function lerJson<T>(arquivo: string, esquema: z.ZodType<T>): Promise<T | null> {
  let texto: string;
  try {
    texto = await readFile(arquivo, 'utf-8');
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw erro;
  }
  try {
    const resultado = esquema.safeParse(JSON.parse(texto));
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

export class QuadroDaAtualizacaoEmArquivo implements QuadroDaAtualizacao {
  private readonly pasta: string;
  private readonly arquivoDoAviso: string;
  private readonly pastaDosApps: string;

  /** @param pastaDosDados pasta dos dados reais (ao lado do .exe na rede), mesmo no modo apresentação */
  constructor(pastaDosDados: string) {
    this.pasta = path.join(pastaDosDados, NOME_DA_PASTA_DE_CONTROLE);
    this.arquivoDoAviso = path.join(this.pasta, 'aviso.json');
    this.pastaDosApps = path.join(this.pasta, 'apps');
  }

  lerAviso(): Promise<AvisoDeAtualizacao | null> {
    return lerJson(this.arquivoDoAviso, esquemaAviso);
  }

  gravarAviso(aviso: AvisoDeAtualizacao): Promise<void> {
    return gravarAtomico(this.arquivoDoAviso, aviso);
  }

  async apagarAviso(id?: string): Promise<void> {
    if (id !== undefined && (await this.lerAviso())?.id !== id) return;
    await rm(this.arquivoDoAviso, { force: true });
  }

  registrarApp(app: AppAberto): Promise<void> {
    return gravarAtomico(this.arquivoDoApp(app.instanciaId), app);
  }

  removerApp(instanciaId: string): void {
    try {
      rmSync(this.arquivoDoApp(instanciaId), { force: true });
    } catch {
      // pasta de rede fora do ar: o registro expira sozinho
    }
  }

  async listarApps(): Promise<AppAberto[]> {
    const arquivos = await this.arquivosDosApps();
    const apps = await Promise.all(arquivos.map((arquivo) => lerJson(arquivo, esquemaApp).catch(() => null)));
    return apps.filter((app): app is AppAberto => app !== null);
  }

  async apagarAppsSemSinalDesde(limite: Date): Promise<void> {
    for (const arquivo of await this.arquivosDosApps()) {
      const app = await lerJson(arquivo, esquemaApp).catch(() => null);
      if (!app || app.ultimoSinal < limite) await rm(arquivo, { force: true }).catch(() => undefined);
    }
  }

  private arquivoDoApp(instanciaId: string): string {
    if (!nomeDeArquivo.test(instanciaId)) throw new Error('Identificador de app inválido.');
    return path.join(this.pastaDosApps, `${instanciaId}.json`);
  }

  private async arquivosDosApps(): Promise<string[]> {
    try {
      return (await readdir(this.pastaDosApps))
        .filter((nome) => nome.endsWith('.json'))
        .map((nome) => path.join(this.pastaDosApps, nome));
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw erro;
    }
  }
}
