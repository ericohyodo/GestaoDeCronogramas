/** Formatação só para exibição. Regras de datas (validação, duração) ficam no domínio, no main. */

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Versão compacta (dd/mm/aa) para as colunas estreitas da tabela de atividades. */
export function formatarDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano?.slice(2)}`;
}

export function formatarPeriodo(inicio: string, fim: string): string {
  return `${formatarData(inicio)} – ${formatarData(fim)}`;
}

export function formatarDias(dias: number): string {
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

/** Data local de hoje em AAAA-MM-DD. */
export function hojeIso(): string {
  const agora = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

/** Dias corridos entre duas datas AAAA-MM-DD (negativo quando `fim` é anterior a `inicio`). */
export function diasEntreDatas(inicio: string, fim: string): number {
  return (Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000;
}

export function somarDias(iso: string, dias: number): string {
  const instante = Date.parse(`${iso}T00:00:00Z`) + dias * 86_400_000;
  return new Date(instante).toISOString().slice(0, 10);
}

const FORMATADOR_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number | null): string {
  return valor == null ? '—' : FORMATADOR_MOEDA.format(valor);
}

/**
 * Dia local (AAAA-MM-DD) de um instante ISO gravado em UTC. Evita o erro de `iso.slice(0, 10)`, que
 * depois das 21h (Brasília) mostra o dia seguinte.
 */
export function dataLocal(isoInstante: string): string {
  const data = new Date(isoInstante);
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** Data local de um instante ISO no formato dd/mm/aaaa. */
export function formatarDataLocal(isoInstante: string): string {
  return formatarData(dataLocal(isoInstante));
}

/** Data e hora local de um instante ISO (dd/mm/aaaa hh:mm). */
export function formatarDataHora(isoInstante: string): string {
  return new Date(isoInstante).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Tamanho de arquivo legível (KB/MB). */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
