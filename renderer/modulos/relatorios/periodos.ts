import { diasEntreDatas, formatarDataCurta, somarDias } from '@/compartilhado/formatacao';

export interface Periodo {
  chave: string;
  rotulo: string;
  detalhe: string;
  inicio: string;
  fim: string;
}

const paraData = (iso: string) => new Date(`${iso}T00:00:00Z`);
const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const diaMes = (iso: string) => formatarDataCurta(iso).slice(0, 5);

/** Semanas de segunda a domingo. */
export function inicioDaSemana(iso: string): string {
  return somarDias(iso, -((paraData(iso).getUTCDay() + 6) % 7));
}

export function proximasSemanas(hoje: string, quantidade: number): Periodo[] {
  const primeira = inicioDaSemana(hoje);
  return Array.from({ length: quantidade }, (_, indice) => {
    const inicio = somarDias(primeira, indice * 7);
    const fim = somarDias(inicio, 6);
    const rotulo =
      indice === 0 ? 'Esta semana' : indice === 1 ? 'Próxima semana' : `Semana de ${diaMes(inicio)}`;
    return { chave: inicio, rotulo, detalhe: `${diaMes(inicio)} – ${diaMes(fim)}`, inicio, fim };
  });
}

const FORMATO_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function proximosMeses(hoje: string, quantidade: number): Periodo[] {
  const [ano, mes] = hoje.split('-').map(Number) as [number, number];
  return Array.from({ length: quantidade }, (_, indice) => {
    const primeiro = new Date(Date.UTC(ano, mes - 1 + indice, 1));
    const inicio = primeiro.toISOString().slice(0, 10);
    const fim = new Date(Date.UTC(ano, mes + indice, 0)).toISOString().slice(0, 10);
    const rotulo = indice === 0 ? 'Este mês' : maiuscula(FORMATO_MES.format(primeiro));
    return { chave: inicio, rotulo, detalhe: indice === 0 ? maiuscula(FORMATO_MES.format(primeiro)) : '', inicio, fim };
  });
}

const FORMATO_DIA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

export function rotuloDoDia(iso: string, hoje: string): string {
  const dias = diasEntreDatas(hoje, iso);
  const data = maiuscula(FORMATO_DIA.format(paraData(iso)));
  if (dias === 0) return `Hoje · ${data}`;
  if (dias === 1) return `Amanhã · ${data}`;
  return data;
}

/** "vence hoje", "em 3 dias", "atrasada há 2 dias"... */
export function rotuloDoPrazo(dataFim: string, hoje: string): string {
  const dias = diasEntreDatas(hoje, dataFim);
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `em ${dias} dias`;
  return dias === -1 ? 'atrasada há 1 dia' : `atrasada há ${-dias} dias`;
}

/** Faixas relativas a hoje, usadas nas visões por responsável e por projeto. */
export function faixaDoPrazo(dataFim: string, hoje: string): string {
  if (dataFim < hoje) return 'Atrasadas';
  if (dataFim === hoje) return 'Hoje';
  const inicioDaProxima = somarDias(inicioDaSemana(hoje), 7);
  if (dataFim < inicioDaProxima) return 'Esta semana';
  if (dataFim < somarDias(inicioDaProxima, 7)) return 'Próxima semana';
  return 'Mais adiante';
}
