'use client';

import { Plus, Trash2 } from 'lucide-react';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

export interface LinhaOperacaoEditavel {
  chave: string;
  descricao: string;
  maquina: string;
  pecasHora: string;
}

export function novaLinhaOperacao(chave: string): LinhaOperacaoEditavel {
  return { chave, descricao: '', maquina: '', pecasHora: '' };
}

/** Sequência de operações da AV: uma linha por operação, na ordem em que acontecem. */
export function TabelaDeOperacoes({
  linhas,
  operacoes,
  maquinas,
  aoMudar,
  aoAdicionar,
  aoRemover,
  aoLimpar,
}: {
  aoLimpar: () => void;
  linhas: LinhaOperacaoEditavel[];
  /** Descrições já usadas antes (sugestões; o texto continua livre). */
  operacoes: string[];
  maquinas: string[];
  aoMudar: (chave: string, campo: keyof LinhaOperacaoEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Sequência de operações</TituloSecao>
          <Ajuda texto="Passo a passo da fabricação do item, na ordem em que acontece. Inclua uma operação por vez (botão +). Essa sequência alimenta o Mapa de Custo e o PCP; um template salva uma sequência para reutilizar em outras AVs." />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo="Incluir operação" onClick={aoAdicionar} />
        </div>
      </div>
      {linhas.length === 0 ? (
        <p className="text-xs text-texto-secundario">
          Nenhuma operação ainda. Use o botão + para incluir a primeira.
        </p>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="w-10 pl-3" ajuda="Ordem da operação no processo (10, 20, 30…). Calculada pela posição na lista.">
                #
              </CelulaCabecalho>
              <CelulaCabecalho ajuda="Nome da operação (ex.: Estampagem, Solda, Usinagem CNC). As sugestões vêm do catálogo e do que já foi digitado em outras AVs.">
                Descrição
              </CelulaCabecalho>
              <CelulaCabecalho className="w-56" ajuda="Máquina ou posto em que a operação será feita.">
                Máquina
              </CelulaCabecalho>
              <CelulaCabecalho className="w-28" ajuda="Quantas peças a operação produz por hora. Segue para o PCP e para o Mapa de Custo.">
                Pçs/hora
              </CelulaCabecalho>
              <CelulaCabecalho className="w-10 pr-3">
                <span className="sr-only">Remover</span>
              </CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => (
              <LinhaTabela key={linha.chave}>
                <CelulaTabela className="pl-3 tabular-nums text-texto-secundario">{(indice + 1) * 10}</CelulaTabela>
                <CelulaTabela>
                  <input
                    list="av-operacoes-descricoes"
                    aria-label={`Descrição da operação ${indice + 1}`}
                    className={CLASSE_CELULA_EDITAVEL}
                    value={linha.descricao}
                    onChange={(e) => aoMudar(linha.chave, 'descricao', e.target.value)}
                  />
                </CelulaTabela>
                <CelulaTabela>
                  <input
                    list="av-operacoes-maquinas"
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
                <CelulaTabela className="pr-3">
                  <BotaoIcone icone={Trash2} rotulo="Remover operação" onClick={() => aoRemover(linha.chave)} />
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
      <datalist id="av-operacoes-descricoes">
        {operacoes.map((operacao) => (
          <option key={operacao} value={operacao} />
        ))}
      </datalist>
      <datalist id="av-operacoes-maquinas">
        {maquinas.map((maquina) => (
          <option key={maquina} value={maquina} />
        ))}
      </datalist>
    </div>
  );
}
