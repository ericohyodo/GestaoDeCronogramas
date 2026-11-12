# Plano: autocompletar e outras funções de IA

**Data:** 12/11/2026 · **Versão do app hoje:** 0.3.0 · **Status:** proposta, aguardando aprovação

## 1. O que você definiu

| Tema | Decisão |
|---|---|
| Funções | Gerar cronograma do PRO, completar seções da AV, recursos pela equipe da AV, alertas e assistente, nesta ordem |
| Custo | Até **US$ 50/mês** |
| Acesso na AV | Quem pode editar a área usa o autocompletar |
| Acesso nos projetos | **Gestores e gerentes** geram e alteram o cronograma. **Usuários** só acompanham e dão baixa, mas podem usar a IA para dar baixa e para gerar ou ver relatórios |
| Dados | Pode enviar tudo à API (com uma ressalva de LGPD, na seção 7) |

## 2. Princípios que valem para todas as fases

1. **A IA só sugere, quem decide é a pessoa.** Nada é gravado sem alguém clicar em "Aceitar" ou "Aplicar". Para isso reaproveitamos o fluxo que já existe de propostas (`ia_propostas`, `CartaoDaProposta.tsx`, `AplicarAlteracoesEmLote`).
2. **O que dá para resolver com uma regra fixa não usa IA.** Mapear área → pessoa → recurso, calcular datas a partir das durações e detectar atrasos são cálculos determinísticos. A IA entra onde há julgamento: quais tarefas, quais riscos, quais operações.
3. **A IA nunca sobrescreve um campo já preenchido.** As sugestões só ocupam campos e linhas vazios.
4. **Cada sugestão mostra de onde veio**, por exemplo "baseado na AV 26-012 (mesmo cliente e família)". Isso aumenta a confiança de quem aceita e facilita revisar.
5. **O servidor confere a permissão de toda operação.** O que a IA propõe passa pelas mesmas regras da tela e pelos mesmos casos de uso.

## 3. Correção necessária antes de tudo: permissões do agente

Hoje o perfil `usuario` tem a permissão `tarefas` (`electron/modulos/usuarios/dominio/perfil.ts:21`). O agente do Chat com IA libera **todas** as operações para quem tem `tarefas` (`ConversarComIa`, `casos-de-uso.ts:306`), ou seja: **um usuário comum já consegue pedir à IA para criar tarefas e mudar datas.** Isso contraria a regra que você definiu.

**Ajuste proposto:**

| Perfil | Operações do agente |
|---|---|
| Gestor, administrador (permissão `planejamento`) | Todas: criar fase e tarefa, ajustar datas, ordenar, definir responsável, dar baixa |
| Usuário | Só `concluir_tarefa` e `atualizar_progresso`, **e só nas tarefas em que ele é o responsável** (por `responsaveis.usuario_id`) |

Esse filtro fica em dois lugares: na lista de ferramentas que o agente recebe e, de novo, no `AplicarProposta`. Também é preciso conferir se a própria tela do cronograma já impede o usuário de editar datas. Ainda não verifiquei isso.

**Decisão sua:** "gerentes" são o perfil `gestor` e o `administrador`, ou incluem os papéis especiais Gerente de Engenharia e Gestor de Programa? Proposta: `planejamento` **ou** um desses papéis.

## 4. Fases

### Fase 0: fundação (custo, limites e erros), cerca de 1 dia
Sem ela não dá para cumprir o teto de US$ 50.
- **Registro de uso:** migração nova `0044-ia-uso` com a tabela `ia_uso`. Cada chamada grava data, usuário, função, modelo, tokens (entrada, leitura e escrita de cache, saída) e custo estimado em US$. **O conteúdo das mensagens não é gravado.** Os dados vêm de `response.usage`, em `modelo-claude.ts`.
- **Teto mensal configurável** em Configurações da IA. Com 80% atingido, o administrador é avisado pelo sino. Com 100%, as funções de sugestão param e o chat de baixa continua funcionando.
- **Tela "Uso da IA"** para o administrador: gasto do mês por função e por usuário. Ela responde em parte a dúvida sobre créditos, mas o saldo pré-pago continua só no Console.
- **Erro de crédito esgotado** com mensagem própria em `traduzirErro`: "Créditos da API esgotados. Avise o T.I."
- **Ajuste de permissões do agente** descrito na seção 3.

### Fase 1: gerar cronograma do PRO, cerca de 4 a 5 dias
**Etapa 1a: recursos pela equipe da AV, sem IA e sem custo.** A fase depende disso, então vem primeiro.
- Migração: coluna `area` em `tarefas` (comercial, produto, processo, pcp, custo, gestao, qualidade). Ela fica opcional e herda a área da fase.
- Responsável padrão para `gestao` e `qualidade`, que não fazem parte da equipe da AV: escolhido no próprio PRO.
- Botão **"Preencher responsáveis pela equipe da AV"** no PRO. Ele gera uma proposta com uma operação nova, `definir_responsavel`, que a pessoa revisa e aplica.
- Regra: área da tarefa → membro da AV (`av.membro_*`) → recurso (`responsaveis.usuario_id`). Se a pessoa ainda não tem recurso, a proposta oferece criá-lo.

**Etapa 1b: geração com IA.**
- Caso de uso `GerarCronogramaComIa` no módulo de IA, liberado só para gestores e gerentes, num PRO que ainda não tem tarefas.
- **Contexto enviado:**
  - a AV de origem: escopo, operações, prazos de protótipo e de produção, investimentos, equipe;
  - os 3 PROs mais parecidos, escolhidos pelas AVs deles (mesmo cliente, família ou linha, e palavras em comum na descrição), com fases, tarefas e durações relativas;
  - o período do PRO.
- **Saída estruturada** (zod, pelo mesmo padrão de `gerar` com `betaZodOutputFormat`): fases → tarefas `{chave, titulo, inicioRelativo, duracaoDias, area, predecessoras[]}`.
- **Pós-processamento determinístico:** calcula as datas a partir do início do PRO, atribui responsáveis pela etapa 1a e valida o resultado (sem ciclos de dependência, tudo dentro do período).
- **Operações novas no lote:**
  - `criar_fase {chave, nome}`;
  - `criar_tarefa` passa a aceitar `faseChave`, `chave`, `area` e `predecessoras`.

  `AplicarAlteracoesEmLote` precisa resolver essas chaves temporárias numa única transação.
- **Tela:** a proposta abre como uma prévia em tabela (fase, tarefa, responsável, início, fim), com Aplicar e Descartar. Para cronogramas grandes, o cartão atual fica pequeno.
- Modelo: **Opus 5.5** com `effort: high`, porque é a tarefa que mais exige raciocínio e a menos frequente.

### Fase 2: completar seções da AV, cerca de 3 dias
- Um botão **"Sugerir com IA"** por seção:
  - Produto: riscos, premissas, recursos, restrições, escopo, estrutura, investimentos;
  - Processo: operações e investimentos;
  - PCP: cargas a partir das operações;
  - Custo: materiais e processos.
- **Contexto enviado:**
  - a própria AV;
  - as 3 AVs anteriores mais parecidas que já passaram daquela etapa;
  - os catálogos que já existem (`ObterCatalogoCusto`: máquinas, operações, materiais e taxas já usadas).
- **Como aparece na tela:**
  - **campos de texto:** a sugestão aparece em cinza dentro do campo vazio; Tab aceita e Esc descarta (componente novo `CampoComSugestao` em `renderer/compartilhado/ui`);
  - **tabelas:** linhas sugeridas com borda tracejada, com botões aceitar e descartar por linha e "aceitar todas";
  - em todos os casos, o selo de origem ("baseado na AV 26-012").
- **Permissão:** `exigirEdicaoDaArea`, a mesma da tela. Quem pode editar a área pode pedir sugestão.
- Modelo: **Haiku 5.5**, rápido e cerca de 40 vezes mais barato que o Opus. Chamada só **pelo botão**, para controlar o custo. Sugestão automática ao entrar no campo fica como evolução, se o custo medido permitir.

### Fase 3: alertas, assistente e IA para usuários, cerca de 3 dias
- **Baixa por conversa** para usuários. Exemplo: "terminei o DFMEA hoje, evidência na pasta X". O agente restrito da seção 3 gera a proposta de `concluir_tarefa`, e o usuário confirma.
- **Relatórios para todos:** status do projeto, minhas tarefas, AVs por etapa. É só leitura, então qualquer usuário logado pode usar.
- **Resumo semanal para gestores:**
  - os sinais são calculados em código: tarefas atrasadas, caminho crítico em risco, AVs paradas há mais de X dias, carga de máquina acima de 85% no PCP;
  - a IA só escreve o resumo e as recomendações, num aviso pelo sino na segunda-feira;
  - é barato porque a IA recebe números prontos, não o banco inteiro.
- Modelos:
  - **Haiku 5.5** para a baixa e o resumo;
  - **Opus 5.5** com cache para relatórios analíticos sob demanda.

## 5. Custo estimado (preços da tabela oficial: Opus 5.5 a US$ 4/20 por milhão de tokens, Haiku 5.5 a US$ 0,10/0,50)

| Função | Modelo | Custo por uso (estimado) | Volume/mês (suposição) | US$/mês |
|---|---|---|---|---|
| Gerar cronograma | Opus 5.5 | ~US$ 0,36 (40 mil tokens de entrada, 10 mil de saída) | 15 | ~5,40 |
| Completar seção da AV | Haiku 5.5 | ~US$ 0,003 | 1.500 | ~4,50 |
| Baixa por conversa | Haiku 5.5 | ~US$ 0,002 | 2.000 | ~4,00 |
| Resumo semanal | Haiku 5.5 | ~US$ 0,01 | 20 | ~0,20 |
| Relatórios e chat analítico | Opus 5.5 + cache | US$ 0,05 a 0,40 por pergunta | 60 | ~6 a 24 |
| **Total** | | | | **~US$ 20 a 40** |

**Maior risco para o teto:** o chat analítico atual, que envia até cerca de 100 mil tokens de contexto por pergunta. Sem cache, isso dá cerca de US$ 0,40 por pergunta. Para controlar: cache (já usado no system), contexto menor no chat do usuário (só as tarefas dele) e o teto da Fase 0. Os volumes são suposições: o registro da Fase 0 vai mostrar os números reais depois de um mês de piloto.

## 6. Arquivos principais

| Área | Arquivos |
|---|---|
| IA (processo principal) | `electron/modulos/ia/aplicacao/` (casos de uso novos, `agente-de-cronogramas.ts`, `instrucoes.ts`), `infraestrutura/modelo-claude.ts` (registro de uso, Haiku), `infraestrutura/esquemas-do-agente.ts` |
| Lote do cronograma | `contratos/tarefas.contrato.ts` (operações novas), `electron/modulos/tarefas/aplicacao/casos-de-uso/aplicar-alteracoes-em-lote.ts` |
| AVs parecidas e catálogos | `electron/modulos/avs/` (consulta nova de AVs parecidas), `obter-catalogo-custo.ts` |
| Permissões | `electron/modulos/usuarios/dominio/perfil.ts`, `electron/raiz-de-composicao.ts` (ligação de `permissoes` da IA) |
| Tela | `renderer/compartilhado/ui/` (`CampoComSugestao`), abas da AV, `CartaoDaProposta.tsx` / prévia de cronograma, tela "Uso da IA" |
| Banco | Migrações novas `0044-ia-uso` e `0045-tarefas-area`. Nenhuma migração existente é alterada. |

## 7. Segurança e riscos

- **Injeção de instruções:** os textos das AVs, escritos por usuários, entram no prompt. A mitigação é a IA só propor, o servidor validar cada operação pelo perfil e a saída ser validada por esquema zod com limites de tamanho.
- **LGPD (minimização):** você liberou enviar tudo, mas os **contatos de clientes** (nome, e-mail, telefone) não ajudam em nenhuma sugestão. Recomendo deixá-los fora do contexto. Não custa nada e reduz exposição de dados pessoais.
- **Chave da API:** continua cifrada no banco e pode ser recuperada por quem tiver o exe e o `.db`; isso já é assim hoje. O registro de uso não guarda conteúdo.
- **Qualidade:** as sugestões podem errar, e por isso nada é aplicado automaticamente. Proposta: medir a taxa de aceite por função no `ia_uso` e ajustar os prompts com dados reais.
- **Não verificado:** suporte a saída estruturada no Haiku 5.5 com o SDK atual (`@anthropic-ai/sdk ^0.128.0`). É a primeira coisa a confirmar na Fase 0. No Haiku não há fallback automático para recusas, então essas recusas precisam de mensagem própria.

## 8. Testes por fase
- Testes de unidade dos casos de uso com o `ModeloDeAnalise` falso (a porta já existe em `aplicacao/portas.ts`), sem chamar a API.
- Testes de integração das operações novas do lote: chaves temporárias, dependências, atomicidade e recusa por perfil.
- Teste de permissão: usuário comum não consegue criar tarefa pelo agente nem dar baixa em tarefa de outra pessoa.
- Teste manual no modo Apresentação, porque a vitrine já tem AV, SD e PRO prontos para demonstrar cada função.

## 9. Versões (patch notes)
- **0.4.0:** Fase 0 e Fase 1
- **0.5.0:** Fase 2
- **0.6.0:** Fase 3

## 10. Decisões que preciso de você
1. Quem conta como **"gerente"** (seção 3).
2. Se aceita o **Haiku 5.5** para a baixa por conversa e para as sugestões da AV, que é o que mantém o custo abaixo de US$ 50.
3. Se aceita **deixar os contatos de clientes fora** do contexto da IA.
4. Se começamos pela **Fase 0 e etapa 1a**, que são as que corrigem a permissão atual do agente.
