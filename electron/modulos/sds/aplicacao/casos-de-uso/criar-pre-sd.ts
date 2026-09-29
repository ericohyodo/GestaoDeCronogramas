import type { SdDTO } from '@contratos/sds.contrato';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { trocarPrefixoDoNumero } from '../../dominio/sd';
import type { RepositorioSds } from '../../dominio/repositorio-sds';
import { paraSdDTO } from '../mapeador-dto';

export interface CriarPreSdEntrada {
  avId: string;
  avNumero: string;
  usuarioId: string | null;
}

/** Comando interno: quem decide se a AV pode virar SD é o módulo de AVs; aqui só nasce a SD. */
export class CriarPreSd {
  constructor(
    private readonly repositorio: RepositorioSds,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
  ) {}

  async executar(entrada: CriarPreSdEntrada): Promise<SdDTO> {
    if (await this.repositorio.obterPorAv(entrada.avId)) {
      throw new ErroDeDominio('SD_JA_EXISTE', 'Esta AV já tem uma SD.');
    }
    await this.repositorio.salvar({
      id: this.geradorDeId.gerar(),
      avId: entrada.avId,
      numero: trocarPrefixoDoNumero(entrada.avNumero, 'SD'),
      status: 'pre_sd',
      criadoPor: entrada.usuarioId,
      criadoEm: this.relogio.agora(),
    });
    const criada = await this.repositorio.obterPorAv(entrada.avId);
    return paraSdDTO(criada!);
  }
}
