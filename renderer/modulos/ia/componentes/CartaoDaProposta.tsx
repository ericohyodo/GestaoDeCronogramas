'use client';

import clsx from 'clsx';
import { ArrowRight, Check, CircleSlash, ListChecks, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { PropostaDeAlteracaoDTO, SituacaoDaPropostaDTO } from '@contratos/ia.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarDataHora } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { Etiqueta, type Tom } from '@/compartilhado/ui/Etiqueta';

const SITUACAO: Record<SituacaoDaPropostaDTO, { rotulo: string; tom: Tom }> = {
  pendente: { rotulo: 'aguardando você', tom: 'alerta' },
  aplicada: { rotulo: 'aplicada', tom: 'sucesso' },
  descartada: { rotulo: 'descartada', tom: 'neutro' },
  desatualizada: { rotulo: 'não aplicada', tom: 'perigo' },
};

/**
 * Proposta do agente dentro da conversa: o que muda (antes → depois) e a decisão. Nada é gravado no
 * cronograma até a pessoa clicar em "Aplicar".
 * @param proposta proposta trazida pela resposta da IA
 * @param podeAplicar quem não edita tarefas só vê a lista
 * @param aoDecidir recebe a proposta já decidida (para atualizar a fala)
 */
export function CartaoDaProposta({
  proposta,
  podeAplicar,
  aoDecidir,
}: {
  proposta: PropostaDeAlteracaoDTO;
  podeAplicar: boolean;
  aoDecidir: (proposta: PropostaDeAlteracaoDTO) => void;
}) {
  const [decidindo, setDecidindo] = useState<'aplicar' | 'descartar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const situacao = SITUACAO[proposta.situacao];

  const decidir = async (acao: 'aplicar' | 'descartar') => {
    setDecidindo(acao);
    setErro(null);
    try {
      aoDecidir(
        acao === 'aplicar'
          ? await clienteDesktop.ia.aplicarProposta(proposta.id)
          : await clienteDesktop.ia.descartarProposta(proposta.id),
      );
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      // Proposta desatualizada: o servidor já a marcou; a fala mostra o motivo.
      if (acao === 'aplicar') {
        aoDecidir({ ...proposta, situacao: 'desatualizada', motivo: mensagemDeErro(falha), decididaEm: new Date().toISOString() });
      }
    } finally {
      setDecidindo(null);
    }
  };

  return (
    <section
      aria-label={`Proposta de alteração em ${proposta.cronogramaNome}`}
      className="mt-3 overflow-hidden rounded-xl border border-borda bg-superficie-solida/80 text-texto"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-borda/70 px-4 py-2.5">
        <ListChecks aria-hidden className="size-4 text-primaria" />
        <p className="text-sm font-semibold">Proposta de alteração</p>
        <span className="text-xs text-texto-secundario">· {proposta.cronogramaNome}</span>
        <span className="ml-auto">
          <Etiqueta tom={situacao.tom}>{situacao.rotulo}</Etiqueta>
        </span>
      </header>
      <p className="px-4 pt-3 text-sm">{proposta.resumo}</p>
      <ol className="flex flex-col gap-2 px-4 py-3">
        {proposta.itens.map((item, indice) => (
          <li key={indice} className="rounded-lg bg-texto/4 px-3 py-2">
            <p className="text-sm font-medium">{item.descricao}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-texto-secundario">
              {item.antes && (
                <>
                  <span className="line-through decoration-texto-sutil/60">{item.antes}</span>
                  <ArrowRight aria-label="passa a" className="size-3 shrink-0" />
                </>
              )}
              <span className="font-medium text-texto">{item.depois}</span>
            </p>
          </li>
        ))}
      </ol>

      {proposta.situacao === 'pendente' ? (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-borda/70 px-4 py-2.5">
          {!podeAplicar && (
            <p className="mr-auto text-xs text-texto-sutil">Seu perfil não pode alterar tarefas: só quem pode aplica.</p>
          )}
          <Botao tamanho="sm" icone={X} onClick={() => void decidir('descartar')} disabled={decidindo !== null}>
            {decidindo === 'descartar' ? 'Descartando…' : 'Descartar'}
          </Botao>
          {podeAplicar && (
            <Botao
              tamanho="sm"
              variante="primario"
              icone={Check}
              onClick={() => void decidir('aplicar')}
              disabled={decidindo !== null}
            >
              {decidindo === 'aplicar' ? 'Aplicando…' : `Aplicar ${proposta.itens.length} alteração(ões)`}
            </Botao>
          )}
        </footer>
      ) : (
        <footer
          className={clsx(
            'flex flex-wrap items-center gap-2 border-t border-borda/70 px-4 py-2.5 text-xs',
            proposta.situacao === 'desatualizada' ? 'text-perigo' : 'text-texto-secundario',
          )}
        >
          {proposta.situacao === 'desatualizada' ? (
            <TriangleAlert aria-hidden className="size-3.5" />
          ) : proposta.situacao === 'descartada' ? (
            <CircleSlash aria-hidden className="size-3.5" />
          ) : (
            <Check aria-hidden className="size-3.5 text-sucesso" />
          )}
          <span>
            {proposta.situacao === 'aplicada' && 'Aplicada'}
            {proposta.situacao === 'descartada' && (proposta.motivo ?? 'Descartada')}
            {proposta.situacao === 'desatualizada' && (proposta.motivo ?? 'O cronograma mudou; peça uma nova proposta.')}
            {proposta.decididaEm && ` · ${formatarDataHora(proposta.decididaEm)}`}
          </span>
          <Link
            href={{ pathname: '/cronograma/', query: { id: proposta.cronogramaId } }}
            className="ml-auto inline-flex items-center gap-1 font-medium text-primaria hover:text-primaria-hover"
          >
            Abrir cronograma
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </footer>
      )}
      {erro && proposta.situacao === 'pendente' && <p className="px-4 pb-3 text-xs text-perigo">{erro}</p>}
    </section>
  );
}
