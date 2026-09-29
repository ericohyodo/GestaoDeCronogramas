import type {
  AreaAvDTO,
  AtualizarComercialEntrada,
  AtualizarSecaoCustoEntrada,
  AtualizarSecaoProcessoEntrada,
  AtualizarSecaoProdutoEntrada,
  GerarAvsExemploSaida,
} from '@contratos/avs.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { GeradorDeId } from '../../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import type { RepositorioHistoricoAv } from '../../dominio/historico-av';
import type { RepositorioAvs } from '../../dominio/repositorio-avs';
import type { AutorizacaoAv } from '../autorizacao';
import type { ConsultaDeUsuarios } from '../portas';
import type { AtualizarComercial } from './atualizar-comercial';
import type { AvancarEtapa } from './avancar-etapa';
import type { CriarAv } from './criar-av';
import type { DeclinarAv } from './declinar-av';
import type { SalvarSecaoCusto } from './salvar-secao-custo';
import type { SalvarSecaoProcesso } from './salvar-secao-processo';
import type { SalvarSecaoProduto } from './salvar-secao-produto';

export const PREFIXO_AV_EXEMPLO = '[Exemplo] ';

type Destino =
  | 'comercial'
  | 'produto'
  | 'processo'
  | 'pcp'
  | 'custo'
  | 'proposta'
  | 'sd'
  | 'projeto'
  | 'declinada_cliente'
  | 'declinada_empresa';

/** Do mais inicial ao mais avançado; o índice diz quantas etapas a AV percorreu a partir de "Comercial". */
const ORDEM_DOS_DESTINOS: Destino[] = ['comercial', 'produto', 'processo', 'pcp', 'custo', 'proposta', 'sd', 'projeto'];
const nivel = (destino: Destino) => ORDEM_DOS_DESTINOS.indexOf(destino);

interface ClienteExemplo {
  cliente: string;
  programa: string;
  produto: string;
  complexidade: string;
}

const CLIENTES: ClienteExemplo[] = [
  { cliente: 'Aurora Motors', programa: 'AM-SUV', produto: 'Suporte de motor traseiro', complexidade: 'Alta' },
  { cliente: 'Vetor Autopeças', programa: 'VT-200', produto: 'Bracket de fixação do para-choque', complexidade: 'Média' },
  { cliente: 'Nordeste Implementos', programa: 'NI-Agro', produto: 'Lâmina de corte reforçada', complexidade: 'Baixa' },
  { cliente: 'Helix Eletrodomésticos', programa: 'HX-Lava', produto: 'Carcaça do painel de comando', complexidade: 'Média' },
  { cliente: 'Titan Bikes', programa: 'TB-E1', produto: 'Quadro de bicicleta elétrica', complexidade: 'Alta' },
  { cliente: 'Orbital Aeroespacial', programa: 'OA-Sat', produto: 'Estrutura de painel solar', complexidade: 'Alta' },
  { cliente: 'Lume Iluminação', programa: 'LM-LED', produto: 'Dissipador de calor para luminária', complexidade: 'Baixa' },
  { cliente: 'Costa Máquinas', programa: 'CM-Prensa', produto: 'Guia linear usinada', complexidade: 'Média' },
  { cliente: 'Brasil Ferroviária', programa: 'BF-Vagão', produto: 'Sapata de freio', complexidade: 'Alta' },
  { cliente: 'Delta Hidráulica', programa: 'DH-Bomba', produto: 'Corpo de válvula', complexidade: 'Média' },
];

/** 25 destinos — mistura de estágios para todas as telas e abas terem o que mostrar. */
const DESTINOS: Destino[] = [
  'comercial', 'comercial', 'comercial', 'comercial',
  'produto', 'produto', 'produto', 'produto',
  'processo', 'processo', 'processo',
  'pcp', 'pcp', 'pcp',
  'custo', 'custo', 'custo',
  'proposta', 'proposta',
  'sd', 'sd',
  'projeto', 'projeto',
  'declinada_cliente',
  'declinada_empresa',
];

const AREAS: AreaAvDTO[] = ['comercial', 'produto', 'processo', 'pcp', 'custo'];
const DIA_EM_MS = 86_400_000;

/**
 * Cria 25 AVs fictícias em estágios variados de preenchimento, reaproveitando os casos de uso reais
 * (para respeitar as regras de domínio e o histórico). Só administradores; não duplica se já existirem.
 */
export class GerarAvsExemplo implements CasoDeUso<void, GerarAvsExemploSaida> {
  constructor(
    private readonly repositorio: RepositorioAvs,
    private readonly historico: RepositorioHistoricoAv,
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly relogio: Relogio,
    private readonly geradorDeId: GeradorDeId,
    private readonly criarAv: CriarAv,
    private readonly atualizarComercial: AtualizarComercial,
    private readonly salvarProduto: SalvarSecaoProduto,
    private readonly salvarProcesso: SalvarSecaoProcesso,
    private readonly salvarCusto: SalvarSecaoCusto,
    private readonly avancarEtapa: AvancarEtapa,
    private readonly declinar: DeclinarAv,
  ) {}

  async executar(): Promise<GerarAvsExemploSaida> {
    const usuario = this.autorizacao.exigirAutenticado();
    if (usuario.perfil !== 'administrador') {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Apenas administradores podem gerar dados de exemplo.');
    }

    const existentes = await this.repositorio.listar();
    if (existentes.some((av) => av.descricao.startsWith(PREFIXO_AV_EXEMPLO))) {
      return { criadas: 0, jaExistiam: true };
    }

    const ativos = await this.usuarios.listarAtivos();
    const membros: Partial<Record<AreaAvDTO, string>> = {};
    AREAS.forEach((area, indice) => {
      const responsavel = ativos[indice % Math.max(ativos.length, 1)];
      if (responsavel) membros[area] = responsavel.id;
    });

    for (const [indice, destino] of DESTINOS.entries()) {
      await this.criarUma(indice, destino, membros, usuario.id);
    }
    return { criadas: DESTINOS.length, jaExistiam: false };
  }

  private async criarUma(
    indice: number,
    destino: Destino,
    membros: Partial<Record<AreaAvDTO, string>>,
    usuarioId: string,
  ): Promise<void> {
    const base = CLIENTES[indice % CLIENTES.length]!;
    const agora = this.relogio.agora();
    const prazo = new Date(agora.getTime() + (30 + indice * 9) * DIA_EM_MS).toISOString().slice(0, 10);

    const criada = await this.criarAv.executar({
      descricao: `${PREFIXO_AV_EXEMPLO}${base.produto}`,
      cliente: base.cliente,
      codigo: `EX-${String(indice + 1).padStart(3, '0')}`,
      complexidade: base.complexidade,
      solicitante: `Compras ${base.cliente}`,
      prazoCliente: prazo,
      membros,
    });
    const avId = criada.id;

    const declinada = destino === 'declinada_cliente' || destino === 'declinada_empresa';
    // Uma AV declinada teve o mesmo preenchimento de uma que parou no Mapa de Custo.
    const alcance = declinada ? nivel('custo') : nivel(destino);

    // As 2 primeiras ficam só com o intake da criação; as demais ganham a ficha comercial.
    if (indice >= 2) {
      await this.atualizarComercial.executar(this.dadosComerciais(avId, base, indice, alcance >= nivel('produto')));
    }

    // Cada seção é preenchida parcialmente quando a AV está nela e por completo quando já passou.
    if (alcance >= nivel('produto')) {
      await this.salvarProduto.executar(this.dadosProduto(avId, indice, alcance > nivel('produto')));
    }
    if (alcance >= nivel('processo')) {
      await this.salvarProcesso.executar(this.dadosProcesso(avId, indice, alcance > nivel('processo')));
    }
    if (alcance >= nivel('custo')) {
      await this.salvarCusto.executar(this.dadosCusto(avId, indice, alcance > nivel('custo')));
    }

    // A abertura de SD ainda não é um fluxo do app: para "Projeto Criado" o avanço para na SD e o último passo é gravado direto.
    const avancos = destino === 'projeto' ? nivel('sd') : alcance;
    for (let passo = 0; passo < avancos; passo += 1) {
      await this.avancarEtapa.executar({ avId, comentario: 'Etapa concluída (exemplo).' });
    }

    if (declinada) {
      await this.declinar.executar({
        avId,
        etapa: destino === 'declinada_cliente' ? 'declinada_cliente' : 'declinada_empresa',
        motivo:
          destino === 'declinada_cliente'
            ? 'Cliente optou por outro fornecedor.'
            : 'Capacidade indisponível no período.',
      });
    } else if (destino === 'projeto') {
      const av = await this.repositorio.obterPorId(avId);
      if (!av) return;
      const etapaDe = av.etapaAtual;
      av.moverParaEtapa(8);
      await this.repositorio.salvar(av);
      await this.historico.registrar({
        id: this.geradorDeId.gerar(),
        avId,
        etapaDe,
        etapaPara: 8,
        usuarioId,
        comentario: 'Projeto criado (exemplo).',
        data: this.relogio.agora(),
      });
    }
  }

  private dadosComerciais(
    avId: string,
    base: ClienteExemplo,
    indice: number,
    completa: boolean,
  ): AtualizarComercialEntrada {
    const dominio = base.cliente.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dados: AtualizarComercialEntrada = {
      avId,
      programa: base.programa,
      contatoComercial: `Contato ${base.cliente}`,
      emailComercial: `compras@${dominio}.exemplo.com`,
      volumeAnual: 5_000 + indice * 2_500,
    };
    if (!completa) return dados;
    return {
      ...dados,
      foneComercial: `(11) 4000-${String(1000 + indice)}`,
      contatoTecnico: `Eng. ${base.cliente}`,
      anoSopEop: `${2027 + (indice % 3)}/${2034 + (indice % 3)}`,
      respAbertura: 'Comercial',
      linha: indice % 2 === 0 ? 'Estamparia' : 'Usinagem',
      origemProjeto: indice % 3 === 0 ? 'Novo negócio' : 'Extensão de programa',
      localEntrega: 'Planta do cliente',
      conceitoLogistico: 'Milk run semanal',
      respEmbalagem: 'Cliente',
      infoComplementarComercial: 'Dados gerados como exemplo.',
      dataFechamento: new Date(this.relogio.agora().getTime() + (15 + indice) * DIA_EM_MS).toISOString().slice(0, 10),
    };
  }

  private dadosProduto(avId: string, indice: number, completa: boolean): AtualizarSecaoProdutoEntrada {
    const parcial: AtualizarSecaoProdutoEntrada = {
      avId,
      descritivoTecnicoExistente: true,
      descritivoTecnicoDisponivel: true,
      desenho2dExistente: true,
      desenho2dDisponivel: indice % 2 === 0,
      desenho3dExistente: indice % 3 !== 0,
      desenho3dDisponivel: false,
      escopoTecnico: 'Desenvolvimento e industrialização conforme desenho do cliente.',
      estrutura: [],
      investimentos: [],
    };
    if (!completa) return parcial;
    return {
      ...parcial,
      desenho2dDisponivel: true,
      desenho3dExistente: true,
      desenho3dDisponivel: true,
      desenhoInterfacesExistente: true,
      desenhoInterfacesDisponivel: true,
      normasTecnicasExistente: true,
      normasTecnicasDisponivel: true,
      requisitosClienteExistente: true,
      requisitosClienteDisponivel: true,
      requisitosGarantiaExistente: true,
      requisitosGarantiaDisponivel: indice % 2 === 0,
      descritivoTecnicoLink: `\\\\servidor\\avs\\exemplo\\${indice + 1}\\descritivo`,
      riscosProjeto: 'Tolerâncias apertadas e dependência de fornecedor único de matéria-prima.',
      premissasProjeto: 'Volume estável e ferramental dedicado.',
      recursosProjeto: 'Engenheiro de produto dedicado e acesso à linha piloto.',
      restricoesProjeto: 'Janela de protótipo limitada pelo calendário do cliente.',
      infoComplementar: 'Dados gerados como exemplo.',
      prazoPrototipoDias: 20 + (indice % 5) * 5,
      estrutura: [
        { chave: 'a', paiChave: null, tipo: 'componente', codigo: `SP-${indice + 1}`, descricao: 'Suporte estampado', quantidade: 1, unidade: 'un' },
        { chave: 'b', paiChave: 'a', tipo: 'componente', descricao: 'Reforço interno', quantidade: 2, unidade: 'un' },
        { chave: 'i', paiChave: 'b', tipo: 'materia_prima', descricao: 'Aço SAE 1020', quantidade: 0.4, unidade: 'kg' },
        { chave: 'c', paiChave: null, tipo: 'componente', descricao: 'Bucha', quantidade: 2, unidade: 'un' },
        { chave: 's', paiChave: null, tipo: 'insumo', descricao: 'Solda MIG', quantidade: 0.02, unidade: 'kg' },
        { chave: 'e', paiChave: null, tipo: 'embalagem', descricao: 'Caixa plástica retornável', quantidade: 0.05, unidade: 'un' },
      ],
      investimentos: [
        { descricao: 'Dispositivo de controle', classificacao: 'suporte_desenvolvimento', valor: 12_000 + indice * 800 },
        { descricao: 'Protótipos', classificacao: 'cliente', valor: 6_500 },
      ],
    };
  }

  private dadosProcesso(avId: string, indice: number, completa: boolean): AtualizarSecaoProcessoEntrada {
    const ferramental = { descricao: 'Ferramental progressivo', classificacao: 'capex', valor: 180_000 + indice * 5_000 } as const;
    return {
      avId,
      prazoProducaoDias: completa ? 45 + (indice % 4) * 5 : null,
      operacoes: completa
        ? [
            { descricao: 'Estampagem', maquina: 'PR-042', pecasHora: 600 },
            { descricao: 'Solda', maquina: 'CABINE-11', pecasHora: 120 },
          ]
        : [{ descricao: 'Estampagem', maquina: 'PR-042', pecasHora: 600 }],
      investimentos: completa
        ? [ferramental, { descricao: 'Gabarito de solda', classificacao: 'sup_des_ou_cliente', valor: 22_000 }]
        : [ferramental],
    };
  }

  private dadosCusto(avId: string, indice: number, completa: boolean): AtualizarSecaoCustoEntrada {
    const materiais: AtualizarSecaoCustoEntrada['materiais'] = [
      { secao: 'materia_prima', descricao: 'Aço SAE 1020 laminado', qtdeBruta: 1.4, qtdeNet: 1.1, unidadeMedida: 'kg', custoUnitario: 7.8, custoTotal: 10.92 },
    ];
    const processo: AtualizarSecaoCustoEntrada['processo'] = [
      { processo: 'Estampagem', maquina: 'Prensa 200t', pecasHora: 600, qtdeColaboradores: 2, taxaMod: 45, taxaMoi: 18, taxaGgf: 60, custoTotal: 0.4 },
    ];
    if (completa) {
      materiais.push(
        { secao: 'outros_insumos', descricao: 'Óleo de estampagem', qtdeBruta: 0.02, unidadeMedida: 'L', custoUnitario: 14, custoTotal: 0.28 },
        { secao: 'embalagem', descricao: 'Caixa plástica retornável', qtdeBruta: 0.05, unidadeMedida: 'un', custoUnitario: 90, custoTotal: 4.5 },
      );
      processo.push({ processo: 'Solda', maquina: 'Robô de solda MIG', pecasHora: 120, qtdeColaboradores: 1, taxaMod: 45, taxaMoi: 18, taxaGgf: 75, custoTotal: 1.15 });
    }
    return {
      avId,
      incoterm: completa ? (indice % 2 === 0 ? 'FCA' : 'DAP') : null,
      observacoes: completa ? 'Custos estimados (exemplo).' : null,
      materiais,
      processo,
    };
  }
}
