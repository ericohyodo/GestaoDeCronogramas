'use client';

import clsx from 'clsx';
import { Package, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ItemPortfolioResumoDTO } from '@contratos/portfolio.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { classeBotao } from '@/compartilhado/ui/Botao';
import { CabecalhoPagina } from '@/compartilhado/ui/CabecalhoPagina';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { EstadoVazio } from '@/compartilhado/ui/EstadoVazio';
import { Etiqueta } from '@/compartilhado/ui/Etiqueta';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { custoPorPeca, DIAS_PARA_CUSTO_ANTIGO, diasDesde } from '../../portfolio';

/**
 * Cadastro de itens de portfólio (templates da AV de portfólio). Todos consultam; gestores e
 * administradores criam e editam.
 * @param podeEditar perfil com permissão de planejamento
 */
export function PaginaItensPortfolio({ podeEditar }: { podeEditar: boolean }) {
  const [itens, setItens] = useState<ItemPortfolioResumoDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);

  useEffect(() => {
    clienteDesktop.portfolio
      .listarItens()
      .then(setItens)
      .catch((falha: unknown) => setErro(mensagemDeErro(falha)));
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (itens ?? [])
      .filter((item) => mostrarInativos || item.ativo)
      .filter(
        (item) =>
          !termo ||
          [item.codigo, item.descricao, item.cliente, item.linha, item.familia].some((campo) =>
            campo?.toLowerCase().includes(termo),
          ),
      );
  }, [itens, busca, mostrarInativos]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <CabecalhoPagina
        titulo="Itens de portfólio"
        descricao="Itens já desenvolvidos que servem de modelo para a AV de portfólio: desenho de referência, estrutura, operações e custos."
        acoes={
          podeEditar && (
            <Link href="/portfolio/itens/editar/" className={classeBotao('primario')}>
              <Plus aria-hidden className="size-4" />
              Novo item
            </Link>
          )
        }
      />
      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}

      <div className="flex flex-wrap items-end gap-4">
        <CampoTexto
          rotulo="Buscar"
          classeContainer="w-72"
          placeholder="Código, descrição, cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className="flex items-center gap-2 pb-2 text-sm text-texto-secundario">
          <input type="checkbox" className="size-4 accent-primaria" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
          Mostrar inativos
        </label>
      </div>

      {itens === null ? (
        <p className="text-sm text-texto-secundario">Carregando itens…</p>
      ) : filtrados.length === 0 ? (
        <PainelVidro>
          <EstadoVazio
            icone={Package}
            titulo="Nenhum item de portfólio"
            descricao={podeEditar ? 'Use "Novo item" para cadastrar o primeiro.' : 'Peça a um gestor para cadastrar os itens.'}
          />
        </PainelVidro>
      ) : (
        <PainelVidro className="overflow-hidden">
          <Tabela>
            <thead>
              <tr>
                <CelulaCabecalho className="pl-5">Código</CelulaCabecalho>
                <CelulaCabecalho>Descrição</CelulaCabecalho>
                <CelulaCabecalho>Linha / família</CelulaCabecalho>
                <CelulaCabecalho className="w-24">Desenho</CelulaCabecalho>
                <CelulaCabecalho className="w-32">Custo/peça</CelulaCabecalho>
                <CelulaCabecalho className="w-40 pr-5">Custos de</CelulaCabecalho>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => {
                const custo = custoPorPeca(item);
                const idade = diasDesde(item.custosAtualizadosEm);
                return (
                  <LinhaTabela key={item.id} className={clsx(!item.ativo && 'opacity-60')}>
                    <CelulaTabela className="pl-5 font-medium">
                      <Link href={`/portfolio/itens/editar/?id=${item.id}`} className="text-primaria hover:text-primaria-hover">
                        {item.codigo}
                      </Link>
                      {!item.ativo && (
                        <span className="ml-2">
                          <Etiqueta>inativo</Etiqueta>
                        </span>
                      )}
                    </CelulaTabela>
                    <CelulaTabela className="max-w-sm">
                      <p className="truncate">{item.descricao}</p>
                      {item.cliente && <p className="truncate text-xs text-texto-secundario">{item.cliente}</p>}
                    </CelulaTabela>
                    <CelulaTabela className="text-sm text-texto-secundario">
                      {[item.linha, item.familia].filter(Boolean).join(' · ') || '—'}
                    </CelulaTabela>
                    <CelulaTabela className="text-sm">{item.revisaoDesenho ? `rev. ${item.revisaoDesenho}` : '—'}</CelulaTabela>
                    <CelulaTabela className="text-sm tabular-nums">{custo === null ? '—' : formatarMoeda(custo)}</CelulaTabela>
                    <CelulaTabela className="pr-5 text-sm">
                      {item.custosAtualizadosEm ? (
                        <span className={clsx(idade !== null && idade > DIAS_PARA_CUSTO_ANTIGO && 'font-medium text-alerta')}>
                          {new Date(`${item.custosAtualizadosEm}T12:00:00`).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </CelulaTabela>
                  </LinhaTabela>
                );
              })}
            </tbody>
          </Tabela>
        </PainelVidro>
      )}
    </div>
  );
}
