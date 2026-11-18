'use client';

import { useState } from 'react';
import { FILHOS_PERMITIDOS_NA_ESTRUTURA, TIPOS_NO_ESTRUTURA, type TipoNoEstruturaDTO } from '@contratos/avs.contrato';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { Modal, RodapeModal } from '@/compartilhado/ui/Modal';
import { IconeDeEstrutura } from './IconesDeEstrutura';
import { formatarQuantidade, pecasValidas, quantidadeDasPecas } from '../quantidade-da-embalagem';

/** Um item da estrutura na tela. A lista é plana; a árvore é montada a partir de `paiChave`. */
export interface NoEditavel {
  chave: string;
  paiChave: string | null;
  tipo: TipoNoEstruturaDTO;
  codigo: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  /** Só embalagens: peças por embalagem (texto da tela). Vazio = quantidade digitada à mão. */
  pecasPorEmbalagem: string;
}

export type DadosDoItem = Omit<NoEditavel, 'chave'>;

export const ROTULO_DO_TIPO: Record<TipoNoEstruturaDTO, string> = {
  conjunto: 'Conjunto',
  componente: 'Componente',
  materia_prima: 'Matéria-prima',
  embalagem: 'Embalagem',
  insumo: 'Insumo',
};

/** Profundidade de cada item: 1 = direto no conjunto principal (1º nível), 2 = dentro de um item de 1º nível… */
export function profundidades(nos: readonly NoEditavel[]): Map<string, number> {
  const porChave = new Map(nos.map((no) => [no.chave, no]));
  const memo = new Map<string, number>();
  const calcular = (no: NoEditavel): number => {
    const conhecido = memo.get(no.chave);
    if (conhecido !== undefined) return conhecido;
    const pai = no.paiChave ? porChave.get(no.paiChave) : undefined;
    const valor = pai ? calcular(pai) + 1 : 1;
    memo.set(no.chave, valor);
    return valor;
  };
  nos.forEach(calcular);
  return memo;
}

export const rotuloDoNivel = (nivel: number) => `${nivel}º nível`;


const nomeDoItem = (no: Pick<NoEditavel, 'codigo' | 'descricao'>) =>
  [no.codigo.trim(), no.descricao.trim()].filter(Boolean).join(' — ') || '(sem descrição)';

/**
 * Modal pequeno para incluir (ou editar) um item da estrutura: tipo, nível (1º nível = direto no conjunto;
 * 2º nível = dentro de um item de 1º nível; e assim por diante), quantidade e a identificação do item.
 */
export function ModalDoItemDaEstrutura({
  aberto,
  nos,
  paiInicial,
  edicao,
  aoConfirmar,
  aoFechar,
}: {
  aberto: boolean;
  nos: NoEditavel[];
  /** Item selecionado na árvore: o novo item já vem dentro dele, se ele puder ter filhos. */
  paiInicial: string | null;
  /** Quando informado, edita este item (tipo e posição não mudam). */
  edicao: NoEditavel | null;
  aoConfirmar: (dados: DadosDoItem) => void;
  aoFechar: () => void;
}) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={edicao ? 'Editar item' : 'Inserir item'}
      descricao={
        edicao
          ? 'Altere a identificação e a quantidade do item.'
          : 'Escolha o tipo, o nível em que o item entra e a quantidade.'
      }
      largura="sm"
    >
      <Conteudo nos={nos} paiInicial={paiInicial} edicao={edicao} aoConfirmar={aoConfirmar} aoFechar={aoFechar} />
    </Modal>
  );
}

function Conteudo({
  nos,
  paiInicial,
  edicao,
  aoConfirmar,
  aoFechar,
}: {
  nos: NoEditavel[];
  paiInicial: string | null;
  edicao: NoEditavel | null;
  aoConfirmar: (dados: DadosDoItem) => void;
  aoFechar: () => void;
}) {
  const nivelDe = profundidades(nos);
  // Só conjuntos e componentes recebem itens dentro; os demais são folhas.
  const podeReceber = (no: NoEditavel) => FILHOS_PERMITIDOS_NA_ESTRUTURA[no.tipo].length > 0;
  const paiSugerido = paiInicial ? nos.find((no) => no.chave === paiInicial && podeReceber(no)) : undefined;

  const [tipo, setTipo] = useState<TipoNoEstruturaDTO>(edicao?.tipo ?? 'componente');
  const [nivel, setNivel] = useState(paiSugerido ? (nivelDe.get(paiSugerido.chave) ?? 1) + 1 : 1);
  const [paiChave, setPaiChave] = useState<string | null>(paiSugerido?.chave ?? null);
  const [codigo, setCodigo] = useState(edicao?.codigo ?? '');
  const [descricao, setDescricao] = useState(edicao?.descricao ?? '');
  const [quantidade, setQuantidade] = useState(edicao?.quantidade ?? '1');
  const [unidade, setUnidade] = useState(edicao?.unidade ?? 'un');
  const [pecasPorEmbalagem, setPecasPorEmbalagem] = useState(edicao?.pecasPorEmbalagem ?? '');
  const ehEmbalagem = tipo === 'embalagem';
  // Embalagem nova exige as peças; uma antiga (só com quantidade) pode continuar sem, até alguém preencher.
  const embalagemLegada = ehEmbalagem && !!edicao && edicao.pecasPorEmbalagem.trim() === '';
  const pecasOk = !ehEmbalagem || pecasValidas(pecasPorEmbalagem) !== null || (embalagemLegada && pecasPorEmbalagem.trim() === '');

  const mudarTipo = (novo: TipoNoEstruturaDTO) => {
    setTipo(novo);
    // Embalagem é contada por peça: a unidade padrão passa a ser a da embalagem (caixa).
    if (novo === 'embalagem' && unidade === 'un') setUnidade('cx');
    if (novo !== 'embalagem' && unidade === 'cx') setUnidade('un');
  };

  // Um nível N > 1 existe quando há algum item de nível N-1 que aceita filhos.
  const maiorNivelPai = Math.max(0, ...nos.filter(podeReceber).map((no) => nivelDe.get(no.chave) ?? 1));
  const niveis = Array.from({ length: maiorNivelPai + 1 }, (_, indice) => indice + 1);
  const candidatosAPai = nos.filter((no) => podeReceber(no) && (nivelDe.get(no.chave) ?? 1) === nivel - 1);
  const paiEscolhido = nivel === 1 ? null : (candidatosAPai.find((no) => no.chave === paiChave)?.chave ?? candidatosAPai[0]?.chave ?? null);

  const mudarNivel = (novo: number) => {
    setNivel(novo);
    setPaiChave(null);
  };

  const podeInserir = !!descricao.trim() && pecasOk && (!!edicao || nivel === 1 || !!paiEscolhido);
  const pecasInformadas = ehEmbalagem ? pecasValidas(pecasPorEmbalagem) : null;

  const enviar = () => {
    if (!podeInserir) return;
    aoConfirmar({
      paiChave: edicao ? edicao.paiChave : paiEscolhido,
      tipo,
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      quantidade: pecasInformadas !== null ? quantidadeDasPecas(pecasPorEmbalagem) : quantidade,
      unidade: unidade.trim(),
      pecasPorEmbalagem: pecasInformadas !== null ? String(pecasInformadas) : '',
    });
    aoFechar();
  };

  return (
    // Não é um <form>: este modal fica dentro do formulário da aba e formulários aninhados fazem o navegador
    // recarregar a página (a AV "some") em vez de inserir o item. Enter nos campos também confirma.
    <div
      className="flex flex-col gap-3"
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' && evento.target instanceof HTMLInputElement) {
          evento.preventDefault();
          enviar();
        }
      }}
    >
      {!edicao && (
        <>
          <Selecao
            rotulo="Tipo"
            ajuda="Conjunto: subconjunto montado. Componente: peça ou item fabricado/comprado. Matéria-prima: material bruto (barra, chapa, granulado). Componentes e matérias-primas vão para as matérias-primas do Mapa de Custo. Embalagem: embalagem do produto. Insumo: material consumido na fabricação."
            value={tipo}
            onChange={(e) => mudarTipo(e.target.value as TipoNoEstruturaDTO)}
            opcoes={TIPOS_NO_ESTRUTURA.map((valor) => ({ valor, rotulo: ROTULO_DO_TIPO[valor] }))}
          />
          <div className="flex items-center gap-2 rounded-lg border border-borda/60 px-3 py-2 text-sm">
            <IconeDeEstrutura tipo={tipo} />
            {ROTULO_DO_TIPO[tipo]}
          </div>
          <Selecao
            rotulo="Nível"
            ajuda="1º nível entra direto no conjunto. 2º nível entra dentro de um item de 1º nível, e assim por diante. Só conjuntos e componentes recebem itens dentro; matérias-primas, embalagens e insumos são folhas."
            value={String(nivel)}
            onChange={(e) => mudarNivel(Number(e.target.value))}
            opcoes={niveis.map((n) => ({
              valor: String(n),
              rotulo: n === 1 ? '1º nível (direto no conjunto)' : `${rotuloDoNivel(n)} (dentro de um item de ${rotuloDoNivel(n - 1)})`,
            }))}
          />
          {nivel > 1 && (
            <Selecao
              rotulo={`Dentro de (${rotuloDoNivel(nivel - 1)})`}
              value={paiEscolhido ?? ''}
              onChange={(e) => setPaiChave(e.target.value)}
              opcoes={candidatosAPai.map((no) => ({ valor: no.chave, rotulo: nomeDoItem(no) }))}
            />
          )}
        </>
      )}
      {ehEmbalagem && (
        <div className="flex flex-col gap-1">
          <CampoTexto
            rotulo="Peças por embalagem"
            ajuda="Quantas peças do produto cabem nesta embalagem. A estrutura recebe a fração por peça: 50 peças por caixa = 0,02 caixa por peça."
            type="number"
            min={1}
            step={1}
            required={!embalagemLegada}
            value={pecasPorEmbalagem}
            onChange={(e) => setPecasPorEmbalagem(e.target.value)}
          />
          <p className="text-xs text-texto-secundario">
            {pecasInformadas !== null
              ? `Quantidade na estrutura: 1/${pecasInformadas} = ${formatarQuantidade(quantidadeDasPecas(pecasPorEmbalagem))} ${unidade.trim() || 'un'} por peça.`
              : embalagemLegada
                ? 'Embalagem antiga, com quantidade digitada. Informe as peças para calcular automaticamente.'
                : 'Informe um número inteiro maior que zero.'}
          </p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {pecasInformadas !== null ? (
          <CampoTexto rotulo="Quantidade" value={formatarQuantidade(quantidadeDasPecas(pecasPorEmbalagem))} readOnly disabled />
        ) : (
          <CampoTexto rotulo="Quantidade" type="number" min={0} step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        )}
        <CampoTexto rotulo="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="un, kg, m…" />
        <CampoTexto rotulo="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
      </div>
      <CampoTexto
        rotulo="Descrição"
        ajuda="Nome do item (ex.: Suporte estampado)."
        maxLength={200}
        required
        autoFocus
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <RodapeModal>
        <Botao onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" onClick={enviar} disabled={!podeInserir}>
          {edicao ? 'Salvar item' : 'Inserir'}
        </Botao>
      </RodapeModal>
    </div>
  );
}
