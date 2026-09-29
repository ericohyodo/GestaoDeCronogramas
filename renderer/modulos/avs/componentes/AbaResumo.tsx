'use client';

import { CheckCircle2, Circle, CircleDot, FileCheck2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AREAS_AV,
  CLASSIFICACOES_INVESTIMENTO,
  type AreaAvDTO,
  type AvDetalheDTO,
  type HistoricoAvItemDTO,
  type InvestimentoDTO,
  type SecaoCustoDTO,
  type SecaoProcessoDTO,
  type SecaoProdutoDTO,
} from '@contratos/avs.contrato';
import type { SdDTO } from '@contratos/sds.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarData, formatarMoeda } from '@/compartilhado/formatacao';
import { Botao, classeBotao } from '@/compartilhado/ui/Botao';
import { DialogoConfirmacao } from '@/compartilhado/ui/DialogoConfirmacao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useAvsStore } from '../store/use-avs-store';
import { ROTULO_AREA, ROTULO_CLASSIFICACAO_INVESTIMENTO, ROTULO_SECAO_CUSTO_MATERIAL } from '../rotulos';
import { SecaoAv, TituloSecao } from './SecaoAv';

/** Etapa do fluxo que corresponde a cada aba: a aba está "liberada" quando a AV já saiu dessa etapa. */
const ETAPA_DA_AREA: Record<AreaAvDTO, string> = {
  comercial: 'comercial',
  produto: 'eng_produto',
  processo: 'eng_processo',
  pcp: 'pcp',
  custo: 'mapa_custo',
};

interface Dados {
  historico: HistoricoAvItemDTO[];
  produto: SecaoProdutoDTO;
  processo: SecaoProcessoDTO;
  custo: SecaoCustoDTO;
  sd: SdDTO | null;
}

const somar = (valores: (number | null | undefined)[]) => valores.reduce<number>((total, v) => total + (v ?? 0), 0);
const somarInvestimentos = (itens: InvestimentoDTO[]) => somar(itens.map((item) => item.valor));

export function AbaResumo({ av }: { av: AvDetalheDTO }) {
  const finalizar = useAvsStore((estado) => estado.finalizarECriarPreSd);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      clienteDesktop.avs.listarHistorico(av.id),
      clienteDesktop.avs.obterSecaoProduto(av.id),
      clienteDesktop.avs.obterSecaoProcesso(av.id),
      clienteDesktop.avs.obterSecaoCusto(av.id),
      clienteDesktop.sds.obterPorAv(av.id),
    ])
      .then(([historico, produto, processo, custo, sd]) => {
        if (!cancelado) setDados({ historico, produto, processo, custo, sd });
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)));
    return () => {
      cancelado = true;
    };
  }, [av.id, av.etapaAtual.numero]);

  if (erro) return <MensagemErro mensagem={erro} />;
  if (!dados) return <PainelVidro className="p-5 text-sm text-texto-secundario">Carregando…</PainelVidro>;

  const etapa = av.etapaAtual;
  const liberacao = (area: AreaAvDTO) =>
    dados.historico.find((item) => item.etapaDe?.chave === ETAPA_DA_AREA[area]) ?? null;

  const investimentoProduto = somarInvestimentos(dados.produto.investimentos);
  const investimentoProcesso = somarInvestimentos(dados.processo.investimentos);
  const investimentos = [...dados.produto.investimentos, ...dados.processo.investimentos];

  const custoPorSecao = (secao: 'materia_prima' | 'outros_insumos' | 'embalagem') =>
    somar(dados.custo.materiais.filter((item) => item.secao === secao).map((item) => item.custoTotal));
  const custoMaoDeObra = somar(dados.custo.processo.map((item) => item.custoTotal));
  const custoPorPeca =
    custoPorSecao('materia_prima') + custoPorSecao('outros_insumos') + custoPorSecao('embalagem') + custoMaoDeObra;

  const podeFinalizar = etapa.numero >= 5 && etapa.numero <= 7 && !dados.sd;

  return (
    <div className="flex flex-col gap-5">
      <SecaoAv tom="azul" className="flex flex-col gap-3 p-5">
        <TituloSecao>Liberação das abas</TituloSecao>
        <ul className="flex flex-col gap-2">
          {AREAS_AV.map((area) => {
            const liberada = liberacao(area);
            const emAndamento = !liberada && etapa.chave === ETAPA_DA_AREA[area];
            const Icone = liberada ? CheckCircle2 : emAndamento ? CircleDot : Circle;
            return (
              <li
                key={area}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda/60 bg-superficie-solida/60 px-3 py-2"
              >
                <span className="flex items-center gap-2.5 text-sm">
                  <Icone
                    aria-hidden
                    className={
                      liberada ? 'size-4 text-sucesso' : emAndamento ? 'size-4 text-primaria' : 'size-4 text-texto-sutil'
                    }
                  />
                  {ROTULO_AREA[area]}
                </span>
                <span className="text-xs text-texto-secundario">
                  {liberada
                    ? `Liberada em ${formatarData(liberada.data.slice(0, 10))}${liberada.usuarioNome ? ` por ${liberada.usuarioNome}` : ''}`
                    : emAndamento
                      ? 'Em andamento'
                      : 'Pendente'}
                </span>
              </li>
            );
          })}
        </ul>
      </SecaoAv>

      <SecaoAv tom="verde" className="flex flex-col gap-4 p-5">
        <TituloSecao>Valores consolidados</TituloSecao>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Bloco titulo="Investimento" total={investimentoProduto + investimentoProcesso}>
            <Linha rotulo="Eng. Produto" valor={investimentoProduto} />
            <Linha rotulo="Eng. Processo" valor={investimentoProcesso} />
            {CLASSIFICACOES_INVESTIMENTO.map((classificacao) => {
              const total = somar(
                investimentos.filter((item) => item.classificacao === classificacao).map((item) => item.valor),
              );
              return total ? (
                <Linha key={classificacao} rotulo={ROTULO_CLASSIFICACAO_INVESTIMENTO[classificacao]} valor={total} sutil />
              ) : null;
            })}
          </Bloco>
          <Bloco titulo="Custo / Pç" total={custoPorPeca}>
            <Linha rotulo={ROTULO_SECAO_CUSTO_MATERIAL.materia_prima} valor={custoPorSecao('materia_prima')} />
            <Linha rotulo={ROTULO_SECAO_CUSTO_MATERIAL.outros_insumos} valor={custoPorSecao('outros_insumos')} />
            <Linha rotulo={ROTULO_SECAO_CUSTO_MATERIAL.embalagem} valor={custoPorSecao('embalagem')} />
            <Linha rotulo="Mão de obra" valor={custoMaoDeObra} />
          </Bloco>
        </div>
      </SecaoAv>

      <SecaoAv tom="ambar" className="flex flex-col gap-3 p-5">
        <TituloSecao>Finalização</TituloSecao>
        {dados.sd ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Pré-SD <span className="font-semibold tabular-nums">{dados.sd.numero}</span> criada a partir desta AV
              (projeto previsto: <span className="tabular-nums">{dados.sd.numeroProjeto}</span>).
            </p>
            <Link href="/sds/" className={classeBotao()}>
              Ver no módulo de SDs
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-texto-secundario">
              {podeFinalizar
                ? 'Encerra a análise e abre uma Pré-SD com o mesmo número desta AV.'
                : etapa.terminal
                  ? 'Esta AV já foi encerrada.'
                  : 'Libere Comercial, Eng. Produto, Eng. Processo e PCP para poder finalizar a AV.'}
            </p>
            <Botao variante="primario" icone={FileCheck2} disabled={!podeFinalizar} onClick={() => setConfirmando(true)}>
              Finalizar AV e Criar Pré SD
            </Botao>
          </div>
        )}
      </SecaoAv>

      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Finalizar AV e criar Pré-SD"
        mensagem={`A AV ${av.numero} será encerrada e a Pré-SD correspondente será criada no módulo de SDs. Continuar?`}
        rotuloConfirmar="Finalizar e criar"
        aoConfirmar={async () => {
          const sd = await finalizar(av.id);
          setDados((atual) => (atual ? { ...atual, sd } : atual));
        }}
        aoFechar={() => setConfirmando(false)}
      />
    </div>
  );
}

function Bloco({ titulo, total, children }: { titulo: string; total: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-borda/60 bg-superficie-solida/60 p-4">
      <p className="text-xs font-medium text-texto-secundario">{titulo}</p>
      <p className="text-2xl font-semibold tabular-nums">{formatarMoeda(total)}</p>
      <dl className="flex flex-col gap-1 border-t border-borda/60 pt-2">{children}</dl>
    </div>
  );
}

function Linha({ rotulo, valor, sutil = false }: { rotulo: string; valor: number; sutil?: boolean }) {
  return (
    <div className={`flex justify-between text-xs ${sutil ? 'pl-3 text-texto-sutil' : 'text-texto-secundario'}`}>
      <dt>{rotulo}</dt>
      <dd className="tabular-nums">{formatarMoeda(valor)}</dd>
    </div>
  );
}
