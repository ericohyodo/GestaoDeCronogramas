'use client';

import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { capacidadeDaLinha, formatarNumero, type ParametrosCapacidade, TURNOS_MAXIMOS_POR_DIA } from '../capacidade';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

/** Linha da carga na tela (textos dos campos). Carga atual e peças/hora estão na unidade da operação. */
export interface LinhaCargaEditavel {
  chave: string;
  operacao: string;
  maquina: string;
  pecasHora: string;
  /** Peças do produto final por unidade da operação ("1" = mesma unidade). */
  conversao: string;
  /** Carga atual da máquina em unidades da operação por mês. */
  cargaAtual: string;
}

export function novaLinhaCarga(chave: string): LinhaCargaEditavel {
  return { chave, operacao: '', maquina: '', pecasHora: '', conversao: '1', cargaAtual: '' };
}

/**
 * Carga de máquina por operação, em peças por mês: o PCP informa a carga atual; a futura (só o item novo) sai
 * do volume anual da aba Comercial; os turnos vêm de peças/hora, horas por turno e dias produtivos.
 */
export function TabelaDeCargas({
  linhas,
  operacoes,
  maquinas,
  volumeAnual,
  parametros,
  aoMudar,
  aoAdicionar,
  aoRemover,
  aoLimpar,
  acoes,
}: {
  linhas: LinhaCargaEditavel[];
  /** Sugestões já usadas (o texto continua livre). */
  operacoes: string[];
  maquinas: string[];
  /** Volume anual estimado pelo Comercial (peças do produto final por ano). */
  volumeAnual: number | null;
  parametros: ParametrosCapacidade;
  aoMudar: (chave: string, campo: keyof LinhaCargaEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
  aoLimpar: () => void;
  acoes?: ReactNode;
}) {
  const demandaMensal = volumeAnual && volumeAnual > 0 ? volumeAnual / 12 : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Carga de máquina</TituloSecao>
          <Ajuda texto="Para cada operação, informe a carga atual da máquina em peças por mês (na unidade da operação). A carga futura é a demanda do item novo: volume anual da aba Comercial ÷ 12 ÷ conversão. Com as peças por hora, o app calcula os turnos por dia de hoje e com o item." />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo="Incluir operação" onClick={aoAdicionar} />
        </div>
      </div>
      {acoes}
      <p className={clsx('text-xs', demandaMensal === null ? 'text-perigo' : 'text-texto-secundario')}>
        {demandaMensal === null
          ? 'Informe o volume anual na aba Comercial: a carga futura e os turnos dependem dele.'
          : `Demanda do item: ${formatarNumero(volumeAnual ?? null)} pç/ano ÷ 12 = ${formatarNumero(demandaMensal)} pç/mês · ` +
            `turno de ${formatarNumero(parametros.horasPorTurno, 1)} h · ${parametros.diasProdutivosMes} dias produtivos/mês.`}
      </p>
      {linhas.length === 0 ? (
        <p className="text-xs text-texto-secundario">
          Nenhuma operação ainda. Traga as da Eng. Processo ou use o botão + para incluir.
        </p>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="pl-3" ajuda="Operação do processo produtivo (vem da Eng. Processo ou digitada aqui).">
                Operação
              </CelulaCabecalho>
              <CelulaCabecalho className="w-40" ajuda="Máquina ou posto onde a operação será executada.">
                Máquina
              </CelulaCabecalho>
              <CelulaCabecalho className="w-24" ajuda="Capacidade da operação por hora, na unidade da operação (ex.: placas por hora na fundição).">
                Pçs/hora
              </CelulaCabecalho>
              <CelulaCabecalho
                className="w-24"
                ajuda="Quantas peças do produto final saem de uma unidade da operação. Ex.: a fundição faz uma placa que vira 8 peças → 8. Use 1 quando a operação trabalha a própria peça."
              >
                Conversão
              </CelulaCabecalho>
              <CelulaCabecalho className="w-32" ajuda="Quanto a máquina produz hoje por mês, sem este item, na unidade da operação.">
                Carga atual (pç/mês)
              </CelulaCabecalho>
              <CelulaCabecalho className="w-32" ajuda="Demanda do item novo por mês na unidade da operação: volume anual ÷ 12 ÷ conversão. Calculada sozinha.">
                Carga futura (pç/mês)
              </CelulaCabecalho>
              <CelulaCabecalho
                className="w-36"
                ajuda={`Turnos por dia necessários hoje → com o item: carga ÷ (pçs/hora × horas por turno × dias produtivos). Acima de ${TURNOS_MAXIMOS_POR_DIA} turnos a operação não cabe no dia.`}
              >
                Turnos
              </CelulaCabecalho>
              <CelulaCabecalho className="w-10 pr-3">
                <span className="sr-only">Remover</span>
              </CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => {
              const { cargaFutura, turnosAtuais, turnosComItem } = capacidadeDaLinha(linha, volumeAnual, parametros);
              const estoura = turnosComItem !== null && turnosComItem > TURNOS_MAXIMOS_POR_DIA;
              return (
                <LinhaTabela key={linha.chave}>
                  <CelulaTabela className="pl-3">
                    <input
                      list="av-pcp-operacoes"
                      aria-label={`Operação ${indice + 1}`}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.operacao}
                      onChange={(e) => aoMudar(linha.chave, 'operacao', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      list="av-pcp-maquinas"
                      aria-label={`Máquina da operação ${indice + 1}`}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.maquina}
                      onChange={(e) => aoMudar(linha.chave, 'maquina', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`Peças por hora da operação ${indice + 1}`}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.pecasHora}
                      onChange={(e) => aoMudar(linha.chave, 'pecasHora', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`Conversão da operação ${indice + 1}`}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.conversao}
                      onChange={(e) => aoMudar(linha.chave, 'conversao', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      aria-label={`Carga atual da operação ${indice + 1}, em peças por mês`}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.cargaAtual}
                      onChange={(e) => aoMudar(linha.chave, 'cargaAtual', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela className="text-sm tabular-nums text-texto-secundario" title="Calculada: volume anual ÷ 12 ÷ conversão">
                    {formatarNumero(cargaFutura)}
                  </CelulaTabela>
                  <CelulaTabela className={clsx('text-sm tabular-nums', estoura ? 'font-semibold text-perigo' : 'text-texto-secundario')}>
                    {turnosAtuais === null && turnosComItem === null
                      ? '—'
                      : `${formatarNumero(turnosAtuais, 2)} → ${formatarNumero(turnosComItem, 2)}`}
                  </CelulaTabela>
                  <CelulaTabela className="pr-3">
                    <BotaoIcone icone={Trash2} rotulo="Remover operação" onClick={() => aoRemover(linha.chave)} />
                  </CelulaTabela>
                </LinhaTabela>
              );
            })}
          </tbody>
        </Tabela>
      )}
      <datalist id="av-pcp-operacoes">
        {operacoes.map((operacao) => (
          <option key={operacao} value={operacao} />
        ))}
      </datalist>
      <datalist id="av-pcp-maquinas">
        {maquinas.map((maquina) => (
          <option key={maquina} value={maquina} />
        ))}
      </datalist>
    </div>
  );
}
