export interface ItemHistoricoAv {
  id: string;
  avId: string;
  etapaDe: number | null;
  etapaPara: number;
  usuarioId: string | null;
  comentario: string | null;
  data: Date;
}

export interface RepositorioHistoricoAv {
  registrar(item: ItemHistoricoAv): Promise<void>;
  listarPorAv(avId: string): Promise<ItemHistoricoAv[]>;
}
