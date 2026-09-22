# Gestão de Cronogramas

Aplicativo desktop (Windows) para gestão de cronogramas, com estrutura analítica em fases, gráfico de
Gantt, dependências, caminho crítico e controle de acesso por perfil.

## O que o app faz

- **Login com perfis:** administrador, gestor de projeto, usuário e visualizador. A senha usa hash
  scrypt e cada canal IPC exige a permissão do perfil — a interface esconde, e o processo principal barra.
- **Cronogramas** com período, situação e descrição.
- **Fases:** você informa o nome e a quantidade de subtarefas; elas nascem em branco e indentadas,
  para preencher nome e responsável direto na lista.
- **Lista de atividades** com N (numeração WBS), % concluído, descrição, responsável, dependência,
  início e conclusão — tudo editável na própria célula.
- **Gantt ao lado da lista**, com divisor arrastável, barras de tarefa, barra-resumo de fase, setas de
  dependência, caminho crítico em vermelho e linha do dia de hoje.
- **Atraso sob confirmação:** ao empurrar o término de uma tarefa, o app lista as sucessoras e pergunta
  se desloca todas pelo mesmo número de dias. Nem todo atraso se propaga, então quem decide é você.
- **Recursos:** cadastro de responsáveis usado na coluna Responsável.

## Como rodar

Requisitos: Node.js 22.12+ ou 24+, npm 11+ e Windows 10/11.

```bash
npm install
npm run dev        # Next.js (porta 3123) + Electron com recarga do processo principal
```

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor do Next.js e abre o Electron. Mudanças em `electron/` ou `contratos/` reiniciam o app |
| `npm start` | Build de produção e abre o Electron carregando o export estático (`app://`) |
| `npm run dist` | Gera `dist/GestaoDeCronogramas-<versão>-portatil.exe` |
| `npm test` | Testes unitários e de integração (SQLite em memória) |
| `npm run typecheck` | TypeScript do main, do renderer e dos testes |
| `npm run lint` | ESLint, incluindo as regras de fronteira da arquitetura |

## Stack e decisões

| Pedido original | Decisão | Motivo |
|---|---|---|
| Next.js + Pinia | **Zustand** | Pinia é do Vue; Next.js é React |
| Next.js + Vite | **Sem Vite** | Ambos são bundlers. O Next usa Turbopack; o main do Electron é compilado com **tsup** |
| Next.js no Electron | `output: 'export'` servido por um protocolo `app://` próprio | SSR e API routes não fazem sentido num app offline |
| `.db` na pasta do app | **Build portátil**: o banco fica ao lado do `.exe` | Program Files é somente leitura, o `app.asar` não aceita escrita e atualizações apagariam o banco |

- **Electron 44** + **electron-builder** (target `portable`).
- **Next.js 16** (App Router), **React 19**, **Zustand 5**, **Tailwind CSS 4**, `lucide-react`, fonte Inter offline.
- **better-sqlite3 13**: usa Node-API com binários pré-compilados, então não precisa recompilar para o Electron. É a única dependência de produção.
- **zod 4**, com mensagens em português, valida tudo que chega pelo IPC.
- **TypeScript 6** strict, **Vitest**, **ESLint** + `eslint-plugin-boundaries`.

## Arquitetura

**Monolito modular** (um processo, um banco, módulos isolados) com **Clean Architecture** dentro de cada
módulo. O processo principal do Electron é o "backend"; o renderer (Next.js) é a camada de UI.

```
contratos/                 Única ponte main ↔ renderer: DTOs, canais IPC, Resultado<T>, formato de window.api
electron/
  main.ts · preload.ts     Ciclo de vida, janela segura, ponte contextBridge
  protocolo-app.ts         Serve renderer/out em app://-/ (com CSP)
  raiz-de-composicao.ts    Injeção de dependência manual: banco → repositórios → casos de uso → IPC
  janela/                  Janela com Acrylic, barra de título própria
  nucleo/                  Shared kernel: Periodo, erros, portas (Relogio, GeradorDeId), SQLite, migrador, IPC
  modulos/<modulo>/
    dominio/               Entidades, value objects, interfaces de repositório. TypeScript puro
    aplicacao/             Casos de uso, portas, mapeadores para DTO
    infraestrutura/        Repositórios SQLite, adaptadores (ex.: nativeTheme)
    apresentacao/          Controladores IPC (validação zod)
    index.ts               API pública do módulo: a única coisa que o resto do app pode importar
renderer/
  app/                     Rotas do Next.js; compõem os módulos da UI
  modulos/<modulo>/        Store Zustand + componentes do módulo
  compartilhado/           Design system (ui/), layout, cliente IPC, formatação
testes/                    Unitários (dublês em memória) e integração (SQLite :memory:)
```

Módulos: **usuarios** (autenticação, perfis e sessão), **cronogramas**, **tarefas** (fases,
dependências e caminho crítico), **responsaveis** e **preferencias** (tema).

### Perfis e permissões

A política vive em `electron/modulos/usuarios/dominio/perfil.ts` e é a fonte da verdade: o registrador
de canais IPC consulta a sessão antes de executar qualquer coisa, e as permissões do usuário viajam na
sessão para a interface esconder o que ele não pode fazer.

| Permissão | O que libera | administrador | gestor | usuário | visualizador |
|---|---|:--:|:--:|:--:|:--:|
| `leitura` | consultar cronogramas, atividades e responsáveis | ✓ | ✓ | ✓ | ✓ |
| `tarefas` | criar e editar tarefas, progresso e dependências | ✓ | ✓ | ✓ | |
| `planejamento` | cronogramas, fases e responsáveis | ✓ | ✓ | | |
| `administracao` | gerenciar usuários | ✓ | | | |

A sessão vive só na memória do processo principal: fechar o app exige login de novo. Cinco tentativas
erradas de senha bloqueiam aquele login por 30 segundos.

### Datas, dependências e caminho crítico

- As datas são sempre suas: o app não reagenda nada sozinho.
- A dependência é do tipo término → início. Ciclos são barrados na gravação.
- O caminho crítico sai de `dominio/servicos/calculo-do-cronograma.ts`: uma passagem para trás calcula
  a data mais tarde em que cada tarefa poderia terminar sem atrasar o fim do projeto. Folga zero é
  caminho crítico. Quando a tarefa começa antes do fim de uma predecessora, a linha recebe um aviso.
- A fase é um resumo: menor início, maior término e percentual ponderado pela duração das subtarefas.

### Regras verificadas pelo `npm run lint`

- `dominio` e `aplicacao` não importam bibliotecas externas nem módulos do Node.
- As dependências apontam para dentro: `apresentacao`/`infraestrutura` → `aplicacao` → `dominio`.
- Um módulo não importa as camadas internas de outro. Exemplo: `tarefas` verifica se um cronograma existe pela porta `VerificadorDeCronograma`, e a raiz de composição a liga à API pública de `cronogramas`.
- No renderer, os módulos não se conhecem, e `compartilhado/` não conhece nenhum módulo. Quem compõe é `app/`.

Concessão consciente: a FK `tarefas.cronograma_id → cronogramas.id ON DELETE CASCADE` atravessa módulos.
Mais para frente ela pode virar um evento `CronogramaExcluido`.

### Fluxo de uma chamada

`componente → store Zustand → clienteDesktop → window.api (preload) → ipcMain → controlador (zod) → caso de uso → repositório → SQLite`

Todo canal devolve `Resultado<T>`: `{ ok: true, dados }` ou `{ ok: false, erro: { codigo, mensagem } }`.
Erros de domínio (`VALIDACAO`, `NAO_ENCONTRADO`) chegam intactos à UI.

## Persistência

- Arquivo: `gestao-cronogramas.db`, que fica:
  - no `.exe` portátil: na mesma pasta do `.exe`;
  - no build desempacotado (`dist/win-unpacked`): na pasta do executável;
  - no desenvolvimento: em `dados-dev/` (ignorado pelo git).
- Se a pasta não aceita escrita, o app mostra uma mensagem pedindo para movê-lo e encerra.
- Journal `DELETE` (sem WAL): com o app fechado, o banco é um arquivo único, fácil de copiar ou fazer backup.
- Migrações versionadas em `electron/nucleo/infraestrutura/banco/migracoes/`, aplicadas na inicialização.
- Só uma instância roda por vez, para evitar duas escrevendo no mesmo `.db`.

## Design: glassmorphism "clean corporativo"

- **Tokens** em `renderer/app/globals.css`: variáveis CSS com variantes clara e escura, expostas ao Tailwind por `@theme inline` (`bg-superficie`, `text-texto`, `text-primaria`...).
- **Paleta:** azul-marinho `#1F4E8C` como primária e verde-azulado `#0E9F9A` como destaque, sobre neutros frios.
- **Vidro:** os utilitários `vidro` e `vidro-forte` combinam `backdrop-filter` com uma borda translúcida. O blur fica só em superfícies estruturais (painéis, barra lateral, modais); linhas de tabela e campos não usam blur.
- **Acrylic nativo** no Windows 11 22H2+: a janela usa `backgroundMaterial: 'acrylic'`. No Windows 10 (ou com `GC_SEM_VIDRO_NATIVO=1`), o fundo é um gradiente com manchas desfocadas.
- **Tema:** Sistema, Claro ou Escuro, salvo no SQLite e aplicado via `nativeTheme`. O CSS reage a `prefers-color-scheme`, então a UI, o Acrylic e os botões da janela mudam juntos.
- **Acessibilidade:**
  - Com `prefers-reduced-transparency` (Windows com "Efeitos de transparência" desligado), as superfícies ficam sólidas.
  - As etiquetas misturam a cor do tom com a cor do texto, para manter contraste AA.
  - Foco visível e `prefers-reduced-motion` são respeitados.
- **Componentes** em `renderer/compartilhado/ui/`: `PainelVidro`, `Botao`/`BotaoIcone`, `Campos`, `Modal` (sobre `<dialog>`), `DialogoConfirmacao`, `Tabela`, `Etiqueta`, `BarraProgresso`, `EstadoVazio`, `MensagemErro`, `CabecalhoPagina`.

## Limitações conhecidas

- **Export estático:** não há rotas dinâmicas com IDs desconhecidos no build. Por isso o detalhe usa `/cronograma/?id=<uuid>`. Server Actions, Route Handlers e `next/image` otimizado também não estão disponíveis.
- **`.exe` portátil:** a cada abertura ele se descompacta no `%TEMP%`, então a inicialização é alguns segundos mais lenta que a de um app instalado. O cache do Chromium fica em `%APPDATA%`; os dados de negócio não.
- **Acrylic:** fica sólido quando a janela perde o foco, que é o comportamento do Windows.
- **Assinatura e ícone:** o executável não é assinado e usa o ícone padrão do Electron. Para trocar, coloque `recursos/icon.ico`.

## Armadilhas resolvidas (não reverter)

- **User-Agent sem acentos** (`electron/main.ts`): o UA padrão inclui o productName ("Gestão..."). Como cabeçalhos HTTP só aceitam Latin-1, o `protocol.handle` rejeitava todo `fetch()` do renderer (fontes, navegação).
- **`protocolo-app.ts` lê o arquivo direto** em vez de usar `net.fetch(file://)`, pelo mesmo motivo: o caminho do projeto tem acento.
- **`npmRebuild: false`** no electron-builder: o better-sqlite3 já vem pré-compilado. Um rebuild tentaria compilar com node-gyp.
- **O Next.js 16.3 cria `renderer/AGENTS.md` e `renderer/CLAUDE.md`** a cada `next dev`. São orientações para agentes de IA sobre a versão instalada. Para desativar, use `agentRules: false` no `next.config.ts`.

## Próximos passos sugeridos

- Reordenar fases e tarefas (arrastar na lista).
- Dependências com folga (lag) e tipos além de término → início.
- Calendário de dias úteis e feriados no cálculo de duração.
- Módulo de relatórios (já aparece na navegação como "em breve") e exportação do Gantt.
- Backup/exportação do `.db` e ícone do aplicativo.
