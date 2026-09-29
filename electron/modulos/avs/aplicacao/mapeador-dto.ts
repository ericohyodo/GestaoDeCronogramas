import type { AreaAvDTO, AvDetalheDTO, AvResumoDTO, MembroAreaDTO } from '@contratos/avs.contrato';
import { AREAS_AV } from '@contratos/avs.contrato';
import type { Av } from '../dominio/av';
import { obterEtapaAv } from '../dominio/etapa-av';

export function construirMapaDeNomes(usuarios: { id: string; nome: string }[]): Map<string, string> {
  return new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));
}

function paraMembros(av: Av, nomesPorId: Map<string, string>): Partial<Record<AreaAvDTO, MembroAreaDTO>> {
  const resultado: Partial<Record<AreaAvDTO, MembroAreaDTO>> = {};
  const membros = av.membros;
  for (const area of AREAS_AV) {
    const id = membros[area];
    if (id) resultado[area] = { id, nome: nomesPorId.get(id) ?? id };
  }
  return resultado;
}

export function paraAvResumoDTO(av: Av, nomesPorId: Map<string, string>): AvResumoDTO {
  return {
    id: av.id,
    numero: av.numero,
    cliente: av.cliente,
    descricao: av.descricao,
    complexidade: av.complexidade,
    prazoCliente: av.prazoCliente,
    etapaAtual: obterEtapaAv(av.etapaAtual),
    membros: paraMembros(av, nomesPorId),
    propostaEnviada: av.propostaEnviada,
    criadoEm: av.criadoEm.toISOString(),
    grupo: av.grupoId ? { id: av.grupoId, nome: av.grupoNome ?? '' } : null,
  };
}

export function paraAvDetalheDTO(av: Av, nomesPorId: Map<string, string>): AvDetalheDTO {
  return {
    ...paraAvResumoDTO(av, nomesPorId),
    camposPendentes: av.camposPendentes ?? [],
    criadoPorNome: av.criadoPor ? (nomesPorId.get(av.criadoPor) ?? null) : null,
    codigo: av.codigo,
    solicitante: av.solicitante,
    desenhoClienteRef: av.desenhoClienteRef,
    contatoComercial: av.contatoComercial,
    emailComercial: av.emailComercial,
    foneComercial: av.foneComercial,
    contatoTecnico: av.contatoTecnico,
    dataFechamento: av.dataFechamento,
    programa: av.programa,
    volumeAnual: av.volumeAnual,
    anoSopEop: av.anoSopEop,
    respAbertura: av.respAbertura,
    linha: av.linha,
    origemProjeto: av.origemProjeto,
    familia: av.familia,
    localEntrega: av.localEntrega,
    conceitoLogistico: av.conceitoLogistico,
    respEmbalagem: av.respEmbalagem,
    infoComplementarComercial: av.infoComplementarComercial,
    dataProposta: av.dataProposta ? av.dataProposta.toISOString() : null,
    cronogramaId: av.cronogramaId,
  };
}
