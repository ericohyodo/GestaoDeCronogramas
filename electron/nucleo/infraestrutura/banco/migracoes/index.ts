import type { Migracao } from '../migrador';
import { migracao0001 } from './0001-cronogramas';
import { migracao0002 } from './0002-tarefas';
import { migracao0003 } from './0003-preferencias';
import { migracao0004 } from './0004-usuarios';
import { migracao0005 } from './0005-responsaveis';
import { migracao0006 } from './0006-fases-e-dependencias';

export const MIGRACOES: readonly Migracao[] = [
  migracao0001,
  migracao0002,
  migracao0003,
  migracao0004,
  migracao0005,
  migracao0006,
];
