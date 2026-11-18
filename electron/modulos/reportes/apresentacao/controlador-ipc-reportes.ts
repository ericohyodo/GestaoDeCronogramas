import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { LIMITES_REPORTE, STATUS_REPORTE, TIPOS_REPORTE } from '@contratos/reportes.contrato';
import { esquemaId } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type {
  CriarReporte,
  ListarReportes,
  ObterImagemReporte,
  ObterReporte,
  RegistrarAndamentoReporte,
} from '../aplicacao/casos-de-uso';

export interface CasosDeUsoReportes {
  criar: CriarReporte;
  listar: ListarReportes;
  obter: ObterReporte;
  registrarAndamento: RegistrarAndamentoReporte;
  obterImagem: ObterImagemReporte;
}

// Base64 de até 10 MB: 4 caracteres para cada 3 bytes (mais a folga do preenchimento).
const MAXIMO_BASE64 = Math.ceil(LIMITES_REPORTE.bytesPorImagem / 3) * 4;

const esquemaImagem = z.object({
  nomeArquivo: z.string().trim().min(1).max(200),
  base64: z
    .string()
    .min(1)
    .max(MAXIMO_BASE64, 'Imagem com mais de 10 MB.')
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Imagem em formato inválido.'),
});

/**
 * Registra os canais dos reportes. Enviar é para qualquer pessoa logada (`leitura`); acompanhar e dar
 * baixa é só do administrador.
 */
export function registrarIpcReportes(ipc: RegistradorIpc, casos: CasosDeUsoReportes): void {
  ipc.registrar(
    CANAIS.reportes.criar,
    'leitura',
    z.object({
      tipo: z.enum(TIPOS_REPORTE),
      texto: z.string().max(LIMITES_REPORTE.texto),
      rota: z.string().max(300).nullish(),
      imagens: z.array(esquemaImagem).max(LIMITES_REPORTE.imagens),
    }),
    (entrada) => casos.criar.executar(entrada),
  );
  ipc.registrar(
    CANAIS.reportes.listar,
    'administracao',
    z.object({ status: z.enum(STATUS_REPORTE).optional() }).optional(),
    (filtro) => casos.listar.executar(filtro),
  );
  ipc.registrar(CANAIS.reportes.obter, 'administracao', esquemaId, (id) => casos.obter.executar(id));
  ipc.registrar(
    CANAIS.reportes.registrarAndamento,
    'administracao',
    z.object({
      id: esquemaId,
      status: z.enum(STATUS_REPORTE),
      comentario: z.string().max(LIMITES_REPORTE.comentario).nullish(),
    }),
    (entrada) => casos.registrarAndamento.executar(entrada),
  );
  ipc.registrar(CANAIS.reportes.obterImagem, 'administracao', esquemaId, (id) => casos.obterImagem.executar(id));
}
