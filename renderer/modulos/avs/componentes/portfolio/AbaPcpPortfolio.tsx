'use client';

import { ListOrdered } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AvDetalheDTO, CapacidadeConfigDTO } from '@contratos/avs.contrato';
import type { OperacaoPortfolioDTO, PortfolioDaAvDTO } from '@contratos/portfolio.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { estadosDosBlocos, preenchido, tabelaObrigatoriaCompleta } from '../../blocos';
import { linhaDeCargaCompleta } from '../../capacidade';
import { ErroDaAba, useAlteracoes, useRegistrarAba } from '../alteracoes-da-aba';
import { ProgressoDaAba, SecaoAv } from '../SecaoAv';
import { type LinhaCargaEditavel, novaLinhaCarga, TabelaDeCargas } from '../TabelaDeCargas';
import { ChecagemDaArea, checagemCompleta, checagemInicial } from './comum';

let contador = 0;
const chaveLocal = () => `local-${Date.now()}-${contador++}`;
const texto = (valor: number | null | undefined) => (valor == null ? '' : String(valor));
const numeroOuNull = (valor: string) => (valor.trim() === '' ? null : Number(valor));

/** Linhas da carga a partir das operações do item (mantém as cargas já digitadas na mesma posição). */
function cargasDoItem(linhas: LinhaCargaEditavel[], operacoes: OperacaoPortfolioDTO[]): LinhaCargaEditavel[] {
  const atualizadas = operacoes.map((operacao, indice) => ({
    ...(linhas[indice] ?? novaLinhaCarga(chaveLocal())),
    operacao: operacao.descricao,
    maquina: operacao.maquina ?? '',
    pecasHora: texto(operacao.pecasHora),
  }));
  return [...atualizadas, ...linhas.slice(operacoes.length)];
}

/**
 * PCP da AV de portfólio: carga de máquina em peças (operações do item, volume da cotação) e a conclusão
 * "Temos capacidade produtiva?".
 */
export function AbaPcpPortfolio({ av }: { av: AvDetalheDTO }) {
  const [dados, setDados] = useState<PortfolioDaAvDTO | null>(null);
  const [cargasSalvas, setCargasSalvas] = useState<{ linhas: LinhaCargaEditavel[]; versao: number } | null>(null);
  const [capacidade, setCapacidade] = useState<CapacidadeConfigDTO>({ horasPorTurno: 8, diasProdutivosMes: 22 });
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      clienteDesktop.portfolio.obterDaAv(av.id),
      clienteDesktop.avs.obterSecaoPcp(av.id),
      clienteDesktop.avs.obterCapacidadeConfig(),
    ])
      .then(([portfolio, secao, parametros]) => {
        if (cancelado) return;
        const salvas = secao.cargas.map((carga) => ({
          chave: carga.id,
          operacao: carga.operacao,
          maquina: carga.maquina ?? '',
          pecasHora: texto(carga.pecasHora),
          conversao: texto(carga.conversao),
          cargaAtual: texto(carga.cargaAtualPecas),
        }));
        // Sem carga salva, já nasce com as operações do item.
        setCargasSalvas({
          linhas: salvas.length === 0 && portfolio.item ? cargasDoItem([], portfolio.item.operacoes) : salvas,
          versao: secao.versao,
        });
        setCapacidade(parametros);
        setDados(portfolio);
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)));
    return () => {
      cancelado = true;
    };
  }, [av.id]);

  if (erro) return <MensagemErro mensagem={erro} />;
  if (!dados || !cargasSalvas) return <PainelVidro className="p-5 text-sm text-texto-secundario">Carregando…</PainelVidro>;
  return <Formulario av={av} dados={dados} inicial={cargasSalvas} capacidade={capacidade} />;
}

function Formulario({
  av,
  dados,
  inicial,
  capacidade,
}: {
  av: AvDetalheDTO;
  dados: PortfolioDaAvDTO;
  inicial: { linhas: LinhaCargaEditavel[]; versao: number };
  capacidade: CapacidadeConfigDTO;
}) {
  const [cargas, setCargas] = useState(inicial.linhas);
  const [versao, setVersao] = useState<number | null>(inicial.versao);
  const [checagem, setChecagem] = useState(() => checagemInicial(dados, 'pcp'));
  const [erroSalvar, setErroSalvar] = useState<unknown>(null);
  const { sujo, marcarLimpo } = useAlteracoes({ cargas, checagem }, true);

  const salvar = async (): Promise<boolean> => {
    setErroSalvar(null);
    try {
      const salva = await clienteDesktop.avs.salvarSecaoPcp({
        avId: av.id,
        versaoEsperada: versao,
        cargas: cargas
          .filter((linha) => linha.operacao.trim())
          .map((linha) => ({
            operacao: linha.operacao,
            maquina: linha.maquina.trim() || null,
            pecasHora: numeroOuNull(linha.pecasHora),
            conversao: numeroOuNull(linha.conversao),
            cargaAtualPecas: numeroOuNull(linha.cargaAtual),
          })),
        custos: [],
      });
      setVersao(salva.versao);
      if (checagem.resultado !== '') {
        await clienteDesktop.portfolio.salvarChecagem({
          avId: av.id,
          area: 'pcp',
          resultado: checagem.resultado,
          observacao: checagem.observacao || null,
        });
      }
      marcarLimpo();
      return true;
    } catch (falha) {
      setErroSalvar(falha);
      return false;
    }
  };
  useRegistrarAba({ sujo, salvar });

  const temVolume = av.volumeAnual != null && av.volumeAnual > 0;
  const estados = estadosDosBlocos([
    temVolume && tabelaObrigatoriaCompleta(cargas, (carga) => preenchido(carga.operacao), linhaDeCargaCompleta),
    checagemCompleta(checagem),
  ]);
  const operacoesDoItem = dados.item?.operacoes ?? [];

  return (
    <div className="flex flex-col gap-5">
      <ProgressoDaAba estados={estados} />
      <SecaoAv estado={estados[0]} tom="azul" className="p-5">
        <TabelaDeCargas
          linhas={cargas}
          operacoes={[]}
          maquinas={[]}
          volumeAnual={av.volumeAnual}
          parametros={capacidade}
          aoLimpar={() => setCargas([])}
          aoAdicionar={() => setCargas((atual) => [...atual, novaLinhaCarga(chaveLocal())])}
          aoRemover={(chave) => setCargas((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setCargas((atual) => atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)))
          }
          acoes={
            <Botao
              tamanho="sm"
              icone={ListOrdered}
              className="w-fit"
              disabled={operacoesDoItem.length === 0}
              onClick={() => setCargas((atual) => cargasDoItem(atual, operacoesDoItem))}
            >
              Trazer operações do item de portfólio
            </Botao>
          }
        />
      </SecaoAv>
      <SecaoAv estado={estados[1]} tom="verde" className="p-5">
        <ChecagemDaArea
          pergunta="Temos capacidade produtiva para este volume?"
          ajuda="Com a carga de hoje e a do item, veja os turnos de cada operação. Com ressalvas ou sem capacidade, descreva o gargalo e a solução (turno extra, terceiro, investimento)."
          valor={checagem}
          aoMudar={setChecagem}
        />
      </SecaoAv>
      <ErroDaAba erro={erroSalvar} />
    </div>
  );
}
