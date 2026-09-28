import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { Anexo } from '../dominio/anexo';
import type { Area } from '../dominio/area';
import type { RepositorioAnexos } from '../dominio/repositorio-anexos';

interface LinhaAnexo {
  id: string;
  av_id: string;
  secao: Area;
  nome_arquivo: string;
  nome_armazenado: string;
  tipo_mime: string | null;
  tamanho_bytes: number;
  usuario_id: string | null;
  criado_em: string;
}

function paraEntidade(linha: LinhaAnexo): Anexo {
  return {
    id: linha.id,
    avId: linha.av_id,
    secao: linha.secao,
    nomeArquivo: linha.nome_arquivo,
    nomeArmazenado: linha.nome_armazenado,
    tipoMime: linha.tipo_mime,
    tamanhoBytes: linha.tamanho_bytes,
    usuarioId: linha.usuario_id,
    criadoEm: new Date(linha.criado_em),
  };
}

export class RepositorioAnexosSqlite implements RepositorioAnexos {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[string], LinhaAnexo>(
        'SELECT * FROM av_anexos WHERE av_id = ? ORDER BY criado_em DESC',
      ),
      obterPorId: db.prepare<[string], LinhaAnexo>('SELECT * FROM av_anexos WHERE id = ?'),
      inserir: db.prepare<[LinhaAnexo]>(`
        INSERT INTO av_anexos
          (id, av_id, secao, nome_arquivo, nome_armazenado, tipo_mime, tamanho_bytes, usuario_id, criado_em)
        VALUES
          (@id, @av_id, @secao, @nome_arquivo, @nome_armazenado, @tipo_mime, @tamanho_bytes, @usuario_id, @criado_em)
      `),
      excluir: db.prepare<[string]>('DELETE FROM av_anexos WHERE id = ?'),
    };
  }

  async listar(avId: string): Promise<Anexo[]> {
    return this.sql.listar.all(avId).map(paraEntidade);
  }

  async obterPorId(id: string): Promise<Anexo | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha) : null;
  }

  async inserir(anexo: Anexo): Promise<void> {
    this.sql.inserir.run({
      id: anexo.id,
      av_id: anexo.avId,
      secao: anexo.secao,
      nome_arquivo: anexo.nomeArquivo,
      nome_armazenado: anexo.nomeArmazenado,
      tipo_mime: anexo.tipoMime,
      tamanho_bytes: anexo.tamanhoBytes,
      usuario_id: anexo.usuarioId,
      criado_em: anexo.criadoEm.toISOString(),
    });
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }
}
