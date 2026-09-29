'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';
import type { LinhaProcessoEditavel } from '../linha-de-processo';

export type { LinhaProcessoEditavel };

export function TabelaDeProcesso({
  linhas,
  operacoes,
  maquinas,
  aoMudar,
  aoAdicionar,
  aoRemover,
  aoLimpar,
  acoes,
}: {
  aoLimpar: () => void;
  linhas: LinhaProcessoEditavel[];
  operacoes: string[];
  maquinas: string[];
  aoMudar: (chave: string, campo: keyof LinhaProcessoEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
  /** Botões extras (templates, importação) exibidos acima da tabela. */
  acoes?: ReactNode;
}) {
  const total = linhas.reduce((soma, linha) => soma + (Number(linha.custoTotal) || 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Mão de obra por processo</TituloSecao>
          <Ajuda texto="Custo de transformação por operação: pessoas e máquina necessárias, taxas horárias e custo por peça. Traga a sequência da Eng. Processo e complete colaboradores, taxas e custo." />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo="Adicionar linha de processo" onClick={aoAdicionar} />
        </div>
      </div>
      {acoes}
      {linhas.length > 0 && (
        <>
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="w-40 pl-3" ajuda="Operação do processo. Vem da Eng. Processo (botão 'Trazer operações') ou é digitada aqui.">
                  Processo
                </CelulaCabecalho>
                <CelulaCabecalho className="w-40" ajuda="Máquina em que a operação é feita.">
                  Máquina
                </CelulaCabecalho>
                <CelulaCabecalho className="w-24" ajuda="Peças produzidas por hora nesta operação.">
                  Peças/hora
                </CelulaCabecalho>
                <CelulaCabecalho className="w-20" ajuda="Quantidade de colaboradores necessários para operar a máquina.">
                  Colab.
                </CelulaCabecalho>
                <CelulaCabecalho className="w-24" ajuda="Taxa horária de mão de obra direta (MOD), em R$/h, do centro de custo da máquina.">
                  Taxa MOD
                </CelulaCabecalho>
                <CelulaCabecalho className="w-24" ajuda="Taxa horária de mão de obra indireta (MOI), em R$/h.">
                  Taxa MOI
                </CelulaCabecalho>
                <CelulaCabecalho className="w-24" ajuda="Taxa horária de gastos gerais de fabricação (GGF), em R$/h: energia, manutenção, depreciação e rateios.">
                  Taxa GGF
                </CelulaCabecalho>
                <CelulaCabecalho className="w-28" ajuda="Custo da operação por peça, em reais. Por padrão é (taxa MOD + MOI + GGF) ÷ peças por hora e se atualiza sozinho quando as taxas ou as peças/hora mudam; digite outro valor para sobrescrever (o ícone de seta volta ao cálculo automático). Entra na soma do Custo/Pç.">
                  Custo total
                </CelulaCabecalho>
                <CelulaCabecalho className="w-10 pr-3">
                  <span className="sr-only">Remover</span>
                </CelulaCabecalho>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <LinhaTabela key={linha.chave}>
                  <CelulaTabela className="pl-3">
                    <input
                      list="av-catalogo-operacoes"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.processo}
                      onChange={(e) => aoMudar(linha.chave, 'processo', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      list="av-catalogo-maquinas"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.maquina}
                      onChange={(e) => aoMudar(linha.chave, 'maquina', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.pecasHora}
                      onChange={(e) => aoMudar(linha.chave, 'pecasHora', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.qtdeColaboradores}
                      onChange={(e) => aoMudar(linha.chave, 'qtdeColaboradores', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      step="0.01"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.taxaMod}
                      onChange={(e) => aoMudar(linha.chave, 'taxaMod', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      step="0.01"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.taxaMoi}
                      onChange={(e) => aoMudar(linha.chave, 'taxaMoi', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      step="0.01"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.taxaGgf}
                      onChange={(e) => aoMudar(linha.chave, 'taxaGgf', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        aria-label="Custo total da operação"
                        title={linha.custoManual ? 'Valor digitado à mão' : '(MOD + MOI + GGF) ÷ peças por hora'}
                        className={CLASSE_CELULA_EDITAVEL}
                        value={linha.custoTotal}
                        onChange={(e) => aoMudar(linha.chave, 'custoTotal', e.target.value)}
                      />
                      {linha.custoManual && (
                        <BotaoIcone
                          icone={RotateCcw}
                          rotulo="Voltar ao cálculo automático ((MOD + MOI + GGF) ÷ peças/hora)"
                          onClick={() => aoMudar(linha.chave, 'custoTotal', '')}
                        />
                      )}
                    </div>
                  </CelulaTabela>
                  <CelulaTabela className="pr-3">
                    <BotaoIcone icone={Trash2} rotulo="Remover linha" onClick={() => aoRemover(linha.chave)} />
                  </CelulaTabela>
                </LinhaTabela>
              ))}
            </tbody>
          </Tabela>
          <p className="self-end text-xs text-texto-secundario">
            Total mão de obra: <span className="font-semibold text-texto">{formatarMoeda(total)}</span>
          </p>
        </>
      )}
      {/* Sugestões de digitação (não travam o texto livre — a lista de máquinas cresce com o tempo). */}
      <datalist id="av-catalogo-operacoes">
        {operacoes.map((operacao) => (
          <option key={operacao} value={operacao} />
        ))}
      </datalist>
      <datalist id="av-catalogo-maquinas">
        {maquinas.map((maquina) => (
          <option key={maquina} value={maquina} />
        ))}
      </datalist>
    </div>
  );
}
