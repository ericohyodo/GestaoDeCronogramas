import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RepositorioTemplatesAv, TemplateAv, TipoTemplateAv } from '../dominio/template-av';

interface LinhaTemplate {
  id: string;
  tipo: TipoTemplateAv;
  nome: string;
  itens: string;
  usuario_id: string | null;
  criado_em: string;
}

export class RepositorioTemplatesAvSqlite implements RepositorioTemplatesAv {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[string], LinhaTemplate>(
        'SELECT * FROM av_templates WHERE tipo = ? ORDER BY nome COLLATE NOCASE',
      ),
      obterPorNome: db.prepare<[string, string], LinhaTemplate>(
        'SELECT * FROM av_templates WHERE tipo = ? AND nome = ? COLLATE NOCASE',
      ),
      inserir: db.prepare<[LinhaTemplate]>(`
        INSERT INTO av_templates (id, tipo, nome, itens, usuario_id, criado_em)
        VALUES (@id, @tipo, @nome, @itens, @usuario_id, @criado_em)
      `),
      atualizar: db.prepare<[string, string, string, string]>(
        'UPDATE av_templates SET nome = ?, itens = ?, criado_em = ? WHERE id = ?',
      ),
      excluir: db.prepare<[string]>('DELETE FROM av_templates WHERE id = ?'),
    };
  }

  async listar(tipo: TipoTemplateAv): Promise<TemplateAv[]> {
    return this.sql.listar.all(tipo).map(paraEntidade);
  }

  async salvar(template: TemplateAv): Promise<TemplateAv> {
    const existente = this.sql.obterPorNome.get(template.tipo, template.nome);
    const itens = JSON.stringify(template.itens);
    const criadoEm = template.criadoEm.toISOString();
    if (existente) {
      this.sql.atualizar.run(template.nome, itens, criadoEm, existente.id);
      return { ...template, id: existente.id };
    }
    this.sql.inserir.run({
      id: template.id,
      tipo: template.tipo,
      nome: template.nome,
      itens,
      usuario_id: template.usuarioId,
      criado_em: criadoEm,
    });
    return template;
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }
}

function paraEntidade(linha: LinhaTemplate): TemplateAv {
  return {
    id: linha.id,
    tipo: linha.tipo,
    nome: linha.nome,
    itens: JSON.parse(linha.itens) as unknown[],
    usuarioId: linha.usuario_id,
    criadoEm: new Date(linha.criado_em),
  };
}
