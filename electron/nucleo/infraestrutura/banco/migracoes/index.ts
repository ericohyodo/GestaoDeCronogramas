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
];
