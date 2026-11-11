# Patch Notes — Gestão de Novos Desenvolvimentos (AV-SD-PRO)

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
