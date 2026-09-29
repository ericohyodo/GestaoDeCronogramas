'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

export interface LinhaCustoLogisticoEditavel {
  chave: string;
  descricao: string;
  valor: string;
}

export function novaLinhaCustoLogistico(chave: string): LinhaCustoLogisticoEditavel {
  return { chave, descricao: '', valor: '' };
}

/** Custos logísticos e investimentos do PCP para implantar o item: uma linha por custo, com descrição e valor. */
export function TabelaDeCustosLogisticos({
  linhas,
  aoMudar,
  aoAdicionar,
  aoRemover,
  aoLimpar,
}: {
  linhas: LinhaCustoLogisticoEditavel[];
  aoMudar: (chave: string, campo: keyof LinhaCustoLogisticoEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
  aoLimpar: () => void;
}) {
  const total = linhas.reduce((soma, linha) => soma + (Number(linha.valor) || 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Custos logísticos / investimentos</TituloSecao>
          <Ajuda texto="Custos e investimentos de logística necessários para implantar o item: empilhadeira, estantes, embalagens, transporte interno, adequação de área etc. Informe a descrição e o valor de cada um." />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo="Adicionar custo logístico" onClick={aoAdicionar} />
        </div>
      </div>
      {linhas.length > 0 && (
        <>
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="pl-3" ajuda="O que é o custo ou investimento (ex.: Estante para armazenagem).">
                  Descrição
                </CelulaCabecalho>
                <CelulaCabecalho className="w-40" ajuda="Valor em reais (R$).">
                  Valor (R$)
                </CelulaCabecalho>
                <CelulaCabecalho className="w-10 pr-3">
                  <span className="sr-only">Remover</span>
                </CelulaCabecalho>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, indice) => (
                <LinhaTabela key={linha.chave}>
                  <CelulaTabela className="pl-3">
                    <input
                      aria-label={`Descrição do custo ${indice + 1}`}
                      className={CLASSE_CELULA_EDITAVEL}
                      maxLength={200}
                      value={linha.descricao}
                      onChange={(e) => aoMudar(linha.chave, 'descricao', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`Valor do custo ${indice + 1}`}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.valor}
                      onChange={(e) => aoMudar(linha.chave, 'valor', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela className="pr-3">
                    <BotaoIcone icone={Trash2} rotulo="Remover custo" onClick={() => aoRemover(linha.chave)} />
                  </CelulaTabela>
                </LinhaTabela>
              ))}
            </tbody>
          </Tabela>
          <p className="self-end text-xs text-texto-secundario">
            Total: <span className="font-semibold text-texto">{formatarMoeda(total)}</span>
          </p>
        </>
      )}
    </div>
  );
}
