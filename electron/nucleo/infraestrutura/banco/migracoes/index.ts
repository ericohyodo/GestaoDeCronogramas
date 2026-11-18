import type { Migracao } from '../migrador';
import { migracao0001 } from './0001-cronogramas';
import { migracao0002 } from './0002-tarefas';
import { migracao0003 } from './0003-preferencias';
import { migracao0004 } from './0004-usuarios';
import { migracao0005 } from './0005-responsaveis';
import { migracao0006 } from './0006-fases-e-dependencias';
import { migracao0007 } from './0007-evidencia-das-tarefas';
import { migracao0008 } from './0008-configuracao-ia';
import { migracao0009 } from './0009-arquivo-de-analises';
import { migracao0010 } from './0010-data-efetiva-das-tarefas';
import { migracao0011 } from './0011-avs-perfil-usuario';
import { migracao0012 } from './0012-avs-nucleo';
import { migracao0013 } from './0013-avs-mapa-de-custo';
import { migracao0014 } from './0014-avs-eng-produto-processo';
import { migracao0015 } from './0015-avs-catalogo-materiais';
import { migracao0016 } from './0016-avs-links-de-evidencia';
import { migracao0017 } from './0017-avs-anexos';
import { migracao0018 } from './0018-avs-operacoes-e-templates';
import { migracao0019 } from './0019-sds';
import { migracao0020 } from './0020-avs-grupos';
import { migracao0021 } from './0021-presenca-de-usuarios';
import { migracao0022 } from './0022-avs-contatos';
import { migracao0023 } from './0023-avs-familia';
import { migracao0024 } from './0024-avs-campos-pendentes';
import { migracao0025 } from './0025-avs-pcp-e-complexidade';
import { migracao0026 } from './0026-ia-analises-de-avs';
import { migracao0027 } from './0027-avs-estrutura-de-produto';
import { migracao0028 } from './0028-avs-estrutura-com-componentes';
import { migracao0029 } from './0029-avs-estrutura-materia-prima';
import { migracao0030 } from './0030-controle-de-versao';
import { migracao0031 } from './0031-numeracao-unificada';
import { migracao0032 } from './0032-papeis-especiais';
import { migracao0033 } from './0033-sd-formulario';
import { migracao0034 } from './0034-avs-checklist-nao-aplica';
import { migracao0035 } from './0035-sd-parecer-do-aceite';
import { migracao0036 } from './0036-notificacoes';
import { migracao0037 } from './0037-usuarios-email';
import { migracao0038 } from './0038-responsaveis-usuario';
import { migracao0039 } from './0039-notificacoes-chave';
import { migracao0040 } from './0040-equipe-e-primeiro-acesso';
import { migracao0041 } from './0041-ia-conversas';
import { migracao0042 } from './0042-historico-antes-do-multiusuario';
import { migracao0043 } from './0043-ia-propostas';
import { migracao0044 } from './0044-sd-lead-time';
import { migracao0045 } from './0045-prazos-das-areas';
import { migracao0046 } from './0046-estrutura-pecas-por-embalagem';
import { migracao0047 } from './0047-pcp-sem-alteracoes';
import { migracao0048 } from './0048-reportes';
import { migracao0049 } from './0049-pcp-carga-em-pecas';
import { migracao0050 } from './0050-av-portfolio';

export const MIGRACOES: readonly Migracao[] = [
  migracao0001,
  migracao0002,
  migracao0003,
  migracao0004,
  migracao0005,
  migracao0006,
  migracao0007,
  migracao0008,
  migracao0009,
  migracao0010,
  migracao0011,
  migracao0012,
  migracao0013,
  migracao0014,
  migracao0015,
  migracao0016,
  migracao0017,
  migracao0018,
  migracao0019,
  migracao0020,
  migracao0021,
  migracao0022,
  migracao0023,
  migracao0024,
  migracao0025,
  migracao0026,
  migracao0027,
  migracao0028,
  migracao0029,
  migracao0030,
  migracao0031,
  migracao0032,
  migracao0033,
  migracao0034,
  migracao0035,
  migracao0036,
  migracao0037,
  migracao0038,
  migracao0039,
  migracao0040,
  migracao0041,
  migracao0042,
  migracao0043,
  migracao0044,
  migracao0045,
  migracao0046,
  migracao0047,
  migracao0048,
  migracao0049,
  migracao0050,
];
