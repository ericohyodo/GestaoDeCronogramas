import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type {
  EventoReporte,
  ImagemReporte,
  Reporte,
  ReporteListado,
  StatusReporte,
  TipoDeImagem,
  TipoEventoReporte,
  TipoReporte,
} from '../dominio/reporte';
import type { RepositorioReportes } from '../dominio/repositorio-reportes';

interface LinhaReporte {
  id: string;
  numero: number;
  tipo: TipoReporte;
  texto: string;
  status: StatusReporte;
  usuario_id: string | null;
  rota: string | null;
  versao_app: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface LinhaReporteListado extends LinhaReporte {
  quantidade_imagens: number;
}

interface LinhaImagem {
  id: string;
  reporte_id: string;
  ordem: number;
  nome_arquivo: string;
  nome_armazenado: string;
  tipo_mime: TipoDeImagem;
  tamanho_bytes: number;
}

interface LinhaEvento {
  id: string;
  reporte_id: string;
  tipo: TipoEventoReporte;
  status_de: StatusReporte | null;
  status_para: StatusReporte | null;
  comentario: string | null;
  usuario_id: string | null;
  criado_em: string;
}

const SELECT_LISTADO = `
  SELECT r.*, (SELECT COUNT(*) FROM reporte_imagens i WHERE i.reporte_id = r.id) AS quantidade_imagens
  FROM reportes r
`;

export class RepositorioReportesSqlite implements RepositorioReportes {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      // O número sai do próprio INSERT (atômico sob a trava de escrita do SQLite).
      inserir: db.prepare<[Omit<LinhaReporte, 'numero'>]>(`
        INSERT INTO reportes (id, numero, tipo, texto, status, usuario_id, rota, versao_app, criado_em, atualizado_em)
        VALUES (
          @id, (SELECT COALESCE(MAX(numero), 0) + 1 FROM reportes), @tipo, @texto, @status, @usuario_id, @rota,
          @versao_app, @criado_em, @atualizado_em
        )
      `),
      numeroDe: db.prepare<[string], { numero: number }>('SELECT numero FROM reportes WHERE id = ?'),
      inserirImagem: db.prepare<[LinhaImagem]>(`
        INSERT INTO reporte_imagens (id, reporte_id, ordem, nome_arquivo, nome_armazenado, tipo_mime, tamanho_bytes)
        VALUES (@id, @reporte_id, @ordem, @nome_arquivo, @nome_armazenado, @tipo_mime, @tamanho_bytes)
      `),
      inserirEvento: db.prepare<[LinhaEvento]>(`
        INSERT INTO reporte_eventos (id, reporte_id, tipo, status_de, status_para, comentario, usuario_id, criado_em)
        VALUES (@id, @reporte_id, @tipo, @status_de, @status_para, @comentario, @usuario_id, @criado_em)
      `),
      listarTodos: db.prepare<[], LinhaReporteListado>(`${SELECT_LISTADO} ORDER BY r.criado_em DESC, r.numero DESC`),
      listarPorStatus: db.prepare<[StatusReporte], LinhaReporteListado>(
        `${SELECT_LISTADO} WHERE r.status = ? ORDER BY r.criado_em DESC, r.numero DESC`,
      ),
      obter: db.prepare<[string], LinhaReporte>('SELECT * FROM reportes WHERE id = ?'),
      listarImagens: db.prepare<[string], LinhaImagem>('SELECT * FROM reporte_imagens WHERE reporte_id = ? ORDER BY ordem'),
      obterImagem: db.prepare<[string], LinhaImagem>('SELECT * FROM reporte_imagens WHERE id = ?'),
      listarEventos: db.prepare<[string], LinhaEvento>(
        'SELECT * FROM reporte_eventos WHERE reporte_id = ? ORDER BY criado_em, rowid',
      ),
      mudarStatus: db.prepare<[StatusReporte, string, string]>(
        'UPDATE reportes SET status = ?, atualizado_em = ? WHERE id = ?',
      ),
    };
  }

  async criar(dados: {
    reporte: Omit<Reporte, 'numero'>;
    imagens: ImagemReporte[];
    evento: EventoReporte;
  }): Promise<number> {
    return this.db.transaction(() => {
      const { reporte } = dados;
      this.sql.inserir.run({
        id: reporte.id,
        tipo: reporte.tipo,
        texto: reporte.texto,
        status: reporte.status,
        usuario_id: reporte.usuarioId,
        rota: reporte.rota,
        versao_app: reporte.versaoApp,
        criado_em: reporte.criadoEm.toISOString(),
        atualizado_em: reporte.atualizadoEm.toISOString(),
      });
      for (const imagem of dados.imagens) this.sql.inserirImagem.run(paraLinhaImagem(imagem));
      this.sql.inserirEvento.run(paraLinhaEvento(dados.evento));
      return this.sql.numeroDe.get(reporte.id)!.numero;
    })();
  }

  async listar(filtro?: { status?: StatusReporte }): Promise<ReporteListado[]> {
    const linhas = filtro?.status ? this.sql.listarPorStatus.all(filtro.status) : this.sql.listarTodos.all();
    return linhas.map((linha) => ({ ...paraReporte(linha), quantidadeImagens: linha.quantidade_imagens }));
  }

  async obter(id: string): Promise<Reporte | null> {
    const linha = this.sql.obter.get(id);
    return linha ? paraReporte(linha) : null;
  }

  async listarImagens(reporteId: string): Promise<ImagemReporte[]> {
    return this.sql.listarImagens.all(reporteId).map(paraImagem);
  }

  async obterImagem(imagemId: string): Promise<ImagemReporte | null> {
    const linha = this.sql.obterImagem.get(imagemId);
    return linha ? paraImagem(linha) : null;
  }

  async listarEventos(reporteId: string): Promise<EventoReporte[]> {
    return this.sql.listarEventos.all(reporteId).map(paraEvento);
  }

  async registrarAndamento(dados: {
    reporteId: string;
    status: StatusReporte;
    atualizadoEm: Date;
    evento: EventoReporte;
  }): Promise<void> {
    this.db.transaction(() => {
      this.sql.mudarStatus.run(dados.status, dados.atualizadoEm.toISOString(), dados.reporteId);
      this.sql.inserirEvento.run(paraLinhaEvento(dados.evento));
    })();
  }
}

function paraReporte(linha: LinhaReporte): Reporte {
  return {
    id: linha.id,
    numero: linha.numero,
    tipo: linha.tipo,
    texto: linha.texto,
    status: linha.status,
    usuarioId: linha.usuario_id,
    rota: linha.rota,
    versaoApp: linha.versao_app,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  };
}

function paraImagem(linha: LinhaImagem): ImagemReporte {
  return {
    id: linha.id,
    reporteId: linha.reporte_id,
    ordem: linha.ordem,
    nomeArquivo: linha.nome_arquivo,
    nomeArmazenado: linha.nome_armazenado,
    tipoMime: linha.tipo_mime,
    tamanhoBytes: linha.tamanho_bytes,
  };
}

function paraLinhaImagem(imagem: ImagemReporte): LinhaImagem {
  return {
    id: imagem.id,
    reporte_id: imagem.reporteId,
    ordem: imagem.ordem,
    nome_arquivo: imagem.nomeArquivo,
    nome_armazenado: imagem.nomeArmazenado,
    tipo_mime: imagem.tipoMime,
    tamanho_bytes: imagem.tamanhoBytes,
  };
}

function paraEvento(linha: LinhaEvento): EventoReporte {
  return {
    id: linha.id,
    reporteId: linha.reporte_id,
    tipo: linha.tipo,
    statusDe: linha.status_de,
    statusPara: linha.status_para,
    comentario: linha.comentario,
    usuarioId: linha.usuario_id,
    criadoEm: new Date(linha.criado_em),
  };
}

function paraLinhaEvento(evento: EventoReporte): LinhaEvento {
  return {
    id: evento.id,
    reporte_id: evento.reporteId,
    tipo: evento.tipo,
    status_de: evento.statusDe,
    status_para: evento.statusPara,
    comentario: evento.comentario,
    usuario_id: evento.usuarioId,
    criado_em: evento.criadoEm.toISOString(),
  };
}
