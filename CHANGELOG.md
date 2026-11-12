# Patch Notes — Gestão de Novos Desenvolvimentos (AV-SD-PRO)

## 0.4.0 — 12/11/2026

### Novidades
- **Prazo das áreas na AV:** Eng. Produto, Eng. Processo, PCP e Mapa de Custo têm, cada uma, um prazo em
  **dias úteis** para preencher a sua aba (padrão: 3), contado a partir do dia em que a etapa chega à área.
  Sábado e domingo não contam; feriados ainda não entram na conta.
  - O aviso "chegou à sua área" passa a trazer a data-limite.
  - O responsável da área recebe um aviso na véspera útil (ou no próprio dia) e outro quando o prazo vence,
    uma vez cada.
  - **Painel das AVs:** faixa "Prazos das áreas" com No prazo, Vencendo e Atrasadas. Cada número abre o
    relatório já filtrado.
  - **Relatório das AVs:** colunas "Prazo da área" e "Situação" (atrasada há N dias úteis), filtros por prazo e
    por área e o quadro "Entregas no prazo por área (90 dias)". O indicador que comparava com o prazo do
    cliente passa a se chamar "Prazo do cliente vencido".
  - **Configurações (administrador):** dias úteis de cada área, de 1 a 30. A mudança vale para as próximas
    etapas liberadas; prazos em curso não mudam.
  - AVs que já estavam em andamento recebem o prazo a partir da data em que a etapa atual foi liberada. O
    histórico (H-AV) fica de fora.
- **Lead time na SD:** o Comercial informa o **prazo acordado com o cliente, em dias corridos** (obrigatório
  para abrir a SD) e uma observação do prazo (marcos do cliente, por exemplo).
- **Confirmação do aceite da SD:** o aceite abre o modal "Confirmar aceite da SD" com as especificações do
  produto (cliente, código, programa, volume, complexidade, linha, família, PO), o prazo acordado e o período
  do projeto. O término do PRO vem calculado como **início + lead time**. Se a Engenharia mudar o término, a
  justificativa é obrigatória (mínimo de 10 caracteres) e fica registrada na SD. SDs abertas antes desta
  versão, sem lead time, continuam com o padrão de 180 dias.

### Técnico
- Migrações:
  - 0044: `lead_time_dias`, `lead_time_observacao` e `prazo_justificativa` em `sd`;
  - 0045: `av_prazo_config` (dias úteis por área) e `av_prazos_area` (prazo de cada etapa, com entrega).
- `HistoricoComPrazos`: decorador do histórico de etapas; toda mudança de etapa (avançar, finalizar,
  declinar, concluir) entrega o prazo da etapa que sai e abre o da etapa que chega, na mesma transação.
- Rotina horária ganha `avs.rotinas.verificarPrazosDasAreas()` (preenchimento retroativo + avisos
  `av.area_vencendo` e `av.area_atrasada`, com deduplicação por chave).
- O servidor confere a regra do término no aceite (`exigirJustificativaDoPrazo`), não só a tela.
- Canais IPC novos: `avs:obter-prazos-config` (leitura), `avs:salvar-prazos-config` (administração) e
  `avs:entregas-no-prazo` (leitura).
- Calendário do núcleo (`calendario.ts`): dias corridos, dias úteis e dia local.

## 0.3.0 — 11/11/2026

### Novidades
- **Agente no Chat com IA (Projetos):** além de responder, a IA propõe alterações nos cronogramas:
  - dar baixa em atividades;
  - atualizar o percentual;
  - ajustar datas;
  - criar atividades encaixadas na fase e na posição certas;
  - arrumar a sequência cronológica de uma fase.

  A proposta aparece como um cartão no chat, com o que muda (antes → depois). **Nada é gravado até a pessoa
  clicar em "Aplicar"**. Tudo entra numa transação só, com as mesmas regras da tela. Se alguém alterou a
  tarefa depois da proposta, nada é aplicado e o cartão mostra o motivo. Só quem pode editar tarefas recebe
  o agente e o "Aplicar"; quem só consulta continua com o chat de perguntas.
- **Ponto de corte do uso multiusuário:**
  - o que foi criado antes de 11/11/2026 às 14h (5 projetos sem código e as AVs 26-028 a 26-033) virou
    **histórico**, com prefixo `H-` (ex.: H-AV 26-028);
  - o histórico fica em abas próprias ("Histórico" em AVs e em Projetos) e sai dos contadores, mas continua
    editável e segue no chat com IA, nas análises, nos relatórios e nos avisos de prazo;
  - a numeração do uso real recomeça em **AV 26-001 → SD 26-001 → PRO 26-001**.
- **Menu Notificações:** no fim do menu lateral, com bolinha vermelha de não lidas e filtro "Não lidas". O
  sino da barra superior passa a só sinalizar (ponto vermelho) e leva ao menu.
- **Tema claro por padrão.** O tema agora é guardado em cada computador, e não mais no banco compartilhado.
  Antes, quem escolhia o escuro mudava o tema de todos.

### Técnico
- Migrações:
  - 0042: coluna `historico` em `av`, `sd` e `cronogramas`; índice único de (ano, sequencial) só fora do
    histórico;
  - 0043: tabela `ia_propostas` e coluna `proposta_id` nas falas do chat.
- Agente:
  - laço de ferramentas na API da Anthropic (`ver_cronograma` e `propor_alteracoes`), com no máximo 8
    rodadas e fallback por recusa;
  - entradas validadas com zod, na infraestrutura;
  - lote aplicado em `tarefas.comandos.aplicarAlteracoes`.
- Canais IPC `ia:aplicar-proposta` (permissão `tarefas`) e `ia:descartar-proposta`.

## 0.2.2 — 11/11/2026

### Novidades
- **Modo Apresentação para todos os usuários:** serve de tutorial prático. Fica no painel inicial e no topo de
  **Tutoriais** ("Fazer o tour guiado"). Abre só os dados fictícios, numa pasta local; os dados reais não são
  abertos nem alterados. Ao sair, o app reinicia e pede o login de novo.
- **Atualização do sistema (administrador, painel inicial):**
  - "Pedir fechamento para atualizar", com prazo de 2, 5, 10 ou 15 minutos e mensagem opcional;
  - em todos os apps abertos (inclusive na tela de login e no modo apresentação) aparece um aviso na frente
    da tela, com contagem regressiva, "Fechar agora" e "Salvar meu trabalho primeiro" (minimiza; no último
    minuto o aviso volta para a frente);
  - no fim do prazo o app fecha sozinho e, por até 30 minutos, não abre; a versão nova libera ao ser aberta;
  - lista "Apps abertos agora", com usuário (ou "Tela de login"), computador, usuário do Windows, versão e
    modo, para saber quem ainda trava o executável.

### Técnico
- Quadro da atualização em arquivos na pasta de produção (`controle-de-atualizacao/`: `aviso.json` e um
  arquivo por app aberto), fora do banco, para valer também no modo apresentação.
- `npm run publicar` (`scripts/publicar-producao.ps1`):
  - recusa se houver apps abertos;
  - move o executável em uso para `Versões anteriores` (só a última versão anterior fica guardada);
  - copia o novo com o nome fixo e confere o hash.

## 0.2.1 — 11/11/2026

### Novidades
- **Chat com IA reconhece quem está perguntando:** a IA recebe o nome, o departamento, o perfil, os papéis
  (Gerente de Engenharia, Gestor de Programa, competências) e o recurso vinculado do usuário logado. Assim,
  perguntas como "quais são as minhas tarefas?" ou "que AVs estão comigo?" passam a ser respondidas.
- **Histórico de conversas do chat:** barra à esquerda com "Nova conversa" e as conversas anteriores do
  usuário, separadas por escopo (Projetos e AVs). Dá para retomar ou excluir uma conversa. Cada pessoa só vê
  as próprias conversas; as que ficam 90 dias sem uso são apagadas automaticamente.

### Técnico
- Migração 0041 (`ia_conversas` e `ia_conversa_mensagens`), aplicada sozinha na primeira abertura, com backup
  antes.
- Novos canais IPC `ia:listar-conversas`, `ia:obter-conversa` e `ia:excluir-conversa`. A posse da conversa é
  conferida no servidor.
- **Atenção (privacidade):** nome, departamento e papéis do usuário passam a ser enviados à Anthropic junto com a
  pergunta. Os nomes dos responsáveis já eram enviados nos dados.

## 0.2.0 — 12/11/2026

### Novidades
- **Novo nome:** Gestão de Novos Desenvolvimentos (AV-SD-PRO). Módulos: Gestão AVs, Gestão SDs e Gestão de
  Projetos (antes "Cronogramas"). O executável passa a se chamar `GestaoNovosDesenvolvimentos-0.2.0-portatil.exe`.
- **Código único AV → SD → PRO** no formato `AA-SSS` (ex.: AV 26-001 → SD 26-001 → PRO 26-001). AVs e SDs
  existentes são renumeradas na primeira abertura; o número antigo fica no histórico da AV.
- **Formulário da SD** (passagem de bastão Comercial → Engenharia):
  - o responsável Comercial da AV informa a data de envio da cotação e o nº do PO, anexa a evidência de
    oficialização do cliente (e-mail .msg/.eml, PDF, Office ou imagem) e abre a SD;
  - no fim da página, o **aceite** é dado só pelo Gerente de Engenharia ou por um Gestor de Programa: fecha a
    SD, cria o projeto `PRO AA-SSS` e leva a AV para "Projeto Criado". A Engenharia também pode devolver a SD
    ao Comercial, com motivo.
- **Papéis e competências** na tela de Usuários (administrador): competências por área da AV, "só visualiza",
  Gerente de Engenharia e Gestor de Programa.
- **Liberação fracionada nas abas da AV:** o primeiro bloco incompleto fica em destaque, os completos ganham selo
  e os seguintes ficam esmaecidos até o anterior ser preenchido (continuam editáveis). Indicador
  "N de M blocos" no topo da aba.
- **Inserir linha no cronograma, estilo Word:** alça ⊕ na borda esquerda entre as linhas.
- **Checklist de entrada técnica (Eng. Produto) com N/A:** terceira opção por item, para registrar que foi visto
  mas não se aplica. O bloco mostra o que falta para ficar completo.
- **Ícone do app** (conceito "Fluxo": três marcos em ascensão, AV → SD → PRO).
- **Parecer da Engenharia na SD:** campo antes dos botões de aceite. É o motivo obrigatório para devolver ao
  Comercial (ex.: anexo não é de fato o PO) e uma observação opcional no aceite, que fica registrada na SD.
- **Notificações (sino na barra superior):** contador de não lidas, lista com as 50 mais recentes, "marcar todas
  como lidas" e aviso nativo do Windows quando chega algo novo com o app aberto. Eventos:
  - AV: designação como responsável de área, etapa liberada para a sua área, AV declinada, dados do grupo
    aplicados, AV concluída com projeto criado;
  - SD: Pré-SD criada (Comercial), SD aberta (Gerente de Engenharia e Gestores de Programa), SD aceita e SD
    devolvida (Comercial, com o parecer);
  - Sistema: novas permissões no fluxo AV/SD, falha no backup automático (administradores).
- **E-mail no cadastro de usuários** (opcional), base do futuro status report por e-mail.
- **Recursos vinculados a usuários:** no cadastro de Recursos, campo "Usuário do sistema" (um usuário por
  recurso). A lista mostra quem está vinculado.
- **Notificações de Projetos** (para o usuário vinculado ao responsável da tarefa): tarefa atribuída, tarefa
  liberada (todas as predecessoras concluídas), datas deslocadas por atraso de outra tarefa, tarefa vencendo em até
  2 dias e tarefa atrasada.
- **Aviso de prazo do cliente na AV:** a 5 dias do prazo (ou vencido), o responsável da etapa atual é avisado.
- Os avisos de prazo são verificados na abertura do app e a cada hora, e cada um sai uma única vez por prazo, mesmo
  com vários computadores abertos.

- **Equipe FERKODA cadastrada** com departamento (Comercial, Eng. Processo, Gestão de Projetos, Qualidade, PCP,
  Financeiro), competências e papéis de aceite. Todos (menos o erico) entram pela primeira vez **sem senha**:
  informam o usuário, cadastram o e-mail e criam a senha. Logins: primeiro nome ou nome.sobrenome
  (ex.: `leandro.cruz`, `andre.pinto`). O administrador pode "Exigir novo primeiro acesso" (esqueci a senha).
- **Menu Tutoriais** nos três módulos, com o passo a passo para a equipe.
- **Modo Apresentação** (administrador, botão no painel inicial): o app reinicia com dados fictícios numa pasta
  própria no computador local (`%TEMP%\gestao-novos-desenvolvimentos\apresentacao`), recriada a cada entrada, e abre um **roteiro guiado de 18 passos** com destaque
  na tela, navegação automática e preenchimento ao vivo do parecer da SD. Setas ← → avançam, Esc pausa.
  "Sair da apresentação" reinicia com os dados reais, que nunca são abertos nesse modo.

### Dados e multiusuário
- **Backup automático** do banco em `backups/` (ao lado do .db): antes de toda atualização de estrutura e uma vez
  por dia; mantém 7 dias, 4 semanas e as 3 últimas pré-atualização.
- **Gravação otimista:** se outra pessoa salvou a mesma aba depois que você a abriu, o app avisa e oferece
  "Recarregar", em vez de apagar o trabalho dela.
- **Banco ocupado:** espera até 5 s pelo outro PC antes de desistir, com mensagem clara.
- Operações que gravam em várias tabelas (avançar etapa, finalizar AV, aceite da SD, criar grupo, copiar
  estrutura, inserir/duplicar tarefa) passam a ser atômicas.

### Correções e segurança
- Links de evidência não abrem mais programas ou scripts (.exe, .bat, .ps1…) nem esquemas como `file:`.
- Canais de gravação das AVs exigem permissão de edição também no processo principal.
- Datas exibidas no fuso local (antes, após as 21h aparecia o dia seguinte).
- Abas da AV mostram "somente leitura" para quem não é o responsável da área.
- Projeto criado a partir de SD não pode ser excluído (use "Arquivado").
- Fim do aviso "ainda não implementado" na etapa SD Aberta.
- IA: somente Anthropic (Claude); chaves antigas do Google/OpenRouter são apagadas do banco.

### Removido
- Componentes sem uso (`SecaoNaoImplementada`, `BarraProgresso`) e duplicações de formatação de data.

### Pendências conhecidas (próximas versões)
- O banco continua em SQLite numa pasta de rede. Funciona com backup e gravação otimista, mas, se o uso
  simultâneo crescer, o caminho seguro é um servidor de banco (PostgreSQL ou API).
- Cálculos de custo ainda são feitos na tela e gravados como vieram; vão para o processo principal.
- Regra única de "tarefa atrasada" (hoje há três definições: tela, portfólio e IA).
- Cifra das chaves de IA com `safeStorage` do Windows; versões de dependências fixadas.
- Cancelamento de SD (status existe, sem fluxo na tela).
- Notificar também o gestor do projeto (o projeto ainda não tem campo de gestor).
- Status report automático por e-mail (notificações e próximas atividades): precisa de um serviço que rode sem o
  app aberto (tarefa agendada do Windows, Power Automate ou serviço dedicado) e de conta SMTP/Microsoft 365.
