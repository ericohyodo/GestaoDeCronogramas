'use client';

import { useEffect, useState } from 'react';
import type { AtualizarComercialEntrada, AvDetalheDTO, ContatoAvEntrada } from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';
import { AreaTexto, CampoData, CampoTexto, Selecao } from '@/compartilhado/ui/Campos';
import { MensagemErro } from '@/compartilhado/ui/MensagemErro';
import { useAvsStore } from '../store/use-avs-store';
import { useAlteracoes, useRegistrarAba } from './alteracoes-da-aba';
import { CabecalhoDaSecao, SecaoAv, TituloSecao } from './SecaoAv';
import { novaLinhaContato, TabelaDeContatos, type LinhaContatoEditavel } from './TabelaDeContatos';

// Os contatos são uma lista à parte (TabelaDeContatos); por isso os quatro campos antigos ficam de fora.
type CamposTexto = Omit<
  AtualizarComercialEntrada,
  'avId' | 'volumeAnual' | 'contatoComercial' | 'emailComercial' | 'foneComercial' | 'contatoTecnico'
>;

const LINHAS_DE_PRODUTO = ['Fogões', 'Automotivo', 'Armamento', 'Não Letais', 'Eletrônico', 'Outros'];
const ORIGENS_DO_PROJETO = [
  'Cliente',
  'Ferkoda',
  'Redução de Custo',
  'Melhoria Qualidade',
  'Resourcing',
  'Oportunidade de Negócio',
  'Outros',
];
const FAMILIAS = ['Venturi', 'Base', 'Capa', 'Mufla', 'Cartucho', 'Porta Sinal', 'Outros'];
const RESPONSAVEIS_PELA_EMBALAGEM = ['Ferkoda', 'Cliente'];

/** Opções fixas do dropdown; um valor antigo (digitado livremente antes) continua selecionável. */
function opcoesDe(lista: string[], atual: string | null | undefined) {
  const extra = atual && !lista.includes(atual) ? [atual] : [];
  return [{ valor: '', rotulo: '— selecione —' }, ...[...lista, ...extra].map((item) => ({ valor: item, rotulo: item }))];
}

let contador = 0;
const chaveLocal = () => `local-${Date.now()}-${contador++}`;

function paraFormulario(av: AvDetalheDTO): CamposTexto & { volumeAnual: string } {
  return {
    cliente: av.cliente ?? '',
    codigo: av.codigo ?? '',
    descricao: av.descricao,
    solicitante: av.solicitante ?? '',
    prazoCliente: av.prazoCliente ?? '',
    programa: av.programa ?? '',
    volumeAnual: av.volumeAnual != null ? String(av.volumeAnual) : '',
    anoSopEop: av.anoSopEop ?? '',
    linha: av.linha ?? '',
    origemProjeto: av.origemProjeto ?? '',
    familia: av.familia ?? '',
    localEntrega: av.localEntrega ?? '',
    conceitoLogistico: av.conceitoLogistico ?? '',
    respEmbalagem: av.respEmbalagem ?? '',
    infoComplementarComercial: av.infoComplementarComercial ?? '',
  };
}

function contatosParaEnvio(linhas: LinhaContatoEditavel[]): ContatoAvEntrada[] {
  return linhas
    .filter((linha) => [linha.nome, linha.area, linha.telefone, linha.email].some((valor) => valor.trim()))
    .map((linha) => ({ nome: linha.nome, area: linha.area, telefone: linha.telefone, email: linha.email }));
}

type CampoDoProduto = 'descricao' | 'codigo' | 'volumeAnual' | 'linha' | 'programa';

/** O estado inicial só é recalculado ao montar: depende de `AvDetalhe` estar montado com
 * `key={av.id}` lá em cima (ver `pagina-detalhe-av.tsx`) pra reiniciar o formulário ao trocar de AV. */
export function AbaComercial({ av }: { av: AvDetalheDTO }) {
  const atualizarComercial = useAvsStore((estado) => estado.atualizarComercial);
  const [campos, setCampos] = useState(() => paraFormulario(av));
  // `null` enquanto carrega; os contatos vêm de uma chamada própria.
  const [contatos, setContatos] = useState<LinhaContatoEditavel[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    clienteDesktop.avs
      .obterContatos(av.id)
      .then((lista) => {
        if (cancelado) return;
        setContatos(
          lista.map((contato) => ({
            chave: contato.id,
            nome: contato.nome,
            area: contato.area ?? '',
            telefone: contato.telefone ?? '',
            email: contato.email ?? '',
          })),
        );
      })
      .catch((falha: unknown) => !cancelado && setErro(mensagemDeErro(falha)));
    return () => {
      cancelado = true;
    };
  }, [av.id]);

  const def = <K extends keyof CamposTexto>(campo: K) => ({
    value: campos[campo] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCampos((atual) => ({ ...atual, [campo]: e.target.value })),
  });
  const defSelecao = (campo: 'linha' | 'familia' | 'origemProjeto' | 'respEmbalagem') => ({
    value: campos[campo] ?? '',
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setCampos((atual) => ({ ...atual, [campo]: e.target.value })),
  });

  const limpar = (lista: (keyof CamposTexto | 'volumeAnual')[]) => {
    setCampos((atual) => {
      const novo: Record<string, unknown> = { ...atual };
      for (const campo of lista) novo[campo] = '';
      return novo as typeof atual;
    });
  };

  // Campos do produto de uma AV que herdou dados do grupo: em alerta (vermelho) até serem preenchidos à mão.
  const original = paraFormulario(av);
  const alerta = (campo: CampoDoProduto) => {
    const atual = String(campos[campo] ?? '').trim();
    const pendente =
      av.camposPendentes.includes(campo) && (atual === '' || atual === String(original[campo] ?? '').trim());
    return pendente ? { erro: 'Preencher manualmente', className: 'bg-perigo/5' } : {};
  };

  const { sujo, marcarLimpo } = useAlteracoes({ campos, contatos }, contatos !== null);

  const salvar = async (): Promise<boolean> => {
    setErro(null);
    try {
      await atualizarComercial({
        avId: av.id,
        ...campos,
        volumeAnual: campos.volumeAnual.trim() ? Number(campos.volumeAnual) : null,
      });
      if (contatos !== null) {
        await clienteDesktop.avs.salvarContatos({ avId: av.id, contatos: contatosParaEnvio(contatos) });
      }
      marcarLimpo();
      return true;
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      return false;
    }
  };

  useRegistrarAba({ sujo, salvar });

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void salvar();
      }}
      className="flex flex-col gap-5"
    >
      <SecaoAv tom="azul" className="flex flex-col gap-4 p-5">
        <CabecalhoDaSecao
          titulo="Identificação"
          ajuda="Dados que identificam o item que o cliente quer cotar e de que negócio ele faz parte."
          aoLimpar={() =>
            limpar([
              'descricao',
              'cliente',
              'codigo',
              'solicitante',
              'volumeAnual',
              'linha',
              'familia',
              'origemProjeto',
              'programa',
              'anoSopEop',
              'prazoCliente',
            ])
          }
        />
        <CampoTexto
          rotulo="Descrição do item/produto"
          ajuda="Nome do item como o cliente o chama, de forma que qualquer pessoa reconheça o produto (ex.: Mufla M8HB0010A). Cada AV de um grupo tem a sua."
          maxLength={200}
          required
          {...def('descricao')}
          {...alerta('descricao')}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoTexto
            rotulo="Cliente"
            ajuda="Empresa que está pedindo a cotação (razão social ou nome pelo qual ela é conhecida)."
            {...def('cliente')}
          />
          <CampoTexto
            rotulo="Código do cliente"
            ajuda="Código ou número da peça no sistema do cliente (part number). Serve para conferir se estamos falando do mesmo item."
            {...def('codigo')}
            {...alerta('codigo')}
          />
          <CampoTexto
            rotulo="Solicitante"
            ajuda="Pessoa do cliente que fez a solicitação da cotação."
            {...def('solicitante')}
          />
          <CampoTexto
            rotulo="Volume anual"
            ajuda="Quantidade de peças por ano prevista pelo cliente. Base para dimensionar capacidade, ferramental e custo por peça."
            type="number"
            min={0}
            value={campos.volumeAnual}
            onChange={(e) => setCampos((atual) => ({ ...atual, volumeAnual: e.target.value }))}
            {...alerta('volumeAnual')}
          />
          <Selecao
            rotulo="Linha"
            ajuda="Segmento de mercado a que o produto pertence (Fogões, Automotivo, Armamento…)."
            opcoes={opcoesDe(LINHAS_DE_PRODUTO, campos.linha)}
            {...defSelecao('linha')}
            {...alerta('linha')}
          />
          <Selecao
            rotulo="Família"
            ajuda="Família do produto na fábrica (Venturi, Base, Capa, Mufla, Cartucho, Porta Sinal…). Agrupa itens parecidos para comparar custos e processos."
            opcoes={opcoesDe(FAMILIAS, campos.familia)}
            {...defSelecao('familia')}
          />
          <Selecao
            rotulo="Origem"
            ajuda="De onde veio a demanda: pedido do Cliente, iniciativa da Ferkoda, Redução de Custo, Melhoria de Qualidade, Resourcing (troca de fornecedor), Oportunidade de Negócio ou Outros."
            opcoes={opcoesDe(ORIGENS_DO_PROJETO, campos.origemProjeto)}
            {...defSelecao('origemProjeto')}
          />
          <CampoTexto
            rotulo="Programa"
            ajuda="Programa, plataforma ou projeto do cliente ao qual o item pertence (ex.: o modelo de veículo ou eletrodoméstico em que será usado)."
            {...def('programa')}
            {...alerta('programa')}
          />
          <CampoTexto
            rotulo="Ano SOP/EOP"
            ajuda="Início (SOP, Start of Production) e fim (EOP, End of Production) previstos da produção pelo cliente, por exemplo 2027/2034."
            {...def('anoSopEop')}
          />
          <CampoData
            rotulo="Prazo para AV"
            ajuda="Data limite para a Ferkoda entregar a análise de viabilidade (a proposta) ao cliente."
            {...def('prazoCliente')}
          />
        </div>
      </SecaoAv>

      <SecaoAv tom="verde" className="flex flex-col gap-4 p-5">
        {contatos === null ? (
          <>
            <TituloSecao>Contato</TituloSecao>
            <p className="text-sm text-texto-secundario">Carregando…</p>
          </>
        ) : (
          <TabelaDeContatos
            linhas={contatos}
            aoLimpar={() => setContatos([])}
            aoAdicionar={() => setContatos((atual) => [...(atual ?? []), novaLinhaContato(chaveLocal())])}
            aoRemover={(chave) => setContatos((atual) => (atual ?? []).filter((linha) => linha.chave !== chave))}
            aoMudar={(chave, campo, valor) =>
              setContatos((atual) =>
                (atual ?? []).map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)),
              )
            }
          />
        )}
      </SecaoAv>

      <SecaoAv tom="ciano" className="flex flex-col gap-4 p-5">
        <CabecalhoDaSecao
          titulo="Logística"
          ajuda="Como o produto chega ao cliente: para onde vai, de que forma é entregue e quem cuida da embalagem."
          aoLimpar={() => limpar(['localEntrega', 'conceitoLogistico', 'respEmbalagem'])}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoTexto
            rotulo="Local de entrega"
            ajuda="Planta ou endereço do cliente onde o produto será entregue."
            {...def('localEntrega')}
          />
          <CampoTexto
            rotulo="Conceito logístico"
            ajuda="Forma de abastecimento combinada com o cliente: milk run, entrega direta, consignação, estoque-pulmão, frequência de entrega etc."
            {...def('conceitoLogistico')}
          />
          <Selecao
            rotulo="Responsabilidade de embalagem final"
            ajuda="Quem fornece e responde pela embalagem final do produto: a Ferkoda ou o Cliente (embalagem retornável do cliente, por exemplo)."
            opcoes={opcoesDe(RESPONSAVEIS_PELA_EMBALAGEM, campos.respEmbalagem)}
            {...defSelecao('respEmbalagem')}
          />
        </div>
      </SecaoAv>

      <SecaoAv tom="lilas" className="flex flex-col gap-3 p-5">
        <CabecalhoDaSecao titulo="Observações" aoLimpar={() => limpar(['infoComplementarComercial'])} />
        <AreaTexto
          rotulo="Informações complementares"
          ajuda="Qualquer informação comercial que ajude as outras áreas e não tenha campo próprio: combinados com o cliente, contexto da negociação, urgências."
          rows={4}
          {...def('infoComplementarComercial')}
        />
      </SecaoAv>

      {erro && <MensagemErro mensagem={erro} />}
    </form>
  );
}
