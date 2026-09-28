'use client';

import { Plus, Trash2 } from 'lucide-react';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';

export interface LinhaProcessoEditavel {
  chave: string;
  processo: string;
  maquina: string;
  pecasHora: string;
  qtdeColaboradores: string;
  taxaMod: string;
  taxaMoi: string;
  taxaGgf: string;
  custoTotal: string;
}

export function novaLinhaProcesso(chave: string): LinhaProcessoEditavel {
  return {
    chave,
    processo: '',
    maquina: '',
    pecasHora: '',
    qtdeColaboradores: '',
    taxaMod: '',
    taxaMoi: '',
    taxaGgf: '',
    custoTotal: '',
  };
}

export function TabelaDeProcesso({
  linhas,
  operacoes,
  maquinas,
  aoMudar,
  aoAdicionar,
  aoRemover,
}: {
  linhas: LinhaProcessoEditavel[];
  operacoes: string[];
  maquinas: string[];
  aoMudar: (chave: string, campo: keyof LinhaProcessoEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
}) {
  const total = linhas.reduce((soma, linha) => soma + (Number(linha.custoTotal) || 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-texto-sutil">Mão de obra por processo</p>
        <BotaoIcone icone={Plus} rotulo="Adicionar linha de processo" onClick={aoAdicionar} />
      </div>
      {linhas.length > 0 && (
        <>
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="w-40 pl-3">Processo</CelulaCabecalho>
                <CelulaCabecalho className="w-40">Máquina</CelulaCabecalho>
                <CelulaCabecalho className="w-24">Peças/hora</CelulaCabecalho>
                <CelulaCabecalho className="w-20">Colab.</CelulaCabecalho>
                <CelulaCabecalho className="w-24">Taxa MOD</CelulaCabecalho>
                <CelulaCabecalho className="w-24">Taxa MOI</CelulaCabecalho>
                <CelulaCabecalho className="w-24">Taxa GGF</CelulaCabecalho>
                <CelulaCabecalho className="w-28">Custo total</CelulaCabecalho>
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
                    <input
                      type="number"
                      step="0.01"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.custoTotal}
                      onChange={(e) => aoMudar(linha.chave, 'custoTotal', e.target.value)}
                    />
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
