import type { RoteiroDaApresentacaoDTO } from '@contratos/apresentacao.contrato';

// =====================================================================================================
// Roteiro da apresentação: cada passo abre uma tela (com os dados fictícios do modo apresentação),
// destaca um elemento marcado com `data-tour` e explica o que ele faz. Alguns passos "digitam" um texto
// para mostrar o preenchimento ao vivo (nada é gravado sem clicar em Salvar).
// =====================================================================================================

export interface PassoDoRoteiro {
  /** Tela do passo; `null` mantém a tela atual. */
  rota: string | null;
  /** Valor do atributo `data-tour` destacado; `null` mostra o cartão no centro. */
  alvo: string | null;
  titulo: string;
  texto: string;
  /** Digita este texto no campo indicado (seletor dentro do alvo). */
  digitar?: { seletor: string; texto: string };
}

/**
 * Monta os passos com os registros fictícios do seed (os ids mudam a cada entrada no modo).
 * Passos cujo registro não existe são omitidos.
 */
export function montarRoteiro(r: RoteiroDaApresentacaoDTO): PassoDoRoteiro[] {
  const av = (id: string | null) => (id ? `/avs/detalhe/?id=${id}` : null);
  const sd = (id: string | null) => (id ? `/sds/detalhe/?id=${id}` : null);
  const passos: (PassoDoRoteiro | false)[] = [
    {
      rota: '/',
      alvo: null,
      titulo: 'Gestão de Novos Desenvolvimentos',
      texto:
        'Um único app para acompanhar o novo desenvolvimento do pedido de cotação até o projeto: AV → SD → PRO. Estes dados são fictícios e ficam numa pasta separada; os dados reais não são tocados.',
    },
    {
      rota: '/',
      alvo: 'modulos',
      titulo: 'Três módulos, um código',
      texto:
        'Gestão AVs (viabilidade), Gestão SDs (passagem do Comercial para a Engenharia) e Gestão de Projetos. O número nasce na AV e acompanha tudo: AV 26-001 → SD 26-001 → PRO 26-001.',
    },
    {
      rota: '/',
      alvo: 'sino',
      titulo: 'Notificações',
      texto:
        'O sino acende um ponto vermelho quando chega algo para você: a AV chegou à sua área, uma SD aguarda o seu aceite, uma tarefa foi atribuída ou atrasou. A lista fica no menu Notificações, com a bolinha de não lidas. Com o app aberto, o Windows também avisa.',
    },
    {
      rota: '/avs/',
      alvo: 'lista-avs',
      titulo: 'Gestão AVs',
      texto: 'Todas as análises de viabilidade, com a etapa atual de cada uma. Filtre por situação e abra uma AV para trabalhar nela.',
    },
    !!r.avEmProduto && {
      rota: av(r.avEmProduto),
      alvo: 'abas-av',
      titulo: 'Uma aba por área',
      texto:
        'Comercial, Eng. Produto, Eng. Processo, PCP e Mapa de Custo. Cada área preenche a sua aba e libera a próxima etapa; quem não é o responsável vê a aba em somente leitura.',
    },
    !!r.avEmProduto && {
      rota: av(r.avEmProduto),
      alvo: 'progresso-aba',
      titulo: 'Progresso da aba',
      texto: 'Quantos blocos já foram preenchidos nesta aba. Ajuda a ver o que falta antes de liberar a próxima área.',
    },
    !!r.avEmProduto && {
      rota: av(r.avEmProduto),
      alvo: 'bloco-atual',
      titulo: 'Liberação fracionada',
      texto:
        'O bloco em destaque é o próximo a preencher; os completos ganham selo e os seguintes ficam esmaecidos (mas editáveis). No checklist técnico há a opção N/A para o que foi visto e não se aplica.',
    },
    !!r.avEmProduto && {
      rota: av(r.avEmProduto),
      alvo: 'botoes-aba',
      titulo: 'Salvar e liberar',
      texto:
        '"Salvar e Liberar Próximo" grava a aba e passa a AV para a próxima área, que é avisada no sino. Se duas pessoas editarem a mesma aba, o app avisa em vez de apagar o trabalho do outro.',
    },
    !!r.avEmProduto && {
      rota: av(r.avEmProduto),
      alvo: 'equipe-av',
      titulo: 'Equipe da AV',
      texto: 'O Comercial indica o responsável de cada área. Quem é designado recebe uma notificação.',
    },
    !!r.avNaProposta && {
      rota: av(r.avNaProposta),
      alvo: 'finalizar-av',
      titulo: 'Finalizar a AV',
      texto:
        'Com a proposta enviada, o Comercial finaliza a AV: nasce a Pré-SD com o mesmo número e a AV vai para "SD Aberta".',
    },
    !!r.sdComComercial && {
      rota: sd(r.sdComComercial),
      alvo: 'sd-comercial',
      titulo: 'SD: oficialização do cliente',
      texto:
        'O Comercial informa a data de envio da cotação e o nº do PO e anexa a evidência do cliente (e-mail do Outlook, PDF…). Só então a SD pode ser aberta para a Engenharia.',
    },
    !!r.sdAguardandoAceite && {
      rota: sd(r.sdAguardandoAceite),
      alvo: 'sd-parecer',
      titulo: 'Parecer da Engenharia',
      texto:
        'O Gerente de Engenharia ou um Gestor de Programa registra o parecer. É obrigatório para devolver ao Comercial (ex.: o anexo não é o PO) e opcional no aceite.',
      digitar: {
        seletor: 'textarea',
        texto: 'PO conferido: pedido assinado pelo cliente, de acordo com o escopo e o preço cotados.',
      },
    },
    !!r.sdAguardandoAceite && {
      rota: sd(r.sdAguardandoAceite),
      alvo: 'sd-aceite',
      titulo: 'Aceite e projeto',
      texto:
        'O aceite fecha a SD, cria o projeto PRO com o mesmo número e conclui a AV. O Comercial e a equipe recebem o aviso. "Devolver" manda a SD de volta ao Comercial com o parecer.',
    },
    !!r.projeto && {
      rota: `/cronograma/?id=${r.projeto}`,
      alvo: 'tabela-tarefas',
      titulo: 'Gestão de Projetos',
      texto:
        'O projeto nasce do aceite. Fases, tarefas, responsáveis, % concluído e predecessoras. Para inserir uma tarefa no meio, passe o mouse na borda esquerda entre as linhas e clique no ⊕.',
    },
    !!r.projeto && {
      rota: `/cronograma/?id=${r.projeto}`,
      alvo: 'gantt',
      titulo: 'Gantt e prazos',
      texto:
        'Barras das tarefas, dependências e caminho crítico. Tarefas vencendo ou atrasadas avisam o responsável; ao atrasar uma tarefa, o app oferece deslocar as sucessoras.',
    },
    {
      rota: '/usuarios/',
      alvo: 'perfis-fluxo',
      titulo: 'Quem faz o quê',
      texto:
        'Competências por área e papéis de aceite da SD. A equipe entra pela primeira vez sem senha: informa o usuário, cadastra o e-mail e cria a própria senha.',
    },
    {
      rota: '/tutoriais/',
      alvo: 'tutoriais',
      titulo: 'Tutoriais',
      texto: 'O passo a passo de cada módulo para a equipe consultar no dia a dia.',
    },
    {
      rota: '/',
      alvo: null,
      titulo: 'Fim do roteiro',
      texto:
        'Você pode navegar livremente pelos dados fictícios. Para voltar aos dados reais, use "Sair da apresentação" na barra superior.',
    },
  ];
  return passos.filter((passo): passo is PassoDoRoteiro => !!passo);
}
