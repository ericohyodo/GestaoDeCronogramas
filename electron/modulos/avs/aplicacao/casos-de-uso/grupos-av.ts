import {
  QUANTIDADE_MAXIMA_DO_GRUPO,
  QUANTIDADE_MINIMA_DO_GRUPO,
  type AplicarAoGrupoEntrada,
  type AplicarAoGrupoSaida,
  type CriarGrupoAvEntrada,
  type GrupoAvDTO,
} from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio, ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import type { Av, CamposComerciaisAv } from '../../dominio/av';
import { obterEtapaAv } from '../../dominio/etapa-av';
import { validarNomeDoGrupo, type GrupoAv, type RepositorioGruposAv } from '../../dominio/grupo-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { RepositorioContatosAv } from '../../dominio/contato-av';
import type { AutorizacaoAv } from '../autorizacao';
import type { CriarAv } from './criar-av';

function paraGrupoDTO(grupo: GrupoAv, avs: Av[]): GrupoAvDTO {
  return {
    id: grupo.id,
    nome: grupo.nome,
    criadoEm: grupo.criadoEm.toISOString(),
    avs: avs
      .filter((av) => av.grupoId === grupo.id)
      .sort((a, b) => a.ano - b.ano || a.sequencial - b.sequencial)
      .map((av) => ({
        id: av.id,
        numero: av.numero,
        cliente: av.cliente,
        descricao: av.descricao,
        etapaAtual: obterEtapaAv(av.etapaAtual),
      })),
  };
}

export class ListarGruposAv implements CasoDeUso<void, GrupoAvDTO[]> {
  constructor(
    private readonly grupos: RepositorioGruposAv,
    private readonly avs: RepositorioAvs,
    private readonly autorizacao: AutorizacaoAv,
  ) {}

  async executar(): Promise<GrupoAvDTO[]> {
    this.autorizacao.exigirAutenticado();
    const [grupos, avs] = await Promise.all([this.grupos.listar(), this.avs.listar()]);
    return grupos.map((grupo) => paraGrupoDTO(grupo, avs));
  }
}

/**
 * Cria um grupo e `quantidade` AVs normais (vazias, com a descrição "<grupo> — i/N") vinculadas a ele.
 * Cada AV depois é preenchida como qualquer outra; o vínculo serve para aplicar dados às demais.
 * Como abrir uma AV, exige a competência 'comercial'.
 */
export class CriarGrupoDeAvs implements CasoDeUso<CriarGrupoAvEntrada, GrupoAvDTO> {
  constructor(
    private readonly grupos: RepositorioGruposAv,
    private readonly avs: RepositorioAvs,
    private readonly criarAv: CriarAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarGrupoAvEntrada): Promise<GrupoAvDTO> {
    const usuario = await this.autorizacao.exigirCompetencia('comercial');
    const nome = validarNomeDoGrupo(entrada.nome);
    const { quantidade } = entrada;
    if (
      !Number.isInteger(quantidade) ||
      quantidade < QUANTIDADE_MINIMA_DO_GRUPO ||
      quantidade > QUANTIDADE_MAXIMA_DO_GRUPO
    ) {
      throw new ErroDeValidacao(
        `A quantidade de AVs do grupo deve ficar entre ${QUANTIDADE_MINIMA_DO_GRUPO} e ${QUANTIDADE_MAXIMA_DO_GRUPO}.`,
      );
    }
    if (await this.grupos.obterPorNome(nome)) {
      throw new ErroDeValidacao(`Já existe um grupo chamado "${nome}".`);
    }

    const avIds: string[] = [];
    for (let indice = 1; indice <= quantidade; indice += 1) {
      const criada = await this.criarAv.executar({ descricao: `${nome} — ${indice}/${quantidade}` });
      avIds.push(criada.id);
    }

    const grupo: GrupoAv = {
      id: this.geradorDeId.gerar(),
      nome,
      criadoPor: usuario.id,
      criadoEm: this.relogio.agora(),
    };
    await this.grupos.salvar(grupo, avIds);
    return paraGrupoDTO(grupo, await this.avs.listar());
  }
}

/** Campos comerciais herdados do grupo. Ficam de fora os que mudam de produto para produto
 * (descrição, código do cliente, volume anual, linha e programa: ver `CAMPOS_DO_PRODUTO`). */
const CAMPOS_COMERCIAIS_DO_GRUPO = [
  'cliente',
  'solicitante',
  'prazoCliente',
  'anoSopEop',
  'origemProjeto',
  'familia',
  'localEntrega',
  'conceitoLogistico',
  'respEmbalagem',
  'infoComplementarComercial',
] as const satisfies readonly (keyof Omit<CamposComerciaisAv, 'descricao'>)[];

/**
 * Copia da AV informada (já salva) para as demais AVs abertas do grupo. Só os campos preenchidos
 * são copiados, então nunca apaga o que a outra AV já tem. AVs encerradas, ou onde a pessoa não
 * pode editar o Comercial, são ignoradas e listadas no retorno.
 */
export class AplicarAoGrupo implements CasoDeUso<AplicarAoGrupoEntrada, AplicarAoGrupoSaida> {
  constructor(
    private readonly avs: RepositorioAvs,
    private readonly autorizacao: AutorizacaoAv,
    private readonly contatos: RepositorioContatosAv,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: AplicarAoGrupoEntrada): Promise<AplicarAoGrupoSaida> {
    const origem = await this.avs.obterPorId(entrada.avId);
    if (!origem) throw new ErroNaoEncontrado('AV');
    if (!origem.grupoId) throw new ErroDeDominio('AV_SEM_GRUPO', 'Esta AV não pertence a nenhum grupo.');
    await this.autorizacao.exigirEdicaoDaArea(origem, 'comercial');

    const destinos = (await this.avs.listar()).filter(
      (av) => av.grupoId === origem.grupoId && av.id !== origem.id,
    );
    const saida: AplicarAoGrupoSaida = { aplicadas: 0, ignoradas: [] };
    const contatosDaOrigem = entrada.secao === 'comercial' ? await this.contatos.listar(origem.id) : [];

    for (const destino of destinos) {
      if (obterEtapaAv(destino.etapaAtual).terminal) {
        saida.ignoradas.push({ numero: destino.numero, motivo: 'AV já encerrada' });
        continue;
      }
      try {
        await this.autorizacao.exigirEdicaoDaArea(destino, 'comercial');
      } catch {
        saida.ignoradas.push({ numero: destino.numero, motivo: 'sem permissão no Comercial desta AV' });
        continue;
      }

      if (entrada.secao === 'comercial') {
        const campos: Partial<CamposComerciaisAv> = {};
        for (const campo of CAMPOS_COMERCIAIS_DO_GRUPO) {
          const valor = origem[campo];
          if (valor !== null && valor !== '') (campos as Record<string, unknown>)[campo] = valor;
        }
        // Na primeira herança, os campos do produto são esvaziados e ficam em alerta para preenchimento manual
        // (depois disso, reaplicar não apaga o que a pessoa já preencheu).
        if (destino.camposPendentes === null) destino.marcarHerdadoDoGrupo();
        destino.atualizarComercial(campos);
        // A lista de contatos da origem substitui a do destino (só se a origem tiver algum).
        if (contatosDaOrigem.length > 0) {
          await this.contatos.substituir(
            destino.id,
            contatosDaOrigem.map((contato) => ({ ...contato, id: this.geradorDeId.gerar(), avId: destino.id })),
          );
        }
      } else {
        destino.atualizarEquipe(origem.membros);
      }
      await this.avs.salvar(destino);
      saida.aplicadas += 1;
    }
    return saida;
  }
}
