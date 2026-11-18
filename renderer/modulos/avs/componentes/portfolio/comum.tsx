'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { NoEstruturaDTO } from '@contratos/avs.contrato';
import type {
  AreaChecagemDTO,
  ItemPortfolioDTO,
  OperacaoPortfolioDTO,
  PortfolioDaAvDTO,
  ResultadoChecagemDTO,
} from '@contratos/portfolio.contrato';
import { RESULTADOS_DE_CHECAGEM } from '@contratos/portfolio.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { AreaTexto } from '@/compartilhado/ui/Campos';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { RESULTADO_VISUAL } from '../../rotulos';
import { ROTULO_DO_TIPO } from '../ModalDoItemDaEstrutura';
import { IconeDeEstrutura } from '../IconesDeEstrutura';
import { TituloSecao } from '../SecaoAv';

// =====================================================================================================
// Peças comuns das abas da AV de Item de Portfólio.
// =====================================================================================================

/**
 * Item (template) e conclusões das áreas de uma AV de portfólio, lidos ao montar a aba.
 * @param avId AV de portfólio
 * @returns dados (ou `null` enquanto carrega), erro e o setter para atualizar depois de salvar
 */
export function usePortfolioDaAv(avId: string) {
  const [dados, setDados] = useState<PortfolioDaAvDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let cancelado = false;
    clienteDesktop.portfolio
      .obterDaAv(avId)
      .then((lido) => !cancelado && setDados(lido))
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)));
    return () => {
      cancelado = true;
    };
  }, [avId]);
  return { dados, erro, setDados };
}

/** Conclusão em edição: resultado ainda não escolhido = ''. */
export interface ChecagemEditavel {
  resultado: ResultadoChecagemDTO | '';
  observacao: string;
}

/**
 * Conclusão salva de uma área, como estado inicial do formulário.
 * @param dados item e conclusões
 * @param area área da aba
 */
export function checagemInicial(dados: PortfolioDaAvDTO, area: AreaChecagemDTO): ChecagemEditavel {
  const salva = dados.checagens.find((checagem) => checagem.area === area);
  return { resultado: salva?.resultado ?? '', observacao: salva?.observacao ?? '' };
}

/** A área concluiu: escolheu o resultado e, se não confere, explicou na observação. */
export function checagemCompleta(checagem: ChecagemEditavel): boolean {
  return checagem.resultado === 'confere' || (checagem.resultado !== '' && checagem.observacao.trim() !== '');
}

/**
 * Pergunta da área com as três respostas (confere, com ressalvas, não confere) e a observação.
 * @param pergunta o que a área precisa responder
 * @param valor conclusão em edição
 * @param aoMudar recebe a conclusão alterada
 */
export function ChecagemDaArea({
  pergunta,
  ajuda,
  valor,
  aoMudar,
}: {
  pergunta: string;
  ajuda: string;
  valor: ChecagemEditavel;
  aoMudar: (valor: ChecagemEditavel) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <TituloSecao>{pergunta}</TituloSecao>
        <p className="mt-1 text-xs text-texto-secundario">{ajuda}</p>
      </div>
      <div role="radiogroup" aria-label={pergunta} className="flex flex-wrap gap-2">
        {RESULTADOS_DE_CHECAGEM.map((resultado) => {
          const visual = RESULTADO_VISUAL[resultado];
          const ativo = valor.resultado === resultado;
          return (
            <button
              key={resultado}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar({ ...valor, resultado })}
              className={clsx(
                'etiqueta rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                ativo ? `tom-${visual.tom} border-current` : 'border-borda/70 text-texto-secundario hover:text-texto',
              )}
            >
              {visual.rotulo}
            </button>
          );
        })}
      </div>
      <AreaTexto
        rotulo={valor.resultado === '' || valor.resultado === 'confere' ? 'Observação (opcional)' : 'O que difere? (obrigatório)'}
        rows={3}
        maxLength={2000}
        value={valor.observacao}
        onChange={(e) => aoMudar({ ...valor, observacao: e.target.value })}
      />
    </div>
  );
}

/** Identificação do item de portfólio usado pela AV, com o link para o cadastro. */
export function CartaoDoItem({ item }: { item: ItemPortfolioDTO }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <TituloSecao>Item de portfólio</TituloSecao>
        <Link href={`/portfolio/itens/editar/?id=${item.id}`} className="text-xs text-primaria hover:text-primaria-hover">
          Abrir cadastro do item
        </Link>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-texto-sutil">Código</dt>
        <dd className="font-medium">{item.codigo}</dd>
        <dt className="text-texto-sutil">Descrição</dt>
        <dd>{item.descricao}</dd>
        <dt className="text-texto-sutil">Linha / família</dt>
        <dd>{[item.linha, item.familia].filter(Boolean).join(' · ') || '—'}</dd>
        <dt className="text-texto-sutil">Programa</dt>
        <dd>{item.programa ?? '—'}</dd>
        <dt className="text-texto-sutil">Desenho</dt>
        <dd>{item.revisaoDesenho ? `rev. ${item.revisaoDesenho}` : '—'}</dd>
      </dl>
    </div>
  );
}

/** Estrutura do produto do item, só para leitura (árvore indentada). */
export function EstruturaSomenteLeitura({ nos }: { nos: NoEstruturaDTO[] }) {
  const nivel = new Map<string, number>();
  for (const no of nos) nivel.set(no.id, no.paiId ? (nivel.get(no.paiId) ?? 0) + 1 : 0);
  return (
    <div className="flex flex-col gap-2">
      <TituloSecao>Estrutura do item</TituloSecao>
      {nos.length === 0 ? (
        <p className="text-sm text-texto-secundario">O item não tem estrutura cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-0.5 rounded-lg border border-borda/60 bg-superficie-solida/60 p-2">
          {nos.map((no) => (
            <li key={no.id} className="flex items-center gap-2 py-0.5 text-sm" style={{ paddingLeft: `${(nivel.get(no.id) ?? 0) * 20}px` }}>
              <IconeDeEstrutura tipo={no.tipo} className="size-4" />
              <span className="min-w-0 flex-1 truncate" title={ROTULO_DO_TIPO[no.tipo]}>
                {[no.codigo, no.descricao].filter(Boolean).join(' — ')}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-texto-secundario">
                {no.pecasPorEmbalagem ? `1/${no.pecasPorEmbalagem}` : (no.quantidade?.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) ?? '—')}{' '}
                {no.unidade ?? ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Operações do item, só para leitura. */
export function OperacoesSomenteLeitura({ operacoes }: { operacoes: OperacaoPortfolioDTO[] }) {
  return (
    <div className="flex flex-col gap-2">
      <TituloSecao>Operações do item</TituloSecao>
      {operacoes.length === 0 ? (
        <p className="text-sm text-texto-secundario">O item não tem operações cadastradas.</p>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="w-10 pl-3">#</CelulaCabecalho>
              <CelulaCabecalho>Operação</CelulaCabecalho>
              <CelulaCabecalho className="w-48">Máquina</CelulaCabecalho>
              <CelulaCabecalho className="w-28 pr-3">Pçs/hora</CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {operacoes.map((operacao, indice) => (
              <LinhaTabela key={operacao.id}>
                <CelulaTabela className="pl-3 text-xs text-texto-sutil">{indice + 1}</CelulaTabela>
                <CelulaTabela>{operacao.descricao}</CelulaTabela>
                <CelulaTabela className="text-texto-secundario">{operacao.maquina ?? '—'}</CelulaTabela>
                <CelulaTabela className="pr-3 tabular-nums">
                  {operacao.pecasHora?.toLocaleString('pt-BR') ?? '—'}
                </CelulaTabela>
              </LinhaTabela>
            ))}
          </tbody>
        </Tabela>
      )}
    </div>
  );
}

/** Item excluído do cadastro depois da abertura (não deveria acontecer: itens só são desativados). */
export function SemItem() {
  return <p className="text-sm text-texto-secundario">O item de portfólio desta AV não foi encontrado no cadastro.</p>;
}
