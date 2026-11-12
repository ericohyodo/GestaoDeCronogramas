import type { Migracao } from '../migrador';

// Prazo acordado com o cliente (lead time, em dias corridos) informado pelo Comercial na SD, a observação
// desse prazo e a justificativa da Engenharia quando o término do PRO difere de início + lead time.
export const migracao0044: Migracao = {
  versao: 44,
  nome: '0044-sd-lead-time',
  sql: `
    ALTER TABLE sd ADD COLUMN lead_time_dias INTEGER
      CHECK (lead_time_dias IS NULL OR lead_time_dias BETWEEN 1 AND 1825);
    ALTER TABLE sd ADD COLUMN lead_time_observacao TEXT;
    ALTER TABLE sd ADD COLUMN prazo_justificativa TEXT;
  `,
};
