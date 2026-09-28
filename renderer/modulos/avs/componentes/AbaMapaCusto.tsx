'use client';

import { type FormEvent, useEffect, useState } from 'react';
import {
  INCOTERMS,
  SECOES_CUSTO_MATERIAL,
  type AvDetalheDTO,
  type IncotermDTO,
  type ItemCatalogoMaterialDTO,
  type ItemCustoMaterialEntrada,
  type ItemCustoProcessoEntrada,
  type SecaoCustoDTO,
  type SecaoCustoMaterialDTO,
} from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { formatarMoeda } from '@/compartilhado/formatacao';
import { Botao } from '@/compartilhado/ui/Botao';
import { AreaTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { PainelVidro } from '@/compartilhado/ui/PainelVidro';
import { ROTULO_SECAO_CUSTO_MATERIAL } from '../rotulos';
import { novaLinhaMaterial, TabelaDeMateriais, type LinhaMaterialEditavel } from './TabelaDeMateriais';
import { novaLinhaProcesso, TabelaDeProcesso, type LinhaProcessoEditavel } from './TabelaDeProcesso';

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

function paraLinhasProcesso(secao: SecaoCustoDTO): LinhaProcessoEditavel[] {
  return secao.processo.map((item) => ({
    chave: item.id,
    processo: item.processo ?? '',
    maquina: item.maquina ?? '',
    pecasHora: item.pecasHora != null ? String(item.pecasHora) : '',
    qtdeColaboradores: item.qtdeColaboradores != null ? String(item.qtdeColaboradores) : '',
    taxaMod: item.taxaMod != null ? String(item.taxaMod) : '',
    taxaMoi: item.taxaMoi != null ? String(item.taxaMoi) : '',
    taxaGgf: item.taxaGgf != null ? String(item.taxaGgf) : '',
    custoTotal: item.custoTotal != null ? String(item.custoTotal) : '',
  }));
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

  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([clienteDesktop.avs.obterSecaoCusto(av.id), clienteDesktop.avs.obterCatalogoCusto()])
      .then(([secao, catalogo]) => {
        setIncoterm(secao.incoterm ?? '');
        setObservacoes(secao.observacoes ?? '');
        setMateriaPrima(paraLinhasMateriais(secao, 'materia_prima'));
        setOutrosInsumos(paraLinhasMateriais(secao, 'outros_insumos'));
        setEmbalagem(paraLinhasMateriais(secao, 'embalagem'));
        setProcesso(paraLinhasProcesso(secao));
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

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
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

      const itensProcesso: ItemCustoProcessoEntrada[] = processo.map((linha) => ({
        processo: linha.processo || null,
        maquina: linha.maquina || null,
        pecasHora: paraNumeroOuNull(linha.pecasHora),
        qtdeColaboradores: paraNumeroOuNull(linha.qtdeColaboradores),
        taxaMod: paraNumeroOuNull(linha.taxaMod),
        taxaMoi: paraNumeroOuNull(linha.taxaMoi),
        taxaGgf: paraNumeroOuNull(linha.taxaGgf),
        custoTotal: paraNumeroOuNull(linha.custoTotal),
      }));

      await clienteDesktop.avs.salvarSecaoCusto({
        avId: av.id,
        incoterm: incoterm || null,
        observacoes: observacoes || null,
        materiais,
        processo: itensProcesso,
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
      <PainelVidro className="flex flex-col gap-4 p-5">
        <p className="text-xs font-medium text-texto-sutil">Condições</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Selecao
            rotulo="Incoterm"
            value={incoterm}
            onChange={(e) => setIncoterm(e.target.value as IncotermDTO | '')}
            opcoes={[{ valor: '', rotulo: '— não definido —' }, ...INCOTERMS.map((i) => ({ valor: i, rotulo: i }))]}
          />
        </div>
        <AreaTexto rotulo="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </PainelVidro>

      {SECOES_CUSTO_MATERIAL.map((secaoAtual) => (
        <PainelVidro key={secaoAtual} className="p-5">
          <TabelaDeMateriais
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
        </PainelVidro>
      ))}

      <PainelVidro className="p-5">
        <TabelaDeProcesso
          linhas={processo}
          operacoes={operacoes}
          maquinas={maquinas}
          aoAdicionar={() => setProcesso((atual) => [...atual, novaLinhaProcesso(chaveLocal())])}
          aoRemover={(chave) => setProcesso((atual) => atual.filter((linha) => linha.chave !== chave))}
          aoMudar={(chave, campo, valor) =>
            setProcesso((atual) =>
              atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)),
            )
          }
        />
      </PainelVidro>

      <div className="flex items-center justify-between">
        <p className="text-sm">
          Total geral: <span className="font-semibold">{formatarMoeda(totalGeral)}</span>
        </p>
        <div className="flex items-center gap-3">
          {erroSalvar && <MensagemErro mensagem={erroSalvar} />}
          <Botao type="submit" variante="primario" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar mapa de custo'}
          </Botao>
        </div>
      </div>
    </form>
  );
}
