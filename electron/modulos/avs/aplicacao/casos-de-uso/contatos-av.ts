import type { ContatoAvDTO, SalvarContatosAvEntrada } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import { normalizarContato, type ContatoAv, type RepositorioContatosAv } from '../../dominio/contato-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';

function paraContatoDTO(contato: ContatoAv): ContatoAvDTO {
  return { id: contato.id, nome: contato.nome, area: contato.area, telefone: contato.telefone, email: contato.email };
}

export class ObterContatosAv implements CasoDeUso<string, ContatoAvDTO[]> {
  constructor(
    private readonly contatos: RepositorioContatosAv,
    private readonly autorizacao: AutorizacaoAv,
  ) {}

  async executar(avId: string): Promise<ContatoAvDTO[]> {
    this.autorizacao.exigirAutenticado();
    return (await this.contatos.listar(avId)).map(paraContatoDTO);
  }
}

/** Contatos fazem parte da aba Comercial: só quem responde por ela (ou administrador) altera. */
export class SalvarContatosAv implements CasoDeUso<SalvarContatosAvEntrada, ContatoAvDTO[]> {
  constructor(
    private readonly avs: RepositorioAvs,
    private readonly contatos: RepositorioContatosAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: SalvarContatosAvEntrada): Promise<ContatoAvDTO[]> {
    const av = await this.avs.obterPorId(entrada.avId);
    if (!av) throw new ErroNaoEncontrado('AV');
    await this.autorizacao.exigirEdicaoDaArea(av, 'comercial');

    const lista: ContatoAv[] = entrada.contatos.map((dados, ordem) => ({
      id: this.geradorDeId.gerar(),
      avId: av.id,
      ordem,
      ...normalizarContato(dados),
    }));
    await this.contatos.substituir(av.id, lista);
    return lista.map(paraContatoDTO);
  }
}
