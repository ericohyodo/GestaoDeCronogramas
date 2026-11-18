'use client';

import { Plus, Trash2 } from 'lucide-react';
import { CLASSIFICACOES_INVESTIMENTO, type ClassificacaoInvestimentoDTO } from '@contratos/avs.contrato';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { ROTULO_CLASSIFICACAO_INVESTIMENTO } from '../rotulos';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

export interface LinhaInvestimentoEditavel {
  chave: string;
  descricao: string;
  classificacao: ClassificacaoInvestimentoDTO | '';
  valor: string;
}

export function novaLinhaInvestimento(chave: string, descricao = '', classificacao: ClassificacaoInvestimentoDTO | '' = ''): LinhaInvestimentoEditavel {
  return { chave, descricao, classificacao, valor: '' };
}

export function TabelaDeInvestimentos({
  linhas,
  aoMudar,
  aoAdicionar,
  aoRemover,
  aoLimpar,
}: {
  aoLimpar: () => void;
  linhas: LinhaInvestimentoEditavel[];
  aoMudar: (chave: string, campo: keyof LinhaInvestimentoEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
}) {
  const totalGeral = linhas.reduce((soma, linha) => soma + (Number(linha.valor) || 0), 0);

  const subtotaisPorClassificacao = CLASSIFICACOES_INVESTIMENTO.map((classificacao) => ({
    classificacao,
    total: linhas
      .filter((linha) => linha.classificacao === classificacao)
      .reduce((soma, linha) => soma + (Number(linha.valor) || 0), 0),
  })).filter((item) => item.total !== 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Investimentos</TituloSecao>
          <Ajuda texto="Tudo o que precisa ser comprado ou desenvolvido para produzir o item: ferramentas, dispositivos, meios de controle, embalagens, adequações. Informe a descrição, quem paga e o valor." />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo="Adicionar item de investimento" onClick={aoAdicionar} />
        </div>
      </div>
      {linhas.length > 0 && (
        <>
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="pl-3" ajuda="O que precisa ser adquirido ou desenvolvido (ex.: ferramental progressivo, gabarito de solda, dispositivo de controle).">
                  Descrição
                </CelulaCabecalho>
                <CelulaCabecalho className="w-56" ajuda="Quem arca com o investimento: Capex (Ferkoda), Suporte Desenvolvimento, Sup. Des. ou Cliente, ou Cliente.">
                  Classificação
                </CelulaCabecalho>
                <CelulaCabecalho className="w-32" ajuda="Valor do investimento em reais (R$).">
                  Valor
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
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.descricao}
                      onChange={(e) => aoMudar(linha.chave, 'descricao', e.target.value)}
                      placeholder="Descrição do investimento"
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <select
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.classificacao}
                      onChange={(e) => aoMudar(linha.chave, 'classificacao', e.target.value)}
                    >
                      <option value="">— não definida —</option>
                      {CLASSIFICACOES_INVESTIMENTO.map((classificacao) => (
                        <option key={classificacao} value={classificacao}>
                          {ROTULO_CLASSIFICACAO_INVESTIMENTO[classificacao]}
                        </option>
                      ))}
                    </select>
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      step="0.01"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.valor}
                      onChange={(e) => aoMudar(linha.chave, 'valor', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela className="pr-3">
                    <BotaoIcone icone={Trash2} rotulo="Remover item" onClick={() => aoRemover(linha.chave)} />
                  </CelulaTabela>
                </LinhaTabela>
              ))}
            </tbody>
          </Tabela>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-texto-secundario">
            {subtotaisPorClassificacao.map(({ classificacao, total }) => (
              <span key={classificacao}>
                {ROTULO_CLASSIFICACAO_INVESTIMENTO[classificacao]}: <span className="font-medium text-texto">{formatarMoeda(total)}</span>
              </span>
            ))}
            <span>
              Total: <span className="font-semibold text-texto">{formatarMoeda(totalGeral)}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
