import { MIGRACOES as TODAS } from '../../electron/nucleo/infraestrutura/banco/migracoes';

/**
 * Migrações para os testes: iguais às do app, mas a 0040 só com a parte de estrutura (colunas novas).
 * A parte de dados dela cadastra a equipe FERKODA, que colidiria com os usuários que cada teste cria;
 * essa parte tem teste próprio (equipe-e-primeiro-acesso.test.ts).
 */
export const MIGRACOES = TODAS.map((migracao) =>
  migracao.versao === 40 ? { ...migracao, sql: migracao.sql.split('-- Usuários que já existiam')[0]! } : migracao,
);
