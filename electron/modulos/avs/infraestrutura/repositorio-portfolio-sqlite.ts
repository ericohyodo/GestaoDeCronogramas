import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { TipoNoEstrutura } from '../dominio/estrutura-produto';
import type {
  AnexoPortfolio,
  AreaChecagem,
  ChecagemPortfolio,
  CustosDaAvPortfolio,
  ItemPortfolio,
  ItemPortfolioCompleto,
  NoEstruturaPortfolio,
  OperacaoPortfolio,
  RepositorioChecagensPortfolio,
  RepositorioPortfolio,
  ResultadoChecagem,
} from '../dominio/portfolio';

// =====================================================================================================
// Itens de portfólio (templates) e checagens da AV de portfólio no SQLite
// =====================================================================================================

interface LinhaItem {
  id: string;
  codigo: string;
  descricao: string;
  cliente: string | null;
  linha: string | null;
  familia: string | null;
  programa: string | null;
  revisao_desenho: string | null;
  custo_materia_prima: number | null;
  custo_insumos: number | null;
  custo_embalagem: number | null;
  custo_processo: number | null;
  custos_atualizados_em: string | null;
  observacoes: string | null;
  ativo: number;
  criado_em: string;
  criado_por: string | null;
  atualizado_em: string;
  atualizado_por: string | null;
}

interface LinhaNo {
  id: string;
  item_id: string;
  pai_id: string | null;
  ordem: number;
  tipo: TipoNoEstrutura;
  codigo: string | null;
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  pecas_por_embalagem: number | null;
}

interface LinhaOperacao {
  id: string;
  item_id: string;
  ordem: number;
  descricao: string;
  maquina: string | null;
  pecas_hora: number | null;
}

interface LinhaAnexo {
  id: string;
  item_id: string;
  nome_arquivo: string;
  nome_armazenado: string;
  tipo_mime: string | null;
  tamanho_bytes: number;
  usuario_id: string | null;
  criado_em: string;
}

export class RepositorioPortfolioSqlite implements RepositorioPortfolio {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      listarTodos: db.prepare<[], LinhaItem>('SELECT * FROM portfolio_itens ORDER BY codigo'),
      listarAtivos: db.prepare<[], LinhaItem>('SELECT * FROM portfolio_itens WHERE ativo = 1 ORDER BY codigo'),
      obter: db.prepare<[string], LinhaItem>('SELECT * FROM portfolio_itens WHERE id = ?'),
      codigoEmUso: db.prepare<[string, string], { n: number }>(
        'SELECT COUNT(*) AS n FROM portfolio_itens WHERE codigo = ? COLLATE NOCASE AND id <> ?',
      ),
      salvarItem: db.prepare<[LinhaItem]>(`
        INSERT INTO portfolio_itens (
          id, codigo, descricao, cliente, linha, familia, programa, revisao_desenho, custo_materia_prima,
          custo_insumos, custo_embalagem, custo_processo, custos_atualizados_em, observacoes, ativo,
          criado_em, criado_por, atualizado_em, atualizado_por
        ) VALUES (
          @id, @codigo, @descricao, @cliente, @linha, @familia, @programa, @revisao_desenho, @custo_materia_prima,
          @custo_insumos, @custo_embalagem, @custo_processo, @custos_atualizados_em, @observacoes, @ativo,
          @criado_em, @criado_por, @atualizado_em, @atualizado_por
        )
        ON CONFLICT (id) DO UPDATE SET
          codigo = excluded.codigo, descricao = excluded.descricao, cliente = excluded.cliente,
          linha = excluded.linha, familia = excluded.familia, programa = excluded.programa,
          revisao_desenho = excluded.revisao_desenho, custo_materia_prima = excluded.custo_materia_prima,
          custo_insumos = excluded.custo_insumos, custo_embalagem = excluded.custo_embalagem,
          custo_processo = excluded.custo_processo, custos_atualizados_em = excluded.custos_atualizados_em,
          observacoes = excluded.observacoes, ativo = excluded.ativo,
          atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por
      `),
      listarEstrutura: db.prepare<[string], LinhaNo>('SELECT * FROM portfolio_estrutura WHERE item_id = ? ORDER BY ordem'),
      excluirEstrutura: db.prepare<[string]>('DELETE FROM portfolio_estrutura WHERE item_id = ?'),
      inserirNo: db.prepare<[LinhaNo]>(`
        INSERT INTO portfolio_estrutura (id, item_id, pai_id, ordem, tipo, codigo, descricao, quantidade, unidade, pecas_por_embalagem)
        VALUES (@id, @item_id, @pai_id, @ordem, @tipo, @codigo, @descricao, @quantidade, @unidade, @pecas_por_embalagem)
      `),
      listarOperacoes: db.prepare<[string], LinhaOperacao>('SELECT * FROM portfolio_operacoes WHERE item_id = ? ORDER BY ordem'),
      excluirOperacoes: db.prepare<[string]>('DELETE FROM portfolio_operacoes WHERE item_id = ?'),
      inserirOperacao: db.prepare<[LinhaOperacao]>(`
        INSERT INTO portfolio_operacoes (id, item_id, ordem, descricao, maquina, pecas_hora)
        VALUES (@id, @item_id, @ordem, @descricao, @maquina, @pecas_hora)
      `),
      listarAnexos: db.prepare<[string], LinhaAnexo>('SELECT * FROM portfolio_anexos WHERE item_id = ? ORDER BY criado_em'),
      obterAnexo: db.prepare<[string], LinhaAnexo>('SELECT * FROM portfolio_anexos WHERE id = ?'),
      inserirAnexo: db.prepare<[LinhaAnexo]>(`
        INSERT INTO portfolio_anexos (id, item_id, nome_arquivo, nome_armazenado, tipo_mime, tamanho_bytes, usuario_id, criado_em)
        VALUES (@id, @item_id, @nome_arquivo, @nome_armazenado, @tipo_mime, @tamanho_bytes, @usuario_id, @criado_em)
      `),
      excluirAnexo: db.prepare<[string]>('DELETE FROM portfolio_anexos WHERE id = ?'),
    };
  }

  async listar(apenasAtivos: boolean): Promise<ItemPortfolio[]> {
    return (apenasAtivos ? this.sql.listarAtivos : this.sql.listarTodos).all().map(paraItem);
  }

  async obter(id: string): Promise<ItemPortfolioCompleto | null> {
    const linha = this.sql.obter.get(id);
    if (!linha) return null;
    return {
      item: paraItem(linha),
      estrutura: this.sql.listarEstrutura.all(id).map(paraNo),
      operacoes: this.sql.listarOperacoes.all(id).map(paraOperacao),
    };
  }

  async codigoEmUso(codigo: string, excetoId: string | null): Promise<boolean> {
    return this.sql.codigoEmUso.get(codigo, excetoId ?? '')!.n > 0;
  }

  async salvar(dados: ItemPortfolioCompleto): Promise<void> {
    const { item } = dados;
    this.db.transaction(() => {
      this.sql.salvarItem.run({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        cliente: item.cliente,
        linha: item.linha,
        familia: item.familia,
        programa: item.programa,
        revisao_desenho: item.revisaoDesenho,
        custo_materia_prima: item.materiaPrima,
        custo_insumos: item.insumos,
        custo_embalagem: item.embalagem,
        custo_processo: item.processo,
        custos_atualizados_em: item.custosAtualizadosEm,
        observacoes: item.observacoes,
        ativo: item.ativo ? 1 : 0,
        criado_em: item.criadoEm.toISOString(),
        criado_por: item.criadoPor,
        atualizado_em: item.atualizadoEm.toISOString(),
        atualizado_por: item.atualizadoPor,
      });
      // Pai antes dos filhos (ordem da árvore): a chave estrangeira do pai já existe ao inserir.
      this.sql.excluirEstrutura.run(item.id);
      for (const no of dados.estrutura) {
        this.sql.inserirNo.run({
          id: no.id,
          item_id: item.id,
          pai_id: no.paiId,
          ordem: no.ordem,
          tipo: no.tipo,
          codigo: no.codigo,
          descricao: no.descricao,
          quantidade: no.quantidade,
          unidade: no.unidade,
          pecas_por_embalagem: no.pecasPorEmbalagem,
        });
      }
      this.sql.excluirOperacoes.run(item.id);
      for (const operacao of dados.operacoes) {
        this.sql.inserirOperacao.run({
          id: operacao.id,
          item_id: item.id,
          ordem: operacao.ordem,
          descricao: operacao.descricao,
          maquina: operacao.maquina,
          pecas_hora: operacao.pecasHora,
        });
      }
    })();
  }

  async listarAnexos(itemId: string): Promise<AnexoPortfolio[]> {
    return this.sql.listarAnexos.all(itemId).map(paraAnexo);
  }

  async obterAnexo(id: string): Promise<AnexoPortfolio | null> {
    const linha = this.sql.obterAnexo.get(id);
    return linha ? paraAnexo(linha) : null;
  }

  async inserirAnexo(anexo: AnexoPortfolio): Promise<void> {
    this.sql.inserirAnexo.run({
      id: anexo.id,
      item_id: anexo.itemId,
      nome_arquivo: anexo.nomeArquivo,
      nome_armazenado: anexo.nomeArmazenado,
      tipo_mime: anexo.tipoMime,
      tamanho_bytes: anexo.tamanhoBytes,
      usuario_id: anexo.usuarioId,
      criado_em: anexo.criadoEm.toISOString(),
    });
  }

  async excluirAnexo(id: string): Promise<void> {
    this.sql.excluirAnexo.run(id);
  }
}

function paraItem(linha: LinhaItem): ItemPortfolio {
  return {
    id: linha.id,
    codigo: linha.codigo,
    descricao: linha.descricao,
    cliente: linha.cliente,
    linha: linha.linha,
    familia: linha.familia,
    programa: linha.programa,
    revisaoDesenho: linha.revisao_desenho,
    materiaPrima: linha.custo_materia_prima,
    insumos: linha.custo_insumos,
    embalagem: linha.custo_embalagem,
    processo: linha.custo_processo,
    custosAtualizadosEm: linha.custos_atualizados_em,
    observacoes: linha.observacoes,
    ativo: linha.ativo === 1,
    criadoEm: new Date(linha.criado_em),
    criadoPor: linha.criado_por,
    atualizadoEm: new Date(linha.atualizado_em),
    atualizadoPor: linha.atualizado_por,
  };
}

function paraNo(linha: LinhaNo): NoEstruturaPortfolio {
  return {
    id: linha.id,
    itemId: linha.item_id,
    paiId: linha.pai_id,
    ordem: linha.ordem,
    tipo: linha.tipo,
    codigo: linha.codigo,
    descricao: linha.descricao,
    quantidade: linha.quantidade,
    unidade: linha.unidade,
    pecasPorEmbalagem: linha.pecas_por_embalagem,
  };
}

function paraOperacao(linha: LinhaOperacao): OperacaoPortfolio {
  return {
    id: linha.id,
    itemId: linha.item_id,
    ordem: linha.ordem,
    descricao: linha.descricao,
    maquina: linha.maquina,
    pecasHora: linha.pecas_hora,
  };
}

function paraAnexo(linha: LinhaAnexo): AnexoPortfolio {
  return {
    id: linha.id,
    itemId: linha.item_id,
    nomeArquivo: linha.nome_arquivo,
    nomeArmazenado: linha.nome_armazenado,
    tipoMime: linha.tipo_mime,
    tamanhoBytes: linha.tamanho_bytes,
    usuarioId: linha.usuario_id,
    criadoEm: new Date(linha.criado_em),
  };
}

// --- Checagens e custos da AV de portfólio ----------------------------------------------------------

interface LinhaChecagem {
  av_id: string;
  area: AreaChecagem;
  resultado: ResultadoChecagem;
  observacao: string | null;
  atualizado_em: string;
  atualizado_por: string | null;
}

interface LinhaCustos {
  av_id: string;
  ref_materia_prima: number | null;
  ref_insumos: number | null;
  ref_embalagem: number | null;
  ref_processo: number | null;
  ref_atualizados_em: string | null;
  novo_materia_prima: number | null;
  novo_insumos: number | null;
  novo_embalagem: number | null;
  novo_processo: number | null;
  atualizado_em: string;
  atualizado_por: string | null;
}

export class RepositorioChecagensPortfolioSqlite implements RepositorioChecagensPortfolio {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[string], LinhaChecagem>('SELECT * FROM av_portfolio_checagens WHERE av_id = ?'),
      salvar: db.prepare<[LinhaChecagem]>(`
        INSERT INTO av_portfolio_checagens (av_id, area, resultado, observacao, atualizado_em, atualizado_por)
        VALUES (@av_id, @area, @resultado, @observacao, @atualizado_em, @atualizado_por)
        ON CONFLICT (av_id, area) DO UPDATE SET
          resultado = excluded.resultado, observacao = excluded.observacao,
          atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por
      `),
      obterCustos: db.prepare<[string], LinhaCustos>('SELECT * FROM av_portfolio_custos WHERE av_id = ?'),
      salvarCustos: db.prepare<[LinhaCustos]>(`
        INSERT INTO av_portfolio_custos (
          av_id, ref_materia_prima, ref_insumos, ref_embalagem, ref_processo, ref_atualizados_em,
          novo_materia_prima, novo_insumos, novo_embalagem, novo_processo, atualizado_em, atualizado_por
        ) VALUES (
          @av_id, @ref_materia_prima, @ref_insumos, @ref_embalagem, @ref_processo, @ref_atualizados_em,
          @novo_materia_prima, @novo_insumos, @novo_embalagem, @novo_processo, @atualizado_em, @atualizado_por
        )
        ON CONFLICT (av_id) DO UPDATE SET
          ref_materia_prima = excluded.ref_materia_prima, ref_insumos = excluded.ref_insumos,
          ref_embalagem = excluded.ref_embalagem, ref_processo = excluded.ref_processo,
          ref_atualizados_em = excluded.ref_atualizados_em, novo_materia_prima = excluded.novo_materia_prima,
          novo_insumos = excluded.novo_insumos, novo_embalagem = excluded.novo_embalagem,
          novo_processo = excluded.novo_processo, atualizado_em = excluded.atualizado_em,
          atualizado_por = excluded.atualizado_por
      `),
    };
  }

  async listar(avId: string): Promise<ChecagemPortfolio[]> {
    return this.sql.listar.all(avId).map((linha) => ({
      avId: linha.av_id,
      area: linha.area,
      resultado: linha.resultado,
      observacao: linha.observacao,
      atualizadoEm: new Date(linha.atualizado_em),
      atualizadoPor: linha.atualizado_por,
    }));
  }

  async salvar(checagem: ChecagemPortfolio): Promise<void> {
    this.sql.salvar.run({
      av_id: checagem.avId,
      area: checagem.area,
      resultado: checagem.resultado,
      observacao: checagem.observacao,
      atualizado_em: checagem.atualizadoEm.toISOString(),
      atualizado_por: checagem.atualizadoPor,
    });
  }

  async obterCustos(avId: string): Promise<CustosDaAvPortfolio | null> {
    const linha = this.sql.obterCustos.get(avId);
    if (!linha) return null;
    return {
      avId: linha.av_id,
      referencia: {
        materiaPrima: linha.ref_materia_prima,
        insumos: linha.ref_insumos,
        embalagem: linha.ref_embalagem,
        processo: linha.ref_processo,
        atualizadosEm: linha.ref_atualizados_em,
      },
      novos: {
        materiaPrima: linha.novo_materia_prima,
        insumos: linha.novo_insumos,
        embalagem: linha.novo_embalagem,
        processo: linha.novo_processo,
      },
      atualizadoEm: new Date(linha.atualizado_em),
      atualizadoPor: linha.atualizado_por,
    };
  }

  async salvarCustos(custos: CustosDaAvPortfolio): Promise<void> {
    this.sql.salvarCustos.run({
      av_id: custos.avId,
      ref_materia_prima: custos.referencia.materiaPrima,
      ref_insumos: custos.referencia.insumos,
      ref_embalagem: custos.referencia.embalagem,
      ref_processo: custos.referencia.processo,
      ref_atualizados_em: custos.referencia.atualizadosEm,
      novo_materia_prima: custos.novos.materiaPrima,
      novo_insumos: custos.novos.insumos,
      novo_embalagem: custos.novos.embalagem,
      novo_processo: custos.novos.processo,
      atualizado_em: custos.atualizadoEm.toISOString(),
      atualizado_por: custos.atualizadoPor,
    });
  }
}
