'use client';

import { FolderOpen } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import type {
  AvDetalheDTO,
  ClassificacaoInvestimentoDTO,
  InvestimentoEntrada,
  SecaoProdutoDTO,
} from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { AreaTexto, CampoTexto } from '@/compartilhado/ui/Campos';
import { Botao, BotaoIcone } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ITENS_CHECKLIST_PRODUTO } from '../rotulos';
import { AnexosGaleria } from './AnexosGaleria';
import {
  novaLinhaInvestimento,
  TabelaDeInvestimentos,
  type LinhaInvestimentoEditavel,
} from './TabelaDeInvestimentos';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';

let contador = 0;
const chaveLocal = () => `local-${Date.now()}-${contador++}`;

type ChaveChecklist = (typeof ITENS_CHECKLIST_PRODUTO)[number]['chave'];
type Checklist = Record<`${ChaveChecklist}Existente` | `${ChaveChecklist}Disponivel`, boolean>;
type Links = Record<`${ChaveChecklist}Link`, string>;

const CATALOGO_PADRAO: { descricao: string; classificacao: ClassificacaoInvestimentoDTO }[] = [
  { descricao: 'Projeto do Produto', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Análises Virtuais', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Testes de Projeto', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Ferramental de Protótipo', classificacao: 'sup_des_ou_cliente' },
  { descricao: 'Protótipos', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Montagem e Análise de Protótipos', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Meios de Validação', classificacao: 'capex' },
  { descricao: 'Testes de Protótipo', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Corrida Piloto - Materiais', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Ferramental/Dispositivos de Cliente', classificacao: 'cliente' },
  { descricao: 'Embalagem de Propriedade do Cliente', classificacao: 'cliente' },
  { descricao: 'Engenharia Produto/CAD/Teste (h)', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Viagens', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Envios de Amostras', classificacao: 'suporte_desenvolvimento' },
  { descricao: 'Treinamentos', classificacao: 'suporte_desenvolvimento' },
];

function checklistInicial(secao: SecaoProdutoDTO | null): Checklist {
  const resultado = {} as Checklist;
  for (const { chave } of ITENS_CHECKLIST_PRODUTO) {
    resultado[`${chave}Existente`] = secao?.[`${chave}Existente` as keyof SecaoProdutoDTO] === true;
    resultado[`${chave}Disponivel`] = secao?.[`${chave}Disponivel` as keyof SecaoProdutoDTO] === true;
  }
  return resultado;
}

function linksIniciais(secao: SecaoProdutoDTO | null): Links {
  const resultado = {} as Links;
  for (const { chave } of ITENS_CHECKLIST_PRODUTO) {
    const valor = secao?.[`${chave}Link` as keyof SecaoProdutoDTO];
    resultado[`${chave}Link`] = typeof valor === 'string' ? valor : '';
  }
  return resultado;
}

function linhasIniciais(secao: SecaoProdutoDTO | null): LinhaInvestimentoEditavel[] {
  if (secao && secao.investimentos.length > 0) {
    return secao.investimentos.map((item) => ({
      chave: item.id,
      descricao: item.descricao,
      classificacao: item.classificacao ?? '',
      valor: item.valor != null ? String(item.valor) : '',
    }));
  }
  // Primeira vez que a seção é aberta: pré-preenche com o catálogo da planilha da Ferkoda.
  return CATALOGO_PADRAO.map((item) => novaLinhaInvestimento(chaveLocal(), item.descricao, item.classificacao));
}

function paraNumeroOuNull(texto: string): number | null {
  const limpo = texto.trim();
  return limpo ? Number(limpo) : null;
}

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar o formulário ao trocar de AV. */
export function AbaEngProduto({ av }: { av: AvDetalheDTO }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<Checklist>(() => checklistInicial(null));
  const [links, setLinks] = useState<Links>(() => linksIniciais(null));
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [escopoTecnico, setEscopoTecnico] = useState('');
  const [riscosProjeto, setRiscosProjeto] = useState('');
  const [premissasProjeto, setPremissasProjeto] = useState('');
  const [recursosProjeto, setRecursosProjeto] = useState('');
  const [restricoesProjeto, setRestricoesProjeto] = useState('');
  const [infoComplementar, setInfoComplementar] = useState('');
  const [prazoPrototipoDias, setPrazoPrototipoDias] = useState('');
  const [investimentos, setInvestimentos] = useState<LinhaInvestimentoEditavel[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  useEffect(() => {
    clienteDesktop.avs
      .obterSecaoProduto(av.id)
      .then((secao) => {
        setChecklist(checklistInicial(secao));
        setLinks(linksIniciais(secao));
        setEscopoTecnico(secao.escopoTecnico ?? '');
        setRiscosProjeto(secao.riscosProjeto ?? '');
        setPremissasProjeto(secao.premissasProjeto ?? '');
        setRecursosProjeto(secao.recursosProjeto ?? '');
        setRestricoesProjeto(secao.restricoesProjeto ?? '');
        setInfoComplementar(secao.infoComplementar ?? '');
        setPrazoPrototipoDias(secao.prazoPrototipoDias != null ? String(secao.prazoPrototipoDias) : '');
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

      await clienteDesktop.avs.salvarSecaoProduto({
        avId: av.id,
        ...checklist,
        ...links,
        escopoTecnico: escopoTecnico || null,
        riscosProjeto: riscosProjeto || null,
        premissasProjeto: premissasProjeto || null,
        recursosProjeto: recursosProjeto || null,
        restricoesProjeto: restricoesProjeto || null,
        infoComplementar: infoComplementar || null,
        prazoPrototipoDias: paraNumeroOuNull(prazoPrototipoDias),
        investimentos: itensInvestimento,
      });
    } catch (falha) {
      setErroSalvar(mensagemDeErro(falha));
    } finally {
      setSalvando(false);
    }
  };

  const abrirLink = async (caminho: string) => {
    if (!caminho.trim()) return;
    setErroLink(null);
    try {
      await clienteDesktop.avs.abrirCaminho(caminho);
    } catch (falha) {
      setErroLink(mensagemDeErro(falha));
    }
  };

  if (carregando) return <PainelVidro className="p-5 text-sm text-texto-secundario">Carregando…</PainelVidro>;
  if (erroCarregamento) return <MensagemErro mensagem={erroCarregamento} />;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <PainelVidro className="flex flex-col gap-3 p-5">
        <p className="text-xs font-medium text-texto-sutil">Dados de Entrada Técnica</p>
        {erroLink && <MensagemErro mensagem={erroLink} aoFechar={() => setErroLink(null)} />}
        <div className="flex flex-col gap-2">
          {ITENS_CHECKLIST_PRODUTO.map(({ chave, rotulo }) => (
            <div
              key={chave}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda/60 px-3 py-2"
            >
              <span className="text-sm">{rotulo}</span>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-4 text-xs text-texto-secundario">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="size-4 accent-primaria"
                      checked={checklist[`${chave}Existente`]}
                      onChange={(e) =>
                        setChecklist((atual) => ({ ...atual, [`${chave}Existente`]: e.target.checked }))
                      }
                    />
                    Existente
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="size-4 accent-primaria"
                      checked={checklist[`${chave}Disponivel`]}
                      onChange={(e) =>
                        setChecklist((atual) => ({ ...atual, [`${chave}Disponivel`]: e.target.checked }))
                      }
                    />
                    Disponível
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    className={`${CLASSE_CELULA_EDITAVEL} w-56`}
                    value={links[`${chave}Link`]}
                    onChange={(e) => setLinks((atual) => ({ ...atual, [`${chave}Link`]: e.target.value }))}
                    placeholder="Pasta de evidências ou link"
                  />
                  <BotaoIcone
                    icone={FolderOpen}
                    rotulo={`Abrir evidências de ${rotulo}`}
                    onClick={() => void abrirLink(links[`${chave}Link`])}
                    disabled={!links[`${chave}Link`].trim()}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <AreaTexto rotulo="Escopo Técnico considerado para Cotação" value={escopoTecnico} onChange={(e) => setEscopoTecnico(e.target.value)} />
      </PainelVidro>

      <PainelVidro className="p-5">
        <AnexosGaleria avId={av.id} secao="produto" />
      </PainelVidro>

      <PainelVidro className="flex flex-col gap-4 p-5">
        <p className="text-xs font-medium text-texto-sutil">Riscos, premissas e restrições</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AreaTexto rotulo="Riscos do Projeto" value={riscosProjeto} onChange={(e) => setRiscosProjeto(e.target.value)} />
          <AreaTexto rotulo="Premissas do Projeto" value={premissasProjeto} onChange={(e) => setPremissasProjeto(e.target.value)} />
          <AreaTexto rotulo="Recursos do Projeto" value={recursosProjeto} onChange={(e) => setRecursosProjeto(e.target.value)} />
          <AreaTexto rotulo="Restrições e Barreiras" value={restricoesProjeto} onChange={(e) => setRestricoesProjeto(e.target.value)} />
        </div>
        <AreaTexto rotulo="Informações Complementares" value={infoComplementar} onChange={(e) => setInfoComplementar(e.target.value)} />
        <CampoTexto
          rotulo="Prazo do protótipo (dias)"
          type="number"
          min={0}
          classeContainer="max-w-48"
          value={prazoPrototipoDias}
          onChange={(e) => setPrazoPrototipoDias(e.target.value)}
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
          {salvando ? 'Salvando…' : 'Salvar Eng. Produto'}
        </Botao>
      </div>
    </form>
  );
}
