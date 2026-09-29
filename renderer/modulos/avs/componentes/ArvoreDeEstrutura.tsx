'use client';

import clsx from 'clsx';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { NoEstruturaDTO, NoEstruturaEntrada } from '@contratos/avs.contrato';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { IconeDeEstrutura } from './IconesDeEstrutura';
import { ModalDoItemDaEstrutura, ROTULO_DO_TIPO, type DadosDoItem, type NoEditavel } from './ModalDoItemDaEstrutura';
import { BotaoLimparCampos, TituloSecao } from './SecaoAv';

export type { NoEditavel } from './ModalDoItemDaEstrutura';

export function estruturaDeDto(nos: NoEstruturaDTO[]): NoEditavel[] {
  return nos.map((no) => ({
    chave: no.id,
    paiChave: no.paiId,
    tipo: no.tipo,
    codigo: no.codigo ?? '',
    descricao: no.descricao,
    quantidade: no.quantidade != null ? String(no.quantidade) : '',
    unidade: no.unidade ?? '',
  }));
}

/** Filhos de cada item, na ordem em que foram incluídos (`null` guarda os itens de 1º nível). */
function filhosPorPai(nos: readonly NoEditavel[]): Map<string | null, NoEditavel[]> {
  const mapa = new Map<string | null, NoEditavel[]>();
  for (const no of nos) mapa.set(no.paiChave, [...(mapa.get(no.paiChave) ?? []), no]);
  return mapa;
}

/** O item e tudo o que está abaixo dele. */
export function chavesDoRamo(nos: readonly NoEditavel[], chave: string): Set<string> {
  const filhos = filhosPorPai(nos);
  const ramo = new Set<string>();
  const visitar = (atual: string) => {
    ramo.add(atual);
    for (const filho of filhos.get(atual) ?? []) visitar(filho.chave);
  };
  visitar(chave);
  return ramo;
}

/** Lista para gravar, em ordem de árvore (pai antes dos filhos). Itens sem descrição ficam de fora com o que há abaixo. */
export function estruturaParaEnvio(nos: readonly NoEditavel[]): NoEstruturaEntrada[] {
  const filhos = filhosPorPai(nos);
  const resultado: NoEstruturaEntrada[] = [];
  const visitar = (no: NoEditavel) => {
    if (!no.descricao.trim()) return;
    resultado.push({
      chave: no.chave,
      paiChave: no.paiChave,
      tipo: no.tipo,
      codigo: no.codigo.trim() || null,
      descricao: no.descricao,
      quantidade: no.quantidade.trim() === '' ? null : Number(no.quantidade),
      unidade: no.unidade.trim() || null,
    });
    for (const filho of filhos.get(no.chave) ?? []) visitar(filho);
  };
  for (const raiz of filhos.get(null) ?? []) visitar(raiz);
  return resultado;
}

/**
 * Componentes e matérias-primas da estrutura com a quantidade acumulada por conjunto principal (a quantidade do item vezes a
 * dos itens em que ele está dentro). São eles que vão para as matérias-primas do Mapa de Custo.
 */
export function componentesDaEstrutura(
  nos: readonly NoEditavel[],
): { codigo: string; descricao: string; quantidade: number | null; unidade: string }[] {
  const porChave = new Map(nos.map((no) => [no.chave, no]));
  const acumulada = (no: NoEditavel): number => {
    const propria = no.quantidade.trim() === '' ? 1 : Number(no.quantidade) || 0;
    const pai = no.paiChave ? porChave.get(no.paiChave) : undefined;
    return pai ? propria * acumulada(pai) : propria;
  };
  return nos
    .filter((no) => (no.tipo === 'componente' || no.tipo === 'materia_prima') && no.descricao.trim())
    .map((no) => ({
      codigo: no.codigo.trim(),
      descricao: no.descricao.trim(),
      quantidade: Math.round(acumulada(no) * 10_000) / 10_000,
      unidade: no.unidade.trim(),
    }));
}

/**
 * Estrutura do produto em árvore, no estilo das árvores de montagem de CAD: o conjunto principal (nome vindo do
 * desenho/código do cliente) na raiz e, dentro dele, conjuntos, componentes, embalagens e insumos, cada um com a
 * sua quantidade à direita. Itens novos entram pelo botão "Inserir item".
 */
export function ArvoreDeEstrutura({
  nos,
  nomeDoConjunto,
  aoAdicionar,
  aoMudar,
  aoRemover,
  aoLimpar,
}: {
  nos: NoEditavel[];
  /** Nome automático do conjunto principal (número do desenho do cliente). */
  nomeDoConjunto: string;
  aoAdicionar: (dados: DadosDoItem) => void;
  aoMudar: (chave: string, campo: keyof NoEditavel, valor: string) => void;
  aoRemover: (chave: string) => void;
  aoLimpar: () => void;
}) {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [inserindo, setInserindo] = useState(false);
  const [editando, setEditando] = useState<NoEditavel | null>(null);
  const filhos = filhosPorPai(nos);
  const RAIZ = '__conjunto__';

  const alternar = (chave: string) =>
    setRecolhidos((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(chave)) proximo.add(chave);
      return proximo;
    });

  const expansor = (chave: string, temFilhos: boolean) =>
    temFilhos ? (
      <button
        type="button"
        aria-label={recolhidos.has(chave) ? 'Expandir' : 'Recolher'}
        onClick={(e) => {
          e.stopPropagation();
          alternar(chave);
        }}
        className="grid size-4 shrink-0 place-items-center border border-texto-sutil/70 bg-superficie-solida text-[11px] font-semibold leading-none text-texto-secundario hover:text-texto"
      >
        {recolhidos.has(chave) ? '+' : '−'}
      </button>
    ) : (
      <span className="size-4 shrink-0" aria-hidden />
    );

  const ramo = (no: NoEditavel) => {
    const filhosDoNo = filhos.get(no.chave) ?? [];
    const nome = [no.codigo.trim(), no.descricao.trim()].filter(Boolean).join(' — ');
    return (
      <li
        key={no.chave}
        role="treeitem"
        aria-selected={selecionada === no.chave}
        aria-expanded={filhosDoNo.length > 0 ? !recolhidos.has(no.chave) : undefined}
        className="relative before:absolute before:-left-4 before:top-[15px] before:w-4 before:border-t before:border-dotted before:border-texto-sutil/60"
      >
        <div
          onClick={() => setSelecionada(no.chave)}
          className={clsx(
            'group flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-texto/5',
            selecionada === no.chave && 'bg-primaria/10 ring-1 ring-primaria/60',
          )}
        >
          {expansor(no.chave, filhosDoNo.length > 0)}
          <IconeDeEstrutura tipo={no.tipo} />
          <span className="min-w-0 flex-1 truncate text-sm" title={`${ROTULO_DO_TIPO[no.tipo]}: ${nome}`}>
            {nome || '(sem descrição)'}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <BotaoIcone icone={Pencil} rotulo={`Editar ${nome}`} onClick={() => setEditando(no)} />
            <BotaoIcone icone={Trash2} rotulo={`Remover ${nome} e o que está dentro dele`} onClick={() => aoRemover(no.chave)} />
          </span>
          <span className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min={0}
              step="any"
              aria-label={`Quantidade de ${nome}`}
              className="h-7 w-20 rounded-md border border-borda bg-superficie-solida/80 px-2 text-right text-xs tabular-nums focus:border-primaria focus:outline-none focus:ring-2 focus:ring-primaria/20"
              value={no.quantidade}
              onChange={(e) => aoMudar(no.chave, 'quantidade', e.target.value)}
            />
            <span className="w-7 text-xs text-texto-sutil">{no.unidade}</span>
          </span>
        </div>
        {filhosDoNo.length > 0 && !recolhidos.has(no.chave) && (
          <ul role="group" className="ml-[9px] border-l border-dotted border-texto-sutil/60 pl-4">
            {filhosDoNo.map(ramo)}
          </ul>
        )}
      </li>
    );
  };

  const itensDoPrimeiroNivel = filhos.get(null) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TituloSecao>Estrutura do produto</TituloSecao>
          <Ajuda texto="Composição do produto em árvore. O conjunto principal usa o código do cliente (aba Comercial) como nome. Use 'Inserir item' para adicionar conjuntos, componentes, matérias-primas, embalagens e insumos, escolhendo o nível: 1º nível entra direto no conjunto; 2º nível entra dentro de um item de 1º nível. A quantidade de cada item fica à direita. Os componentes e as matérias-primas vão para as matérias-primas do Mapa de Custo." />
        </div>
        <BotaoLimparCampos aoLimpar={aoLimpar} disabled={nos.length === 0} />
      </div>

      <ul role="tree" aria-label="Estrutura do produto" className="flex flex-col rounded-lg border border-borda/60 bg-superficie-solida/60 p-2">
        <li role="treeitem" aria-selected={selecionada === RAIZ} aria-expanded={itensDoPrimeiroNivel.length > 0 ? !recolhidos.has(RAIZ) : undefined}>
          <div
            onClick={() => setSelecionada(RAIZ)}
            className={clsx(
              'flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-texto/5',
              selecionada === RAIZ && 'bg-primaria/10 ring-1 ring-primaria/60',
            )}
          >
            {expansor(RAIZ, itensDoPrimeiroNivel.length > 0)}
            <IconeDeEstrutura tipo="conjunto" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold" title="Nome automático: código do cliente">
              {nomeDoConjunto || 'Conjunto (preencha o Código do cliente na aba Comercial)'}
            </span>
            <span className="rounded-full border border-borda px-2 text-[10px] font-medium text-texto-sutil">automático</span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-texto-sutil">
              <span className="w-20 pr-2 text-right tabular-nums">1</span>
              <span className="w-7">un</span>
            </span>
          </div>
          {itensDoPrimeiroNivel.length > 0 && !recolhidos.has(RAIZ) && (
            <ul role="group" className="ml-[9px] border-l border-dotted border-texto-sutil/60 pl-4">
              {itensDoPrimeiroNivel.map(ramo)}
            </ul>
          )}
        </li>
      </ul>

      <div className="flex items-center justify-between">
        <Botao icone={Plus} onClick={() => setInserindo(true)}>
          Inserir item
        </Botao>
        <p className="text-xs text-texto-secundario">
          <span className="font-semibold text-texto">{nos.length}</span> item(ns)
        </p>
      </div>

      <ModalDoItemDaEstrutura
        aberto={inserindo}
        nos={nos}
        paiInicial={selecionada === RAIZ ? null : selecionada}
        edicao={null}
        aoConfirmar={aoAdicionar}
        aoFechar={() => setInserindo(false)}
      />
      <ModalDoItemDaEstrutura
        aberto={editando !== null}
        nos={nos}
        paiInicial={null}
        edicao={editando}
        aoConfirmar={(dados) => {
          if (!editando) return;
          aoMudar(editando.chave, 'codigo', dados.codigo);
          aoMudar(editando.chave, 'descricao', dados.descricao);
          aoMudar(editando.chave, 'quantidade', dados.quantidade);
          aoMudar(editando.chave, 'unidade', dados.unidade);
        }}
        aoFechar={() => setEditando(null)}
      />
    </div>
  );
}
