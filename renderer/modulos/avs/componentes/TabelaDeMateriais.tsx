'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ItemCatalogoMaterialDTO } from '@contratos/avs.contrato';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

export interface LinhaMaterialEditavel {
  chave: string;
  codigoItem: string;
  descricao: string;
  qtdeBruta: string;
  qtdeNet: string;
  unidadeMedida: string;
  custoUnitario: string;
  custoTotal: string;
}

export const CLASSE_CELULA_EDITAVEL =
  'h-8 w-full rounded-md border border-borda bg-superficie-solida/80 px-2 text-xs text-texto ' +
  'placeholder:text-texto-sutil focus:border-primaria focus:outline-none focus:ring-2 focus:ring-primaria/20';

export function novaLinhaMaterial(chave: string): LinhaMaterialEditavel {
  return {
    chave,
    codigoItem: '',
    descricao: '',
    qtdeBruta: '',
    qtdeNet: '',
    unidadeMedida: '',
    custoUnitario: '',
    custoTotal: '',
  };
}

export function TabelaDeMateriais({
  titulo,
  idCatalogo,
  catalogo,
  linhas,
  aoMudar,
  aoAdicionar,
  aoRemover,
  aoLimpar,
  acoes,
}: {
  aoLimpar: () => void;
  /** Botões extras (ex.: trazer componentes da estrutura do produto) acima da tabela. */
  acoes?: ReactNode;
  titulo: string;
  /** Id único do <datalist> (evita colidir quando a mesma tabela aparece mais de uma vez na página). */
  idCatalogo: string;
  /** Sugestões de código+descrição — texto livre continua permitido, isto só acelera a digitação. */
  catalogo: ItemCatalogoMaterialDTO[];
  linhas: LinhaMaterialEditavel[];
  aoMudar: (chave: string, campo: keyof LinhaMaterialEditavel, valor: string) => void;
  aoAdicionar: () => void;
  aoRemover: (chave: string) => void;
}) {
  const total = linhas.reduce((soma, linha) => soma + (Number(linha.custoTotal) || 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>{titulo}</TituloSecao>
          <Ajuda texto={`Itens de ${titulo.toLowerCase()} consumidos por peça. Informe código, descrição, quantidades, unidade e custo; o custo total de cada item soma no Custo/Pç.`} />
        </div>
        <div className="flex items-center gap-2">
          <BotaoLimparCampos aoLimpar={aoLimpar} disabled={linhas.length === 0} />
          <BotaoIcone icone={Plus} rotulo={`Adicionar item em ${titulo}`} onClick={aoAdicionar} />
        </div>
      </div>
      {acoes}
      {linhas.length > 0 && (
        <>
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="w-28 pl-3" ajuda="Código do item no ERP. Preenchido sozinho ao escolher uma descrição do catálogo.">
                  Código
                </CelulaCabecalho>
                <CelulaCabecalho ajuda="Nome do material, insumo ou embalagem. Comece a digitar para ver as sugestões do catálogo; texto livre também é aceito.">
                  Descrição
                </CelulaCabecalho>
                <CelulaCabecalho className="w-24" ajuda="Quantidade bruta por peça: o que é consumido, incluindo sobras e perdas.">
                  Qtde bruta
                </CelulaCabecalho>
                <CelulaCabecalho className="w-24" ajuda="Quantidade líquida por peça: o que realmente fica no produto acabado.">
                  Qtde net
                </CelulaCabecalho>
                <CelulaCabecalho className="w-20" ajuda="Unidade de medida da quantidade (kg, m, un, L…).">
                  U.M.
                </CelulaCabecalho>
                <CelulaCabecalho className="w-28" ajuda="Custo de uma unidade de medida do item, em reais.">
                  Custo unit.
                </CelulaCabecalho>
                <CelulaCabecalho className="w-28" ajuda="Custo do item por peça (quantidade bruta × custo unitário). Entra na soma do Custo/Pç.">
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
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.codigoItem}
                      onChange={(e) => aoMudar(linha.chave, 'codigoItem', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      list={idCatalogo}
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.descricao}
                      onChange={(e) => aoMudar(linha.chave, 'descricao', e.target.value)}
                      placeholder="Descrição do item"
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.qtdeBruta}
                      onChange={(e) => aoMudar(linha.chave, 'qtdeBruta', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.qtdeNet}
                      onChange={(e) => aoMudar(linha.chave, 'qtdeNet', e.target.value)}
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.unidadeMedida}
                      onChange={(e) => aoMudar(linha.chave, 'unidadeMedida', e.target.value)}
                      placeholder="KG"
                    />
                  </CelulaTabela>
                  <CelulaTabela>
                    <input
                      type="number"
                      step="0.01"
                      className={CLASSE_CELULA_EDITAVEL}
                      value={linha.custoUnitario}
                      onChange={(e) => aoMudar(linha.chave, 'custoUnitario', e.target.value)}
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
                    <BotaoIcone icone={Trash2} rotulo="Remover item" onClick={() => aoRemover(linha.chave)} />
                  </CelulaTabela>
                </LinhaTabela>
              ))}
            </tbody>
          </Tabela>
          <p className="self-end text-xs text-texto-secundario">
            Total {titulo.toLowerCase()}: <span className="font-semibold text-texto">{formatarMoeda(total)}</span>
          </p>
        </>
      )}
      <datalist id={idCatalogo}>
        {catalogo.map((item) => (
          <option key={item.codigo} value={item.descricao} />
        ))}
      </datalist>
    </div>
  );
}
