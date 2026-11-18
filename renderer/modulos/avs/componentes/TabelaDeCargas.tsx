'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

export interface LinhaCargaEditavel {
  chave: string;
  operacao: string;
  maquina: string;
  pecasHora: string;
  cargaAtual: string;
  cargaFutura: string;
}

export function novaLinhaCarga(chave: string): LinhaCargaEditavel {
  return { chave, operacao: '', maquina: '', pecasHora: '', cargaAtual: '', cargaFutura: '' };
}

/** Diferença, em pontos percentuais, entre a carga futura e a atual; `null` se algum dos dois faltar. */
export function impactoDaCarga(linha: Pick<LinhaCargaEditavel, 'cargaAtual' | 'cargaFutura'>): number | null {
  if (linha.cargaAtual.trim() === '' || linha.cargaFutura.trim() === '') return null;
  return Number(linha.cargaFutura) - Number(linha.cargaAtual);
}

function formatarImpacto(impacto: number | null): string {
  if (impacto === null) return '—';
  const arredondado = Math.round(impacto * 10) / 10;
  return `${arredondado > 0 ? '+' : ''}${arredondado.toLocaleString('pt-BR')} p.p.`;
}

/** Carga de máquina por operação: quanto a máquina está ocupada hoje e quanto ficará com o item implantado. */
export function TabelaDeCargas({
  linhas,
  operacoes,
  maquinas,
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
  aoMudar: (chave: string, campo: keyof LinhaCargaEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
  aoLimpar: () => void;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Carga de máquina</TituloSecao>
          <Ajuda texto="Para cada operação do processo, informe quanto a máquina está ocupada hoje (carga atual) e quanto ficará depois de implantar este item (carga futura). A diferença mostra o impacto da implantação na capacidade." />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo="Incluir operação" onClick={aoAdicionar} />
        </div>
      </div>
      {acoes}
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
              <CelulaCabecalho className="w-48" ajuda="Máquina ou posto onde a operação será executada.">
                Máquina
              </CelulaCabecalho>
              <CelulaCabecalho className="w-24" ajuda="Capacidade de produção da operação, em peças por hora.">
                Pçs/hora
              </CelulaCabecalho>
              <CelulaCabecalho className="w-28" ajuda="Percentual de ocupação da máquina hoje, sem este item.">
                Carga atual (%)
              </CelulaCabecalho>
              <CelulaCabecalho className="w-28" ajuda="Percentual de ocupação previsto depois de implantar este item. Acima de 100% indica sobrecarga.">
                Carga futura (%)
              </CelulaCabecalho>
              <CelulaCabecalho className="w-28" ajuda="Impacto da implantação: carga futura menos carga atual, em pontos percentuais. Calculado sozinho.">
                Impacto
              </CelulaCabecalho>
              <CelulaCabecalho className="w-10 pr-3">
                <span className="sr-only">Remover</span>
              </CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => {
              const impacto = impactoDaCarga(linha);
              const sobrecarga = linha.cargaFutura.trim() !== '' && Number(linha.cargaFutura) > 100;
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
                      step="0.1"
                      aria-label={`Carga atual da operação ${indice + 1}`}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.cargaAtual}
                      onChange={(e) => aoMudar(linha.chave, 'cargaAtual', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      aria-label={`Carga futura da operação ${indice + 1}`}
                      className={`${CLASSE_CELULA_EDITAVEL} ${sobrecarga ? 'border-perigo text-perigo' : ''}`}
                      value={linha.cargaFutura}
                      onChange={(e) => aoMudar(linha.chave, 'cargaFutura', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela className="text-xs tabular-nums text-texto-secundario">
                    {formatarImpacto(impacto)}
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
