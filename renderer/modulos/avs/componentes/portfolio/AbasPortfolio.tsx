'use client';

import { type ReactNode, useMemo, useState } from 'react';
import type { AvDetalheDTO } from '@contratos/avs.contrato';
import type { AreaChecagemDTO, CustosPortfolioDTO, PortfolioDaAvDTO } from '@contratos/portfolio.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { AreaTexto, CampoData, CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { CelulaCabecalho, CelulaTabela, LinhaTabela, Tabela } from '@/compartilhado/ui/Tabela';
import { estadosDosBlocos, todosPreenchidos } from '../../blocos';
import { CATEGORIAS_DE_CUSTO, custoPorPeca, custosVigentes, DIAS_PARA_CUSTO_ANTIGO, diasDesde } from '../../portfolio';
import { useAvsStore } from '../../store/use-avs-store';
import { AnexosGaleria } from '../AnexosGaleria';
import { ErroDaAba, useAlteracoes, useRegistrarAba } from '../alteracoes-da-aba';
import { ProgressoDaAba, SecaoAv, TituloSecao } from '../SecaoAv';
import {
  CartaoDoItem,
  type ChecagemEditavel,
  ChecagemDaArea,
  checagemCompleta,
  checagemInicial,
  EstruturaSomenteLeitura,
  OperacoesSomenteLeitura,
  SemItem,
  usePortfolioDaAv,
} from './comum';
import { fonteDoItemPortfolio } from './fontes';

// =====================================================================================================
// Abas da AV de Item de Portfólio: Comercial, Eng. Produto, Eng. Processo e Custo (o PCP fica em
// AbaPcpPortfolio). Cada área confere o item-modelo e registra a sua conclusão.
// =====================================================================================================

/** Moldura de carregamento comum às abas que dependem do item. */
function Carregando({ erro }: { erro: string | null }) {
  return erro ? <MensagemErro mensagem={erro} /> : <PainelVidro className="p-5 text-sm text-texto-secundario">Carregando…</PainelVidro>;
}

/**
 * Grava a conclusão da área (se escolhida) e devolve os dados atualizados.
 * @returns os dados novos, ou os mesmos quando não há resultado para gravar
 */
async function gravarChecagem(
  avId: string,
  area: AreaChecagemDTO,
  checagem: ChecagemEditavel,
  custosNovos?: CustosPortfolioDTO,
): Promise<PortfolioDaAvDTO | null> {
  if (checagem.resultado === '') return null;
  return clienteDesktop.portfolio.salvarChecagem({
    avId,
    area,
    resultado: checagem.resultado,
    observacao: checagem.observacao || null,
    custosNovos,
  });
}

// --- Comercial ----------------------------------------------------------------------------------------

/** Comercial: dados da cotação (cliente, volume, prazo) e o desenho recebido do cliente. */
export function AbaComercialPortfolio({ av }: { av: AvDetalheDTO }) {
  const atualizarComercial = useAvsStore((estado) => estado.atualizarComercial);
  const { dados, erro } = usePortfolioDaAv(av.id);
  const [campos, setCampos] = useState({
    cliente: av.cliente ?? '',
    solicitante: av.solicitante ?? '',
    volumeAnual: av.volumeAnual != null ? String(av.volumeAnual) : '',
    prazoCliente: av.prazoCliente ?? '',
    infoComplementarComercial: av.infoComplementarComercial ?? '',
  });
  const [versao, setVersao] = useState(av.versaoComercial);
  const [qtdDesenhos, setQtdDesenhos] = useState(0);
  const [erroSalvar, setErroSalvar] = useState<unknown>(null);
  const { sujo, marcarLimpo } = useAlteracoes(campos, true);

  const salvar = async (): Promise<boolean> => {
    setErroSalvar(null);
    try {
      const atualizada = await atualizarComercial({
        avId: av.id,
        versaoEsperada: versao,
        cliente: campos.cliente || null,
        solicitante: campos.solicitante || null,
        volumeAnual: campos.volumeAnual.trim() ? Number(campos.volumeAnual) : null,
        prazoCliente: campos.prazoCliente || null,
        infoComplementarComercial: campos.infoComplementarComercial || null,
      });
      setVersao(atualizada.versaoComercial);
      marcarLimpo();
      return true;
    } catch (falha) {
      setErroSalvar(falha);
      return false;
    }
  };
  useRegistrarAba({ sujo, salvar });

  const mudar = (campo: keyof typeof campos, valor: string) => setCampos((atual) => ({ ...atual, [campo]: valor }));
  // Item → Dados da cotação → Desenho da cotação → Observações (opcional).
  const estados = estadosDosBlocos([
    true,
    todosPreenchidos(campos.cliente, campos.solicitante, campos.volumeAnual, campos.prazoCliente),
    qtdDesenhos > 0,
    true,
  ]);

  return (
    <div className="flex flex-col gap-5">
      <ProgressoDaAba estados={estados} />
      <SecaoAv estado={estados[0]} tom="azul" className="p-5">
        {dados ? dados.item ? <CartaoDoItem item={dados.item} /> : <SemItem /> : <Carregando erro={erro} />}
      </SecaoAv>
      <SecaoAv estado={estados[1]} tom="verde" className="flex flex-col gap-4 p-5">
        <TituloSecao>Dados da cotação</TituloSecao>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <CampoTexto rotulo="Cliente" value={campos.cliente} onChange={(e) => mudar('cliente', e.target.value)} />
          <CampoTexto rotulo="Solicitante" value={campos.solicitante} onChange={(e) => mudar('solicitante', e.target.value)} />
          <CampoTexto
            rotulo="Volume anual (peças)"
            ajuda="Peças por ano previstas na cotação. O PCP usa este volume (÷ 12) para calcular a carga e os turnos."
            type="number"
            min={0}
            value={campos.volumeAnual}
            onChange={(e) => mudar('volumeAnual', e.target.value)}
          />
          <CampoData rotulo="Prazo para AV" value={campos.prazoCliente} onChange={(e) => mudar('prazoCliente', e.target.value)} />
        </div>
      </SecaoAv>
      <SecaoAv estado={estados[2]} tom="ambar" className="p-5">
        <AnexosGaleria
          aoMudarQuantidade={setQtdDesenhos}
          avId={av.id}
          secao="comercial"
          titulo="Desenho da cotação"
          ajuda="Desenho recebido do cliente nesta cotação. A Eng. Produto compara com o desenho de referência do item. Aceita PDF, JPG, JPEG, TIFF, PNG e BMP."
        />
      </SecaoAv>
      <SecaoAv estado={estados[3]} tom="lilas" className="flex flex-col gap-3 p-5">
        <TituloSecao>Observações</TituloSecao>
        <AreaTexto
          rotulo="Informações da cotação"
          rows={4}
          value={campos.infoComplementarComercial}
          onChange={(e) => mudar('infoComplementarComercial', e.target.value)}
        />
      </SecaoAv>
      <ErroDaAba erro={erroSalvar} />
    </div>
  );
}

// --- Eng. Produto e Eng. Processo ------------------------------------------------------------------

/** Aba de uma área que só confere o item: conteúdo de leitura + a conclusão da área. */
function AbaDeChecagem({
  av,
  area,
  pergunta,
  ajuda,
  conteudo,
}: {
  av: AvDetalheDTO;
  area: 'produto' | 'processo';
  pergunta: string;
  ajuda: string;
  conteudo: (dados: PortfolioDaAvDTO) => ReactNode;
}) {
  const { dados, erro } = usePortfolioDaAv(av.id);
  if (!dados) return <Carregando erro={erro} />;
  return <FormularioDeChecagem av={av} area={area} dados={dados} pergunta={pergunta} ajuda={ajuda} conteudo={conteudo} />;
}

function FormularioDeChecagem({
  av,
  area,
  dados,
  pergunta,
  ajuda,
  conteudo,
}: {
  av: AvDetalheDTO;
  area: 'produto' | 'processo';
  dados: PortfolioDaAvDTO;
  pergunta: string;
  ajuda: string;
  conteudo: (dados: PortfolioDaAvDTO) => ReactNode;
}) {
  const [checagem, setChecagem] = useState(() => checagemInicial(dados, area));
  const [erroSalvar, setErroSalvar] = useState<unknown>(null);
  const { sujo, marcarLimpo } = useAlteracoes(checagem, true);

  const salvar = async (): Promise<boolean> => {
    setErroSalvar(null);
    try {
      await gravarChecagem(av.id, area, checagem);
      marcarLimpo();
      return true;
    } catch (falha) {
      setErroSalvar(falha);
      return false;
    }
  };
  useRegistrarAba({ sujo, salvar });

  const estados = estadosDosBlocos([true, checagemCompleta(checagem)]);
  return (
    <div className="flex flex-col gap-5">
      <ProgressoDaAba estados={estados} />
      <SecaoAv estado={estados[0]} tom="azul" className="flex flex-col gap-5 p-5">
        {dados.item ? conteudo(dados) : <SemItem />}
      </SecaoAv>
      <SecaoAv estado={estados[1]} tom="verde" className="p-5">
        <ChecagemDaArea pergunta={pergunta} ajuda={ajuda} valor={checagem} aoMudar={setChecagem} />
      </SecaoAv>
      <ErroDaAba erro={erroSalvar} />
    </div>
  );
}

/** Desenho de referência do item ao lado do desenho da cotação. */
function DesenhosLadoALado({ av, itemId }: { av: AvDetalheDTO; itemId: string }) {
  const fonte = useMemo(() => fonteDoItemPortfolio(itemId), [itemId]);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <AnexosGaleria
        avId={itemId}
        secao="produto"
        fonte={fonte}
        somenteLeitura
        titulo="Desenho de referência (portfólio)"
        textoVazio="O item não tem desenho de referência anexado."
      />
      <AnexosGaleria
        avId={av.id}
        secao="comercial"
        somenteLeitura
        titulo="Desenho da cotação"
        textoVazio="O Comercial ainda não anexou o desenho da cotação."
      />
    </div>
  );
}

/** Eng. Produto: o desenho da cotação confere com o item de portfólio? */
export function AbaProdutoPortfolio({ av }: { av: AvDetalheDTO }) {
  return (
    <AbaDeChecagem
      av={av}
      area="produto"
      pergunta="O desenho da cotação confere com o item de portfólio?"
      ajuda="Compare cotas, material, tolerâncias e revisão. Com ressalvas ou divergência, descreva o que muda."
      conteudo={(dados) => (
        <>
          <DesenhosLadoALado av={av} itemId={dados.item!.id} />
          <EstruturaSomenteLeitura nos={dados.item!.estrutura} />
        </>
      )}
    />
  );
}

/** Eng. Processo: o processo atual atende? */
export function AbaProcessoPortfolio({ av }: { av: AvDetalheDTO }) {
  return (
    <AbaDeChecagem
      av={av}
      area="processo"
      pergunta="O processo atual atende a esta cotação?"
      ajuda="Confira se as operações, máquinas e ferramentas do item continuam válidas para o desenho e o volume cotados."
      conteudo={(dados) => <OperacoesSomenteLeitura operacoes={dados.item!.operacoes} />}
    />
  );
}

// --- Custo -------------------------------------------------------------------------------------------

/** Custo: os custos de referência continuam válidos? Se não, informa os valores atualizados. */
export function AbaCustoPortfolio({ av }: { av: AvDetalheDTO }) {
  const { dados, erro } = usePortfolioDaAv(av.id);
  if (!dados) return <Carregando erro={erro} />;
  return <FormularioDeCusto av={av} dados={dados} />;
}

const texto = (valor: number | null | undefined) => (valor == null ? '' : String(valor));
const numeroOuNull = (valor: string) => (valor.trim() === '' ? null : Number(valor));

function FormularioDeCusto({ av, dados }: { av: AvDetalheDTO; dados: PortfolioDaAvDTO }) {
  const [checagem, setChecagem] = useState(() => checagemInicial(dados, 'custo'));
  const [novos, setNovos] = useState<Record<keyof CustosPortfolioDTO, string>>(() => ({
    materiaPrima: texto(dados.custos?.novos.materiaPrima),
    insumos: texto(dados.custos?.novos.insumos),
    embalagem: texto(dados.custos?.novos.embalagem),
    processo: texto(dados.custos?.novos.processo),
  }));
  const [erroSalvar, setErroSalvar] = useState<unknown>(null);
  const { sujo, marcarLimpo } = useAlteracoes({ checagem, novos }, true);

  const custosNovos: CustosPortfolioDTO = {
    materiaPrima: numeroOuNull(novos.materiaPrima),
    insumos: numeroOuNull(novos.insumos),
    embalagem: numeroOuNull(novos.embalagem),
    processo: numeroOuNull(novos.processo),
  };
  const salvar = async (): Promise<boolean> => {
    setErroSalvar(null);
    try {
      await gravarChecagem(av.id, 'custo', checagem, custosNovos);
      marcarLimpo();
      return true;
    } catch (falha) {
      setErroSalvar(falha);
      return false;
    }
  };
  useRegistrarAba({ sujo, salvar });

  const item = dados.item;
  const referencia: CustosPortfolioDTO = item ?? { materiaPrima: null, insumos: null, embalagem: null, processo: null };
  const vigentes = custosVigentes(referencia, custosNovos);
  const idade = diasDesde(item?.custosAtualizadosEm ?? null);
  const estados = estadosDosBlocos([true, checagemCompleta(checagem)]);

  return (
    <div className="flex flex-col gap-5">
      <ProgressoDaAba estados={estados} />
      <SecaoAv estado={estados[0]} tom="azul" className="flex flex-col gap-3 p-5">
        <TituloSecao>Custos de referência do item (por peça)</TituloSecao>
        <p className="text-xs text-texto-secundario">
          {item?.custosAtualizadosEm
            ? `Atualizados em ${new Date(`${item.custosAtualizadosEm}T12:00:00`).toLocaleDateString('pt-BR')}`
            : 'Sem data de atualização.'}
          {idade !== null && idade > DIAS_PARA_CUSTO_ANTIGO && (
            <span className="ml-1 font-medium text-alerta">Mais de 6 meses: confira os valores.</span>
          )}
        </p>
        <Tabela>
          <thead>
            <tr>
              <CelulaCabecalho className="pl-3">Categoria</CelulaCabecalho>
              <CelulaCabecalho className="w-40">Referência</CelulaCabecalho>
              <CelulaCabecalho className="w-48 pr-3" ajuda="Preencha só o que mudou; vazio mantém a referência.">
                Atualizado (R$/peça)
              </CelulaCabecalho>
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS_DE_CUSTO.map(({ chave, rotulo }) => (
              <LinhaTabela key={chave}>
                <CelulaTabela className="pl-3">{rotulo}</CelulaTabela>
                <CelulaTabela className="tabular-nums">{formatarMoeda(referencia[chave])}</CelulaTabela>
                <CelulaTabela className="pr-3">
                  <input
                    type="number"
                    min={0}
                    step="0.0001"
                    aria-label={`${rotulo} atualizado`}
                    className="h-8 w-full rounded-md border border-borda bg-superficie-solida/80 px-2 text-right text-sm tabular-nums focus:border-primaria focus:outline-none focus:ring-2 focus:ring-primaria/20"
                    value={novos[chave]}
                    onChange={(e) => setNovos((atual) => ({ ...atual, [chave]: e.target.value }))}
                  />
                </CelulaTabela>
              </LinhaTabela>
            ))}
            <LinhaTabela>
              <CelulaTabela className="pl-3 font-semibold">Custo por peça</CelulaTabela>
              <CelulaTabela className="font-semibold tabular-nums">{formatarMoeda(custoPorPeca(referencia))}</CelulaTabela>
              <CelulaTabela className="pr-3 text-right font-semibold tabular-nums">{formatarMoeda(custoPorPeca(vigentes))}</CelulaTabela>
            </LinhaTabela>
          </tbody>
        </Tabela>
      </SecaoAv>
      <SecaoAv estado={estados[1]} tom="verde" className="p-5">
        <ChecagemDaArea
          pergunta="Os custos de referência continuam válidos?"
          ajuda="Confere: a cotação usa a referência. Com ressalvas ou não confere: informe acima os valores atualizados e explique."
          valor={checagem}
          aoMudar={setChecagem}
        />
      </SecaoAv>
      <ErroDaAba erro={erroSalvar} />
    </div>
  );
}
