/** Anexos da AV: só desenhos/imagens (incl. TIFF), até 25 MB, lote tudo-ou-nada e sem arquivo órfão. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutorizacaoAv } from '../../electron/modulos/avs/aplicacao/autorizacao';
import { CriarAv } from '../../electron/modulos/avs/aplicacao/casos-de-uso/criar-av';
import { SelecionarEAnexar } from '../../electron/modulos/avs/aplicacao/casos-de-uso/selecionar-e-anexar';
import type {
  ArmazenamentoDeArquivos,
  ArquivoArmazenado,
  ArquivoSelecionado,
  ConsultaDeUsuarios,
  SeletorDeArquivos,
} from '../../electron/modulos/avs/aplicacao/portas';
import { extensaoDe, TAMANHO_MAXIMO_ANEXO_BYTES, validarArquivoDeAnexo } from '../../electron/modulos/avs/dominio/anexo';
import { RepositorioAnexosSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-anexos-sqlite';
import { RepositorioAvsSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-avs-sqlite';
import { RepositorioPerfisAvSqlite } from '../../electron/modulos/avs/infraestrutura/repositorio-perfis-av-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

/** Seletor que devolve sempre os arquivos configurados no teste. */
class SeletorFalso implements SeletorDeArquivos {
  arquivos: ArquivoSelecionado[] = [];
  async escolher(): Promise<ArquivoSelecionado[] | null> {
    return this.arquivos;
  }
}

/** Armazenamento em memória que registra o que foi copiado e apagado. */
class ArmazenamentoFalso implements ArmazenamentoDeArquivos {
  copiados: string[] = [];
  apagados: string[] = [];
  async copiarParaAnexos(_avId: string, arquivo: ArquivoSelecionado): Promise<ArquivoArmazenado> {
    this.copiados.push(arquivo.nomeArquivo);
    return { nomeArmazenado: `x-${arquivo.nomeArquivo}`, tipoMime: null, tamanhoBytes: arquivo.tamanhoBytes };
  }
  async lerConteudoBase64(): Promise<string> {
    return '';
  }
  async excluirArquivo(_avId: string, nomeArmazenado: string): Promise<void> {
    this.apagados.push(nomeArmazenado);
  }
  async abrirNoProgramaPadrao(): Promise<void> {}
}

const arquivo = (nomeArquivo: string, tamanhoBytes = 1000): ArquivoSelecionado => ({
  caminhoOriginal: `C:\\temp\\${nomeArquivo}`,
  nomeArquivo,
  tamanhoBytes,
});

describe('regras de aceite dos anexos', () => {
  it('lê a extensão sem o ponto e em minúsculas', () => {
    expect(extensaoDe('Desenho.TIFF')).toBe('tiff');
    expect(extensaoDe('sem-extensao')).toBe('');
    expect(extensaoDe('.oculto')).toBe('');
  });

  it('aceita desenhos e imagens e recusa o resto', () => {
    for (const nome of ['a.pdf', 'a.jpg', 'a.JPEG', 'a.tif', 'a.tiff', 'a.png', 'a.bmp']) {
      expect(() => validarArquivoDeAnexo(nome, 10)).not.toThrow();
    }
    for (const nome of ['a.exe', 'a.docx', 'a.pdf.exe', 'sem-extensao']) {
      expect(() => validarArquivoDeAnexo(nome, 10)).toThrow(/Aceita apenas/);
    }
  });

  it('recusa arquivo acima de 25 MB', () => {
    expect(() => validarArquivoDeAnexo('a.pdf', TAMANHO_MAXIMO_ANEXO_BYTES)).not.toThrow();
    expect(() => validarArquivoDeAnexo('a.pdf', TAMANHO_MAXIMO_ANEXO_BYTES + 1)).toThrow(/25 MB/);
  });
});

describe('SelecionarEAnexar', () => {
  let db: BancoDeDados;
  let avId: string;
  let seletor: SeletorFalso;
  let armazenamento: ArmazenamentoFalso;
  let anexar: SelecionarEAnexar;

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    await new RepositorioUsuariosSqlite(db).salvar(
      Usuario.criar({ id: 'u1', nome: 'Erico', login: 'erico', senhaHash: 'h', perfil: 'administrador', agora: relogio.agora() }),
    );
    const consulta: ConsultaDeUsuarios = {
      usuarioAtual: () => ({ id: 'u1', nome: 'Erico', perfil: 'administrador' }),
      listarAtivos: async () => [{ id: 'u1', nome: 'Erico' }],
      obterPerfilGlobal: async () => 'administrador',
    };
    const ids = new GeradorDeIdSequencial('a');
    const avs = new RepositorioAvsSqlite(db);
    const autorizacao = new AutorizacaoAv(consulta, new RepositorioPerfisAvSqlite(db));
    avId = (await new CriarAv(avs, relogio, ids, consulta, autorizacao).executar({ descricao: 'Item' })).id;
    seletor = new SeletorFalso();
    armazenamento = new ArmazenamentoFalso();
    anexar = new SelecionarEAnexar(
      avs,
      new RepositorioAnexosSqlite(db),
      autorizacao,
      seletor,
      armazenamento,
      relogio,
      ids,
      consulta,
    );
  });

  afterEach(() => db.close());

  it('anexa o desenho do item na seção Comercial, inclusive TIFF', async () => {
    seletor.arquivos = [arquivo('Desenho.pdf'), arquivo('Desenho.tiff')];
    const anexos = await anexar.executar({ avId, secao: 'comercial' });
    expect(anexos?.map((a) => [a.secao, a.nomeArquivo])).toEqual([
      ['comercial', 'Desenho.pdf'],
      ['comercial', 'Desenho.tiff'],
    ]);
  });

  it('um arquivo proibido no lote barra o lote inteiro antes de copiar', async () => {
    seletor.arquivos = [arquivo('Desenho.pdf'), arquivo('virus.exe')];
    await expect(anexar.executar({ avId, secao: 'comercial' })).rejects.toThrow(/virus\.exe/);
    expect(armazenamento.copiados).toEqual([]);
  });

  it('recusa arquivo grande demais sem copiar', async () => {
    seletor.arquivos = [arquivo('Gigante.pdf', TAMANHO_MAXIMO_ANEXO_BYTES + 1)];
    await expect(anexar.executar({ avId, secao: 'pcp' })).rejects.toThrow(/25 MB/);
    expect(armazenamento.copiados).toEqual([]);
  });
});
