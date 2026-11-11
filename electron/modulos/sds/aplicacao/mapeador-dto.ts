import type { AnexoSdDTO, SdDTO } from '@contratos/sds.contrato';
import type { AnexoSd } from '../dominio/repositorio-sds';
import { trocarPrefixoDoNumero, type SdListada } from '../dominio/sd';

/** Chave da SD no controle de versão (gravação otimista). */
export const chaveDaSd = (sdId: string) => `sd:${sdId}`;

const nomeDe = (nomes: Map<string, string>, id: string | null) => (id ? (nomes.get(id) ?? null) : null);
const iso = (data: Date | null) => (data ? data.toISOString() : null);

/**
 * @param listada SD com os dados da AV de origem
 * @param nomes id → nome dos usuários (para "aberta por", "aceite por"…)
 * @param versao versão atual da SD no controle de versão
 */
export function paraSdDTO(listada: SdListada, nomes: Map<string, string>, versao: number): SdDTO {
  const { sd } = listada;
  return {
    id: sd.id,
    numero: sd.numero,
    avId: sd.avId,
    avNumero: listada.avNumero,
    cliente: listada.cliente,
    descricao: listada.descricao,
    status: sd.status,
    numeroProjeto: listada.codigoProjeto ?? trocarPrefixoDoNumero(listada.avNumero, 'PRO'),
    criadoEm: sd.criadoEm.toISOString(),
    dataEnvioCotacao: sd.dataEnvioCotacao,
    numeroPo: sd.numeroPo,
    observacoes: sd.observacoes,
    responsavelComercialId: listada.responsavelComercialId,
    responsavelComercialNome: nomeDe(nomes, listada.responsavelComercialId),
    abertaPorNome: nomeDe(nomes, sd.abertaPor),
    abertaEm: iso(sd.abertaEm),
    aceitePorNome: nomeDe(nomes, sd.aceitePor),
    aceiteEm: iso(sd.aceiteEm),
    parecerAceite: sd.parecerAceite,
    devolucaoMotivo: sd.devolucaoMotivo,
    devolucaoPorNome: nomeDe(nomes, sd.devolucaoPor),
    devolucaoEm: iso(sd.devolucaoEm),
    cronogramaId: sd.cronogramaId,
    versao,
  };
}

export function paraAnexoSdDTO(anexo: AnexoSd, nomes: Map<string, string>): AnexoSdDTO {
  return {
    id: anexo.id,
    nomeArquivo: anexo.nomeArquivo,
    tipoMime: anexo.tipoMime,
    tamanhoBytes: anexo.tamanhoBytes,
    usuarioNome: nomeDe(nomes, anexo.usuarioId),
    criadoEm: anexo.criadoEm.toISOString(),
  };
}
