'use client';

import clsx from 'clsx';
import { ExternalLink, FileClock, FileDown, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnaliseArquivadaDTO, ResumoDeAnaliseDTO } from '@contratos/ia.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao, classeBotao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { Selecao } from '@/compartilhado/ui/Campos';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { AVISO_DA_IA, dataEHora, nomeDoModelo, SAUDE, useExportarPdfDaAnalise } from './comum';
import { RelatorioDaAnalise } from './RelatorioDaAnalise';

const TODAS = 'todas';
const PORTFOLIO = 'portfolio';

/** Todas as análises geradas, para consultar sem chamar a IA de novo e exportar em PDF. */
export function ArquivoDeAnalises({
  podeExcluir,
  escopo = 'projetos',
}: {
  podeExcluir: boolean;
  /** Cada módulo vê só as análises dele: Projetos (cronograma e portfólio) ou AVs. */
  escopo?: 'projetos' | 'avs';
}) {
  const [resumos, setResumos] = useState<ResumoDeAnaliseDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState(TODAS);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<ResumoDeAnaliseDTO | null>(null);

  const doEscopo = useCallback(
    (lista: ResumoDeAnaliseDTO[]) => lista.filter((resumo) => (resumo.tipo === 'avs') === (escopo === 'avs')),
    [escopo],
  );

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setResumos(doEscopo(await clienteDesktop.ia.listarAnalises()));
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }, [doEscopo]);

  useEffect(() => {
    clienteDesktop.ia
      .listarAnalises()
      .then((lista) => setResumos(doEscopo(lista)))
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, [doEscopo]);

  // Um item por projeto analisado, com o nome da análise mais recente (o projeto pode ter sido renomeado).
  const opcoesDoFiltro = useMemo(() => {
    const projetos = new Map<string, string>();
    for (const resumo of resumos ?? []) {
      if (resumo.cronogramaId && !projetos.has(resumo.cronogramaId)) {
        projetos.set(resumo.cronogramaId, resumo.titulo);
      }
    }
    return [
      { valor: TODAS, rotulo: 'Todas as análises' },
      { valor: PORTFOLIO, rotulo: 'Portfólio' },
      ...[...projetos]
        .sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))
        .map(([valor, rotulo]) => ({ valor, rotulo })),
    ];
  }, [resumos]);

  const filtradas = useMemo(
    () =>
      (resumos ?? []).filter((resumo) =>
        filtro === TODAS
          ? true
          : filtro === PORTFOLIO
            ? resumo.tipo === 'portfolio'
            : resumo.cronogramaId === filtro,
      ),
    [resumos, filtro],
  );
  const selecionada = filtradas.find((resumo) => resumo.id === selecionadaId) ?? filtradas[0] ?? null;

  const excluir = async (resumo: ResumoDeAnaliseDTO) => {
    await clienteDesktop.ia.excluirAnalise(resumo.id);
    setResumos((atuais) => atuais?.filter((cada) => cada.id !== resumo.id) ?? null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-6">
      <CabecalhoPagina
        titulo="Análises"
        descricao={
          escopo === 'avs'
            ? 'Toda análise das AVs gerada com IA fica salva aqui. Consulte, compare com as anteriores e exporte em PDF sem gerar de novo.'
            : 'Toda análise gerada com IA fica salva aqui. Consulte, compare com as anteriores e exporte em PDF sem gerar de novo.'
        }
        acoes={
          <>
            {escopo === 'projetos' && (
              <Selecao
                rotulo="Mostrar"
                opcoes={opcoesDoFiltro}
                value={filtro}
                onChange={(evento) => setFiltro(evento.target.value)}
                classeContainer="w-60 [&>label]:sr-only"
              />
            )}
            <Botao icone={RefreshCw} onClick={() => void carregar()}>
              Atualizar
            </Botao>
          </>
        }
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      {resumos === null ? (
        !erro && (
          <div className="flex justify-center py-16">
            <Loader2 aria-label="Carregando" className="size-6 animate-spin text-primaria" />
          </div>
        )
      ) : resumos.length === 0 ? (
        <PainelVidro>
          <EstadoVazio
            icone={FileClock}
            titulo="Nenhuma análise ainda"
            descricao={
              escopo === 'avs'
                ? 'Use "Analisar AVs com IA" na tela de AVs. Cada análise gerada aparece aqui.'
                : 'Use "Analisar com IA" em um cronograma, ou "Analisar portfólio com IA" na tela inicial. Cada análise gerada aparece aqui.'
            }
          />
        </PainelVidro>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">
          <PainelVidro className="flex w-80 shrink-0 flex-col overflow-hidden">
            {filtradas.length === 0 ? (
              <p className="p-4 text-sm text-texto-sutil">Nenhuma análise com este filtro.</p>
            ) : (
              <ul className="flex-1 overflow-y-auto p-2">
                {filtradas.map((resumo) => (
                  <li key={resumo.id}>
                    <ItemDaLista
                      resumo={resumo}
                      ativo={resumo.id === selecionada?.id}
                      aoSelecionar={() => setSelecionadaId(resumo.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </PainelVidro>

          <PainelVidro className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {selecionada ? (
              <Detalhe
                key={selecionada.id}
                resumo={selecionada}
                podeExcluir={podeExcluir}
                aoExcluir={() => setExcluindo(selecionada)}
              />
            ) : (
              <p className="p-6 text-sm text-texto-sutil">Escolha uma análise na lista.</p>
            )}
          </PainelVidro>
        </div>
      )}

      <DialogoConfirmacao
        aberto={excluindo !== null}
        titulo="Excluir análise"
        mensagem={
          excluindo
            ? `A análise "${excluindo.titulo}" de ${dataEHora(excluindo.geradaEm)} será removida do arquivo para todos os usuários.`
            : ''
        }
        aoConfirmar={() => (excluindo ? excluir(excluindo) : Promise.resolve())}
        aoFechar={() => setExcluindo(null)}
      />
    </div>
  );
}

function ItemDaLista({
  resumo,
  ativo,
  aoSelecionar,
}: {
  resumo: ResumoDeAnaliseDTO;
  ativo: boolean;
  aoSelecionar: () => void;
}) {
  const saude = SAUDE[resumo.saude];
  return (
    <button
      type="button"
      aria-current={ativo ? 'true' : undefined}
      onClick={aoSelecionar}
      className={clsx(
        'flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors',
        ativo ? 'bg-primaria/12' : 'hover:bg-texto/6',
      )}
    >
      <span className="flex items-center gap-2">
        <span className={clsx('min-w-0 flex-1 truncate text-sm', ativo ? 'font-medium text-primaria' : '')}>
          {resumo.tipo === 'portfolio' ? 'Portfólio' : resumo.titulo}
        </span>
        <Etiqueta tom={saude.tom}>{saude.rotulo}</Etiqueta>
      </span>
      <span className="truncate text-xs text-texto-sutil">
        {dataEHora(resumo.geradaEm)}
        {resumo.geradaPor && ` · ${resumo.geradaPor}`}
      </span>
    </button>
  );
}

function Detalhe({
  resumo,
  podeExcluir,
  aoExcluir,
}: {
  resumo: ResumoDeAnaliseDTO;
  podeExcluir: boolean;
  aoExcluir: () => void;
}) {
  const [arquivada, setArquivada] = useState<AnaliseArquivadaDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pdf = useExportarPdfDaAnalise();

  useEffect(() => {
    let vigente = true;
    clienteDesktop.ia
      .obterAnalise(resumo.id)
      .then((analise) => vigente && setArquivada(analise))
      .catch((falha: unknown) => vigente && setErro(mensagemDeErro(falha)));
    return () => {
      vigente = false;
    };
  }, [resumo.id]);

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-borda/60 px-6 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-texto-sutil">
            {resumo.tipo === 'avs'
              ? 'Análise das AVs'
              : resumo.tipo === 'portfolio'
                ? 'Análise do portfólio'
                : 'Análise do cronograma'}
          </p>
          <h2 className="truncate text-lg font-semibold">{resumo.titulo}</h2>
          <p className="text-xs text-texto-sutil">
            {dataEHora(resumo.geradaEm)} · {nomeDoModelo(resumo.modelo)}
            {resumo.geradaPor && ` · por ${resumo.geradaPor}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {resumo.cronogramaId && (
            <Link href={`/cronograma/?id=${resumo.cronogramaId}`} className={classeBotao('fantasma')}>
              <ExternalLink aria-hidden className="size-4" />
              Abrir cronograma
            </Link>
          )}
          <Botao icone={FileDown} onClick={() => void pdf.exportar(resumo.id)} disabled={pdf.gerando}>
            {pdf.gerando ? 'Gerando PDF…' : 'Exportar PDF'}
          </Botao>
          {podeExcluir && (
            <Botao icone={Trash2} variante="fantasma" onClick={aoExcluir} aria-label="Excluir análise">
              Excluir
            </Botao>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {pdf.erro && <MensagemErro className="mb-3" mensagem={pdf.erro} aoFechar={pdf.limparErro} />}
        {erro ? (
          <MensagemErro mensagem={erro} />
        ) : arquivada ? (
          <>
            <RelatorioDaAnalise arquivada={arquivada} />
            <p className="mt-4 text-xs text-texto-sutil">{AVISO_DA_IA}</p>
          </>
        ) : (
          <div className="flex justify-center py-12">
            <Loader2 aria-label="Carregando análise" className="size-6 animate-spin text-primaria" />
          </div>
        )}
      </div>
    </>
  );
}
