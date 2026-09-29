'use client';

import { useEffect, useState } from 'react';
import type {
  AvDetalheDTO,
  ClassificacaoInvestimentoDTO,
  InvestimentoEntrada,
  OperacaoEntrada,
  SecaoProcessoDTO,
} from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { useAlteracoes, useRegistrarAba } from './alteracoes-da-aba';
import { CabecalhoDaSecao, SecaoAv } from './SecaoAv';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { BarraDeTemplates } from './BarraDeTemplates';
import { novaLinhaOperacao, TabelaDeOperacoes, type LinhaOperacaoEditavel } from './TabelaDeOperacoes';
import {
  novaLinhaInvestimento,
  TabelaDeInvestimentos,
  type LinhaInvestimentoEditavel,
} from './TabelaDeInvestimentos';

let contador = 0;
const chaveLocal = () => `local-${Date.now()}-${contador++}`;

const CATALOGO_PADRAO: { descricao: string; classificacao: ClassificacaoInvestimentoDTO }[] = [
  { descricao: 'Meios de Produção', classificacao: 'capex' },
  { descricao: 'Meios de Controle', classificacao: 'capex' },
  { descricao: 'Embalagens Internas', classificacao: 'capex' },
  { descricao: 'Embalagens Externas', classificacao: 'capex' },
  { descricao: 'Embalagens Retornáveis (Cliente)', classificacao: 'capex' },
  { descricao: 'Adequação de Fábrica', classificacao: 'capex' },
];

function linhasIniciais(secao: SecaoProcessoDTO | null): LinhaInvestimentoEditavel[] {
  if (secao && secao.investimentos.length > 0) {
    return secao.investimentos.map((item) => ({
      chave: item.id,
      descricao: item.descricao,
      classificacao: item.classificacao ?? '',
      valor: item.valor != null ? String(item.valor) : '',
    }));
  }
  return CATALOGO_PADRAO.map((item) => novaLinhaInvestimento(chaveLocal(), item.descricao, item.classificacao));
}

function paraLinhasOperacao(operacoes: { id?: string; descricao: string; maquina?: string | null; pecasHora?: number | null }[]): LinhaOperacaoEditavel[] {
  return operacoes.map((item) => ({
    chave: item.id ?? chaveLocal(),
    descricao: item.descricao,
    maquina: item.maquina ?? '',
    pecasHora: item.pecasHora != null ? String(item.pecasHora) : '',
  }));
}

function paraNumeroOuNull(texto: string): number | null {
  const limpo = texto.trim();
  return limpo ? Number(limpo) : null;
}

function operacoesParaEntrada(linhas: LinhaOperacaoEditavel[]): OperacaoEntrada[] {
  return linhas
    .filter((linha) => linha.descricao.trim())
    .map((linha) => ({
      descricao: linha.descricao,
      maquina: linha.maquina.trim() || null,
      pecasHora: paraNumeroOuNull(linha.pecasHora),
    }));
}

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar o formulário ao trocar de AV. */
export function AbaEngProcesso({ av }: { av: AvDetalheDTO }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [prazoProducaoDias, setPrazoProducaoDias] = useState('');
  const [investimentos, setInvestimentos] = useState<LinhaInvestimentoEditavel[]>([]);
  const [operacoes, setOperacoes] = useState<LinhaOperacaoEditavel[]>([]);
  const [sugestoesOperacao, setSugestoesOperacao] = useState<string[]>([]);
  const [sugestoesMaquina, setSugestoesMaquina] = useState<string[]>([]);

  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([clienteDesktop.avs.obterSecaoProcesso(av.id), clienteDesktop.avs.obterCatalogoCusto()])
      .then(([secao, catalogo]) => {
        setPrazoProducaoDias(secao.prazoProducaoDias != null ? String(secao.prazoProducaoDias) : '');
        setInvestimentos(linhasIniciais(secao));
        setOperacoes(paraLinhasOperacao(secao.operacoes));
        setSugestoesOperacao(catalogo.operacoes);
        setSugestoesMaquina(catalogo.maquinas);
      })
      .catch((falha: unknown) => setErroCarregamento(mensagemDeErro(falha)))
      .finally(() => setCarregando(false));
  }, [av.id]);

  const { sujo, marcarLimpo } = useAlteracoes({ prazoProducaoDias, investimentos, operacoes }, !carregando);

  const salvar = async (): Promise<boolean> => {
    setErroSalvar(null);
    try {
      const itensInvestimento: InvestimentoEntrada[] = investimentos
        .filter((linha) => linha.descricao.trim())
        .map((linha) => ({
          descricao: linha.descricao,
          classificacao: linha.classificacao || null,
          valor: paraNumeroOuNull(linha.valor),
        }));

      const itensOperacao = operacoesParaEntrada(operacoes);
      // Os nomes digitados passam a ser sugeridos nas próximas operações.
      const novosNomes = (valores: string[], atuais: string[]) =>
        [...new Set([...atuais, ...valores.map((v) => v.trim()).filter(Boolean)])].sort((a, b) =>
          a.localeCompare(b, 'pt-BR'),
        );

      await clienteDesktop.avs.salvarSecaoProcesso({
        avId: av.id,
        prazoProducaoDias: paraNumeroOuNull(prazoProducaoDias),
        operacoes: itensOperacao,
        investimentos: itensInvestimento,
      });
      setSugestoesOperacao((atuais) => novosNomes(itensOperacao.map((item) => item.descricao), atuais));
      setSugestoesMaquina((atuais) => novosNomes(itensOperacao.map((item) => item.maquina ?? ''), atuais));
      marcarLimpo();
      return true;
    } catch (falha) {
      setErroSalvar(mensagemDeErro(falha));
      return false;
    }
  };

  useRegistrarAba({ sujo, salvar });

  if (carregando) return <PainelVidro className="p-5 text-sm text-texto-secundario">Carregando…</PainelVidro>;
  if (erroCarregamento) return <MensagemErro mensagem={erroCarregamento} />;

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void salvar();
      }}
      className="flex flex-col gap-5">
      <SecaoAv tom="azul" className="flex flex-col gap-4 p-5">
        <BarraDeTemplates
          tipo="operacoes"
          itens={() => operacoesParaEntrada(operacoes)}
          aoCarregar={(itens) => setOperacoes(paraLinhasOperacao(itens))}
        />
        <TabelaDeOperacoes
          aoLimpar={() => setOperacoes([])}
          linhas={operacoes}
          operacoes={sugestoesOperacao}
          maquinas={sugestoesMaquina}
          aoAdicionar={() => setOperacoes((atual) => [...atual, novaLinhaOperacao(chaveLocal())])}
          aoRemover={(chave) => setOperacoes((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setOperacoes((atual) =>
              atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)),
            )
          }
        />
      </SecaoAv>

      <SecaoAv tom="ambar" className="flex flex-col gap-3 p-5">
        <CabecalhoDaSecao
          titulo="Prazo"
          ajuda="Tempo que a fábrica precisa, depois do protótipo aprovado, para ficar pronta para produzir em série (ferramental, ajustes, ensaios)."
          aoLimpar={() => setPrazoProducaoDias('')}
        />
        <CampoTexto
          rotulo="Prazo de produção (dias)"
          ajuda="Quantos dias corridos a Engenharia de Processo precisa para deixar o processo pronto para produzir."
          type="number"
          min={0}
          classeContainer="max-w-48"
          value={prazoProducaoDias}
          onChange={(e) => setPrazoProducaoDias(e.target.value)}
        />
      </SecaoAv>

      <SecaoAv tom="lilas" className="p-5">
        <TabelaDeInvestimentos
          aoLimpar={() => setInvestimentos([])}
          linhas={investimentos}
          aoAdicionar={() => setInvestimentos((atual) => [...atual, novaLinhaInvestimento(chaveLocal())])}
          aoRemover={(chave) => setInvestimentos((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setInvestimentos((atual) =>
              atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)),
            )
          }
        />
      </SecaoAv>

      {erroSalvar && <MensagemErro mensagem={erroSalvar} />}
    </form>
  );
}
