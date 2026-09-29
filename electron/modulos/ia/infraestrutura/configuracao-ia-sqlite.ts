import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import {
  type CofreDeChave,
  type EscopoIaDTO,
  type InstrucoesSalvas,
  MODELOS_IA,
  type ModeloIaDTO,
  type ProvedorIaDTO,
  type RepositorioDeConfiguracaoIa,
  type RepositorioDeInstrucoesIa,
} from '../aplicacao/portas';

const chaveDoProvedor = (provedor: ProvedorIaDTO) => `chave_api_${provedor}`;
const SALT = 'salt';
// O módulo de AVs tem modelo e instruções próprios: as mesmas chaves com sufixo (as chaves de API são comuns).
const sufixo = (escopo: EscopoIaDTO) => (escopo === 'avs' ? '_avs' : '');
const MODELO = 'modelo';
const CHECKLIST = 'checklist';
const ORIENTACOES = 'orientacoes';
const INSTRUCOES_ATUALIZADAS_EM = 'instrucoes_atualizadas_em';

/*
 * O app roda de uma pasta de rede, aberto por várias contas do Windows. Por isso as chaves não usam
 * a criptografia do Windows (DPAPI/safeStorage), que é por usuário: só quem salvou conseguiria ler.
 * A cifra abaixo (AES-256-GCM) impede ler as chaves abrindo o .db, mas não protege contra quem tiver
 * o aplicativo e disposição para extrair o segredo dele. A mitigação é usar chaves com limite de
 * gasto (ou plano gratuito) e trocá-las pelo app quando necessário.
 */
const SEGREDO_DO_APP = 'gestao-cronogramas/ia/v1';
const ALGORITMO = 'aes-256-gcm';
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

export class ConfiguracaoIaSqlite
  implements CofreDeChave, RepositorioDeConfiguracaoIa, RepositorioDeInstrucoesIa
{
  private readonly sql;
  private readonly salvarVarios;

  constructor(db: BancoDeDados) {
    this.salvarVarios = db.transaction((pares: [string, string][]) => {
      for (const [chave, valor] of pares) this.sql.salvar.run(chave, valor);
    });
    this.sql = {
      obter: db.prepare<[string], string>('SELECT valor FROM ia_configuracao WHERE chave = ?').pluck(),
      salvar: db.prepare<[string, string]>(`
        INSERT INTO ia_configuracao (chave, valor) VALUES (?, ?)
        ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor
      `),
      remover: db.prepare<[string]>('DELETE FROM ia_configuracao WHERE chave = ?'),
    };
  }

  async obter(provedor: ProvedorIaDTO): Promise<string | null> {
    const cifrada = this.sql.obter.get(chaveDoProvedor(provedor));
    if (!cifrada) return null;
    try {
      const bytes = Buffer.from(cifrada, 'base64');
      const iv = bytes.subarray(0, TAMANHO_IV);
      const tag = bytes.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
      const decifrador = createDecipheriv(ALGORITMO, this.chaveDeCifra(), iv);
      decifrador.setAuthTag(tag);
      return Buffer.concat([
        decifrador.update(bytes.subarray(TAMANHO_IV + TAMANHO_TAG)),
        decifrador.final(),
      ]).toString('utf8');
    } catch (erro) {
      // Chave corrompida ou gravada com outro segredo: vale como "não configurada".
      console.warn(`[ia] não foi possível ler a chave salva (${provedor}):`, erro);
      return null;
    }
  }

  async salvar(provedor: ProvedorIaDTO, chave: string): Promise<void> {
    const iv = randomBytes(TAMANHO_IV);
    const cifrador = createCipheriv(ALGORITMO, this.chaveDeCifra(), iv);
    const conteudo = Buffer.concat([cifrador.update(chave, 'utf8'), cifrador.final()]);
    const cifrada = Buffer.concat([iv, cifrador.getAuthTag(), conteudo]).toString('base64');
    this.sql.salvar.run(chaveDoProvedor(provedor), cifrada);
  }

  async remover(provedor: ProvedorIaDTO): Promise<void> {
    this.sql.remover.run(chaveDoProvedor(provedor));
  }

  async obterModelo(escopo: EscopoIaDTO = 'projetos'): Promise<ModeloIaDTO | null> {
    const valor = this.sql.obter.get(MODELO + sufixo(escopo));
    return valor && (MODELOS_IA as readonly string[]).includes(valor) ? (valor as ModeloIaDTO) : null;
  }

  async salvarModelo(modelo: ModeloIaDTO, escopo: EscopoIaDTO = 'projetos'): Promise<void> {
    this.sql.salvar.run(MODELO + sufixo(escopo), modelo);
  }

  async obterInstrucoes(escopo: EscopoIaDTO = 'projetos'): Promise<InstrucoesSalvas | null> {
    const s = sufixo(escopo);
    const checklist = this.sql.obter.get(CHECKLIST + s);
    const atualizadoEm = this.sql.obter.get(INSTRUCOES_ATUALIZADAS_EM + s);
    if (!checklist || !atualizadoEm) return null;
    return {
      checklist: JSON.parse(checklist) as InstrucoesSalvas['checklist'],
      orientacoes: this.sql.obter.get(ORIENTACOES + s) ?? '',
      atualizadoEm: new Date(atualizadoEm),
    };
  }

  async salvarInstrucoes(instrucoes: InstrucoesSalvas, escopo: EscopoIaDTO = 'projetos'): Promise<void> {
    const s = sufixo(escopo);
    this.salvarVarios([
      [CHECKLIST + s, JSON.stringify(instrucoes.checklist)],
      [ORIENTACOES + s, instrucoes.orientacoes],
      [INSTRUCOES_ATUALIZADAS_EM + s, instrucoes.atualizadoEm.toISOString()],
    ]);
  }

  /** Salt aleatório por banco, criado na primeira vez: a cifra não é igual entre instalações. */
  private chaveDeCifra(): Buffer {
    let salt = this.sql.obter.get(SALT);
    if (!salt) {
      salt = randomBytes(16).toString('base64');
      this.sql.salvar.run(SALT, salt);
    }
    return scryptSync(SEGREDO_DO_APP, Buffer.from(salt, 'base64'), 32);
  }
}
