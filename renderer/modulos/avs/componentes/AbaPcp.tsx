'use client';

import { ListOrdered } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AvDetalheDTO, CargaMaquinaEntrada, CustoLogisticoEntrada, OperacaoDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { useAlteracoes, useRegistrarAba } from './alteracoes-da-aba';
import { AnexosGaleria } from './AnexosGaleria';
import { CabecalhoDaSecao, SecaoAv } from './SecaoAv';
import { novaLinhaCarga, TabelaDeCargas, type LinhaCargaEditavel } from './TabelaDeCargas';
import {
  novaLinhaCustoLogistico,
  TabelaDeCustosLogisticos,
  type LinhaCustoLogisticoEditavel,
} from './TabelaDeCustosLogisticos';

let contador = 0;
const chaveLocal = () => `local-${Date.now()}-${contador++}`;

const numeroOuNull = (texto: string): number | null => (texto.trim() === '' ? null : Number(texto));
const textoDe = (valor: number | null | undefined) => (valor != null ? String(valor) : '');

/** Traz a sequência da Eng. Processo: a n-ésima operação atualiza a n-ésima linha (mantendo as cargas já
 * digitadas) e as operações sem linha são acrescentadas ao final; linhas a mais continuam onde estão. */
function aplicarOperacoes(linhas: LinhaCargaEditavel[], operacoes: OperacaoDTO[]): LinhaCargaEditavel[] {
  const atualizadas = operacoes.map((operacao, indice) => ({
    ...(linhas[indice] ?? novaLinhaCarga(chaveLocal())),
    operacao: operacao.descricao,
    maquina: operacao.maquina ?? '',
    pecasHora: textoDe(operacao.pecasHora),
  }));
  return [...atualizadas, ...linhas.slice(operacoes.length)];
}

function cargasParaEnvio(linhas: LinhaCargaEditavel[]): CargaMaquinaEntrada[] {
  return linhas
    .filter((linha) => linha.operacao.trim())
    .map((linha) => ({
      operacao: linha.operacao,
      maquina: linha.maquina.trim() || null,
      pecasHora: numeroOuNull(linha.pecasHora),
      cargaAtual: numeroOuNull(linha.cargaAtual),
      cargaFutura: numeroOuNull(linha.cargaFutura),
    }));
}

function custosParaEnvio(linhas: LinhaCustoLogisticoEditavel[]): CustoLogisticoEntrada[] {
  return linhas
    .filter((linha) => linha.descricao.trim())
    .map((linha) => ({ descricao: linha.descricao, valor: numeroOuNull(linha.valor) }));
}

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar o formulário ao trocar de AV. */
export function AbaPcp({ av }: { av: AvDetalheDTO }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [cargas, setCargas] = useState<LinhaCargaEditavel[]>([]);
  const [custos, setCustos] = useState<LinhaCustoLogisticoEditavel[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [operacoesDaEngenharia, setOperacoesDaEngenharia] = useState<OperacaoDTO[]>([]);
  const [sugestoesOperacao, setSugestoesOperacao] = useState<string[]>([]);
  const [sugestoesMaquina, setSugestoesMaquina] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      clienteDesktop.avs.obterSecaoPcp(av.id),
      clienteDesktop.avs.obterSecaoProcesso(av.id),
      clienteDesktop.avs.obterCatalogoCusto(),
    ])
      .then(([secao, processo, catalogo]) => {
        setObservacoes(secao.observacoes ?? '');
        setCustos(
          secao.custos.map((custo) => ({ chave: custo.id, descricao: custo.descricao, valor: textoDe(custo.valor) })),
        );
        setOperacoesDaEngenharia(processo.operacoes);
        const salvas: LinhaCargaEditavel[] = secao.cargas.map((carga) => ({
          chave: carga.id,
          operacao: carga.operacao,
          maquina: carga.maquina ?? '',
          pecasHora: textoDe(carga.pecasHora),
          cargaAtual: textoDe(carga.cargaAtual),
          cargaFutura: textoDe(carga.cargaFutura),
        }));
        // Sem carga salva, já nasce com as operações definidas pela Eng. Processo.
        setCargas(salvas.length === 0 && processo.operacoes.length > 0 ? aplicarOperacoes([], processo.operacoes) : salvas);
        setSugestoesOperacao(catalogo.operacoes);
        setSugestoesMaquina(catalogo.maquinas);
      })
      .catch((falha: unknown) => setErroCarregamento(mensagemDeErro(falha)))
      .finally(() => setCarregando(false));
  }, [av.id]);

  const { sujo, marcarLimpo } = useAlteracoes({ cargas, custos, observacoes }, !carregando);

  const salvar = async (): Promise<boolean> => {
    setErroSalvar(null);
    try {
      await clienteDesktop.avs.salvarSecaoPcp({
        avId: av.id,
        observacoes: observacoes || null,
        cargas: cargasParaEnvio(cargas),
        custos: custosParaEnvio(custos),
      });
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
      className="flex flex-col gap-5"
    >
      <SecaoAv tom="azul" className="p-5">
        <TabelaDeCargas
          linhas={cargas}
          operacoes={sugestoesOperacao}
          maquinas={sugestoesMaquina}
          aoLimpar={() => setCargas([])}
          aoAdicionar={() => setCargas((atual) => [...atual, novaLinhaCarga(chaveLocal())])}
          aoRemover={(chave) => setCargas((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setCargas((atual) => atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)))
          }
          acoes={
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Botao
                  tamanho="sm"
                  icone={ListOrdered}
                  disabled={operacoesDaEngenharia.length === 0}
                  title={
                    operacoesDaEngenharia.length === 0 ? 'A Eng. Processo ainda não salvou operações' : undefined
                  }
                  onClick={() => {
                    setCargas((atual) => aplicarOperacoes(atual, operacoesDaEngenharia));
                    setAviso(`${operacoesDaEngenharia.length} operações da Eng. Processo trazidas. Salve a aba para gravar.`);
                  }}
                >
                  Trazer operações da Eng. Processo
                </Botao>
              </div>
              {aviso && <p className="text-xs text-texto-secundario">{aviso}</p>}
            </div>
          }
        />
      </SecaoAv>

      <SecaoAv tom="verde" className="p-5">
        <AnexosGaleria
          avId={av.id}
          secao="pcp"
          titulo="Layout da fábrica"
          ajuda="Anexe uma imagem ou PDF do layout da fábrica indicando o local onde o item será implantado (máquinas, áreas de armazenagem e fluxo). Aceita PDF, JPG, JPEG, PNG e BMP."
        />
      </SecaoAv>

      <SecaoAv tom="ambar" className="p-5">
        <TabelaDeCustosLogisticos
          linhas={custos}
          aoLimpar={() => setCustos([])}
          aoAdicionar={() => setCustos((atual) => [...atual, novaLinhaCustoLogistico(chaveLocal())])}
          aoRemover={(chave) => setCustos((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setCustos((atual) => atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)))
          }
        />
      </SecaoAv>

      <SecaoAv tom="lilas" className="flex flex-col gap-3 p-5">
        <CabecalhoDaSecao titulo="Observações" aoLimpar={() => setObservacoes('')} />
        <AreaTexto
          rotulo="Observações do PCP"
          ajuda="Anotações do PCP sobre a análise de capacidade: gargalos, hipóteses assumidas, turnos considerados, restrições de abastecimento ou qualquer informação que ajude quem for decidir."
          rows={10}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </SecaoAv>

      {erroSalvar && <MensagemErro mensagem={erroSalvar} />}
    </form>
  );
}
