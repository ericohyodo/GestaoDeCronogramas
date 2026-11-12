import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import {
  type AreaComPrazo,
  AREAS_COM_PRAZO,
  type ConfigPrazos,
  DIAS_UTEIS_PADRAO,
  type PrazoArea,
  type RepositorioConfigPrazos,
  type RepositorioPrazosArea,
} from '../dominio/prazo-area';

interface LinhaPrazo {
  id: string;
  av_id: string;
  etapa: number;
  area: AreaComPrazo;
  dias_uteis: number;
  iniciada_em: string;
  data_limite: string;
  entregue_em: string | null;
}

const paraPrazo = (linha: LinhaPrazo): PrazoArea => ({
  id: linha.id,
  avId: linha.av_id,
  etapa: linha.etapa,
  area: linha.area,
  diasUteis: linha.dias_uteis,
  iniciadaEm: new Date(linha.iniciada_em),
  dataLimite: linha.data_limite,
  entregueEm: linha.entregue_em ? new Date(linha.entregue_em) : null,
});

/** Prazos das áreas da AV (tabela `av_prazos_area`). */
export class RepositorioPrazosAreaSqlite implements RepositorioPrazosArea {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      abrir: db.prepare<[LinhaPrazo]>(`
        INSERT OR IGNORE INTO av_prazos_area (id, av_id, etapa, area, dias_uteis, iniciada_em, data_limite, entregue_em)
        VALUES (@id, @av_id, @etapa, @area, @dias_uteis, @iniciada_em, @data_limite, @entregue_em)
      `),
      entregar: db.prepare<[string, string, number]>(
        'UPDATE av_prazos_area SET entregue_em = ? WHERE av_id = ? AND etapa = ? AND entregue_em IS NULL',
      ),
      obterAberto: db.prepare<[string, number], LinhaPrazo>(
        'SELECT * FROM av_prazos_area WHERE av_id = ? AND etapa = ? AND entregue_em IS NULL',
      ),
      listarAbertos: db.prepare<[], LinhaPrazo>(
        'SELECT * FROM av_prazos_area WHERE entregue_em IS NULL ORDER BY data_limite',
      ),
      redefinirLimite: db.prepare<[string, string, number]>(
        'UPDATE av_prazos_area SET data_limite = ? WHERE av_id = ? AND etapa = ? AND entregue_em IS NULL',
      ),
      listarEntreguesDesde: db.prepare<[string], LinhaPrazo>(
        'SELECT * FROM av_prazos_area WHERE entregue_em IS NOT NULL AND entregue_em >= ? ORDER BY entregue_em',
      ),
    };
  }

  async abrir(prazo: PrazoArea): Promise<void> {
    this.sql.abrir.run({
      id: prazo.id,
      av_id: prazo.avId,
      etapa: prazo.etapa,
      area: prazo.area,
      dias_uteis: prazo.diasUteis,
      iniciada_em: prazo.iniciadaEm.toISOString(),
      data_limite: prazo.dataLimite,
      entregue_em: prazo.entregueEm ? prazo.entregueEm.toISOString() : null,
    });
  }

  async entregar(avId: string, etapa: number, instante: Date): Promise<void> {
    this.sql.entregar.run(instante.toISOString(), avId, etapa);
  }

  async obterAberto(avId: string, etapa: number): Promise<PrazoArea | null> {
    const linha = this.sql.obterAberto.get(avId, etapa);
    return linha ? paraPrazo(linha) : null;
  }

  async listarAbertos(): Promise<PrazoArea[]> {
    return this.sql.listarAbertos.all().map(paraPrazo);
  }

  async redefinirLimite(avId: string, etapa: number, dataLimite: string): Promise<void> {
    this.sql.redefinirLimite.run(dataLimite, avId, etapa);
  }

  async listarEntreguesDesde(desdeIso: string): Promise<PrazoArea[]> {
    return this.sql.listarEntreguesDesde.all(desdeIso).map(paraPrazo);
  }
}

/** Dias úteis de cada área (tabela `av_prazo_config`); área ausente usa o padrão de 3. */
export class RepositorioConfigPrazosSqlite implements RepositorioConfigPrazos {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obter: db.prepare<[], { area: AreaComPrazo; dias_uteis: number }>('SELECT area, dias_uteis FROM av_prazo_config'),
      salvar: db.prepare<[{ area: string; dias_uteis: number; atualizado_em: string; atualizado_por: string }]>(`
        INSERT INTO av_prazo_config (area, dias_uteis, atualizado_em, atualizado_por)
        VALUES (@area, @dias_uteis, @atualizado_em, @atualizado_por)
        ON CONFLICT (area) DO UPDATE SET
          dias_uteis = excluded.dias_uteis,
          atualizado_em = excluded.atualizado_em,
          atualizado_por = excluded.atualizado_por
      `),
    };
  }

  async obter(): Promise<ConfigPrazos> {
    const valores = Object.fromEntries(AREAS_COM_PRAZO.map((area) => [area, DIAS_UTEIS_PADRAO])) as ConfigPrazos;
    for (const linha of this.sql.obter.all()) valores[linha.area] = linha.dias_uteis;
    return valores;
  }

  async salvar(valores: ConfigPrazos, usuarioId: string, instante: Date): Promise<void> {
    const gravar = this.db.transaction(() => {
      for (const area of AREAS_COM_PRAZO) {
        this.sql.salvar.run({
          area,
          dias_uteis: valores[area],
          atualizado_em: instante.toISOString(),
          atualizado_por: usuarioId,
        });
      }
    });
    gravar();
  }
}
