// =====================================================================================================
// Conteúdo dos Tutoriais (para os usuários do dia a dia). Texto puro: a página só organiza e exibe.
// Ao mudar uma regra do app, atualize o tópico correspondente aqui.
// =====================================================================================================

export interface PassoDoTutorial {
  titulo: string;
  texto: string;
}

export interface TopicoDoTutorial {
  id: string;
  titulo: string;
  resumo: string;
  passos: PassoDoTutorial[];
  /** Rota da tela relacionada, para o botão "Ir para a tela". */
  rota?: string;
}

export const TOPICOS: TopicoDoTutorial[] = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros passos',
    resumo: 'Primeiro acesso, os três módulos e onde ficam os avisos.',
    rota: '/',
    passos: [
      {
        titulo: 'Primeiro acesso',
        texto:
          'Digite o seu usuário (ex.: luciana ou andre.pinto) e clique em Entrar sem senha. O app pede o seu e-mail e que você crie uma senha de no mínimo 8 caracteres. Depois disso, entre sempre com usuário e senha.',
      },
      {
        titulo: 'Os três módulos',
        texto:
          'Gestão AVs (análise de viabilidade), Gestão SDs (passagem do Comercial para a Engenharia) e Gestão de Projetos (cronogramas). O código acompanha o desenvolvimento: AV 26-001 vira SD 26-001 e depois PRO 26-001.',
      },
      {
        titulo: 'Notificações',
        texto:
          'O menu Notificações (no fim do menu lateral) mostra o que precisa de você: uma área da AV que chegou até você, uma SD aguardando aceite, uma tarefa atribuída ou atrasada. A bolinha vermelha conta as não lidas, e o sino no topo acende um ponto vermelho quando chega algo novo. Clique no aviso para ir direto à tela. Com o app aberto, o Windows também mostra o aviso.',
      },
      {
        titulo: 'Trocar de módulo',
        texto:
          'Nas listas de AVs, SDs e Projetos, a faixa AV | SD | PRO no topo leva direto ao outro módulo, sem voltar à tela inicial.',
      },
      {
        titulo: 'Reportar erro ou sugestão',
        texto:
          'Use "Erros e sugestões" no menu lateral. Descreva o que aconteceu (ou a sua ideia) e, se ajudar, anexe até 3 prints: tire com Win + Shift + S e cole com Ctrl + V. A tela em que você estava vai junto. Você recebe um aviso quando o reporte for resolvido.',
      },
      {
        titulo: 'Meu perfil',
        texto:
          'Clique na sua foto ou no seu nome, na barra de título. Ali você inclui a foto, preenche cargo, departamento, e-mail, ramal, celular e "sobre mim", e redefine a senha (pede a senha atual).',
      },
      {
        titulo: 'Esqueci a senha',
        texto:
          'Peça ao administrador para marcar "Exigir novo primeiro acesso" no seu cadastro. No próximo login você cria uma senha nova.',
      },
    ],
  },
  {
    id: 'avs',
    titulo: 'Gestão AVs',
    resumo: 'Como preencher a sua área e liberar a próxima etapa.',
    rota: '/avs/',
    passos: [
      {
        titulo: 'Quem cria a AV',
        texto:
          'O Comercial cria a AV e indica o responsável de cada área (Comercial, Eng. Produto, Eng. Processo, PCP e Mapa de Custo). Cada responsável recebe um aviso no sino.',
      },
      {
        titulo: 'Etapas em sequência',
        texto:
          'A AV passa por Comercial → Eng. Produto → Eng. Processo → PCP → Mapa de Custo → Proposta → SD. Só o responsável da área da etapa atual libera a próxima, pelo botão "Salvar e Liberar Próximo".',
      },
      {
        titulo: 'Blocos da aba',
        texto:
          'Cada aba é dividida em blocos. O bloco em destaque ("Preencha agora") é o próximo a completar; os já preenchidos ganham o selo "Bloco completo" e os seguintes ficam esmaecidos até lá, mas continuam editáveis. O topo da aba mostra quantos blocos já foram preenchidos.',
      },
      {
        titulo: 'Pasta da AV',
        texto:
          'Toda AV nova ganha uma pasta no Windows ("AV 26-036 - Cliente - Descrição") para as entradas do Comercial: e-mails, desenhos e orçamentos. No cabeçalho da AV, "Arquivos da AV" mostra o que há na pasta; clique num item para abrir. AVs antigas mostram "Criar pasta da AV".',
      },
      {
        titulo: 'Desenho do item',
        texto:
          'Na aba Comercial, o bloco "Desenho do item" (logo após Identificação) recebe o desenho da cotação e é obrigatório. Os anexos da AV aceitam PDF, JPG, JPEG, TIFF, PNG e BMP de até 25 MB; o TIFF abre no visualizador do Windows.',
      },
      {
        titulo: 'Embalagem na estrutura',
        texto:
          'Na estrutura do produto (Eng. Produto), ao inserir uma embalagem, informe quantas peças cabem nela. A estrutura recebe a fração por peça: 50 peças por caixa = 0,02 caixa por peça (aparece como 1/50 na árvore).',
      },
      {
        titulo: 'Templates de operações',
        texto:
          'Na aba Eng. Processo, a barra de templates traz sequências prontas por família com "(referência)" no nome: bases forjadas, venturi e estamparia, tiradas das folhas de processo. Aplique o mais parecido com o item, apague as etapas que não se aplicam e ajuste máquina e peças por hora.',
      },
      {
        titulo: 'Carga de máquina (PCP)',
        texto:
          'Para cada operação, informe as peças por hora e a carga atual da máquina em peças por mês, na unidade da operação. A conversão diz quantas peças do produto saem de uma unidade (ex.: uma placa da fundição vira 8 peças → 8; use 1 quando for a própria peça). A carga futura vem do volume anual da aba Comercial ÷ 12 ÷ conversão, e o app mostra os turnos por dia de hoje → com o item (8 h por turno e 22 dias por mês, ajustáveis em Configurações).',
      },
      {
        titulo: 'PCP sem alterações',
        texto:
          'Na aba PCP, os blocos Layout da fábrica, Custos logísticos e Observações precisam de conteúdo ou da caixa "Sem alterações significativas", que só pode ser marcada com o bloco vazio.',
      },
      {
        titulo: 'Itens que não se aplicam',
        texto:
          'Em "Dados de Entrada Técnica" (Eng. Produto), marque N/A no item que foi visto mas não se aplica. Item marcado como Disponível pede o link ou a pasta da evidência.',
      },
      {
        titulo: 'Salvar e somente leitura',
        texto:
          'Salve antes de sair da aba. Se a aba não é sua, ela aparece como somente leitura. Se outra pessoa salvou a mesma aba depois que você abriu, o app avisa e oferece "Recarregar aba": copie o que digitou antes de recarregar.',
      },
      {
        titulo: 'Finalizar a AV',
        texto:
          'Depois do Mapa de Custo, o Comercial usa "Finalizar AV e criar Pré-SD" na aba Resumo. A AV vai para "SD Aberta" e a SD aparece em Gestão SDs.',
      },
    ],
  },
  {
    id: 'portfolio',
    titulo: 'AV de Portfólio',
    resumo: 'Checagem rápida de itens já desenvolvidos, a partir do cadastro de itens-modelo.',
    rota: '/portfolio/',
    passos: [
      {
        titulo: 'Itens de portfólio',
        texto:
          'Gestores e administradores cadastram os itens já desenvolvidos em "Itens de portfólio": código, descrição, desenho de referência (com a revisão), estrutura, operações com peças por hora e custos de referência por peça com a data da última atualização. Item desativado some da escolha de novas AVs.',
      },
      {
        titulo: 'Abrir a AV de portfólio',
        texto:
          'Em "AVs de portfólio", use "Nova AV de Portfólio", escolha o item e a equipe. A AV usa a mesma numeração da AV e já vem com código, descrição, linha, família e programa do item.',
      },
      {
        titulo: 'Checagem por área',
        texto:
          'A sequência é a da AV: Comercial (cliente, volume, prazo e desenho da cotação) → Eng. Produto (o desenho confere com o item?) → Eng. Processo (o processo atende?) → PCP (carga em peças e turnos: temos capacidade?) → Custo (os custos de referência valem ou precisam de atualização?). Cada área responde Confere, Com ressalvas ou Não confere; nos dois últimos, a observação é obrigatória.',
      },
      {
        titulo: 'Resumo e conclusão',
        texto:
          'O Resumo junta as conclusões, os turnos por operação e o custo por peça vigente para a cotação. Depois do Custo, o Comercial usa "Concluir AV de portfólio": não há SD, porque o item já existe.',
      },
    ],
  },
  {
    id: 'sds',
    titulo: 'Gestão SDs',
    resumo: 'Oficialização do cliente e aceite da Engenharia.',
    rota: '/sds/',
    passos: [
      {
        titulo: 'Comercial: oficialização',
        texto:
          'Abra a SD, informe a data de envio da cotação e o nº do PO e anexe a evidência do cliente: e-mail do Outlook (.msg), PDF ou documento. Clique em "Abrir SD e enviar à Engenharia".',
      },
      {
        titulo: 'Engenharia: parecer e aceite',
        texto:
          'O Gerente de Engenharia ou um Gestor de Programa lê a SD, escreve o parecer e escolhe: "Dar aceite e criar projeto" (informa o período previsto) ou "Devolver ao Comercial" (o parecer vira o motivo, por exemplo: o anexo não é o PO).',
      },
      {
        titulo: 'O que o aceite faz',
        texto:
          'Fecha a SD, cria o projeto PRO com o mesmo número em Gestão de Projetos e conclui a AV. O Comercial e a equipe da AV recebem o aviso.',
      },
    ],
  },
  {
    id: 'projetos',
    titulo: 'Gestão de Projetos',
    resumo: 'Fases, tarefas, Gantt e prazos.',
    rota: '/projetos/',
    passos: [
      {
        titulo: 'Estrutura do projeto',
        texto:
          'Organize o projeto em fases e tarefas. Cada tarefa tem responsável, início, término, % concluído e, se quiser, predecessoras (a tarefa só começa depois delas).',
      },
      {
        titulo: 'Inserir linha',
        texto:
          'Passe o mouse na borda esquerda entre duas linhas: aparece um ⊕ com uma linha azul. Clique para inserir uma tarefa ali, como no Word.',
      },
      {
        titulo: 'Atrasos',
        texto:
          'Ao adiar o término de uma tarefa, o app mostra as sucessoras e pergunta se deve deslocá-las pelos mesmos dias. Quem decide é você; os responsáveis afetados são avisados.',
      },
      {
        titulo: 'Avisos de prazo',
        texto:
          'Quem está vinculado a um Recurso recebe aviso quando a tarefa é atribuída, quando pode começar (predecessoras concluídas), quando vence em até 2 dias e quando atrasa.',
      },
      {
        titulo: 'Relatórios e PDF',
        texto: 'Use Relatórios para a agenda por responsável ou período e o botão de PDF no projeto para imprimir.',
      },
    ],
  },
  {
    id: 'duvidas',
    titulo: 'Dúvidas frequentes',
    resumo: 'Mensagens que podem aparecer e o que fazer.',
    passos: [
      {
        titulo: '"O banco está sendo usado por outro usuário"',
        texto: 'Alguém está salvando ao mesmo tempo. Aguarde alguns segundos e tente de novo.',
      },
      {
        titulo: '"Seu perfil não permite esta ação"',
        texto: 'A ação é de outra área ou de outro perfil. Fale com o responsável da área ou com o administrador.',
      },
      {
        titulo: 'Não recebo avisos das tarefas',
        texto: 'Peça para vincular o seu usuário ao seu nome em Recursos (Gestão de Projetos).',
      },
      {
        titulo: 'Os dados ficam seguros?',
        texto:
          'O app faz uma cópia de segurança do banco todos os dias e antes de cada atualização. O acesso é por usuário e senha, e cada área só edita o que é dela.',
      },
    ],
  },
];
