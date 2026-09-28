'use client';

import { type FormEvent, useEffect, useState } from 'react';
import type { AvDetalheDTO, ClassificacaoInvestimentoDTO, InvestimentoEntrada, SecaoProcessoDTO } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { Botao } from '@/compartilhado/ui/Botao';
import { CampoTexto } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
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

function paraNumeroOuNull(texto: string): number | null {
  const limpo = texto.trim();
  return limpo ? Number(limpo) : null;
}

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar o formulário ao trocar de AV. */
export function AbaEngProcesso({ av }: { av: AvDetalheDTO }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [prazoProducaoDias, setPrazoProducaoDias] = useState('');
  const [investimentos, setInvestimentos] = useState<LinhaInvestimentoEditavel[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  useEffect(() => {
    clienteDesktop.avs
      .obterSecaoProcesso(av.id)
      .then((secao) => {
        setPrazoProducaoDias(secao.prazoProducaoDias != null ? String(secao.prazoProducaoDias) : '');
        setInvestimentos(linhasIniciais(secao));
      })
      .catch((falha: unknown) => setErroCarregamento(mensagemDeErro(falha)))
      .finally(() => setCarregando(false));
  }, [av.id]);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErroSalvar(null);
    try {
      const itensInvestimento: InvestimentoEntrada[] = investimentos
        .filter((linha) => linha.descricao.trim())
        .map((linha) => ({
          descricao: linha.descricao,
          classificacao: linha.classificacao || null,
          valor: paraNumeroOuNull(linha.valor),
        }));

      await clienteDesktop.avs.salvarSecaoProcesso({
        avId: av.id,
        prazoProducaoDias: paraNumeroOuNull(prazoProducaoDias),
        investimentos: itensInvestimento,
      });
    } catch (falha) {
      setErroSalvar(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <PainelVidro className="p-5 text-sm text-texto-secundario">Carregando…</PainelVidro>;
  if (erroCarregamento) return <MensagemErro mensagem={erroCarregamento} />;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <PainelVidro className="flex flex-col gap-3 p-5 text-sm text-texto-secundario">
        A sequência de operações e máquinas ainda não foi implementada nesta versão — por enquanto
        esta aba só cobre o prazo de produção e os investimentos de processo.
      </PainelVidro>

      <PainelVidro className="p-5">
        <CampoTexto
          rotulo="Prazo de produção (dias)"
          type="number"
          min={0}
          classeContainer="max-w-48"
          value={prazoProducaoDias}
          onChange={(e) => setPrazoProducaoDias(e.target.value)}
        />
      </PainelVidro>

      <PainelVidro className="p-5">
        <TabelaDeInvestimentos
          linhas={investimentos}
          aoAdicionar={() => setInvestimentos((atual) => [...atual, novaLinhaInvestimento(chaveLocal())])}
          aoRemover={(chave) => setInvestimentos((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setInvestimentos((atual) =>
              atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)),
            )
          }
        />
      </PainelVidro>

      <div className="flex items-center justify-end gap-3">
        {erroSalvar && <MensagemErro mensagem={erroSalvar} />}
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar Eng. Processo'}
        </Botao>
      </div>
    </form>
  );
}
