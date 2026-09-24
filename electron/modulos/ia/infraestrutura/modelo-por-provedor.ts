import {
  type ModeloDeAnalise,
  type ModeloIaDTO,
  type PedidoDeAnalise,
  type PedidoDeAnalisePortfolio,
  type PedidoDeConversa,
  type ProvedorIaDTO,
  provedorDoModelo,
  type ResultadoDaConversa,
  type ResultadoDoModelo,
  type ResultadoDoPortfolio,
} from '../aplicacao/portas';

/** Encaminha cada pedido ao adaptador do provedor do modelo escolhido (Anthropic, Google ou OpenRouter). */
export class ModeloPorProvedor implements ModeloDeAnalise {
  constructor(private readonly adaptadores: Record<ProvedorIaDTO, ModeloDeAnalise>) {}

  testar(chave: string, modelo: ModeloIaDTO): Promise<void> {
    return this.adaptadores[provedorDoModelo(modelo)].testar(chave, modelo);
  }

  analisar(pedido: PedidoDeAnalise): Promise<ResultadoDoModelo> {
    return this.adaptadores[provedorDoModelo(pedido.modelo)].analisar(pedido);
  }

  analisarPortfolio(pedido: PedidoDeAnalisePortfolio): Promise<ResultadoDoPortfolio> {
    return this.adaptadores[provedorDoModelo(pedido.modelo)].analisarPortfolio(pedido);
  }

  conversar(pedido: PedidoDeConversa): Promise<ResultadoDaConversa> {
    return this.adaptadores[provedorDoModelo(pedido.modelo)].conversar(pedido);
  }
}
