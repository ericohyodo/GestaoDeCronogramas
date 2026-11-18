/** Reportes de erro e sugestões: envio com prints, acompanhamento do administrador e log de alterações. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CriarReporte,
  type DependenciasReportes,
  ListarReportes,
  ObterImagemReporte,
  ObterReporte,
  RegistrarAndamentoReporte,
} from '../../electron/modulos/reportes/aplicacao/casos-de-uso';
import type {
  ArmazenamentoDeImagensReporte,
  UsuarioAtualReporte,
} from '../../electron/modulos/reportes/aplicacao/portas';
import { detectarTipoDeImagem } from '../../electron/modulos/reportes/dominio/reporte';
import { RepositorioReportesSqlite } from '../../electron/modulos/reportes/infraestrutura/repositorio-reportes-sqlite';
import { Usuario } from '../../electron/modulos/usuarios/dominio/usuario';
import { RepositorioUsuariosSqlite } from '../../electron/modulos/usuarios/infraestrutura/repositorio-usuarios-sqlite';
import type { NovaNotificacao } from '../../electron/nucleo/aplicacao/portas/notificador';
import { abrirConexao, type BancoDeDados } from '../../electron/nucleo/infraestrutura/banco/conexao-sqlite';
import { executarMigracoes } from '../../electron/nucleo/infraestrutura/banco/migrador';
import { MIGRACOES } from '../dubles/migracoes-de-teste';
import { GeradorDeIdSequencial, RelogioFixo } from '../dubles/dubles';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString('base64');
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]).toString('base64');
const EXE = Buffer.from('MZ\x90\x00 programa').toString('base64');

/** Prints em memória. */
class ArmazenamentoEmMemoria implements ArmazenamentoDeImagensReporte {
  arquivos = new Map<string, Uint8Array>();
  async gravar(reporteId: string, nomeSeguro: string, bytes: Uint8Array): Promise<string> {
    const nome = `${this.arquivos.size}-${nomeSeguro}`;
    this.arquivos.set(`${reporteId}/${nome}`, bytes);
    return nome;
  }
  async ler(reporteId: string, nome: string): Promise<Uint8Array> {
    return this.arquivos.get(`${reporteId}/${nome}`)!;
  }
  async excluir(reporteId: string, nome: string): Promise<void> {
    this.arquivos.delete(`${reporteId}/${nome}`);
  }
}

describe('reportes de erro e sugestões', () => {
  let db: BancoDeDados;
  let logado: UsuarioAtualReporte | null;
  let notificacoes: NovaNotificacao[];
  let armazenamento: ArmazenamentoEmMemoria;
  let deps: DependenciasReportes;

  const ana: UsuarioAtualReporte = { id: 'u-ana', nome: 'Ana', administrador: false };
  const erico: UsuarioAtualReporte = { id: 'u-erico', nome: 'Erico', administrador: true };

  beforeEach(async () => {
    db = abrirConexao(':memory:');
    executarMigracoes(db, MIGRACOES);
    const relogio = new RelogioFixo();
    const usuarios = new RepositorioUsuariosSqlite(db);
    for (const u of [ana, erico]) {
      await usuarios.salvar(
        Usuario.criar({
          id: u.id,
          nome: u.nome,
          login: u.nome.toLowerCase(),
          senhaHash: 'h',
          perfil: u.administrador ? 'administrador' : 'usuario',
          agora: relogio.agora(),
        }),
      );
    }
    logado = ana;
    notificacoes = [];
    armazenamento = new ArmazenamentoEmMemoria();
    deps = {
      repositorio: new RepositorioReportesSqlite(db),
      acesso: {
        usuarioAtual: () => logado,
        listarNomes: async () => [ana, erico].map(({ id, nome }) => ({ id, nome })),
        listarAdministradores: async () => [erico.id],
      },
      armazenamento,
      base64: {
        decodificar: (b) => new Uint8Array(Buffer.from(b, 'base64')),
        codificar: (bytes) => Buffer.from(bytes).toString('base64'),
      },
      relogio,
      geradorDeId: new GeradorDeIdSequencial('r'),
      notificador: { notificar: async (n) => void notificacoes.push(n) },
      versaoDoApp: '0.5.0',
    };
  });

  afterEach(() => db.close());

  it('qualquer usuário envia um erro com prints; administradores são avisados', async () => {
    const criado = await new CriarReporte(deps).executar({
      tipo: 'erro',
      texto: '  Botão Salvar não responde na aba PCP  ',
      rota: '/avs/detalhe/?id=x',
      imagens: [
        { nomeArquivo: 'print.png', base64: PNG },
        { nomeArquivo: 'outro.jpeg', base64: JPEG },
      ],
    });
    expect(criado.numero).toBe(1);
    expect(armazenamento.arquivos.size).toBe(2);
    expect(notificacoes).toMatchObject([
      { tipo: 'reporte.novo', usuarioIds: [erico.id], titulo: 'Erro reportado #1', link: `/reportes/?id=${criado.id}` },
    ]);

    logado = erico;
    const lista = await new ListarReportes(deps).executar(undefined);
    expect(lista).toMatchObject([
      { numero: 1, tipo: 'erro', status: 'aberto', autor: 'Ana', quantidadeImagens: 2, versaoApp: '0.5.0' },
    ]);
    expect(lista[0]!.texto).toBe('Botão Salvar não responde na aba PCP');

    const detalhe = await new ObterReporte(deps).executar(criado.id);
    expect(detalhe.imagens.map((i) => [i.nomeArquivo, i.tipoMime])).toEqual([
      ['print.png', 'image/png'],
      ['outro.jpeg', 'image/jpeg'],
    ]);
    expect(detalhe.eventos).toMatchObject([{ tipo: 'criado', statusPara: 'aberto', autor: 'Ana' }]);

    const imagem = await new ObterImagemReporte(deps).executar(detalhe.imagens[0]!.id);
    expect(imagem).toMatchObject({ tipoMime: 'image/png', base64: PNG });
  });

  it('numera em sequência', async () => {
    const criar = new CriarReporte(deps);
    await criar.executar({ tipo: 'sugestao', texto: 'A', imagens: [] });
    expect((await criar.executar({ tipo: 'sugestao', texto: 'B', imagens: [] })).numero).toBe(2);
  });

  it('recusa texto vazio, arquivo que não é imagem e prints demais, sem gravar nada', async () => {
    const criar = new CriarReporte(deps);
    await expect(criar.executar({ tipo: 'erro', texto: '   ', imagens: [] })).rejects.toThrow(/obrigatório/);
    await expect(
      criar.executar({ tipo: 'erro', texto: 'X', imagens: [{ nomeArquivo: 'print.png', base64: EXE }] }),
    ).rejects.toThrow(/não é uma imagem/);
    await expect(
      criar.executar({
        tipo: 'erro',
        texto: 'X',
        imagens: Array.from({ length: 4 }, (_, i) => ({ nomeArquivo: `${i}.png`, base64: PNG })),
      }),
    ).rejects.toThrow(/no máximo 3/);
    expect(armazenamento.arquivos.size).toBe(0);
    logado = erico;
    expect(await new ListarReportes(deps).executar(undefined)).toEqual([]);
  });

  it('administrador dá baixa e comenta; tudo vai para o log e quem reportou é avisado', async () => {
    const { id } = await new CriarReporte(deps).executar({ tipo: 'erro', texto: 'Erro', imagens: [] });
    logado = erico;
    notificacoes = [];
    const andamento = new RegistrarAndamentoReporte(deps);

    await andamento.executar({ id, status: 'em_analise' });
    await andamento.executar({ id, status: 'em_analise', comentario: 'Reproduzido na 0.4.0' });
    const final = await andamento.executar({ id, status: 'resolvido', comentario: 'Corrigido na 0.5.0' });

    expect(final.status).toBe('resolvido');
    expect(final.eventos.map((e) => [e.tipo, e.statusDe, e.statusPara, e.comentario, e.autor])).toEqual([
      ['criado', null, 'aberto', null, 'Ana'],
      ['status', 'aberto', 'em_analise', null, 'Erico'],
      ['comentario', null, null, 'Reproduzido na 0.4.0', 'Erico'],
      ['status', 'em_analise', 'resolvido', 'Corrigido na 0.5.0', 'Erico'],
    ]);
    expect(notificacoes).toMatchObject([
      { tipo: 'reporte.status', usuarioIds: [ana.id], titulo: 'Seu reporte #1: resolvido', mensagem: 'Corrigido na 0.5.0' },
    ]);
    expect(await new ListarReportes(deps).executar({ status: 'aberto' })).toEqual([]);
    expect(await new ListarReportes(deps).executar({ status: 'resolvido' })).toHaveLength(1);

    await expect(andamento.executar({ id, status: 'resolvido' })).rejects.toThrow(/outro status ou escreva/);
  });

  it('só administrador lista, abre e dá baixa', async () => {
    const { id } = await new CriarReporte(deps).executar({ tipo: 'erro', texto: 'Erro', imagens: [] });
    await expect(new ListarReportes(deps).executar(undefined)).rejects.toThrow(/administradores/);
    await expect(new ObterReporte(deps).executar(id)).rejects.toThrow(/administradores/);
    await expect(new RegistrarAndamentoReporte(deps).executar({ id, status: 'resolvido' })).rejects.toThrow(
      /administradores/,
    );
    logado = null;
    await expect(new CriarReporte(deps).executar({ tipo: 'erro', texto: 'X', imagens: [] })).rejects.toThrow(/Entre/);
  });

  it('reconhece PNG, JPEG e BMP pela assinatura, não pelo nome', () => {
    expect(detectarTipoDeImagem(Buffer.from(PNG, 'base64'))).toBe('image/png');
    expect(detectarTipoDeImagem(Buffer.from(JPEG, 'base64'))).toBe('image/jpeg');
    expect(detectarTipoDeImagem(new Uint8Array([0x42, 0x4d, ...new Array(30).fill(0)]))).toBe('image/bmp');
    expect(detectarTipoDeImagem(Buffer.from(EXE, 'base64'))).toBeNull();
  });
});
