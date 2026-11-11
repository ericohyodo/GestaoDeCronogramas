import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { RepositorioPreferencias } from '../dominio/repositorio-preferencias';
import { TEMAS, type Tema } from '../dominio/tema';

/**
 * Preferências deste computador (usuário do Windows), num JSON na pasta local do app (%APPDATA%).
 * Ficam fora do banco compartilhado: o tema escolhido num PC não muda o dos outros.
 */
export class RepositorioPreferenciasEmArquivo implements RepositorioPreferencias {
  private readonly arquivo: string;

  /** @param pastaLocal pasta de dados locais do app (`app.getPath('userData')`) */
  constructor(pastaLocal: string) {
    this.arquivo = path.join(pastaLocal, 'preferencias.json');
  }

  async obterTema(): Promise<Tema | null> {
    const valor = this.ler().tema;
    // Ausente, corrompido ou gravado por outra versão: tratado como "não escolhido".
    return typeof valor === 'string' && (TEMAS as readonly string[]).includes(valor) ? (valor as Tema) : null;
  }

  async salvarTema(tema: Tema): Promise<void> {
    mkdirSync(path.dirname(this.arquivo), { recursive: true });
    const temporario = `${this.arquivo}.tmp`;
    writeFileSync(temporario, JSON.stringify({ ...this.ler(), tema }, null, 2), 'utf-8');
    renameSync(temporario, this.arquivo);
  }

  private ler(): Record<string, unknown> {
    try {
      const dados: unknown = JSON.parse(readFileSync(this.arquivo, 'utf-8'));
      return dados && typeof dados === 'object' ? (dados as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
}
