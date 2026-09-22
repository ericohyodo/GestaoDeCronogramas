import { z } from 'zod';

// Mensagens de validação em português.
z.config(z.locales.pt());

/** Esquemas zod reutilizados pelos controladores IPC de todos os módulos. */
export const esquemaId = z.string().trim().min(1, 'Identificador obrigatório');

export const esquemaData = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD');

export const esquemaSemEntrada = z.undefined();
