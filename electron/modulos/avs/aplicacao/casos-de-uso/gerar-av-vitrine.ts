import type {
  AreaAvDTO,
  AtualizarComercialEntrada,
  AtualizarSecaoCustoEntrada,
  AtualizarSecaoPcpEntrada,
  AtualizarSecaoProcessoEntrada,
  AtualizarSecaoProdutoEntrada,
  ContatoAvEntrada,
} from '@contratos/avs.contrato';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import type { AutorizacaoAv } from '../autorizacao';
import type { ConsultaDeUsuarios } from '../portas';
import type { AtualizarComercial } from './atualizar-comercial';
import type { AvancarEtapa } from './avancar-etapa';
import type { SalvarContatosAv } from './contatos-av';
import type { CriarAv } from './criar-av';
import type { FinalizarECriarPreSd } from './finalizar-e-criar-pre-sd';
import type { SalvarSecaoCusto } from './salvar-secao-custo';
import type { SalvarSecaoPcp } from './secao-pcp';
import type { SalvarSecaoProcesso } from './salvar-secao-processo';
import type { SalvarSecaoProduto } from './salvar-secao-produto';

// =====================================================================================================
// AV de vitrine do modo apresentação: UMA cadeia AV → SD → PRO completa e coerente, preenchida pelos
// casos de uso reais (numeração, histórico e versões corretos). Para trocar o produto da demonstração,
// basta editar a constante VITRINE abaixo.
// =====================================================================================================

/** Textos da SD de vitrine (repassados ao módulo de SDs). */
export interface TextosDaSdDeVitrine {
  numeroPo: string;
  observacoes: string;
  parecer: string;
  /** Observação do prazo acordado com o cliente (o lead time de exemplo é de 180 dias). */
  leadTimeObservacao?: string;
}

/** Leva a SD da AV até "fechada" (cria o PRO), via módulo de SDs. */
export type AvancarSdDeVitrine = (
  avId: string,
  ate: 'aberta' | 'fechada',
  usuarioId: string,
  textos?: TextosDaSdDeVitrine,
) => Promise<void>;

/** Quem faz cada área da AV de vitrine (nome do usuário; `null` = o próprio apresentador). */
const EQUIPE: Record<AreaAvDTO, string | null> = {
  comercial: 'Alexandre',
  produto: null,
  processo: 'Allan',
  pcp: 'Thiago',
  custo: 'André Navarro',
};

const DIA_EM_MS = 86_400_000;

const VITRINE = {
  descricao: 'Suporte do coxim do motor – estampado e soldado',
  cliente: 'Vértice Automotive',
  codigo: 'VX3-4471-A',
  complexidade: 'Alta',
  solicitante: 'Marina Duarte (Compras Vértice)',
  comercial: {
    desenhoClienteRef: 'VX3-4471 rev. C',
    programa: 'VX-300 (SUV compacto)',
    volumeAnual: 48_000,
    anoSopEop: '2027/2033',
    respAbertura: 'Comercial',
    linha: 'Automotivo',
    origemProjeto: 'Oportunidade de Negócio',
    familia: 'Outros',
    localEntrega: 'Planta Vértice – Sorocaba/SP',
    conceitoLogistico: 'Milk run 2x por semana, entrega JIT na linha de montagem',
    respEmbalagem: 'Ferkoda',
    infoComplementarComercial:
      'Novo programa do cliente; fornecimento hoje concentrado em um concorrente. Potencial de estender para o VX-400 em 2029.',
    contatoComercial: 'Marina Duarte',
    emailComercial: 'marina.duarte@vertice.exemplo.com',
    foneComercial: '(15) 3200-4471',
    contatoTecnico: 'Eng. Rafael Nogueira',
  },
  contatos: [
    { nome: 'Marina Duarte', area: 'Compras', telefone: '(15) 3200-4471', email: 'marina.duarte@vertice.exemplo.com' },
    { nome: 'Rafael Nogueira', area: 'Engenharia do Produto', telefone: '(15) 3200-4480', email: 'rafael.nogueira@vertice.exemplo.com' },
    { nome: 'Cláudia Prates', area: 'Qualidade de Fornecedores (SQA)', telefone: '(15) 3200-4492', email: 'claudia.prates@vertice.exemplo.com' },
  ] satisfies ContatoAvEntrada[],
} as const;

/**
 * Cria a AV de vitrine e a leva até "Projeto Criado" (SD fechada e PRO). Só administradores.
 * @returns o id da AV criada
 */
export class GerarAvVitrine {
  constructor(
    private readonly autorizacao: AutorizacaoAv,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly relogio: Relogio,
    private readonly criarAv: CriarAv,
    private readonly atualizarComercial: AtualizarComercial,
    private readonly salvarContatos: SalvarContatosAv,
    private readonly salvarProduto: SalvarSecaoProduto,
    private readonly salvarProcesso: SalvarSecaoProcesso,
    private readonly salvarPcp: SalvarSecaoPcp,
    private readonly salvarCusto: SalvarSecaoCusto,
    private readonly avancarEtapa: AvancarEtapa,
    private readonly finalizar: Pick<FinalizarECriarPreSd, 'executar'>,
    private readonly avancarSd?: AvancarSdDeVitrine,
  ) {}

  async executar(): Promise<{ avId: string; membros: Partial<Record<AreaAvDTO, string>> }> {
    const usuario = this.autorizacao.exigirAutenticado();
    if (usuario.perfil !== 'administrador') {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Apenas administradores podem gerar dados de exemplo.');
    }

    // Equipe por nome; quem não existir (ex.: banco de testes sem a equipe) é substituído pelo apresentador.
    const ativos = await this.usuarios.listarAtivos();
    const membros: Partial<Record<AreaAvDTO, string>> = {};
    for (const [area, nome] of Object.entries(EQUIPE) as [AreaAvDTO, string | null][]) {
      membros[area] = (nome && ativos.find((u) => u.nome === nome)?.id) || usuario.id;
    }

    const agora = this.relogio.agora();
    const dia = (deslocamento: number) => new Date(agora.getTime() + deslocamento * DIA_EM_MS).toISOString().slice(0, 10);

    const criada = await this.criarAv.executar({
      descricao: VITRINE.descricao,
      cliente: VITRINE.cliente,
      codigo: VITRINE.codigo,
      complexidade: VITRINE.complexidade,
      solicitante: VITRINE.solicitante,
      prazoCliente: dia(-50),
      membros,
    });
    const avId = criada.id;

    await this.atualizarComercial.executar({ avId, ...VITRINE.comercial, dataFechamento: dia(-48) } satisfies AtualizarComercialEntrada);
    await this.salvarContatos.executar({ avId, contatos: [...VITRINE.contatos] });
    await this.salvarProduto.executar(this.dadosProduto(avId));
    await this.salvarProcesso.executar(this.dadosProcesso(avId));
    await this.salvarPcp.executar(this.dadosPcp(avId));
    await this.salvarCusto.executar(this.dadosCusto(avId));

    const comentarios = [
      'Ficha comercial completa: programa VX-300, 48 mil peças/ano, SOP em 2027.',
      'Desenhos rev. C analisados; estrutura de 6 itens e riscos de tolerância mapeados.',
      'Roteiro de 5 operações definido; ferramental progressivo e gabarito de solda dedicados.',
      'Carga das prensas e da célula de solda comporta o volume com 1 turno adicional na solda.',
      'Mapa de custo fechado; proposta pronta para envio ao cliente.',
    ];
    for (const comentario of comentarios) {
      await this.avancarEtapa.executar({ avId, comentario });
    }

    await this.finalizar.executar(avId);
    await this.avancarSd?.(avId, 'fechada', usuario.id, {
      numeroPo: '4500127731',
      observacoes:
        'PO emitido pela Vértice conforme a cotação revisão 2 (preço-peça e ferramental). SOP do VX-300 confirmado para março/2027; ' +
        'cliente pede amostras PPAP nível 3 e run@rate na planta.',
      parecer:
        'Escopo, prazos e investimentos conferidos com a AV. Aceite dado: projeto aberto com fases APQP e responsáveis definidos ' +
        'pela equipe da AV. Atenção ao prazo do ferramental (fornecedor externo).',
      leadTimeObservacao: 'PPAP até jan/27; SOP do VX-300 em mar/27 (cronograma do cliente rev. B).',
    });
    return { avId, membros };
  }

  private dadosProduto(avId: string): AtualizarSecaoProdutoEntrada {
    const pasta = '\\\\servidor\\engenharia\\AV\\Vertice\\VX3-4471';
    return {
      avId,
      descritivoTecnicoExistente: true,
      descritivoTecnicoDisponivel: true,
      descritivoTecnicoLink: `${pasta}\\descritivo`,
      desenho2dExistente: true,
      desenho2dDisponivel: true,
      desenho2dLink: `${pasta}\\2D`,
      desenho3dExistente: true,
      desenho3dDisponivel: true,
      desenho3dLink: `${pasta}\\3D`,
      desenhoInterfacesExistente: true,
      desenhoInterfacesDisponivel: true,
      desenhoInterfacesLink: `${pasta}\\interfaces`,
      normasTecnicasExistente: true,
      normasTecnicasDisponivel: true,
      normasTecnicasLink: `${pasta}\\normas`,
      requisitosClienteExistente: true,
      requisitosClienteDisponivel: true,
      requisitosClienteLink: `${pasta}\\requisitos`,
      requisitosGarantiaExistente: true,
      requisitosGarantiaDisponivel: false,
      escopoTecnico:
        'Desenvolver e industrializar o suporte do coxim do motor (lado direito) do VX-300: corpo estampado em aço ' +
        'LNE 380 2,5 mm, reforço soldado e duas buchas prensadas, com pintura KTL preta. Inclui ferramental, ' +
        'dispositivos de solda e controle, amostras e aprovação PPAP nível 3.',
      riscosProjeto:
        '1) Tolerância de ±0,1 mm na furação do coxim pode exigir calibração após a solda. ' +
        '2) Distorção térmica na solda do reforço. 3) Prazo do ferramental depende de fornecedor externo. ' +
        '4) Requisitos de garantia (10 anos) ainda não recebidos do cliente.',
      premissasProjeto:
        'Volume de 48 mil peças/ano estável; aço LNE 380 fornecido pela usina homologada; ferramental pago pelo cliente ' +
        'em 3 parcelas; congelamento do desenho na rev. C.',
      recursosProjeto:
        'Engenheiro de produto dedicado (50%), célula robotizada de solda já existente, laboratório de metrologia 3D ' +
        'e acesso à linha piloto para o try-out.',
      restricoesProjeto:
        'Amostras PPAP precisam chegar ao cliente até a semana 14/2027 para não comprometer o SOP do VX-300.',
      infoComplementar: 'Peça de segurança (característica especial SC na furação do coxim).',
      prazoPrototipoDias: 35,
      complexidade: 'Alta',
      estrutura: [
        { chave: 'cj', paiChave: null, tipo: 'conjunto', codigo: 'VX3-4471-A', descricao: 'Conjunto suporte do coxim (pintado)', quantidade: 1, unidade: 'un' },
        { chave: 'corpo', paiChave: 'cj', tipo: 'componente', codigo: 'FK-4471-01', descricao: 'Corpo estampado', quantidade: 1, unidade: 'un' },
        { chave: 'aco1', paiChave: 'corpo', tipo: 'materia_prima', codigo: 'MP-LNE380-25', descricao: 'Bobina aço LNE 380 2,5 mm', quantidade: 1.85, unidade: 'kg' },
        { chave: 'reforco', paiChave: 'cj', tipo: 'componente', codigo: 'FK-4471-02', descricao: 'Reforço interno', quantidade: 1, unidade: 'un' },
        { chave: 'aco2', paiChave: 'reforco', tipo: 'materia_prima', codigo: 'MP-LNE380-20', descricao: 'Bobina aço LNE 380 2,0 mm', quantidade: 0.62, unidade: 'kg' },
        { chave: 'bucha', paiChave: 'cj', tipo: 'componente', codigo: 'CP-BU-1612', descricao: 'Bucha 16 x 12 mm (comprada)', quantidade: 2, unidade: 'un' },
        { chave: 'arame', paiChave: 'cj', tipo: 'insumo', codigo: 'IN-ER70S6', descricao: 'Arame de solda MIG ER70S-6', quantidade: 0.03, unidade: 'kg' },
        { chave: 'ktl', paiChave: 'cj', tipo: 'insumo', codigo: 'IN-KTL-PT', descricao: 'Tinta KTL preta', quantidade: 0.06, unidade: 'kg' },
        { chave: 'emb', paiChave: null, tipo: 'embalagem', codigo: 'EM-KLT-6428', descricao: 'Caixa KLT 6428 retornável (40 peças)', quantidade: 0.025, unidade: 'un' },
      ],
      investimentos: [
        { descricao: 'Dispositivo de controle dimensional (CF)', classificacao: 'suporte_desenvolvimento', valor: 28_000 },
        { descricao: 'Protótipos e amostras PPAP', classificacao: 'cliente', valor: 14_500 },
        { descricao: 'Ensaios de fadiga em laboratório externo', classificacao: 'sup_des_ou_cliente', valor: 19_800 },
      ],
    };
  }

  private dadosProcesso(avId: string): AtualizarSecaoProcessoEntrada {
    return {
      avId,
      prazoProducaoDias: 60,
      operacoes: [
        { descricao: 'Corte de blank', maquina: 'Prensa 160t – PR-018', pecasHora: 900 },
        { descricao: 'Estampagem progressiva', maquina: 'Prensa 400t – PR-042', pecasHora: 480 },
        { descricao: 'Solda MIG robotizada (reforço)', maquina: 'Célula robô 11', pecasHora: 75 },
        { descricao: 'Pintura KTL', maquina: 'Linha KTL (terceiro)', pecasHora: 600 },
        { descricao: 'Montagem das buchas e inspeção final', maquina: 'Prensa pneumática – MT-07', pecasHora: 120 },
      ],
      investimentos: [
        { descricao: 'Ferramental progressivo do corpo', classificacao: 'capex', valor: 312_000 },
        { descricao: 'Ferramenta de corte do reforço', classificacao: 'capex', valor: 68_000 },
        { descricao: 'Gabarito de solda (2 estações)', classificacao: 'sup_des_ou_cliente', valor: 46_000 },
      ],
    };
  }

  private dadosPcp(avId: string): AtualizarSecaoPcpEntrada {
    return {
      avId,
      observacoes:
        'A célula robô 11 passa de 1,6 para 1,9 turno com o item: recomendado 2º turno parcial na solda a partir do lote ' +
        'piloto. Prensas com folga. Estoque de segurança de 2 dias no cliente.',
      // Carga atual em peças/mês (unidade da operação); a futura sai do volume anual (48.000 ÷ 12 = 4.000/mês).
      cargas: [
        { operacao: 'Corte de blank', maquina: 'Prensa 160t – PR-018', pecasHora: 900, conversao: 1, cargaAtualPecas: 85_000 },
        { operacao: 'Estampagem progressiva', maquina: 'Prensa 400t – PR-042', pecasHora: 480, conversao: 1, cargaAtualPecas: 60_000 },
        { operacao: 'Solda MIG robotizada (reforço)', maquina: 'Célula robô 11', pecasHora: 75, conversao: 1, cargaAtualPecas: 21_000 },
        { operacao: 'Montagem das buchas e inspeção final', maquina: 'Prensa pneumática – MT-07', pecasHora: 120, conversao: 1, cargaAtualPecas: 16_000 },
      ],
      custos: [
        { descricao: 'Frete milk run (por mês)', valor: 6_800 },
        { descricao: 'Lote de embalagens KLT retornáveis', valor: 22_400 },
        { descricao: 'Frete da pintura KTL (ida e volta, por mês)', valor: 3_100 },
      ],
    };
  }

  private dadosCusto(avId: string): AtualizarSecaoCustoEntrada {
    return {
      avId,
      incoterm: 'DAP',
      observacoes: 'Base: aço a R$ 7,90/kg (cotação da usina deste mês). Custo de pintura KTL de terceiro por peça. Sem impostos.',
      materiais: [
        { secao: 'materia_prima', codigoItem: 'MP-LNE380-25', descricao: 'Bobina aço LNE 380 2,5 mm', qtdeBruta: 1.85, qtdeNet: 1.32, unidadeMedida: 'kg', custoUnitario: 7.9, custoTotal: 14.62 },
        { secao: 'materia_prima', codigoItem: 'MP-LNE380-20', descricao: 'Bobina aço LNE 380 2,0 mm', qtdeBruta: 0.62, qtdeNet: 0.44, unidadeMedida: 'kg', custoUnitario: 7.9, custoTotal: 4.9 },
        { secao: 'materia_prima', codigoItem: 'CP-BU-1612', descricao: 'Bucha 16 x 12 mm (comprada)', qtdeBruta: 2, qtdeNet: 2, unidadeMedida: 'un', custoUnitario: 1.35, custoTotal: 2.7 },
        { secao: 'outros_insumos', codigoItem: 'IN-ER70S6', descricao: 'Arame de solda MIG ER70S-6', qtdeBruta: 0.03, unidadeMedida: 'kg', custoUnitario: 18.5, custoTotal: 0.56 },
        { secao: 'outros_insumos', codigoItem: 'IN-KTL-PT', descricao: 'Pintura KTL (serviço de terceiro)', qtdeBruta: 1, unidadeMedida: 'pç', custoUnitario: 2.4, custoTotal: 2.4 },
        { secao: 'embalagem', codigoItem: 'EM-KLT-6428', descricao: 'Caixa KLT 6428 retornável (rateio)', qtdeBruta: 0.025, unidadeMedida: 'un', custoUnitario: 96, custoTotal: 2.4 },
      ],
      processo: [
        { processo: 'Corte de blank', maquina: 'Prensa 160t – PR-018', pecasHora: 900, qtdeColaboradores: 1, taxaMod: 48, taxaMoi: 19, taxaGgf: 85, custoTotal: 0.17 },
        { processo: 'Estampagem progressiva', maquina: 'Prensa 400t – PR-042', pecasHora: 480, qtdeColaboradores: 2, taxaMod: 48, taxaMoi: 19, taxaGgf: 140, custoTotal: 0.57 },
        { processo: 'Solda MIG robotizada (reforço)', maquina: 'Célula robô 11', pecasHora: 75, qtdeColaboradores: 1, taxaMod: 48, taxaMoi: 19, taxaGgf: 110, custoTotal: 2.36 },
        { processo: 'Montagem das buchas e inspeção final', maquina: 'Prensa pneumática – MT-07', pecasHora: 120, qtdeColaboradores: 1, taxaMod: 48, taxaMoi: 19, taxaGgf: 35, custoTotal: 0.85 },
      ],
    };
  }
}
