'use client';

import { BarChart3, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LinhaRelatorioAvDTO, SituacaoAvDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarData, formatarMoeda } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { TituloSecao } from './SecaoAv';

const SITUACOES: { valor: SituacaoAvDTO | 'todas'; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas as situações' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluida', rotulo: 'Concluídas' },
  { valor: 'declinada', rotulo: 'Declinadas' },
];

interface Agrupamento {
  chave: string;
  quantidade: number;
  atrasadas: number;
  investimento: number;
}

function agrupar(linhas: LinhaRelatorioAvDTO[], chaveDe: (linha: LinhaRelatorioAvDTO) => string): Agrupamento[] {
  const grupos = new Map<string, Agrupamento>();
  for (const linha of linhas) {
    const chave = chaveDe(linha);
    const atual = grupos.get(chave) ?? { chave, quantidade: 0, atrasadas: 0, investimento: 0 };
    atual.quantidade += 1;
    if (linha.atrasada) atual.atrasadas += 1;
    atual.investimento += linha.investimentoTotal;
    grupos.set(chave, atual);
  }
  return [...grupos.values()].sort((a, b) => b.quantidade - a.quantidade || a.chave.localeCompare(b.chave, 'pt-BR'));
}

/** Relatórios do módulo de AVs: visão por situação, etapa, cliente e família, e o detalhe de cada AV. */
export function PaginaRelatoriosAvs() {
  const [linhas, setLinhas] = useState<LinhaRelatorioAvDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [situacao, setSituacao] = useState<SituacaoAvDTO | 'todas'>('todas');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setLinhas(await clienteDesktop.avs.relatorio());
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }, []);

  useEffect(() => {
    clienteDesktop.avs
      .relatorio()
      .then(setLinhas)
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (linhas ?? []).filter(
      (linha) =>
        (situacao === 'todas' || linha.situacao === situacao) &&
        (!termo ||
          [linha.numero, linha.cliente, linha.descricao, linha.grupo, linha.familia, linha.responsavelDaEtapa].some(
            (campo) => campo?.toLowerCase().includes(termo),
          )),
    );
  }, [linhas, situacao, busca]);

  const resumo = useMemo(() => {
    const emAndamento = filtradas.filter((l) => l.situacao === 'em_andamento').length;
    const comCusto = filtradas.filter((l) => l.custoPorPeca > 0);
    return {
      total: filtradas.length,
      emAndamento,
      atrasadas: filtradas.filter((l) => l.atrasada).length,
      concluidas: filtradas.filter((l) => l.situacao === 'concluida').length,
      declinadas: filtradas.filter((l) => l.situacao === 'declinada').length,
      investimento: filtradas.reduce((soma, l) => soma + l.investimentoTotal, 0),
      custoMedio: comCusto.length ? comCusto.reduce((soma, l) => soma + l.custoPorPeca, 0) / comCusto.length : 0,
    };
  }, [filtradas]);

  const porEtapa = useMemo(() => agrupar(filtradas, (l) => l.etapa), [filtradas]);
  const porCliente = useMemo(() => agrupar(filtradas, (l) => l.cliente ?? 'Sem cliente'), [filtradas]);
  const porFamilia = useMemo(() => agrupar(filtradas, (l) => l.familia ?? 'Sem família'), [filtradas]);
  const maiorEtapa = Math.max(1, ...porEtapa.map((grupo) => grupo.quantidade));

  return (
    <div className="flex flex-col gap-5 p-6">
      <CabecalhoPagina
        titulo="Relatórios das AVs"
        descricao="Situação das Análises de Viabilidade: etapas, prazos, clientes e valores consolidados."
        acoes={
          <Botao icone={RefreshCw} onClick={() => void carregar()}>
            Atualizar
          </Botao>
        }
      />

      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      {linhas === null ? (
        !erro && <p className="text-sm text-texto-secundario">Carregando…</p>
      ) : linhas.length === 0 ? (
        <PainelVidro>
          <EstadoVazio icone={BarChart3} titulo="Nenhuma AV ainda" descricao="Abra AVs para ver os relatórios." />
        </PainelVidro>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Selecao
              rotulo="Situação"
              classeContainer="w-56"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value as SituacaoAvDTO | 'todas')}
              opcoes={SITUACOES.map((s) => ({ valor: s.valor, rotulo: s.rotulo }))}
            />
            <CampoTexto
              rotulo="Buscar"
              classeContainer="w-72"
              placeholder="Número, cliente, descrição, família ou responsável…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Indicador rotulo="AVs" valor={String(resumo.total)} />
            <Indicador rotulo="Em andamento" valor={String(resumo.emAndamento)} />
            <Indicador rotulo="Atrasadas" valor={String(resumo.atrasadas)} alerta={resumo.atrasadas > 0} />
            <Indicador rotulo="Concluídas" valor={String(resumo.concluidas)} />
            <Indicador rotulo="Declinadas" valor={String(resumo.declinadas)} />
            <Indicador rotulo="Investimento total" valor={formatarMoeda(resumo.investimento)} />
            <Indicador rotulo="Custo/Pç médio" valor={formatarMoeda(resumo.custoMedio)} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PainelVidro className="flex flex-col gap-3 p-5">
              <TituloSecao>AVs por etapa</TituloSecao>
              <ul className="flex flex-col gap-2">
                {porEtapa.map((grupo) => (
                  <li key={grupo.chave} className="grid grid-cols-[12rem_1fr_2rem] items-center gap-3 text-sm">
                    <span className="truncate">{grupo.chave}</span>
                    <span className="h-2 rounded-full bg-texto/8">
                      <span
                        className="block h-2 rounded-full bg-primaria"
                        style={{ width: `${(grupo.quantidade / maiorEtapa) * 100}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums">{grupo.quantidade}</span>
                  </li>
                ))}
              </ul>
            </PainelVidro>

            <PainelVidro className="flex flex-col gap-3 p-5">
              <TituloSecao>Por família</TituloSecao>
              <TabelaDeGrupos rotulo="Família" grupos={porFamilia} />
            </PainelVidro>
          </div>

          <PainelVidro className="flex flex-col gap-3 p-5">
            <TituloSecao>Por cliente</TituloSecao>
            <TabelaDeGrupos rotulo="Cliente" grupos={porCliente} />
          </PainelVidro>

          <PainelVidro className="flex flex-col gap-3 p-5">
            <TituloSecao>Detalhe das AVs</TituloSecao>
            <Tabela>
              <thead>
                <tr>
                  <CelulaCabecalho className="pl-3">AV</CelulaCabecalho>
                  <CelulaCabecalho>Cliente / Descrição</CelulaCabecalho>
                  <CelulaCabecalho>Etapa</CelulaCabecalho>
                  <CelulaCabecalho>Responsável</CelulaCabecalho>
                  <CelulaCabecalho>Prazo</CelulaCabecalho>
                  <CelulaCabecalho className="text-right">Dias na etapa</CelulaCabecalho>
                  <CelulaCabecalho className="text-right">Investimento</CelulaCabecalho>
                  <CelulaCabecalho className="pr-3 text-right">Custo/Pç</CelulaCabecalho>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((linha) => (
                  <LinhaTabela key={linha.id}>
                    <CelulaTabela className="pl-3 font-medium tabular-nums">
                      <Link href={`/avs/detalhe/?id=${linha.id}`} className="text-primaria hover:text-primaria-hover">
                        {linha.numero}
                      </Link>
                    </CelulaTabela>
                    <CelulaTabela className="max-w-xs">
                      <p className="truncate font-medium">{linha.cliente ?? '—'}</p>
                      <p className="truncate text-xs text-texto-secundario">{linha.descricao}</p>
                    </CelulaTabela>
                    <CelulaTabela>{linha.etapa}</CelulaTabela>
                    <CelulaTabela className="text-texto-secundario">{linha.responsavelDaEtapa ?? '—'}</CelulaTabela>
                    <CelulaTabela className="whitespace-nowrap tabular-nums">
                      {linha.prazo ? formatarData(linha.prazo) : '—'}
                      {linha.atrasada && (
                        <span className="ml-2">
                          <Etiqueta tom="perigo">Atrasada</Etiqueta>
                        </span>
                      )}
                    </CelulaTabela>
                    <CelulaTabela className="text-right tabular-nums">
                      {linha.situacao === 'em_andamento' ? linha.diasNaEtapa : '—'}
                    </CelulaTabela>
                    <CelulaTabela className="text-right tabular-nums">{formatarMoeda(linha.investimentoTotal)}</CelulaTabela>
                    <CelulaTabela className="pr-3 text-right tabular-nums">{formatarMoeda(linha.custoPorPeca)}</CelulaTabela>
                  </LinhaTabela>
                ))}
              </tbody>
            </Tabela>
            {filtradas.length === 0 && (
              <p className="text-sm text-texto-secundario">Nenhuma AV com este filtro.</p>
            )}
          </PainelVidro>
        </>
      )}
    </div>
  );
}

function Indicador({ rotulo, valor, alerta = false }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <PainelVidro className="px-4 py-3">
      <p className="text-xs text-texto-sutil">{rotulo}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${alerta ? 'text-perigo' : ''}`}>{valor}</p>
    </PainelVidro>
  );
}

function TabelaDeGrupos({ rotulo, grupos }: { rotulo: string; grupos: Agrupamento[] }) {
  return (
    <Tabela>
      <thead>
        <tr>
          <CelulaCabecalho className="pl-3">{rotulo}</CelulaCabecalho>
          <CelulaCabecalho className="text-right">AVs</CelulaCabecalho>
          <CelulaCabecalho className="text-right">Atrasadas</CelulaCabecalho>
          <CelulaCabecalho className="pr-3 text-right">Investimento</CelulaCabecalho>
        </tr>
      </thead>
      <tbody>
        {grupos.map((grupo) => (
          <LinhaTabela key={grupo.chave}>
            <CelulaTabela className="pl-3">{grupo.chave}</CelulaTabela>
            <CelulaTabela className="text-right tabular-nums">{grupo.quantidade}</CelulaTabela>
            <CelulaTabela className="text-right tabular-nums">{grupo.atrasadas || '—'}</CelulaTabela>
            <CelulaTabela className="pr-3 text-right tabular-nums">{formatarMoeda(grupo.investimento)}</CelulaTabela>
          </LinhaTabela>
        ))}
      </tbody>
    </Tabela>
  );
}
