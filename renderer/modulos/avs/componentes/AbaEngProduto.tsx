'use client';

import { FolderOpen, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  AvDetalheDTO,
  ClassificacaoInvestimentoDTO,
  InvestimentoEntrada,
  SecaoProdutoDTO,
} from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { AreaTexto, CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { BotaoIcone } from '@/compartilhado/ui/Botao';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ITENS_CHECKLIST_PRODUTO } from '../rotulos';
import { AnexosGaleria } from './AnexosGaleria';
import {
  ArvoreDeEstrutura,
  chavesDoRamo,
  estruturaDeDto,
  estruturaParaEnvio,
  type NoEditavel,
} from './ArvoreDeEstrutura';
import {
  novaLinhaInvestimento,
  TabelaDeInvestimentos,
  type LinhaInvestimentoEditavel,
} from './TabelaDeInvestimentos';
import { CLASSE_CELULA_EDITAVEL } from './TabelaDeMateriais';
import { useAlteracoes, useRegistrarAba } from './alteracoes-da-aba';
import { Ajuda } from '@/compartilhado/ui/Ajuda';
import { CabecalhoDaSecao, SecaoAv } from './SecaoAv';

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
  const [complexidade, setComplexidade] = useState('');
  const [investimentos, setInvestimentos] = useState<LinhaInvestimentoEditavel[]>([]);
  const [estrutura, setEstrutura] = useState<NoEditavel[]>([]);

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
        setComplexidade(secao.complexidade ?? '');
        setInvestimentos(linhasIniciais(secao));
        setEstrutura(estruturaDeDto(secao.estrutura));
      })
      .catch((falha: unknown) => setErroCarregamento(mensagemDeErro(falha)))
      .finally(() => setCarregando(false));
  }, [av.id]);

  const { sujo, marcarLimpo } = useAlteracoes({ checklist, links, escopoTecnico, riscosProjeto, premissasProjeto, recursosProjeto, restricoesProjeto, infoComplementar, prazoPrototipoDias, complexidade, investimentos, estrutura }, !carregando);

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
        complexidade: complexidade || null,
        investimentos: itensInvestimento,
        estrutura: estruturaParaEnvio(estrutura),
      });
      marcarLimpo();
      return true;
    } catch (falha) {
      setErroSalvar(mensagemDeErro(falha));
      return false;
    }
  };

  useRegistrarAba({ sujo, salvar });

  const procurarArquivo = async (chave: ChaveChecklist) => {
    setErroLink(null);
    try {
      const caminho = await clienteDesktop.avs.selecionarCaminho();
      if (caminho) setLinks((atual) => ({ ...atual, [`${chave}Link`]: caminho }));
    } catch (falha) {
      setErroLink(mensagemDeErro(falha));
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
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void salvar();
      }}
      className="flex flex-col gap-5">
      <SecaoAv tom="azul" className="flex flex-col gap-3 p-5">
        <CabecalhoDaSecao
          titulo="Dados de Entrada Técnica"
          ajuda="Levantamento do que já existe de informação técnica sobre o item. Para cada linha: marque 'Existente' se o documento existe, 'Disponível' se a engenharia já tem acesso a ele, e informe onde ficam as evidências (pasta de rede ou link). A lupa busca o arquivo no computador; a pasta abre o local informado."
          aoLimpar={() => {
            setChecklist(checklistInicial(null));
            setLinks(linksIniciais(null));
            setEscopoTecnico('');
          }}
        />
        {erroLink && <MensagemErro mensagem={erroLink} aoFechar={() => setErroLink(null)} />}
        <div className="flex flex-col gap-2">
          {ITENS_CHECKLIST_PRODUTO.map(({ chave, rotulo, ajuda }) => (
            <div
              key={chave}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda/60 px-3 py-2"
            >
              <span className="flex items-center gap-1.5 text-sm">
                {rotulo}
                <Ajuda texto={ajuda} />
              </span>
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
                    icone={Search}
                    rotulo={`Procurar arquivo de ${rotulo}`}
                    onClick={() => void procurarArquivo(chave)}
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
        <AreaTexto
          rotulo="Escopo Técnico considerado para Cotação"
          ajuda="Resumo do que está incluído (e do que não está) no preço cotado: o que a Engenharia vai desenvolver, testar e entregar."
          value={escopoTecnico}
          onChange={(e) => setEscopoTecnico(e.target.value)}
        />
      </SecaoAv>

      <SecaoAv tom="verde" className="p-5">
        <AnexosGaleria
          avId={av.id}
          secao="produto"
          ajuda="Anexe aqui os desenhos, fotos e PDFs que ajudam a entender o produto (aceita PDF, JPG, JPEG, PNG e BMP). Clique no olho para visualizar em tela cheia."
        />
      </SecaoAv>

      <SecaoAv tom="rosa" className="p-5">
        <ArvoreDeEstrutura
          nos={estrutura}
          // O conjunto principal se chama pelo número do desenho do cliente (o código do cliente da aba Comercial).
          nomeDoConjunto={av.codigo?.trim() || av.descricao}
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
      </SecaoAv>

      <SecaoAv tom="ambar" className="flex flex-col gap-4 p-5">
        <CabecalhoDaSecao
          titulo="Riscos, premissas e restrições"
          ajuda="Registro do raciocínio da Engenharia por trás da cotação: o que pode dar errado, o que foi assumido e o que limita a solução."
          aoLimpar={() => {
            setRiscosProjeto('');
            setPremissasProjeto('');
            setRecursosProjeto('');
            setRestricoesProjeto('');
            setInfoComplementar('');
            setPrazoPrototipoDias('');
            setComplexidade('');
          }}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AreaTexto
            rotulo="Riscos do Projeto"
            ajuda="O que pode dar errado no desenvolvimento ou na produção deste item (tolerâncias apertadas, fornecedor único, tecnologia nova, prazo curto…)."
            value={riscosProjeto}
            onChange={(e) => setRiscosProjeto(e.target.value)}
          />
          <AreaTexto
            rotulo="Premissas do Projeto"
            ajuda="O que foi assumido como verdade para montar esta análise (volume estável, ferramental dedicado, material fornecido pelo cliente…). Se uma premissa mudar, a análise pode mudar."
            value={premissasProjeto}
            onChange={(e) => setPremissasProjeto(e.target.value)}
          />
          <AreaTexto
            rotulo="Recursos do Projeto"
            ajuda="Pessoas, equipamentos, laboratórios e serviços externos necessários para desenvolver o item."
            value={recursosProjeto}
            onChange={(e) => setRecursosProjeto(e.target.value)}
          />
          <AreaTexto
            rotulo="Restrições e Barreiras"
            ajuda="Limitações que restringem a solução: calendário do cliente, normas, capacidade, materiais indisponíveis, patentes."
            value={restricoesProjeto}
            onChange={(e) => setRestricoesProjeto(e.target.value)}
          />
        </div>
        <AreaTexto
          rotulo="Informações Complementares"
          ajuda="Qualquer informação técnica relevante que não caiba nos campos acima."
          value={infoComplementar}
          onChange={(e) => setInfoComplementar(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Prazo do protótipo (dias)"
            ajuda="Quantos dias corridos a engenharia precisa para entregar o protótipo, contados a partir da liberação da AV."
            type="number"
            min={0}
            value={prazoPrototipoDias}
            onChange={(e) => setPrazoPrototipoDias(e.target.value)}
          />
          <Selecao
            rotulo="Complexidade"
            ajuda="Avaliação da Engenharia de Produto sobre o esforço e o risco técnico do item: Alta (tecnologia nova ou muitas interfaces), Média (adaptação de algo existente) ou Baixa (similar a um item já produzido)."
            value={complexidade}
            onChange={(e) => setComplexidade(e.target.value)}
            opcoes={[
              { valor: '', rotulo: '— selecione —' },
              ...['Alta', 'Média', 'Baixa'].map((nivel) => ({ valor: nivel, rotulo: nivel })),
              // Valor antigo digitado à mão continua visível em vez de sumir da lista.
              ...(complexidade && !['Alta', 'Média', 'Baixa'].includes(complexidade)
                ? [{ valor: complexidade, rotulo: complexidade }]
                : []),
            ]}
          />
        </div>
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
