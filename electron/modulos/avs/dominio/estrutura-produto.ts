export type TipoNoEstrutura = 'conjunto' | 'componente' | 'materia_prima' | 'embalagem' | 'insumo';

/** Um item da estrutura do produto (conjunto, nível, embalagem ou insumo) e o seu pai na árvore. */
export interface NoEstrutura {
  id: string;
  avId: string;
  paiId: string | null;
  ordem: number;
  tipo: TipoNoEstrutura;
  codigo: string | null;
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
}
