import type { MembroAreaDTO } from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { ConsultaDeUsuarios } from '../portas';

/** Lista simples (id + nome) para preencher os seletores de responsável por área — qualquer
 * pessoa logada pode ver, ao contrário de `usuarios:listar` (administração). */
export class ListarMembros implements CasoDeUso<void, MembroAreaDTO[]> {
  constructor(private readonly usuarios: ConsultaDeUsuarios) {}

  async executar(): Promise<MembroAreaDTO[]> {
    return this.usuarios.listarAtivos();
  }
}
