'use client';

import { ArrowLeft, Power, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { CustosPortfolioDTO, ItemPortfolioDTO } from '@contratos/portfolio.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { Botao, classeBotao } from '@/compartilhado/ui/Botao';
import { AreaTexto, CampoData, CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CATEGORIAS_DE_CUSTO, custoPorPeca } from '../../portfolio';
import { AnexosGaleria } from '../AnexosGaleria';
import { ArvoreDeEstrutura, chavesDoRamo, estruturaDeDto, estruturaParaEnvio, type NoEditavel } from '../ArvoreDeEstrutura';
import { TituloSecao } from '../SecaoAv';
import { type LinhaOperacaoEditavel, novaLinhaOperacao, TabelaDeOperacoes } from '../TabelaDeOperacoes';
import { fonteDoItemPortfolio } from './fontes';

let contador = 0;
const chaveLocal = () => `local-${Date.now()}-${contador++}`;
const texto = (valor: number | null | undefined) => (valor == null ? '' : String(valor));
const numeroOuNull = (valor: string) => (valor.trim() === '' ? null : Number(valor));

interface Formulario {
  codigo: string;
  descricao: string;
  cliente: string;
  linha: string;
  familia: string;
  programa: string;
  revisaoDesenho: string;
  observacoes: string;
  custosAtualizadosEm: string;
  custos: Record<keyof CustosPortfolioDTO, string>;
}

const FORMULARIO_VAZIO: Formulario = {
  codigo: '',
  descricao: '',
  cliente: '',
  linha: '',
  familia: '',
  programa: '',
  revisaoDesenho: '',
  observacoes: '',
  custosAtualizadosEm: '',
  custos: { materiaPrima: '', insumos: '', embalagem: '', processo: '' },
};

function paraFormulario(item: ItemPortfolioDTO): Formulario {
  return {
    codigo: item.codigo,
    descricao: item.descricao,
    cliente: item.cliente ?? '',
    linha: item.linha ?? '',
    familia: item.familia ?? '',
    programa: item.programa ?? '',
    revisaoDesenho: item.revisaoDesenho ?? '',
    observacoes: item.observacoes ?? '',
    custosAtualizadosEm: item.custosAtualizadosEm ?? '',
    custos: {
      materiaPrima: texto(item.materiaPrima),
      insumos: texto(item.insumos),
      embalagem: texto(item.embalagem),
      processo: texto(item.processo),
    },
  };
}

/**
 * Cadastro de um item de portfólio: identificação, desenho de referência, estrutura, operações e custos de
 * referência. Sem `id`, cria um item novo (o desenho pode ser anexado depois de salvar).
 * @param id item a editar, ou `null` para novo
 * @param podeEditar gestor ou administrador; os demais só consultam
 */
export function EditorItemPortfolio({ id, podeEditar }: { id: string | null; podeEditar: boolean }) {
  const router = useRouter();
  const [item, setItem] = useState<ItemPortfolioDTO | null>(null);
  const [carregando, setCarregando] = useState(!!id);
  const [form, setForm] = useState<Formulario>(FORMULARIO_VAZIO);
  const [estrutura, setEstrutura] = useState<NoEditavel[]>([]);
  const [operacoes, setOperacoes] = useState<LinhaOperacaoEditavel[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    clienteDesktop.portfolio
      .obterItem(id)
      .then((lido) => {
        if (cancelado) return;
        setItem(lido);
        setForm(paraFormulario(lido));
        setEstrutura(estruturaDeDto(lido.estrutura));
        setOperacoes(
          lido.operacoes.map((operacao) => ({
            chave: operacao.id,
            descricao: operacao.descricao,
            maquina: operacao.maquina ?? '',
            pecasHora: texto(operacao.pecasHora),
          })),
        );
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  const fonte = useMemo(() => (item ? fonteDoItemPortfolio(item.id) : null), [item]);
  const mudar = (campo: Exclude<keyof Formulario, 'custos'>, valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const custosNumericos: CustosPortfolioDTO = {
    materiaPrima: numeroOuNull(form.custos.materiaPrima),
    insumos: numeroOuNull(form.custos.insumos),
    embalagem: numeroOuNull(form.custos.embalagem),
    processo: numeroOuNull(form.custos.processo),
  };
  const total = custoPorPeca(custosNumericos);

  /** Grava o item (cria ou altera); num item novo, passa a editar o que foi criado. */
  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const salvo = await clienteDesktop.portfolio.salvarItem({
        id: item?.id ?? null,
        codigo: form.codigo,
        descricao: form.descricao,
        cliente: form.cliente || null,
        linha: form.linha || null,
        familia: form.familia || null,
        programa: form.programa || null,
        revisaoDesenho: form.revisaoDesenho || null,
        observacoes: form.observacoes || null,
        custos: custosNumericos,
        custosAtualizadosEm: form.custosAtualizadosEm || null,
        estrutura: estruturaParaEnvio(estrutura),
        operacoes: operacoes
          .filter((operacao) => operacao.descricao.trim())
          .map((operacao) => ({
            descricao: operacao.descricao,
            maquina: operacao.maquina.trim() || null,
            pecasHora: numeroOuNull(operacao.pecasHora),
          })),
      });
      setItem(salvo);
      setForm(paraFormulario(salvo));
      setEstrutura(estruturaDeDto(salvo.estrutura));
      setAviso(`Salvo às ${new Date().toLocaleTimeString('pt-BR', { timeStyle: 'short' })}.`);
      if (!item) router.replace(`/portfolio/itens/editar/?id=${salvo.id}`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async () => {
    if (!item) return;
    setErro(null);
    try {
      setItem(await clienteDesktop.portfolio.definirAtivo({ id: item.id, ativo: !item.ativo }));
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  };

  if (carregando) return <p className="p-6 text-sm text-texto-secundario">Carregando item…</p>;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/portfolio/itens/" className={classeBotao('fantasma')}>
            <ArrowLeft aria-hidden className="size-4" />
            Itens
          </Link>
          <div>
            <p className="text-xs font-medium text-texto-sutil">Item de portfólio{item && !item.ativo ? ' · inativo' : ''}</p>
            <h1 className="text-xl font-semibold">{item ? `${item.codigo} — ${item.descricao}` : 'Novo item'}</h1>
          </div>
        </div>
        {podeEditar && (
          <div className="flex items-center gap-2">
            {aviso && <p className="text-xs text-texto-secundario">{aviso}</p>}
            {item && (
              <Botao icone={Power} onClick={() => void alternarAtivo()}>
                {item.ativo ? 'Desativar' : 'Reativar'}
              </Botao>
            )}
            <Botao variante="primario" icone={Save} onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar item'}
            </Botao>
          </div>
        )}
      </div>
      {erro && <MensagemErro mensagem={erro} aoFechar={() => setErro(null)} />}
      {!podeEditar && (
        <p className="etiqueta tom-info rounded-xl px-3.5 py-2.5 text-sm">Somente leitura: gestores e administradores editam os itens.</p>
      )}

      <fieldset disabled={!podeEditar} className="flex flex-col gap-5">
        <PainelVidro className="flex flex-col gap-4 p-5">
          <TituloSecao>Identificação</TituloSecao>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <CampoTexto rotulo="Código" required maxLength={60} value={form.codigo} onChange={(e) => mudar('codigo', e.target.value)} />
            <CampoTexto
              rotulo="Descrição"
              required
              maxLength={200}
              classeContainer="md:col-span-2"
              value={form.descricao}
              onChange={(e) => mudar('descricao', e.target.value)}
            />
            <CampoTexto rotulo="Cliente" value={form.cliente} onChange={(e) => mudar('cliente', e.target.value)} />
            <CampoTexto rotulo="Linha" value={form.linha} onChange={(e) => mudar('linha', e.target.value)} />
            <CampoTexto rotulo="Família" value={form.familia} onChange={(e) => mudar('familia', e.target.value)} />
            <CampoTexto rotulo="Programa" value={form.programa} onChange={(e) => mudar('programa', e.target.value)} />
            <CampoTexto
              rotulo="Revisão do desenho"
              maxLength={30}
              value={form.revisaoDesenho}
              onChange={(e) => mudar('revisaoDesenho', e.target.value)}
            />
          </div>
          <AreaTexto rotulo="Observações" rows={3} maxLength={2000} value={form.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} />
        </PainelVidro>

        <PainelVidro className="p-5">
          {item && fonte ? (
            <AnexosGaleria
              avId={item.id}
              secao="produto"
              fonte={fonte}
              somenteLeitura={!podeEditar}
              titulo="Desenho de referência"
              ajuda="Desenho oficial do item, na revisão vigente. A Eng. Produto compara com o desenho da cotação. Aceita PDF, JPG, JPEG, TIFF, PNG e BMP."
            />
          ) : (
            <>
              <TituloSecao>Desenho de referência</TituloSecao>
              <p className="mt-2 text-sm text-texto-secundario">Salve o item para anexar o desenho.</p>
            </>
          )}
        </PainelVidro>

        <PainelVidro className="p-5">
          <ArvoreDeEstrutura
            nos={estrutura}
            nomeDoConjunto={form.codigo}
            aoLimpar={() => setEstrutura([])}
            aoAdicionar={(dados) => setEstrutura((atual) => [...atual, { chave: chaveLocal(), ...dados }])}
            aoRemover={(chave) =>
              setEstrutura((atual) => {
                const removidos = chavesDoRamo(atual, chave);
                return atual.filter((no) => !removidos.has(no.chave));
              })
            }
            aoMudar={(chave, campo, valor) =>
              setEstrutura((atual) => atual.map((no) => (no.chave === chave ? { ...no, [campo]: valor } : no)))
            }
          />
        </PainelVidro>

        <PainelVidro className="p-5">
          <TabelaDeOperacoes
            linhas={operacoes}
            operacoes={[]}
            maquinas={[]}
            aoLimpar={() => setOperacoes([])}
            aoAdicionar={() => setOperacoes((atual) => [...atual, novaLinhaOperacao(chaveLocal())])}
            aoRemover={(chave) => setOperacoes((atual) => atual.filter((linha) => linha.chave !== chave))}
            aoMudar={(chave, campo, valor) =>
              setOperacoes((atual) => atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)))
            }
          />
        </PainelVidro>

        <PainelVidro className="flex flex-col gap-4 p-5">
          <TituloSecao>Custos de referência (por peça)</TituloSecao>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {CATEGORIAS_DE_CUSTO.map(({ chave, rotulo }) => (
              <CampoTexto
                key={chave}
                rotulo={`${rotulo} (R$)`}
                type="number"
                min={0}
                step="0.0001"
                value={form.custos[chave]}
                onChange={(e) => setForm((atual) => ({ ...atual, custos: { ...atual.custos, [chave]: e.target.value } }))}
              />
            ))}
            <CampoData
              rotulo="Atualizados em"
              value={form.custosAtualizadosEm}
              onChange={(e) => mudar('custosAtualizadosEm', e.target.value)}
            />
          </div>
          <p className="text-sm text-texto-secundario">
            Custo por peça: <span className="font-semibold text-texto tabular-nums">{total === null ? '—' : formatarMoeda(total)}</span>
          </p>
        </PainelVidro>
      </fieldset>
    </div>
  );
}
