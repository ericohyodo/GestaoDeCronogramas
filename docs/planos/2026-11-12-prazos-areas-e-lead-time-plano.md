# Prazos das áreas, lead time da SD e confirmação do aceite — plano de implementação

> **Para quem executar:** use `superpowers:executing-plans` (nesta sessão) ou `superpowers:subagent-driven-development`. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:**
- A SD passa a ter o lead time acordado com o cliente.
- O aceite confirma as especificações e calcula o término do PRO.
- Cada área da AV ganha um prazo em dias úteis, com avisos, painel e relatório.

**Arquitetura:**
- O cálculo de datas fica numa função pura no núcleo (`calendario.ts`).
- No módulo SDs, o lead time e a justificativa entram no domínio (`sd.ts`). O servidor valida a regra do término.
- No módulo AVs, o prazo da área é gravado em `av_prazos_area` por um decorador do repositório de histórico. Toda mudança de etapa passa por ele (avançar, finalizar, declinar, concluir), sem mexer em cada caso de uso.
- As rotinas de aviso entram na rotina horária que já existe.

**Tecnologias:** Electron, Next.js (renderer), SQLite (better-sqlite3), TypeScript, zod e vitest.

**Especificação:** [2026-11-12-prazos-areas-e-lead-time-design.md](2026-11-12-prazos-areas-e-lead-time-design.md)

## Restrições globais

- **Migrações:**
  - nunca editar uma migração existente;
  - as novas são `0044-sd-lead-time` e `0045-prazos-das-areas`, registradas em `electron/nucleo/infraestrutura/banco/migracoes/index.ts`;
  - **revisar o SQL antes de qualquer `npm run dev`**, que aplica a migração na hora.
- **Limites:**
  - lead time: inteiro de 1 a 1825 (dias corridos);
  - observação do prazo: até 500 caracteres;
  - justificativa do prazo: de 10 a 1000 caracteres;
  - dias úteis por área: inteiro de 1 a 30, com padrão 3.
- **Dias úteis:** contam a partir do dia seguinte e pulam sábado e domingo; feriados ainda não contam. O prazo vence no fim do dia-limite.
- **Áreas com prazo:**

  | Etapa | Área |
  |---|---|
  | 2 | produto |
  | 3 | processo |
  | 4 | pcp |
  | 5 | custo |

  Comercial e etapas 6 a 10 não têm prazo.
- **Escopo das AVs:** as AVs de histórico (`av.historico = 1`) ficam fora de prazos, avisos e painel.
- **Dia local:** é a data no fuso do computador, igual a `diaLocal` em `verificar-prazos-do-cliente.ts`.
- **Textos:**
  - todos em português do Brasil;
  - os erros de validação usam `ErroDeValidacao`, com as mensagens da especificação;
  - toda função nova tem um comentário JSDoc com propósito, parâmetros e retorno (regra da FERKODA).
- **Arquitetura do repositório:**
  - o `index.ts` de um módulo não importa `@contratos` (regra de fronteiras do ESLint);
  - os casos de uso são classes com `executar()`.
- **Verificação de cada tarefa:** `npm test`, `npm run typecheck` e `npm run lint`, todos sem erros.

## Pontos de atenção na revisão

Situações que podem afetar o usuário e que precisam de teste específico:

1. **SD aberta antes da 0.4.0, sem lead time.** O aceite funciona sem justificativa e o modal mostra o aviso dos 180 dias. Teste na Tarefa 2.
2. **No modal, o início muda depois de o término ter sido editado à mão.** O término digitado não é sobrescrito. Se o término voltar ao valor calculado, a justificativa deixa de ser exigida. Teste na Tarefa 4 (`estadoDoTermino`).
3. **A rotina horária roda em vários PCs e várias vezes ao dia.** Não pode haver prazo duplicado (`UNIQUE` com `INSERT OR IGNORE`) nem aviso duplicado (chave). Teste na Tarefa 8.
4. **Área sem membro definido** (`av.membros[area]` vazio). O prazo é gravado, o aviso não sai e nada quebra. Teste na Tarefa 8.
5. **Lead time inválido** (0, negativo, decimal, acima de 1825). O valor é recusado no domínio e no IPC. Teste na Tarefa 1.

---

## Parte B e C — SD (versão 0.4.0, primeira entrega)

### Tarefa 1: Lead time no domínio, no banco e no salvar/abrir da SD

**Arquivos:**
- Criar: `electron/nucleo/infraestrutura/banco/migracoes/0044-sd-lead-time.ts`
- Criar: `electron/nucleo/dominio/calendario.ts`
- Modificar:
  - `electron/nucleo/infraestrutura/banco/migracoes/index.ts`
  - `electron/modulos/sds/dominio/sd.ts`
  - `electron/modulos/sds/infraestrutura/repositorio-sds-sqlite.ts`
  - `electron/modulos/sds/aplicacao/mapeador-dto.ts`
  - `contratos/sds.contrato.ts`
  - `electron/modulos/sds/apresentacao/controlador-ipc-sds.ts:44`
- Testar:
  - `testes/unitarios/nucleo/calendario.test.ts`
  - `testes/integracao/fluxo-sd.test.ts`

**Interfaces:**
- Produz, em `calendario.ts`:
  - `diaLocal(instante: Date): string`, que devolve `AAAA-MM-DD` no fuso do computador;
  - `somarDiasCorridos(dataIso: string, dias: number): string`;
  - `somarDiasUteis(dataIso: string, dias: number): string`;
  - `diasUteisEntre(deIso: string, ateIso: string): number`, que conta os dias úteis de `de` (exclusivo) até `ate` (inclusivo) e devolve 0 se `ate <= de`.
- Produz, em `Sd`:
  - campos `leadTimeDias: number | null`, `leadTimeObservacao: string | null` e `prazoJustificativa: string | null`;
  - `novaPreSd` inicia os três como `null`.
- Produz, em `SdDTO`: `leadTimeDias`, `leadTimeObservacao` e `prazoJustificativa`.
- Produz, em `SalvarSdEntrada`: `leadTimeDias?: number | null` e `leadTimeObservacao?: string | null`.
- `atualizarFormulario(sd, campos)` aceita `leadTimeDias` e `leadTimeObservacao`.

- [ ] **Passo 1: escrever os testes que falham**

  `calendario.test.ts`:
  ```ts
  expect(somarDiasUteis('2026-09-25', 3)).toBe('2026-09-30'); // sexta + 3 = quarta
  expect(somarDiasUteis('2026-09-26', 1)).toBe('2026-09-28'); // sábado + 1 = segunda
  expect(somarDiasUteis('2026-12-31', 3)).toBe('2027-01-05'); // virada de ano (feriado não conta na v1)
  expect(somarDiasUteis('2026-10-30', 3)).toBe('2026-11-04'); // virada de mês
  expect(somarDiasCorridos('2026-11-12', 180)).toBe('2027-05-11');
  expect(diasUteisEntre('2026-09-30', '2026-10-05')).toBe(3); // qui, sex, seg
  expect(diasUteisEntre('2026-09-30', '2026-09-30')).toBe(0);
  ```

  `fluxo-sd.test.ts`, teste novo `it('lead time é obrigatório para abrir e validado ao salvar', ...)`:
  - `abrir` sem lead time recusa com `/prazo acordado com o cliente/`;
  - `salvar` com `leadTimeDias` igual a 0, -5, 2.5 e 1826 recusa com `ErroDeValidacao`;
  - `salvar` com `leadTimeDias: 180` e `leadTimeObservacao: 'SOP em mar/27'` devolve no DTO `leadTimeDias === 180` e a observação.

  Nos testes que já existem (linhas 145, 151, 184 e 207), incluir `leadTimeDias: 180` nas chamadas de `SalvarSd` que antecedem `AbrirSd`.

- [ ] **Passo 2:** rodar `npx vitest run testes/unitarios/nucleo/calendario.test.ts testes/integracao/fluxo-sd.test.ts`. Esperado: FALHA (módulo e campos inexistentes).

- [ ] **Passo 3: migração 0044**

  ```sql
  ALTER TABLE sd ADD COLUMN lead_time_dias INTEGER CHECK (lead_time_dias IS NULL OR lead_time_dias BETWEEN 1 AND 1825);
  ALTER TABLE sd ADD COLUMN lead_time_observacao TEXT;
  ALTER TABLE sd ADD COLUMN prazo_justificativa TEXT;
  ```

  Registrar como `migracao0044`, com `versao: 44` e `nome: '0044-sd-lead-time'`.

- [ ] **Passo 4: implementar `calendario.ts`**

  As datas são tratadas como `T00:00:00Z` e percorridas com `getUTCDay()`, assim não há efeito de fuso.

  `diaLocal` é a mesma função de `verificar-prazos-do-cliente.ts`. Passar a importá-la de `calendario.ts` nesse arquivo.

- [ ] **Passo 5: domínio da SD**

  Em `atualizarFormulario`, validar `leadTimeDias`:
  - `null` ou `undefined` viram `null`;
  - caso contrário, `Number.isInteger` e o intervalo de 1 a 1825;
  - erro: "O prazo acordado deve ser um número inteiro de dias, de 1 a 1825."

  A observação é limitada a 500 caracteres.

  `abrirSd` lança "Informe o prazo acordado com o cliente (em dias)." quando `leadTimeDias` é nulo. A verificação vem depois da checagem da data da cotação.

- [ ] **Passo 6: repositório e IPC**

  O repositório lê e grava as três colunas novas no `INSERT ... ON CONFLICT` e em `paraListada`. O mapeador do DTO expõe os três campos.

  No IPC de salvar, acrescentar:
  ```ts
  leadTimeDias: z.number().int().min(1).max(1825).nullish(),
  leadTimeObservacao: z.string().max(500).nullish(),
  ```

- [ ] **Passo 7:** rodar os testes do Passo 2. Esperado: PASSA. Depois rodar `npm test`, `npm run typecheck` e `npm run lint`.

- [ ] **Passo 8: commit**

  ```
  feat(sds): lead time acordado com o cliente, obrigatório para abrir a SD
  ```

### Tarefa 2: Aceite com término calculado, justificativa e especificações

**Arquivos:**
- Modificar:
  - `electron/modulos/sds/dominio/sd.ts`
  - `electron/modulos/sds/aplicacao/casos-de-uso/fluxo-sd.ts:160-209`
  - `electron/modulos/sds/infraestrutura/repositorio-sds-sqlite.ts` (consultas de listagem: JOIN com `av`)
  - `electron/modulos/sds/aplicacao/mapeador-dto.ts`
  - `contratos/sds.contrato.ts`
  - `electron/modulos/sds/apresentacao/controlador-ipc-sds.ts:54`
- Testar: `testes/integracao/fluxo-sd.test.ts`

**Interfaces:**
- Consome `somarDiasCorridos` (Tarefa 1).
- Produz:
  - `AceitarSdEntrada.justificativaPrazo?: string | null`;
  - `aceitarSd(sd, usuarioId, agora, cronogramaId, parecer?, justificativaPrazo?)`, que grava `prazoJustificativa`;
  - `exigirJustificativaDoPrazo(sd: Sd, dataInicio: string, dataFim: string, justificativa?: string | null): string | null`, em `sd.ts`. Ela devolve a justificativa normalizada, ou `null` quando não há lead time ou quando o término é igual a `somarDiasCorridos(dataInicio, leadTimeDias)`. Lança "Justifique a alteração do prazo acordado (mínimo de 10 caracteres)." quando o término difere e a justificativa tem menos de 10 caracteres, e limita o texto a 1000;
  - `SdListada.especificacoes` e `SdDTO.especificacoes: EspecificacoesSdDTO`, com `{ codigo, programa, volumeAnual, complexidade, linha, familia }`, todos anuláveis e lidos das colunas de `av` com o mesmo nome (`volume_anual` vira `volumeAnual`).

- [ ] **Passo 1: escrever os testes que falham**

  `it('aceite: término calculado dispensa justificativa; diferente exige; sem lead time aceita', ...)`:
  - SD com `leadTimeDias: 180`, aberta e aceita com `dataInicio: '2026-11-12'` e `dataFim: '2027-05-11'`, sem justificativa: passa, e o cronograma criado tem `data_fim = '2027-05-11'`;
  - outra execução com `dataFim: '2027-06-01'` e sem justificativa: recusa com `/Justifique a alteração/`;
  - com `justificativaPrazo: 'Ferramental importado: +3 semanas'`: passa, e o DTO devolve `prazoJustificativa` igual ao texto;
  - SD aberta (com lead time) e depois zerada com `UPDATE sd SET lead_time_dias = NULL`, simulando uma SD de antes da 0.4.0: aceite com `dataFim` qualquer passa sem justificativa (ponto de atenção 1);
  - `ObterSd` devolve `especificacoes.codigo` igual ao `codigo` da AV de teste. Ao criar a AV no `beforeEach`, passar `codigo: 'VX3-1'` se `CriarAv` aceitar; senão, fazer `UPDATE av SET codigo`.

- [ ] **Passo 2:** rodar `npx vitest run testes/integracao/fluxo-sd.test.ts`. Esperado: FALHA.

- [ ] **Passo 3: domínio**

  Implementar `exigirJustificativaDoPrazo` e o parâmetro novo de `aceitarSd`.

  Em `AceitarSd.executar`, chamar `exigirJustificativaDoPrazo(atual.sd, entrada.dataInicio, entrada.dataFim, entrada.justificativaPrazo)` **antes** de `projetos.criar`.

  Quando houver justificativa, acrescentá-la à mensagem da notificação `sd.aceita`: "Prazo alterado: …".

- [ ] **Passo 4: repositório**

  Incluir `av.codigo, av.programa, av.volume_anual, av.complexidade, av.linha, av.familia` nas três consultas de `SdListada` e montar `especificacoes` em `paraListada`.

  No IPC de aceitar, acrescentar `justificativaPrazo: z.string().max(1000).nullish()`.

- [ ] **Passo 5:** rodar o teste. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 6: commit**

  ```
  feat(sds): aceite calcula o término pelo lead time e exige justificativa para mudar
  ```

### Tarefa 3: Campos do Comercial na tela da SD

**Arquivos:**
- Modificar: `renderer/modulos/sds/componentes/DetalheSd.tsx` (bloco "Comercial — oficialização do cliente", :234-342; `Formulario`, `paraFormulario` e `gravarFormulario`, :108)

**Interfaces:** consome `SdDTO.leadTimeDias` e `SdDTO.leadTimeObservacao`, e `SalvarSdEntrada` da Tarefa 1.

- [ ] **Passo 1: formulário**

  `Formulario` ganha `leadTimeDias: string` (texto do campo) e `leadTimeObservacao: string`.

  `gravarFormulario` envia `leadTimeDias: form.leadTimeDias ? Number(form.leadTimeDias) : null` e `leadTimeObservacao: form.leadTimeObservacao || null`.

  `prontaParaAbrir` passa a exigir também `form.leadTimeDias`.

- [ ] **Passo 2: campos na tela**

  Ao lado de "Nº PO":
  - `CampoTexto` com `type="number"`, `min={1}`, `max={1825}`, `step={1}`;
  - rótulo "Prazo acordado com o cliente (dias corridos)";
  - dica "Lead time do pedido até a entrega/SOP; define o término do projeto no aceite."

  Abaixo do anterior:
  - `AreaTexto` "Observação do prazo";
  - placeholder "Ex.: SOP em mar/27; PPAP até jan/27".

  Os dois respeitam `editavel`.

  No bloco de leitura da SD aberta ou fechada, mostrar "Prazo acordado: N dias corridos" e a observação. Se houver `prazoJustificativa`, mostrar "Prazo alterado no aceite: …".

- [ ] **Passo 3:** rodar `npm run typecheck` e `npm run lint`. Esperado: sem erros.

- [ ] **Passo 4: commit**

  ```
  feat(sds): Comercial informa o prazo acordado e a observação na SD
  ```

### Tarefa 4: Modal "Confirmar aceite da SD"

**Arquivos:**
- Criar:
  - `renderer/modulos/sds/prazo-do-aceite.ts`
  - `renderer/modulos/sds/componentes/ModalAceiteSd.tsx`
- Modificar: `renderer/modulos/sds/componentes/DetalheSd.tsx` (remover o `Modal` de aceite, :430-463, e o estado `periodo`; usar o novo componente)
- Testar: `testes/unitarios/sds/prazo-do-aceite.test.ts`

**Interfaces:**
- Consome `SdDTO.especificacoes`, `leadTimeDias`, `leadTimeObservacao` e `AceitarSdEntrada.justificativaPrazo`.
- Produz:
  - `LEAD_TIME_PADRAO = 180`;
  - `terminoCalculado(inicio: string, leadTimeDias: number | null): string`, igual a `somarDias(inicio, leadTimeDias ?? 180)` (usa `somarDias` de `@/compartilhado/formatacao`);
  - `estadoDoTermino(inicio: string, fim: string, leadTimeDias: number | null): { calculado: string; diferencaDias: number; exigeJustificativa: boolean }`. `exigeJustificativa` só é `true` quando `leadTimeDias !== null` e `fim !== calculado`;
  - componente `ModalAceiteSd({ sd, aberto, parecer, aoFechar, aoAceitar }: { sd: SdDTO; aberto: boolean; parecer: string; aoFechar(): void; aoAceitar(entrada: Omit<AceitarSdEntrada, 'id' | 'parecer'>): Promise<void> })`.

- [ ] **Passo 1: escrever o teste que falha**

  ```ts
  expect(terminoCalculado('2026-11-12', 180)).toBe('2027-05-11');
  expect(terminoCalculado('2026-11-12', null)).toBe('2027-05-11'); // padrão 180
  expect(estadoDoTermino('2026-11-12', '2027-05-11', 180)).toEqual({ calculado: '2027-05-11', diferencaDias: 0, exigeJustificativa: false });
  expect(estadoDoTermino('2026-11-12', '2027-05-23', 180).diferencaDias).toBe(12);
  expect(estadoDoTermino('2026-11-12', '2027-05-23', 180).exigeJustificativa).toBe(true);
  expect(estadoDoTermino('2026-11-12', '2027-05-23', null).exigeJustificativa).toBe(false); // SD antiga
  ```

- [ ] **Passo 2:** rodar `npx vitest run testes/unitarios/sds/prazo-do-aceite.test.ts`. Esperado: FALHA.

- [ ] **Passo 3: implementar `prazo-do-aceite.ts`**

- [ ] **Passo 4: implementar `ModalAceiteSd`** (largura `lg`, título "Confirmar aceite da SD", três blocos)

  **Especificações** (só leitura):
  - grade com cliente, código, descrição, programa, volume anual (com separador de milhar), complexidade, linha, família, nº PO e data da cotação;
  - campos nulos aparecem como "—";
  - link "Abrir AV" para `/avs/detalhe/?id=${sd.avId}`.

  **Prazo acordado:**
  - "N dias corridos" e a observação;
  - sem lead time, aviso âmbar "Lead time não informado; usando 180 dias."

  **Projeto:**
  - estado local `inicio` (inicial: `hojeIso()`), `fim`, `fimEditado: boolean`, `justificativa` e `confirmado: boolean`;
  - mudar o início com `fimEditado === false` recalcula `fim = terminoCalculado(...)` (ponto de atenção 2);
  - mudar o fim marca `fimEditado = true`;
  - se `estadoDoTermino(...).exigeJustificativa`, mostrar "+N dias em relação ao acordado" (ou "−N") e a `AreaTexto` "Justificativa da alteração do prazo" com no mínimo 10 caracteres;
  - caixa de seleção "Confirmo as especificações e o prazo acordado".

  **Botão "Confirmar aceite e criar PRO"**, desabilitado quando:
  - o processo está ocupado;
  - o término é anterior ao início;
  - a caixa não está marcada;
  - a justificativa é exigida e tem menos de 10 caracteres.

  Ao abrir, o estado do modal é reiniciado.

  Em `DetalheSd`, `aceitar()` passa a receber a entrada do modal e chama `clienteDesktop.sds.aceitar({ id, parecer, ...entrada })`.

- [ ] **Passo 5:** rodar o teste do Passo 2. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 6: commit**

  ```
  feat(sds): modal de confirmação do aceite com especificações, lead time e justificativa
  ```

### Tarefa 5: Lead time nas SDs do modo Apresentação

**Arquivos:**
- Modificar:
  - `electron/modulos/sds/aplicacao/casos-de-uso/exemplo-sd.ts:36-45`
  - `electron/modulos/avs/aplicacao/casos-de-uso/gerar-av-vitrine.ts` (constante `VITRINE` e chamada `avancarSd`)
- Testar: `testes/integracao/gerar-avs-exemplo.test.ts` e `testes/integracao/gerar-av-vitrine.test.ts` devem continuar passando

**Interfaces:** `TextosDaSdDeVitrine` e o `textos` de `AvancarSdDeExemplo` ganham `leadTimeDias: number` e `leadTimeObservacao: string`.

- [ ] **Passo 1: SDs de exemplo**

  `exemplo-sd.ts` grava, no `SalvarSd`:
  - `leadTimeDias: textos?.leadTimeDias ?? 150`;
  - `leadTimeObservacao: textos?.leadTimeObservacao ?? null`.

  No aceite de exemplo, `dataFim` passa a ser `somarDiasCorridos(dataInicio, leadTimeDias)`, assim não é exigida justificativa.

- [ ] **Passo 2: vitrine**

  Na vitrine:
  - `leadTimeDias: 180`;
  - `leadTimeObservacao: 'PPAP até jan/27; SOP do VX-300 em mar/27 (cronograma do cliente rev. B).'`

  Conferir que o período do PRO de vitrine (hoje −45 a +135) continua igual a início + 180.

- [ ] **Passo 3: verificar**

  Rodar `npx vitest run testes/integracao/gerar-avs-exemplo.test.ts testes/integracao/gerar-av-vitrine.test.ts`. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 4: commit**

  ```
  feat(apresentacao): SDs de exemplo e de vitrine com lead time
  ```

---

## Parte A — Prazos das áreas na AV

### Tarefa 6: Domínio, banco e gravação dos prazos nas mudanças de etapa

**Arquivos:**
- Criar:
  - `electron/nucleo/infraestrutura/banco/migracoes/0045-prazos-das-areas.ts`
  - `electron/modulos/avs/dominio/prazo-area.ts`
  - `electron/modulos/avs/infraestrutura/repositorio-prazos-area-sqlite.ts`
  - `electron/modulos/avs/aplicacao/prazos/historico-com-prazos.ts`
- Modificar:
  - `electron/nucleo/infraestrutura/banco/migracoes/index.ts`
  - `electron/modulos/avs/index.ts:119-200` (usar `HistoricoComPrazos` no lugar de `repositorioHistorico` em todos os casos de uso que registram histórico)
- Testar:
  - `testes/unitarios/avs/prazo-area.test.ts`
  - `testes/integracao/prazos-das-areas.test.ts`

**Interfaces:**
- Consome `somarDiasUteis`, `diasUteisEntre` e `diaLocal` (Tarefa 1).
- Produz, em `prazo-area.ts`:

  ```ts
  export type AreaComPrazo = 'produto' | 'processo' | 'pcp' | 'custo';
  export const AREA_DA_ETAPA_COM_PRAZO: Readonly<Record<number, AreaComPrazo>> = { 2: 'produto', 3: 'processo', 4: 'pcp', 5: 'custo' };
  export const DIAS_UTEIS_PADRAO = 3;
  export interface PrazoArea { id: string; avId: string; etapa: number; area: AreaComPrazo; diasUteis: number; iniciadaEm: Date; dataLimite: string; entregueEm: Date | null }
  export type SituacaoPrazoArea = 'no_prazo' | 'vencendo' | 'atrasada' | 'entregue_no_prazo' | 'entregue_com_atraso';
  export function situacaoDoPrazo(prazo: Pick<PrazoArea, 'dataLimite' | 'entregueEm'>, hoje: string): SituacaoPrazoArea;
  export interface RepositorioPrazosArea {
    abrir(prazo: PrazoArea): Promise<void>;                       // INSERT OR IGNORE (UNIQUE av_id, etapa)
    entregar(avId: string, etapa: number, instante: Date): Promise<void>; // só se entregue_em IS NULL
    obterAberto(avId: string, etapa: number): Promise<PrazoArea | null>;
    listarAbertos(): Promise<PrazoArea[]>;
    listarEntreguesDesde(desdeIso: string): Promise<PrazoArea[]>;
  }
  export interface RepositorioConfigPrazos {
    obter(): Promise<Record<AreaComPrazo, number>>;
    salvar(valores: Record<AreaComPrazo, number>, usuarioId: string, instante: Date): Promise<void>;
  }
  ```

  Regras de `situacaoDoPrazo`:
  - entregue: `diaLocal(entregueEm) <= dataLimite` resulta em `entregue_no_prazo`; senão, `entregue_com_atraso`;
  - aberto: `hoje > dataLimite` resulta em `atrasada`; `hoje === dataLimite` ou `somarDiasUteis(hoje, 1) === dataLimite` resulta em `vencendo`; senão, `no_prazo`.

  `HistoricoComPrazos implements RepositorioHistoricoAv` recebe, no construtor, `(interno: RepositorioHistoricoAv, prazos: RepositorioPrazosArea, config: RepositorioConfigPrazos, ids: GeradorDeId)`. Em `registrar(item)`:
  1. repassa ao interno;
  2. se `item.etapaDe !== item.etapaPara`, entrega o prazo de `etapaDe` (se tiver área com prazo);
  3. abre o de `etapaPara`, com `dataLimite = somarDiasUteis(diaLocal(item.data), dias)`.

  `listarPorAv` só repassa.

- [ ] **Passo 1: escrever os testes que falham**

  Testes unitários de `situacaoDoPrazo` com `dataLimite: '2026-09-30'`:

  | Hoje | Situação esperada |
  |---|---|
  | `'2026-09-25'` | `no_prazo` |
  | `'2026-09-29'` | `vencendo` |
  | `'2026-09-30'` | `vencendo` |
  | `'2026-10-01'` | `atrasada` |

  Entregue em `2026-09-30T20:00:00Z` (dia local 30 em Brasília) resulta em `entregue_no_prazo`. Entregue em `2026-10-02T12:00:00Z` resulta em `entregue_com_atraso`.

  Testes de integração, num `beforeEach` como o de `gerar-av-vitrine.test.ts`, com `AvancarEtapa` montado sobre `HistoricoComPrazos` e `RelogioFixo` em `2026-09-25T12:00:00Z` (sexta):
  - `it('abre o prazo ao chegar em Produto e entrega ao sair')`: na etapa 1, avançar gera uma linha `(etapa 2, produto, dias_uteis 3, data_limite '2026-09-30', entregue_em NULL)`; avançar de novo preenche `entregue_em` da 2 e abre a 3;
  - `it('mudar a configuração não altera prazo aberto')`: salvar a configuração com produto = 5 depois de abrir mantém `data_limite` em `'2026-09-30'`;
  - `it('finalizar e declinar encerram o prazo aberto')`: AV na 5, `FinalizarECriarPreSd` gera `entregue_em` na 5; AV na 3, `DeclinarAv` gera `entregue_em` na 3;
  - `it('registrar duas vezes não duplica')`: chamar `abrir` duas vezes deixa uma linha.

- [ ] **Passo 2:** rodar os dois arquivos de teste. Esperado: FALHA.

- [ ] **Passo 3: migração 0045**

  O SQL de `av_prazo_config` e `av_prazos_area` é o da especificação, seção 3.1. Acrescentar:

  ```sql
  INSERT INTO av_prazo_config (area, dias_uteis, atualizado_em) VALUES
    ('produto',3,datetime('now')),('processo',3,datetime('now')),('pcp',3,datetime('now')),('custo',3,datetime('now'));
  ```

  Registrar como `migracao0045`.

- [ ] **Passo 4: implementar o domínio, o repositório SQLite e `HistoricoComPrazos`**

  - `RepositorioConfigPrazosSqlite` fica no mesmo arquivo do repositório de prazos;
  - no `index.ts` do módulo, criar `const historicoComPrazos = new HistoricoComPrazos(repositorioHistorico, repositorioPrazos, repositorioConfigPrazos, deps.geradorDeId)` e passá-lo a `AvancarEtapa`, `DeclinarAv`, `FinalizarECriarPreSd`, `ConcluirAvComProjeto` e a qualquer outro caso de uso que hoje receba `repositorioHistorico` para registrar;
  - `ObterRelatorioAvs` e `ListarHistoricoAv` podem continuar com o repositório original.

- [ ] **Passo 5:** rodar os testes. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 6: commit**

  ```
  feat(avs): prazo em dias úteis por área, gravado a cada mudança de etapa
  ```

### Tarefa 7: Prazo no aviso de etapa liberada

**Arquivos:**
- Modificar:
  - `electron/modulos/avs/aplicacao/casos-de-uso/avancar-etapa.ts`
  - `electron/modulos/avs/index.ts`
- Testar: `testes/integracao/prazos-das-areas.test.ts`

**Interfaces:**
- Consome `RepositorioPrazosArea.obterAberto` (Tarefa 6).
- `AvancarEtapa` ganha um último parâmetro opcional no construtor: `prazos: Pick<RepositorioPrazosArea, 'obterAberto'> = { obterAberto: async () => null }`.

- [ ] **Passo 1: escrever o teste que falha**

  `it('o aviso de etapa liberada informa o prazo')`, com o `NotificadorInterno` real (como em `fluxo-sd.test.ts`). Depois de avançar de 1 para 2, a notificação `av.etapa_liberada` do membro de produto contém `'Prazo: 30/09 (3 dias úteis)'`.

- [ ] **Passo 2:** rodar o teste. Esperado: FALHA.

- [ ] **Passo 3: implementar**

  Depois de `historico.registrar`, ler `obterAberto(av.id, proxima.numero)`. Se houver prazo, acrescentar `` ` Prazo: ${dd/mm} (${diasUteis} dias úteis).` `` à mensagem. Passar `repositorioPrazos` no `index.ts`.

- [ ] **Passo 4:** rodar o teste. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 5: commit**

  ```
  feat(avs): aviso de etapa liberada com a data-limite da área
  ```

### Tarefa 8: Rotinas de preenchimento retroativo e de avisos

**Arquivos:**
- Criar:
  - `electron/modulos/avs/aplicacao/casos-de-uso/garantir-prazos-das-areas.ts`
  - `electron/modulos/avs/aplicacao/casos-de-uso/verificar-prazos-das-areas.ts`
- Modificar:
  - `electron/modulos/avs/index.ts` (interface `rotinas` e retorno, :98-100 e :326)
  - `electron/raiz-de-composicao.ts:258-272`
- Testar: `testes/integracao/prazos-das-areas.test.ts`

**Interfaces:**
- `GarantirPrazosDasAreas`:
  - construtor `(avs: RepositorioAvs, historico: RepositorioHistoricoAv, prazos: RepositorioPrazosArea, config: RepositorioConfigPrazos, ids: GeradorDeId)`;
  - `executar(): Promise<number>` devolve quantos prazos criou;
  - para AVs com `!historico`, não terminais, na etapa 2 a 5 e sem `obterAberto`, usa como início a `data` mais recente do histórico com `etapaPara === etapaAtual && etapaDe !== etapaPara`, ou `criadoEm` se não houver.
- `VerificarPrazosDasAreas`:
  - construtor `(avs: RepositorioAvs, prazos: RepositorioPrazosArea, notificador: Notificador, relogio: Relogio)`;
  - `executar(): Promise<number>` devolve quantos avisos tentou.
  - Para cada prazo aberto de AV não histórica e não terminal, notifica `av.membros[area]` (pula se vazio):

    | Situação | Tipo | Chave |
    |---|---|---|
    | `vencendo` | `av.area_vencendo` | `` `${avId}:${etapa}:vencendo` `` |
    | `atrasada` | `av.area_atrasada` | `` `${avId}:${etapa}:atrasada` `` |

  - Título: `` `${av.numero} · ${ROTULO_DA_AREA[area]} vence em ${dd/mm}` ``, ou `` `... em atraso desde ${dd/mm}` ``, onde a data do atraso é o dia útil seguinte ao limite.
  - Mensagem: `resumoDaAv(av)`. Link: `linkDaAv(av.id)`.
- `ModuloAvs.rotinas` ganha `verificarPrazosDasAreas(): Promise<number>`, que executa `Garantir` e depois `Verificar`.

- [ ] **Passo 1: escrever os testes que falham**

  - `it('preenche retroativamente só AVs ativas fora do histórico, uma vez')`:
    - AV na etapa 3, com linha de histórico 2→3 em `2026-09-25T12:00Z`, mais uma AV com `historico = 1` e uma AV na etapa 8;
    - `executar()` devolve 1, com `data_limite` igual a `'2026-09-30'`;
    - a segunda execução devolve 0.
  - `it('avisa vencendo e atrasada uma única vez cada')`:
    - prazo com limite `'2026-09-30'` e relógio em `2026-09-29`: rodar duas vezes deixa 1 notificação `av.area_vencendo` no banco;
    - relógio em `2026-10-01`: deixa 1 `av.area_atrasada`.
  - `it('área sem membro não avisa e não quebra')`: `membro_processo = NULL` e prazo atrasado; `executar()` resolve e não grava notificação.
  - `it('prazo entregue não avisa')`.

- [ ] **Passo 2:** rodar o teste. Esperado: FALHA.

- [ ] **Passo 3: implementar os dois casos de uso**

  No `index.ts`, ligar `verificarPrazosDasAreas`. Em `raiz-de-composicao.ts`, dentro de `verificarPrazos()`, chamar `avs.rotinas.verificarPrazosDasAreas()` logo depois de `verificarPrazosDoCliente()`, com o mesmo tratamento de erro das demais.

- [ ] **Passo 4:** rodar o teste. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 5: commit**

  ```
  feat(avs): avisos de prazo da área vencendo e em atraso, com preenchimento retroativo
  ```

### Tarefa 9: Configuração dos prazos (administrador)

**Arquivos:**
- Criar:
  - `electron/modulos/avs/aplicacao/casos-de-uso/configurar-prazos-das-areas.ts`
  - `renderer/modulos/avs/componentes/ConfiguracaoPrazosAreas.tsx`
- Modificar:
  - `contratos/avs.contrato.ts`
  - `contratos/canais.ts:117` (bloco `avs`)
  - `contratos/api-desktop.ts:186`
  - `electron/preload.ts:76`
  - `electron/modulos/avs/apresentacao/controlador-ipc-avs.ts`
  - `electron/modulos/avs/index.ts`
  - `renderer/app/configuracoes/page.tsx`
- Testar: `testes/integracao/prazos-das-areas.test.ts`

**Interfaces:**
- `PrazosConfigDTO = { produto: number; processo: number; pcp: number; custo: number }`.
- Canais: `avs:obter-prazos-config` com permissão `leitura`, e `avs:salvar-prazos-config` com permissão `administracao`.
- Esquema zod: cada área `z.number().int().min(1).max(30)`.
- `ObterPrazosConfig.executar(): Promise<PrazosConfigDTO>`.
- `SalvarPrazosConfig`:
  - construtor `(config: RepositorioConfigPrazos, usuarios: ConsultaDeUsuarios, relogio: Relogio)`;
  - `executar(entrada: PrazosConfigDTO): Promise<PrazosConfigDTO>`;
  - exige que `usuarioAtual().perfil === 'administrador'`, com `ErroDeDominio` 'Só administradores alteram os prazos das áreas.';
  - revalida o intervalo de 1 a 30.
- `clienteDesktop.avs.obterPrazosConfig()` e `clienteDesktop.avs.salvarPrazosConfig(entrada)`.

- [ ] **Passo 1: escrever os testes que falham**

  - `it('só administrador salva; valores fora de 1..30 são recusados')`:
    - gestor recebe recusa com `/administradores/`;
    - `{ produto: 0, ... }` e `{ produto: 31, ... }` são recusados;
    - um administrador grava `{ produto: 4, processo: 3, pcp: 2, custo: 5 }` e `ObterPrazosConfig` devolve o mesmo valor.

- [ ] **Passo 2:** rodar o teste. Esperado: FALHA.

- [ ] **Passo 3: casos de uso e IPC**

  Implementar os casos de uso, os canais, o preload, a API e o registro no IPC, seguindo o padrão de `obterDashboard`.

- [ ] **Passo 4: tela**

  `ConfiguracaoPrazosAreas`:
  - `PainelVidro` com o título "Prazos das áreas da AV";
  - quatro `CampoTexto` `type="number"` (Eng. Produto, Eng. Processo, PCP e Mapa de Custo), com o sufixo "dias úteis";
  - texto de ajuda: "Vale para as próximas etapas liberadas; prazos em curso não mudam.";
  - botão "Salvar" e `MensagemErro`.

  Em `configuracoes/page.tsx`, mostrar o componente abaixo de `ConfiguracaoIa` para administradores.

- [ ] **Passo 5:** rodar o teste. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 6: commit**

  ```
  feat(avs): administrador configura os dias úteis de cada área
  ```

### Tarefa 10: Painel e relatório das AVs

**Arquivos:**
- Criar: `electron/modulos/avs/aplicacao/casos-de-uso/obter-entregas-no-prazo.ts`
- Modificar:
  - `electron/modulos/avs/aplicacao/casos-de-uso/obter-dashboard.ts`
  - `electron/modulos/avs/aplicacao/casos-de-uso/obter-relatorio-avs.ts`
  - `electron/modulos/avs/index.ts`
  - `contratos/avs.contrato.ts`
  - `contratos/canais.ts`
  - `contratos/api-desktop.ts`
  - `electron/preload.ts`
  - `electron/modulos/avs/apresentacao/controlador-ipc-avs.ts`
  - `renderer/modulos/avs/componentes/DashboardAvPanel.tsx`
  - `renderer/modulos/avs/componentes/PaginaRelatoriosAvs.tsx`
- Testar: `testes/integracao/prazos-das-areas.test.ts`

**Interfaces:**
- `DashboardAvDTO.prazosDasAreas: { noPrazo: string[]; vencendo: string[]; atrasadas: string[] }`, com os IDs das AVs.
  - Esta é uma mudança em relação à especificação: em vez de um canal novo, o painel reaproveita `avs:obter-dashboard`.
  - `ObterDashboard` passa a ter o construtor `(repositorio, prazos: RepositorioPrazosArea, relogio: Relogio)`.
- `LinhaRelatorioAvDTO` ganha:
  - `areaComPrazo: string | null` (rótulo da área);
  - `prazoArea: string | null` (AAAA-MM-DD);
  - `situacaoPrazoArea: 'no_prazo' | 'vencendo' | 'atrasada' | null`;
  - `diasUteisDeAtraso: number`, calculado como `diasUteisEntre(dataLimite, hoje)` quando atrasada, ou 0.
- `ObterRelatorioAvs` recebe `prazos: RepositorioPrazosArea` como novo último parâmetro do construtor.
- `EntregasPorAreaDTO = { area: string; entregues: number; noPrazo: number; percentualNoPrazo: number; mediaDiasUteis: number }`:
  - `ObterEntregasNoPrazo.executar(): Promise<EntregasPorAreaDTO[]>`, com os entregues desde hoje −90 dias, uma linha por área na ordem produto, processo, pcp, custo;
  - `mediaDiasUteis` é a média de `diasUteisEntre(diaLocal(iniciadaEm), diaLocal(entregueEm))`;
  - canal `avs:entregas-no-prazo` com permissão `leitura`.

- [ ] **Passo 1: escrever os testes que falham**

  - `it('painel separa AVs no prazo, vencendo e atrasadas e ignora o histórico')`: três AVs com prazos abertos em situações diferentes, mais uma de histórico com prazo atrasado. Os arrays têm 1 ID cada, e o da AV de histórico não aparece.
  - `it('relatório traz prazo e situação da área e dias úteis de atraso')`: limite `'2026-09-30'` e hoje `'2026-10-05'` resultam em `situacaoPrazoArea === 'atrasada'` e `diasUteisDeAtraso === 3`.
  - `it('entregas no prazo por área nos últimos 90 dias')`: 2 entregas de produto, uma no prazo e outra atrasada, resultam em `{ area: 'Eng. Produto', entregues: 2, noPrazo: 1, percentualNoPrazo: 50 }`.

- [ ] **Passo 2:** rodar o teste. Esperado: FALHA.

- [ ] **Passo 3: implementar os casos de uso, o contrato e o canal**

- [ ] **Passo 4: painel**

  `DashboardAvPanel` ganha um `PainelVidro` com o título "Prazos das áreas" e três `Indicador`: No prazo, Vencendo (cor de atenção) e Atrasadas (cor de perigo quando for maior que 0).

  Cada número leva a `/avs/relatorios/?prazo=no_prazo|vencendo|atrasada`.

- [ ] **Passo 5: relatório**

  `PaginaRelatoriosAvs`:
  - lê `?prazo=` com o mesmo padrão de leitura de query de `renderer/app/sds/detalhe/pagina-detalhe-sd.tsx`;
  - ganha os filtros "Prazo da área" (Todas, No prazo, Vencendo, Atrasadas) e "Área";
  - ganha as colunas "Prazo da área" (dd/mm) e "Situação", com os textos "No prazo", "Vencendo" e "Atrasada há N dias úteis";
  - ganha o quadro "Entregas no prazo por área (90 dias)", usando `clienteDesktop.avs.entregasNoPrazo()`;
  - o indicador "Atrasadas" passa a se chamar **"Prazo do cliente vencido"**.

- [ ] **Passo 6:** rodar o teste. Esperado: PASSA. Depois rodar a verificação completa.

- [ ] **Passo 7: commit**

  ```
  feat(avs): prazos das áreas no painel e no relatório das AVs
  ```

### Tarefa 11: Modo Apresentação, Patch Notes 0.4.0 e verificação no app

**Arquivos:**
- Modificar:
  - `electron/apresentacao/modo-apresentacao.ts`
  - `CHANGELOG.md`
  - `package.json` (`"version": "0.4.0"`)
  - `docs/planos/plano-funcoes-ia.md` (renumerar as migrações para 0046 e 0047)

- [ ] **Passo 1: prazos no modo Apresentação**

  Em `semearApresentacao`, depois de `gerarExemplos()` e da vitrine, chamar `m.avs.rotinas.verificarPrazosDasAreas()`.

  Para o painel ter os três estados, ajustar `data_limite` de duas AVs de exemplo abertas:
  - uma para `hoje − 2 dias úteis` (atrasada);
  - outra para o dia útil seguinte (vencendo).

  O ajuste é feito por um método novo de apresentação: `m.avs.apresentacao.ajustarPrazosDeExemplo(hoje)`, que roda só nesse modo.

- [ ] **Passo 2: Patch Notes**

  Seção `## 0.4.0 — <data>` em `CHANGELOG.md` com:
  - **Novidades:** prazo das áreas, avisos, painel, relatório, configuração, lead time na SD e modal de aceite;
  - **Técnico:** migrações 0044 e 0045, decorador de histórico e canais novos.

- [ ] **Passo 3:** rodar `npm test`, `npm run typecheck` e `npm run lint`. Esperado: tudo passa.

- [ ] **Passo 4: verificação no app**

  Usar o skill `run` ou abrir em dev **no modo Apresentação**, para não aplicar a migração no banco real antes da revisão. Conferir:
  - a faixa "Prazos das áreas" com os três números, e cada clique abrindo o relatório já filtrado;
  - as colunas do relatório e o quadro de 90 dias;
  - na SD em `pre_sd`, os campos novos e a abertura recusada sem lead time;
  - na SD aberta, o modal com as especificações e o término calculado; mudar o término exige justificativa; mudar o início depois disso não sobrescreve o término;
  - em `/configuracoes`, a seção nova (administrador).

- [ ] **Passo 5: commit**

  ```
  chore: versão 0.4.0 com prazos das áreas e lead time da SD
  ```

- [ ] **Passo 6: publicação**

  Não publicar sem o OK do Érico (`npm run publicar`).
