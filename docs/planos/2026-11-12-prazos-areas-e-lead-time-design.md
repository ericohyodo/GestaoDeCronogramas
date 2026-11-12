# Prazos das áreas na AV, lead time na SD e confirmação do aceite — especificação

- **Data:** 12/11/2026
- **Versão alvo:** 0.4.0. As funções de IA de `plano-funcoes-ia.md` ficam para depois.
- **Status:** desenho aprovado. Esta especificação ainda aguarda revisão.

## 1. Objetivo

1. **Prazo por área na AV.** Cada área (Produto, Processo, PCP e Custo) tem um prazo, em dias úteis, para preencher a sua aba. O padrão é 3 dias.
   - O responsável é avisado do prazo.
   - Os gestores acompanham o prazo no painel e no relatório das AVs.
2. **Lead time na SD.** Ao abrir a SD, o Comercial informa o prazo acordado com o cliente, em dias, e uma observação opcional.
3. **Confirmação do aceite.** No aceite, a Engenharia confirma, num modal, as especificações e o prazo.
   - O PRO nasce com término = início + lead time.
   - Mudar o término exige justificativa.

**Critérios de sucesso:**
- Toda AV que entra em Produto, Processo, PCP ou Custo recebe uma data-limite visível.
- O responsável recebe "Vence amanhã" e "Atrasada" uma única vez por etapa.
- O painel mostra quantas áreas estão no prazo, vencendo ou atrasadas.
- Não é possível abrir uma SD sem lead time.
- O PRO criado no aceite tem o término calculado, ou um término diferente acompanhado da justificativa gravada.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Início da contagem | Quando a etapa chega à área (liberação sequencial, como hoje) |
| Tipo de dia (prazo das áreas) | Dias úteis. Sábado e domingo não contam; feriados ficam para uma versão futura |
| Prazo padrão | 3 dias úteis por área, configurável pelo administrador |
| Exibição | Notificações ao responsável, painel e relatório das AVs. **Sem** escalonamento ao gestor e **sem** selo na aba nesta versão |
| Tipo de dia (lead time) | Dias corridos (é como o cliente informa) |
| Início do PRO | Data do aceite da Engenharia (editável no modal) |
| Término do PRO | Calculado como início + lead time. Pode ser editado com justificativa obrigatória |
| Áreas fora do escopo | O Comercial (etapa 1) e as etapas 6 e 7 não têm prazo de área |

## 3. Parte A — Prazos das áreas na AV

### 3.1 Dados

**Migração `0045-prazos-das-areas`** (nova; nenhuma migração existente é alterada):

```sql
CREATE TABLE av_prazo_config (
  area        TEXT PRIMARY KEY CHECK (area IN ('produto','processo','pcp','custo')),
  dias_uteis  INTEGER NOT NULL CHECK (dias_uteis BETWEEN 1 AND 30),
  atualizado_em  TEXT NOT NULL,
  atualizado_por TEXT REFERENCES usuarios(id)
);
-- valores iniciais: 3 para cada área

CREATE TABLE av_prazos_area (
  id            TEXT PRIMARY KEY,
  av_id         TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
  etapa         INTEGER NOT NULL,             -- 2..5
  area          TEXT NOT NULL,                -- produto|processo|pcp|custo
  dias_uteis    INTEGER NOT NULL,             -- valor copiado da config na criação
  iniciada_em   TEXT NOT NULL,                -- instante ISO da liberação
  data_limite   TEXT NOT NULL,                -- AAAA-MM-DD (vence no fim desse dia)
  entregue_em   TEXT,                         -- instante ISO em que a etapa saiu
  UNIQUE (av_id, etapa)
);
CREATE INDEX idx_av_prazos_area_abertos ON av_prazos_area (entregue_em, data_limite);
```

O prazo fica **gravado** em vez de ser calculado a cada consulta. Assim:
- mudar a configuração não altera prazos já em curso;
- as linhas de "renumeração" da migração 0031 em `etapa_historico` não distorcem as datas;
- o relatório consegue medir as entregas no prazo.

### 3.2 Domínio

- **`dias-uteis.ts`** (no núcleo ou no domínio de AVs), função pura `somarDiasUteis(dataIso, n): string`:
  - conta a partir do dia seguinte e pula sábado e domingo;
  - devolve `AAAA-MM-DD`;
  - exemplo: liberada na sexta com 3 dias úteis vence na quarta.
- **`diasUteisEntre(a, b): number`**, para "atrasada há N dias úteis".
- **`situacaoDoPrazo(prazo, hoje)`** retorna `'no_prazo' | 'vencendo' | 'atrasada' | 'entregue_no_prazo' | 'entregue_com_atraso'`.
  - `vencendo` significa que hoje é o dia-limite ou o dia útil anterior a ele.
- **Interface** `RepositorioPrazosArea` com: `abrir`, `entregar(avId, etapa, instante)`, `listarAbertos`, `listarPorAv`, `listarEntreguesDesde`.
- **Implementação** SQLite em `infraestrutura/repositorio-prazos-area-sqlite.ts`.

### 3.3 Fluxo

- **`AvancarEtapa`** (mesma transação de hoje):
  - ao sair de uma etapa de 2 a 5, chama `entregar`;
  - ao entrar numa etapa de 2 a 5, lê a configuração da área e chama `abrir` com a data-limite calculada.
- **`FinalizarECriarPreSd`**: se a AV sair da etapa 5 direto para a 7, também chama `entregar` na 5.
- **`DeclinarAv`**: encerra o prazo aberto (`entregue_em` = instante do declínio). A AV declinada não aparece como atrasada.
- **Aviso de etapa liberada:** a mensagem de `av.etapa_liberada` ganha "Prazo: dd/mm (N dias úteis)".
- **Preenchimento retroativo**, no caso de uso `GarantirPrazosDasAreas`, executado no início da rotina horária:
  - é idempotente por `UNIQUE (av_id, etapa)`;
  - alcança as AVs fora do histórico (`historico = 0`), não terminais, nas etapas 2 a 5 e sem prazo aberto;
  - `iniciada_em` = a `data` da linha mais recente de `etapa_historico` com `etapa_para = etapa_atual` e `etapa_de <> etapa_para`. Sem essa linha, usa `av.criado_em`.

### 3.4 Notificações

Rodam na rotina horária que já existe (`raiz-de-composicao.ts`), pelo novo caso de uso `VerificarPrazosDasAreas`:

| Tipo | Quando | Para quem | Chave (dedupe) |
|---|---|---|---|
| `av.area_vencendo` | Situação `vencendo` | Membro da área (`av.membro_<area>`) | `avId:etapa:vencendo` |
| `av.area_atrasada` | Primeiro dia após `data_limite` sem entrega | Membro da área | `avId:etapa:atrasada` |

- O link aponta para a AV, na aba da área.
- **Texto:**
  - vencendo: "AV 26-012 · Eng. Produto vence amanhã (dd/mm)";
  - atrasada: "AV 26-012 · Eng. Produto em atraso desde dd/mm".
- **Sem repetição diária:** o atraso continua visível no painel.
- **Observação:** a rotina roda em todos os PCs; a chave impede avisos duplicados (comportamento atual de `NotificadorInterno`).

### 3.5 Painel e relatório

- **Painel das AVs** (`DashboardAvPanel`):
  - nova faixa "Prazos das áreas" com três números: **No prazo**, **Vencendo** e **Atrasadas**;
  - clicar num número filtra a lista por essa situação;
  - nova consulta `avs:obter-prazos-das-areas` (permissão `leitura`), que exclui o histórico.
- **Relatório das AVs** (`PaginaRelatoriosAvs` / `obter-relatorio-avs.ts`):
  - colunas novas **Prazo da área** (dd/mm) e **Situação** (No prazo / Vencendo / Atrasada há N dias úteis);
  - filtro por área;
  - quadro **Entregas no prazo por área nos últimos 90 dias**: quantidade, % no prazo e média de dias úteis gastos;
  - o indicador "Atrasadas" existente, que compara com `prazo_cliente`, passa a se chamar **"Prazo do cliente vencido"**;
  - o DTO do relatório ganha `prazoArea` e `situacaoPrazoArea`, que também ficam disponíveis para o chat com IA.

### 3.6 Configuração

- Em `/configuracoes` (somente administradores), nova seção **"Prazos das áreas da AV"** com quatro campos numéricos (1 a 30 dias úteis).
- **Canais:** `avs:obter-prazos-config` (`leitura`) e `avs:salvar-prazos-config` (`administracao`), com validação zod no IPC e checagem do perfil no caso de uso.

## 4. Parte B — Lead time na SD

### 4.1 Dados

**Migração `0044-sd-lead-time`:**

```sql
ALTER TABLE sd ADD COLUMN lead_time_dias        INTEGER;   -- dias corridos acordados com o cliente
ALTER TABLE sd ADD COLUMN lead_time_observacao  TEXT;      -- até 500 caracteres
ALTER TABLE sd ADD COLUMN prazo_justificativa   TEXT;      -- preenchida quando o término do PRO difere do calculado
```

### 4.2 Domínio e fluxo

- **`atualizarFormulario`** (`sd.ts`) aceita `leadTimeDias`, um inteiro de 1 a 1825, e `leadTimeObservacao`, com até 500 caracteres.
- **`abrirSd`** passa a exigir `leadTimeDias`. Erro: "Informe o prazo acordado com o cliente (em dias)."
- **Tela** (`DetalheSd.tsx`, bloco "Comercial — oficialização do cliente"):
  - campo numérico **"Prazo acordado com o cliente (dias corridos)"**;
  - área de texto **"Observação do prazo"**, por exemplo "SOP em mar/27; PPAP até jan/27";
  - ambos editáveis apenas no status `pre_sd`, como os demais campos;
  - depois da abertura, aparecem só para leitura.
- **Devolução:** quando a Engenharia devolve a SD ao Comercial, o lead time é mantido e continua editável.

## 5. Parte C — Modal "Confirmar aceite da SD"

### 5.1 Tela

O botão "Dar aceite e criar projeto" abre o modal **"Confirmar aceite da SD"** (largura `lg`), com três blocos:

1. **Especificações** (só leitura):
   - cliente, código e descrição do produto;
   - programa, volume anual e complexidade;
   - linha e família;
   - número do PO e data da cotação;
   - link "Abrir AV".
2. **Prazo acordado:**
   - "N dias corridos";
   - a observação do Comercial;
   - aviso âmbar se a SD não tiver lead time (SD aberta antes da versão 0.4.0): "Lead time não informado; usando 180 dias."
3. **Projeto:**
   - **Início previsto**: hoje, editável;
   - **Término previsto**: início + lead time, recalculado quando o início muda enquanto o término não foi editado à mão;
   - se o término for diferente do calculado, aparece **"Justificativa da alteração do prazo"**, obrigatória com no mínimo 10 caracteres, e a diferença ("+12 dias em relação ao acordado").

**Confirmação e após o aceite:**
- Caixa de seleção obrigatória: **"Confirmo as especificações e o prazo acordado"**.
- Botão **"Confirmar aceite e criar PRO"**.
- O parecer continua na página, como hoje.
- Depois do aceite, o bloco da SD fechada mostra o lead time, a observação e, se houver, a justificativa.

### 5.2 Servidor

- **`AceitarSdEntrada`** ganha `justificativaPrazo?: string` (até 1000 caracteres).
- **`AceitarSd`**:
  1. calcula `fimEsperado = dataInicio + lead_time_dias` (dias corridos);
  2. se `lead_time_dias` existir e `dataFim ≠ fimEsperado`, exige a justificativa (erro de validação se faltar);
  3. grava `prazo_justificativa`.

  A checagem acontece no servidor, não só na tela.
- **Dados das especificações:** vêm da consulta da SD. Se o DTO ainda não tiver todos os campos, a consulta passa a incluir os campos da AV listados em 5.1, só para leitura.

## 6. Modo Apresentação

- A SD de vitrine e as SDs de exemplo recebem lead time (vitrine: 180 dias, com uma observação realista).
- As AVs de exemplo nas etapas 2 a 5 recebem prazos pelo preenchimento retroativo. Pelo menos uma deve ficar atrasada e outra vencendo, para o painel ter o que mostrar.

## 7. Segurança e erros

- **Validação:**
  - todo canal novo valida a entrada com zod;
  - os números são limitados (dias úteis de 1 a 30, lead time de 1 a 1825);
  - os textos têm tamanho máximo.
- **Permissões:**
  - salvar a configuração exige `administracao`;
  - o lead time só pode ser editado pelo Comercial da AV ou por um administrador (regra atual de `SalvarSd`);
  - o aceite segue exigindo `gerente_engenharia` ou `gestor_programa`.
- **Mensagens de erro:** em português, sem detalhes internos, passando por `traduzirErro`.
- **Dependências:** nenhuma nova.

## 8. Testes

- **Unidade:**
  - `somarDiasUteis`: sexta + 3 = quarta; sábado + 1 = segunda; virada de mês e de ano;
  - `diasUteisEntre`;
  - `situacaoDoPrazo` em todos os estados.
- **Integração (SQLite em memória):**
  - `AvancarEtapa` abre o prazo ao entrar em 2 e fecha ao sair; a configuração alterada não afeta um prazo aberto;
  - `FinalizarECriarPreSd` e `DeclinarAv` encerram o prazo;
  - `GarantirPrazosDasAreas` é idempotente e ignora o histórico e as AVs terminais;
  - `VerificarPrazosDasAreas` avisa uma única vez por tipo e etapa, e não avisa etapa já entregue;
  - `abrirSd` falha sem lead time;
  - `AceitarSd`: término calculado aceito sem justificativa, término diferente sem justificativa recusado, com justificativa gravado;
  - SD sem lead time aceita normalmente.
- **Manual (app em dev e modo Apresentação):** faixa do painel, filtros, colunas do relatório, modal do aceite e a configuração em `/configuracoes`.

## 9. Ordem de entrega

1. **Partes B e C** (cerca de 1,5 dia): migração 0044, domínio da SD, tela do Comercial, modal e servidor do aceite, vitrine.
2. **Parte A** (2 a 3 dias): migração 0045, dias úteis, prazos no avanço de etapa, rotinas, painel, relatório e configuração.
3. **Versão 0.4.0:** Patch Notes em `CHANGELOG.md` e publicação com o OK do Érico.

As migrações seguem a ordem de entrega (B e C primeiro). Com isso, as migrações 0044 e 0045 previstas em `plano-funcoes-ia.md` passam a ser 0046 e 0047.

## 10. Fora do escopo (versões futuras)

- Feriados no cálculo de dias úteis (calendário configurável).
- Escalonamento automático ao gestor e selo de prazo dentro da aba da AV.
- Prazo para o Comercial (etapa 1) e para as etapas 6 e 7.
- Status `cancelada` da SD (continua sem fluxo).
