'use client';

import { useEffect, useState } from 'react';
import {
  INCOTERMS,
  SECOES_CUSTO_MATERIAL,
  type AvDetalheDTO,
  type IncotermDTO,
  type ItemCatalogoMaterialDTO,
  type ItemCustoMaterialEntrada,
  type ItemCustoProcessoEntrada,
  type OperacaoDTO,
  type SecaoCustoDTO,
  type SecaoCustoMaterialDTO,
} from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { ListOrdered, Network } from 'lucide-react';
import { AreaTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ROTULO_SECAO_CUSTO_MATERIAL } from '../rotulos';
import { componentesDaEstrutura, estruturaDeDto } from './ArvoreDeEstrutura';
import { BarraDeTemplates } from './BarraDeTemplates';
import { novaLinhaMaterial, TabelaDeMateriais, type LinhaMaterialEditavel } from './TabelaDeMateriais';
import {
  alterarLinhaProcesso,
  custoEhManual,
  novaLinhaProcesso,
  type LinhaProcessoEditavel,
} from '../linha-de-processo';
import { TabelaDeProcesso } from './TabelaDeProcesso';
import { useAlteracoes, useRegistrarAba } from './alteracoes-da-aba';
import { CabecalhoDaSecao, SecaoAv, type TomSecao } from './SecaoAv';

const TOM_MATERIAL: Record<SecaoCustoMaterialDTO, TomSecao> = {
  materia_prima: 'verde',
  outros_insumos: 'ambar',
  embalagem: 'lilas',
};

let contador = 0;
const chaveLocal = () => `local-${Date.now()}-${contador++}`;

function paraLinhasMateriais(secao: SecaoCustoDTO, filtro: SecaoCustoMaterialDTO): LinhaMaterialEditavel[] {
  return secao.materiais
    .filter((item) => item.secao === filtro)
    .map((item) => ({
      chave: item.id,
      codigoItem: item.codigoItem ?? '',
      descricao: item.descricao,
      qtdeBruta: item.qtdeBruta != null ? String(item.qtdeBruta) : '',
      qtdeNet: item.qtdeNet != null ? String(item.qtdeNet) : '',
      unidadeMedida: item.unidadeMedida ?? '',
      custoUnitario: item.custoUnitario != null ? String(item.custoUnitario) : '',
      custoTotal: item.custoTotal != null ? String(item.custoTotal) : '',
    }));
}

function paraLinhasProcesso(itens: (ItemCustoProcessoEntrada & { id: string })[]): LinhaProcessoEditavel[] {
  return itens.map((item) => {
    const linha = {
      chave: item.id,
      processo: item.processo ?? '',
      maquina: item.maquina ?? '',
      pecasHora: item.pecasHora != null ? String(item.pecasHora) : '',
      qtdeColaboradores: item.qtdeColaboradores != null ? String(item.qtdeColaboradores) : '',
      taxaMod: item.taxaMod != null ? String(item.taxaMod) : '',
      taxaMoi: item.taxaMoi != null ? String(item.taxaMoi) : '',
      taxaGgf: item.taxaGgf != null ? String(item.taxaGgf) : '',
      custoTotal: item.custoTotal != null ? String(item.custoTotal) : '',
    };
    // Custo salvo diferente da soma das taxas foi digitado à mão: continua assim até ser apagado.
    return { ...linha, custoManual: custoEhManual(linha) };
  });
}

function linhaDeProcessoComOperacao(chave: string, operacao: OperacaoDTO, base?: LinhaProcessoEditavel): LinhaProcessoEditavel {
  return {
    ...(base ?? novaLinhaProcesso(chave)),
    chave: base?.chave ?? chave,
    processo: operacao.descricao,
    maquina: operacao.maquina ?? '',
    pecasHora: operacao.pecasHora != null ? String(operacao.pecasHora) : '',
  };
}

/** Traz a sequência da Eng. Processo: a n-ésima operação atualiza a n-ésima linha (preservando colaboradores,
 * taxas e custo já digitados) e as operações que ainda não têm linha são acrescentadas ao final. */
function aplicarOperacoes(linhas: LinhaProcessoEditavel[], operacoes: OperacaoDTO[]): LinhaProcessoEditavel[] {
  const atualizadas = operacoes.map((operacao, indice) =>
    linhaDeProcessoComOperacao(chaveLocal(), operacao, linhas[indice]),
  );
  return [...atualizadas, ...linhas.slice(operacoes.length)];
}

function paraItensProcesso(linhas: LinhaProcessoEditavel[]): ItemCustoProcessoEntrada[] {
  return linhas.map((linha) => ({
    processo: linha.processo || null,
    maquina: linha.maquina || null,
    pecasHora: paraNumeroOuNull(linha.pecasHora),
    qtdeColaboradores: paraNumeroOuNull(linha.qtdeColaboradores),
    taxaMod: paraNumeroOuNull(linha.taxaMod),
    taxaMoi: paraNumeroOuNull(linha.taxaMoi),
    taxaGgf: paraNumeroOuNull(linha.taxaGgf),
    custoTotal: paraNumeroOuNull(linha.custoTotal),
  }));
}

type ComponenteDaEstrutura = ReturnType<typeof componentesDaEstrutura>[number];

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Traz os componentes da estrutura do produto para as matérias-primas: quem já está na lista (mesmo código ou
 * mesma descrição) só tem a quantidade e a unidade atualizadas, mantendo custos; os novos entram no fim.
 */
function mesclarComponentes(linhas: LinhaMaterialEditavel[], componentes: ComponenteDaEstrutura[]): LinhaMaterialEditavel[] {
  const resultado = [...linhas];
  for (const componente of componentes) {
    const existente = resultado.findIndex(
      (linha) =>
        (componente.codigo && linha.codigoItem && igual(linha.codigoItem, componente.codigo)) ||
        igual(linha.descricao, componente.descricao),
    );
    const quantidade = componente.quantidade != null ? String(componente.quantidade) : '';
    if (existente >= 0) {
      resultado[existente] = {
        ...resultado[existente]!,
        qtdeBruta: quantidade,
        unidadeMedida: componente.unidade || resultado[existente]!.unidadeMedida,
      };
    } else {
      resultado.push({
        ...novaLinhaMaterial(chaveLocal()),
        codigoItem: componente.codigo,
        descricao: componente.descricao,
        qtdeBruta: quantidade,
        unidadeMedida: componente.unidade,
      });
    }
  }
  return resultado;
}

function paraNumeroOuNull(texto: string): number | null {
  const limpo = texto.trim();
  return limpo ? Number(limpo) : null;
}

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar o formulário ao trocar de AV. */
export function AbaMapaCusto({ av }: { av: AvDetalheDTO }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [operacoes, setOperacoes] = useState<string[]>([]);
  const [maquinas, setMaquinas] = useState<string[]>([]);
  const [catalogoMateriaPrima, setCatalogoMateriaPrima] = useState<ItemCatalogoMaterialDTO[]>([]);
  const [catalogoEmbalagem, setCatalogoEmbalagem] = useState<ItemCatalogoMaterialDTO[]>([]);

  const [incoterm, setIncoterm] = useState<IncotermDTO | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [materiaPrima, setMateriaPrima] = useState<LinhaMaterialEditavel[]>([]);
  const [outrosInsumos, setOutrosInsumos] = useState<LinhaMaterialEditavel[]>([]);
  const [embalagem, setEmbalagem] = useState<LinhaMaterialEditavel[]>([]);
  const [processo, setProcesso] = useState<LinhaProcessoEditavel[]>([]);
  const [avisoComponentes, setAvisoComponentes] = useState<string | null>(null);
  const [componentesTrazidos, setComponentesTrazidos] = useState<ComponenteDaEstrutura[]>([]);
  const [operacoesDaEngenharia, setOperacoesDaEngenharia] = useState<OperacaoDTO[]>([]);
  const [avisoImportacao, setAvisoImportacao] = useState<string | null>(null);

  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      clienteDesktop.avs.obterSecaoCusto(av.id),
      clienteDesktop.avs.obterCatalogoCusto(),
      clienteDesktop.avs.obterSecaoProcesso(av.id),
      clienteDesktop.avs.obterSecaoProduto(av.id),
    ])
      .then(([secao, catalogo, secaoProcesso, secaoProduto]) => {
        setIncoterm(secao.incoterm ?? '');
        setObservacoes(secao.observacoes ?? '');
        const componentes = componentesDaEstrutura(estruturaDeDto(secaoProduto.estrutura));
        setComponentesTrazidos(componentes);
        const materiasSalvas = paraLinhasMateriais(secao, 'materia_prima');
        // Sem matéria-prima salva, a lista já nasce com os componentes da estrutura do produto.
        setMateriaPrima(materiasSalvas.length === 0 && componentes.length > 0 ? mesclarComponentes([], componentes) : materiasSalvas);
        setOutrosInsumos(paraLinhasMateriais(secao, 'outros_insumos'));
        setEmbalagem(paraLinhasMateriais(secao, 'embalagem'));
        setOperacoesDaEngenharia(secaoProcesso.operacoes);
        // Sem custo de processo salvo, a tabela já nasce com a sequência definida pela Eng. Processo.
        setProcesso(
          secao.processo.length === 0 && secaoProcesso.operacoes.length > 0
            ? aplicarOperacoes([], secaoProcesso.operacoes)
            : paraLinhasProcesso(secao.processo),
        );
        setOperacoes(catalogo.operacoes);
        setMaquinas(catalogo.maquinas);
        setCatalogoMateriaPrima(catalogo.materiaPrima);
        setCatalogoEmbalagem(catalogo.embalagem);
      })
      .catch((falha: unknown) => setErroCarregamento(mensagemDeErro(falha)))
      .finally(() => setCarregando(false));
  }, [av.id]);

  const totaisPorSecao: Record<SecaoCustoMaterialDTO, LinhaMaterialEditavel[]> = {
    materia_prima: materiaPrima,
    outros_insumos: outrosInsumos,
    embalagem,
  };
  const setPorSecao: Record<SecaoCustoMaterialDTO, typeof setMateriaPrima> = {
    materia_prima: setMateriaPrima,
    outros_insumos: setOutrosInsumos,
    embalagem: setEmbalagem,
  };
  // "Outros insumos" reaproveita o mesmo catálogo de matéria-prima — na planilha original os
  // dois blocos usam a mesma faixa de dropdown ('base MP'!C2:C152), não têm listas separadas.
  const catalogoPorSecao: Record<SecaoCustoMaterialDTO, ItemCatalogoMaterialDTO[]> = {
    materia_prima: catalogoMateriaPrima,
    outros_insumos: catalogoMateriaPrima,
    embalagem: catalogoEmbalagem,
  };

  const totalGeral =
    [...materiaPrima, ...outrosInsumos, ...embalagem, ...processo].reduce(
      (soma, linha) => soma + (Number(linha.custoTotal) || 0),
      0,
    ) || 0;

  const { sujo, marcarLimpo } = useAlteracoes({ incoterm, observacoes, materiaPrima, outrosInsumos, embalagem, processo }, !carregando);

  const salvar = async (): Promise<boolean> => {
    setErroSalvar(null);
    try {
      const materiais: ItemCustoMaterialEntrada[] = SECOES_CUSTO_MATERIAL.flatMap((secaoAtual) =>
        totaisPorSecao[secaoAtual]
          .filter((linha) => linha.descricao.trim())
          .map((linha) => ({
            secao: secaoAtual,
            codigoItem: linha.codigoItem || null,
            descricao: linha.descricao,
            qtdeBruta: paraNumeroOuNull(linha.qtdeBruta),
            qtdeNet: paraNumeroOuNull(linha.qtdeNet),
            unidadeMedida: linha.unidadeMedida || null,
            custoUnitario: paraNumeroOuNull(linha.custoUnitario),
            custoTotal: paraNumeroOuNull(linha.custoTotal),
          })),
      );

      const itensProcesso = paraItensProcesso(processo);

      await clienteDesktop.avs.salvarSecaoCusto({
        avId: av.id,
        incoterm: incoterm || null,
        observacoes: observacoes || null,
        materiais,
        processo: itensProcesso,
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
      className="flex flex-col gap-5">
      <SecaoAv tom="azul" className="flex flex-col gap-4 p-5">
        <CabecalhoDaSecao
          titulo="Condições"
          ajuda="Condições comerciais que afetam o custo final da proposta."
          aoLimpar={() => {
            setIncoterm('');
            setObservacoes('');
          }}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Selecao
            rotulo="Incoterm"
            ajuda="Regra internacional de frete que define quem paga transporte, seguro e risco até a entrega (EXW, FOB, CIF, DAP…). Muda o custo que entra na proposta."
            value={incoterm}
            onChange={(e) => setIncoterm(e.target.value as IncotermDTO | '')}
            opcoes={[{ valor: '', rotulo: '— não definido —' }, ...INCOTERMS.map((i) => ({ valor: i, rotulo: i }))]}
          />
        </div>
        <AreaTexto
          rotulo="Observações"
          ajuda="Hipóteses e informações que explicam os números do mapa: cotação de matéria-prima usada, câmbio, rendimento, sucata considerada."
          value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </SecaoAv>

      {SECOES_CUSTO_MATERIAL.map((secaoAtual) => (
        <SecaoAv tom={TOM_MATERIAL[secaoAtual]} key={secaoAtual} className="p-5">
          <TabelaDeMateriais
            acoes={
              secaoAtual === 'materia_prima' ? (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Botao
                      tamanho="sm"
                      icone={Network}
                      disabled={componentesTrazidos.length === 0}
                      title={
                        componentesTrazidos.length === 0
                          ? 'A Eng. Produto ainda não salvou componentes na estrutura do produto'
                          : undefined
                      }
                      onClick={() => {
                        setMateriaPrima((atual) => mesclarComponentes(atual, componentesTrazidos));
                        setAvisoComponentes(
                          `${componentesTrazidos.length} componente(s) da estrutura do produto trazidos. Salve o mapa para gravar.`,
                        );
                      }}
                    >
                      Trazer componentes da Estrutura do produto
                    </Botao>
                  </div>
                  {avisoComponentes && <p className="text-xs text-texto-secundario">{avisoComponentes}</p>}
                </div>
              ) : undefined
            }
            aoLimpar={() => setPorSecao[secaoAtual]([])}
            titulo={ROTULO_SECAO_CUSTO_MATERIAL[secaoAtual]}
            idCatalogo={`av-catalogo-materiais-${secaoAtual}`}
            catalogo={catalogoPorSecao[secaoAtual]}
            linhas={totaisPorSecao[secaoAtual]}
            aoAdicionar={() =>
              setPorSecao[secaoAtual]((atual) => [...atual, novaLinhaMaterial(chaveLocal())])
            }
            aoRemover={(chave) =>
              setPorSecao[secaoAtual]((atual) => atual.filter((linha) => linha.chave !== chave))
            }
            aoMudar={(chave, campo, valor) =>
              setPorSecao[secaoAtual]((atual) =>
                atual.map((linha) => {
                  if (linha.chave !== chave) return linha;
                  const atualizada = { ...linha, [campo]: valor };
                  // Escolher uma descrição do catálogo já preenche o código correspondente.
                  if (campo === 'descricao') {
                    const encontrado = catalogoPorSecao[secaoAtual].find(
                      (item) => item.descricao === valor,
                    );
                    if (encontrado) atualizada.codigoItem = encontrado.codigo;
                  }
                  return atualizada;
                }),
              )
            }
          />
        </SecaoAv>
      ))}

      <SecaoAv tom="ciano" className="p-5">
        <TabelaDeProcesso
          aoLimpar={() => setProcesso([])}
          linhas={processo}
          operacoes={operacoes}
          maquinas={maquinas}
          acoes={
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Botao
                  tamanho="sm"
                  icone={ListOrdered}
                  disabled={operacoesDaEngenharia.length === 0}
                  title={
                    operacoesDaEngenharia.length === 0
                      ? 'A Eng. Processo ainda não salvou operações'
                      : undefined
                  }
                  onClick={() => {
                    setProcesso((atual) => aplicarOperacoes(atual, operacoesDaEngenharia));
                    setAvisoImportacao(
                      `${operacoesDaEngenharia.length} operações da Eng. Processo trazidas. Salve o mapa para gravar.`,
                    );
                  }}
                >
                  Trazer operações da Eng. Processo
                </Botao>
              </div>
              <BarraDeTemplates
                tipo="custo_processo"
                itens={() => paraItensProcesso(processo)}
                aoCarregar={(itens) =>
                  setProcesso(paraLinhasProcesso(itens.map((item) => ({ id: chaveLocal(), ...item }))))
                }
              />
              {avisoImportacao && <p className="text-xs text-texto-secundario">{avisoImportacao}</p>}
            </div>
          }
          aoAdicionar={() => setProcesso((atual) => [...atual, novaLinhaProcesso(chaveLocal())])}
          aoRemover={(chave) => setProcesso((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setProcesso((atual) =>
              atual.map((linha) => (linha.chave === chave ? alterarLinhaProcesso(linha, campo, valor) : linha)),
            )
          }
        />
      </SecaoAv>

      <div className="flex items-center justify-between">
        <p className="text-sm">
          Total geral: <span className="font-semibold">{formatarMoeda(totalGeral)}</span>
        </p>
        {erroSalvar && <MensagemErro mensagem={erroSalvar} />}
      </div>
    </form>
  );
}
