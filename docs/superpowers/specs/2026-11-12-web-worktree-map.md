# Mapa de worktrees do web GasGuard

- **Data:** 2026-11-12
- **Público:** o agente **orquestrador** em `feat/web`
- **Escopo:** entregar **todo o web** (Etapas 3, 4 e 5 do [roadmap](../../roadmap.md)) na branch pai `feat/web`
- **Fonte:** [architecture.md](../../architecture.md), [csv-contract.md](../../csv-contract.md), [scenarios.md](../../scenarios.md), [decisions.md](../../decisions.md)

Este arquivo é o contrato. Assinaturas, ownership e o pipeline abaixo **valem mais** do que qualquer worker inventar.

## Objetivo

Dois orquestradores, contextos isolados. A `feat/web` **nunca** lê plano, diff, log de teste nem transcript de browser.

Entrega: dashboard em tempo real + login/e-mail de alerta crítico, **código de produto só em `web/`**. Planos Superpowers entram em `docs/superpowers/plans/`. Hardware e mock **não entram**. O mock na raiz já grava o CSV.

## Por que 2 níveis, não 3 (e não 1)

| Camada | O que é | Git worktree | Contexto |
|---|---|---|---|
| 1. Orquestrador `feat/web` | loop até W5; despacha; mergeia | pai (`feat/web`) | **limpo** — só o mapa + o recibo JSON |
| 2. Orquestrador da **branch** | workflow dos 3 agentes | **um** filho (`new-child`) | vive e morre com a fatia |
| 3. Planner / implementer / reviewer | o trabalho | **o mesmo** filho (`--worktree current`) | sessão nova cada um |

Não é 1 nível: se a `feat/web` disparar planner → implementer → reviewer, o transcript da fatia entra nela e o contexto explode no loop.

Não é 3 worktrees aninhados: planner, implementer e reviewer **precisam do mesmo checkout** (o plano vira código na mesma branch). Terceiro git worktree é slot a toa (Max/Orca) e a skill de worktrees **proíbe** worktree dentro de worktree.

Pico em série (padrão): **2 git worktrees** (pai + 1 filha) e no máximo **3 sessões** (pai à espera + orch da branch + 1 worker). Workers fecham depois do `worker_done`. Sem `--keep-open`.

Orca: a pai usa `worker-start --worktree new-child --base-branch feat/web --name <branch> --agent cursor` (ou o agente da sessão). A orch da branch usa `worker-start --worktree current` para os 3. A pai **termina o turno** depois de disparar e espera o wake do Orca — não faz poll.

## Recibo (única coisa que volta para a `feat/web`)

A orch da branch devolve **só** este JSON. Sem diff, sem plano, sem log.

```json
{
  "id": "W1a",
  "branch": "feat/web-lib-pure",
  "verdict": "PASS",
  "head": "abc123",
  "plan": "docs/superpowers/plans/2026-11-12-web-lib-pure.md",
  "files": ["web/src/lib/scenarios.ts"],
  "tests": "npm test/lint/build exit 0",
  "browser": "home carrega; N/A de UI nesta fatia",
  "review": "PASS",
  "notes": ""
}
```

`verdict` é `PASS` ou `FAIL`. `FAIL` traz `notes` com o bloqueio. A pai **não** abre o plano para “conferir”.

## Pipeline por fatia (orch da branch, não a pai)

```text
feat/web orch                         branch orch (filho, contexto próprio)
  pick next ID                          1. PLANNER   writing-plans     → commit do plano
  spawn new-child + spec da fatia       2. IMPLEMENTER executing-plans → TDD, browser, push
  wait worker_done                      3. REVIEWER  requesting-code-review (read-only)
  se PASS: merge feat/web                 FAIL Critical/Important → volta ao implementer
  se FAIL: reporta ao humano              teto 3 voltas; depois FAIL no recibo
  loop                                    worker_done com o JSON
```

Papéis não se misturam. Quem mergeia é **só** a `feat/web`.

Paralelismo é opcional. Padrão: **uma filha por vez**.

## Estado em `main` (não recriar)

Já existe e está congelado:

- `web/src/types/` — `Reading`, `ReportEvent`, `RiskLevel` (não reabrir)
- `web/src/lib/risk-level.ts` + teste, `lib/utils.ts` (`cn`)
- `web/src/app/page.tsx` (placeholder), `layout.tsx`, `globals.css`
- `web/src/components/ui/button.tsx`
- READMEs vazios em `hooks/`, `services/`, `services/report/`, `app/api/`, `components/`
- `.env.example` com `DAILY_REPORT_PATH=../daily-report.csv`
- Recharts e lucide já instalados

Falta tudo das Etapas 3–5: parser, tail, service, SSE, hook, `lib/` de negócio, dashboard, auth, e-mail.

## Guardrails (todo agente)

- Só edita a coluna **Owns** da branch + o plano em `docs/superpowers/plans/` (planner). Se precisa de outro arquivo, para e devolve ao orquestrador.
- Não toca `hardware/`, `mock-daily-report.js`, `docs/` fora de `docs/superpowers/plans/` (e spec curta da fatia, se o planner precisar).
- Não cria pasta nova de primeiro nível em `web/src`.
- Não instala pacote npm. Sem `shadcn add`. Sem `next-auth`. Sem `nodemailer`.
- Camadas: `app` → `components` → `hooks` → `services` → `lib` → `types`. `components` e `hooks` **nunca** importam `services`.
- Só `web/src/services/report/` conhece colunas em português.
- O web **não** recalcula risco. Exibe `level` e `scenarioId`.
- Sem dado há > 5 s → estado `no_data` (cinza). Nunca mostrar NORMAL com dado velho.
- Código em inglês; UI em pt-BR. Protótipo acadêmico, não detector certificado.
- Sem Testing Library e sem jsdom novo. Hook e UI extraem funções puras testáveis. O `build` cobre o JSX.
- Fixtures de `Reading` / CSV **dentro do próprio `*.test.ts`**.

## Arquivos que nunca duas filhas editam ao mesmo tempo

| Arquivo | Dono |
|---|---|
| `web/src/types/**` | só W0 |
| `web/src/app/page.tsx` | W4, depois W5 (nessa ordem) |
| `web/src/app/layout.tsx` | W4 |
| `web/src/app/globals.css` | W4 |
| `web/package.json`, `package-lock.json`, `components.json` | ninguém |
| `web/.env.example` | W0 |

## Grafo

```text
main
 └─ feat/web                         PAI — orquestrador vive aqui
      └─ W0  chore/web-contracts
           ├─ W1a feat/web-lib-pure
           ├─ W1b feat/web-csv-parse
           │     └─ W2  feat/web-report-service
           │           ├─ W3a feat/web-sse
           │           └─ W3b feat/web-use-readings
           ├─ W3c feat/web-ui-risk
           ├─ W3d feat/web-ui-metrics
           ├─ W3e feat/web-ui-chart
           └─ W3f feat/web-ui-events
                 └─ W4  feat/web-page-wire
                       └─ W5  feat/web-auth-alerts
```

Ordem **em série** (padrão do orquestrador):

`W0 → W1a → W1b → W2 → W3a → W3b → W3c → W3d → W3e → W3f → W4 → W5`

Cada uma só começa quando a anterior já foi **mergeada em `feat/web`**.

## Loop da `feat/web` (contexto limpo)

A pai **não** dispara planner, implementer nem reviewer. Só isto:

1. Se `feat/web` não existe: criar a partir de `main`, push `-u`.
2. `.worktrees/` no `.gitignore` (commit na pai se faltar).
3. Próximo ID da ordem em série.
4. Disparar **uma** orch de branch e **encerrar o turno**:

   ```text
   orca orchestration worker-start \
     --spec-file <prompt da orch da branch> \
     --worktree new-child \
     --base-branch feat/web \
     --name <branch> \
     --agent cursor \
     --task-title "<ID> <branch>"
   ```

   Sem Orca: equivalente é um subagente isolado no worktree da filha, com a ordem de devolver **só** o recibo JSON.
5. Wake com `worker_done`: ler o JSON. Nada mais.
6. `PASS`: merge `--no-ff` da filha em `feat/web`, `cd web && npm test && npm run lint && npm run build`, push `feat/web` e da filha, remover o worktree filho.
7. `FAIL`: parar o loop e reportar `notes` ao humano. Não começar a próxima fatia.
8. Repetir até W5 estar na pai. **Não** mergear em `main`.

Proibido na pai: abrir o plano, `git diff` da filha, ler teste, abrir o browser da fatia, resumir transcript. O recibo basta. O `npm test` **depois do merge** é o único comando de verificação da pai.

## Loop da orch da branch (os 3 agentes)

Roda **dentro** do filho. Spec = fatia deste mapa + Owns + contratos.

1. Baseline: `cd web && npm install` se precisar; `npm test` tem que passar **antes** de implementar.
2. `worker-start --worktree current` o **PLANNER**. Esperar o plano commitado.
3. `worker-start --worktree current` o **IMPLEMENTER**. Esperar tasks, test/lint/build, browser, push da filha.
4. `worker-start --worktree current` o **REVIEWER**.
5. Critical/Important → devolver ao implementer na mesma branch; re-revisar. Teto: 3 voltas.
6. `worker_done` com o recibo JSON. Não mergeia. Não fala com a pai além disso.

## Browser (implementer, toda branch)

Usar as browser tools disponíveis (Cursor browser / MCP). Não declarar feito com um screenshot estático.

**Sempre (inclusive W0–W2):** `npm run dev` em `web/` + mock se o CSV for necessário + abrir `http://localhost:3000` e confirmar que a home carrega (placeholder ou dashboard) sem erro de overlay.

**Quando a fatia for visível (W3c–W5 e W4):** exercitar o fluxo da tabela “Done when” como um usuário: click, estado vazio, estado com dado, mobile se o layout mudou.

W3a/W3b: home não quebra; se o dashboard ainda não existe, o smoke da home basta + teste automatizado do contrato.

Se não houver browser tool: `curl -sI http://localhost:3000` não substitui UI. O implementer declara o que **não** conseguiu clicar e o revisor trata como gap se a fatia for visível.

## Contratos congelados

Workers copiam estas assinaturas. Não renomeiam.

### Tipos novos (W0 cria, os outros só importam)

`web/src/types/connection.ts`

```ts
export type ConnectionStatus = "live" | "reconnecting" | "no_data";
```

`web/src/types/event-filter.ts`

```ts
import type { RiskLevel } from "./risk-level";

export type EventPeriod = "last-hour" | "last-6h" | "today";

export interface EventFilterState {
  levels: RiskLevel[];
  period: EventPeriod;
}
```

`web/src/types/recent-readings.ts`

```ts
import type { Reading } from "./reading";
import type { ReportEvent } from "./report-event";

export interface RecentReadings {
  date: string;
  readings: Reading[];
  events: ReportEvent[];
}
```

Reexportar em `web/src/types/index.ts`.

### `lib/` (W1a)

```ts
import type { Reading, ReportEvent, RiskLevel } from "@/types";
import type { EventFilterState } from "@/types";

export interface ScenarioCopy {
  id: number;
  title: string;
  guidance: string;
}

export function getScenario(id: number): ScenarioCopy;

export function detectEvents(readings: Reading[]): ReportEvent[];

export function filterEvents(
  events: ReportEvent[],
  filter: EventFilterState,
  now: Date,
): ReportEvent[];

export function formatAge(isoTimestamp: string, now: Date): string;
export function formatGasDelta(value: number, base: number): string;
export function formatTemperature(celsius: number | null): string;
```

Regras:

- `getScenario`: ids 0–17 de [scenarios.md](../../scenarios.md). Id desconhecido → título `"Cenário desconhecido"`, guidance `"—"`.
- `detectEvents`: uma `ReportEvent` por mudança de `level` entre leituras **consecutivas já ordenadas por `timestamp`**. A primeira leitura do dia **não** gera evento. `id` = `timestamp` da leitura que mudou o nível. Teste: `[NORMAL, NORMAL, ALERT]` → 1 evento, `from: "NORMAL"`, `to: "ALERT"`.
- `filterEvents`: `levels` vazio = todos os níveis. `today` = mesma data local de `now`. Períodos em horário local. Saída na mesma ordem de entrada (W4/W3f invertem para “mais novo no topo” se a entrada vier cronológica).
- `formatAge`: `"há 12 s"`, `"há 3 min"`, `"há 2 h"` (pt-BR, espaço antes da unidade).
- `formatGasDelta`: `"+120"` / `"-15"` / `"+0"` (inteiro, sempre com sinal).

### CSV (W1b)

```ts
import type { Reading } from "@/types";

export function parseCsvLine(line: string, date: string): Reading | null;

export interface TailSnapshot {
  size: number;
  truncated: boolean;
  lines: string[];
}

export function readNewLines(
  content: string,
  previousSize: number,
): TailSnapshot;
```

Regras de [csv-contract.md](../../csv-contract.md):

- `date` é `AAAA-MM-DD` da linha 1. `timestamp` = `${date}T${hora}` (sem fuso).
- `origem` `placa`→`board`, `mock`→`mock`.
- `nivel` PT→EN: `NORMAL`→`NORMAL`, `ATENCAO`→`ATTENTION`, `ALERTA`→`ALERT`, `ALTO`→`HIGH`, `CRITICO`→`CRITICAL`, `FALHA`→`FAILURE`.
- Linha com ≠ 17 campos, tipo inválido ou `nivel` desconhecido → `null` (o service loga).
- `temp` / `temp_limite` vazios → `null`.
- `readNewLines`: se `content.length < previousSize`, `truncated: true` e relê do início (pula linha 1 e 2, devolve só linhas de dados **completas** terminadas em `\n`). Bytes finais sem `\n` ficam de fora (`size` = offset até o último `\n` consumido).

W1b **não** implementa `report-service.ts`.

### Service (W2)

`web/src/services/report/report-service.ts` começa com `import "server-only";`.

```ts
import type { Reading, RecentReadings } from "@/types";

export function getReportPath(): string;

export function getRecentReadings(): Promise<RecentReadings | null>;

export function watchReadings(handlers: {
  onReading: (reading: Reading) => void;
  onReset: () => void;
}): () => void;
```

- Caminho: `process.env.DAILY_REPORT_PATH ?? "../daily-report.csv"`, resolvido a partir de `process.cwd()` (Next roda em `web/`).
- Arquivo ausente, linha 1 inválida ou cabeçalho ≠ contrato → `null` e log no servidor.
- `readings`: últimos 10 min em relação à **última** leitura válida do arquivo.
- `events`: `detectEvents` em **todas** as leituras válidas do dia (ordem cronológica).
- `watchReadings`: poll **500 ms**, usa `readNewLines` + `parseCsvLine`, chama `onReading` por linha nova; `onReset` se `truncated`. O retorno cancela o interval.
- Este arquivo é o único que importa `fs`/`node:fs`.

### SSE (W3a)

`GET /api/stream` em `web/src/app/api/stream/route.ts`.

| Evento SSE | `data` | Quando |
|---|---|---|
| `reading` | JSON de `Reading` | cada linha nova |
| `ping` | vazio | a cada 15 s |
| `reset` | vazio | arquivo recriado (`onReset`) |

Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`. Sem `Last-Event-ID`. Sem rota `/api/report`.

### Hook (W3b)

`web/src/hooks/use-readings.ts` (`"use client"`).

```ts
import type { ConnectionStatus, Reading, RecentReadings, ReportEvent } from "@/types";

export function useReadings(initial: RecentReadings | null): {
  readings: Reading[];
  events: ReportEvent[];
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
};
```

- Abre `EventSource("/api/stream")`.
- `reading`: descarta se `timestamp` ≤ o último já visto; senão acumula leitura e atualiza eventos com `detectEvents`.
- Buffer de gráfico: manter só 10 min.
- `reset` **ou** `EventSource.onerror` seguido de `onopen`: `router.refresh()` (de `next/navigation`).
- Sem evento `reading` há > 5 s, ou `initial === null` e nada chegou: `connection: "no_data"`.
- Conectando / erro: `"reconnecting"`. Aberto e dado fresco: `"live"`.
- `secondsSinceLast`: segundos inteiros desde a última leitura, ou `null`.

### Componentes (W3c–W3f) — só props, sem data fetching

Todos em `web/src/components/dashboard/`, `"use client"` só se precisarem de estado local (filtros). Animações de pulso **no próprio arquivo** (Tailwind), não em `globals.css`.

Cores ([scenarios.md](../../scenarios.md)): NORMAL verde, ATTENTION amarelo, ALERT laranja + pulso, HIGH vermelho + pulso, CRITICAL vermelho escuro alternando vermelho/laranja + pulso, FAILURE e `no_data` cinza.

```ts
// W3c  risk-card.tsx + dashboard-header.tsx
export function DashboardHeader(props: {
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
}): JSX.Element;

export function RiskCard(props: {
  reading: Reading | null;
  connection: ConnectionStatus;
}): JSX.Element;

// W3d  metrics-grid.tsx
export function MetricsGrid(props: { reading: Reading | null }): JSX.Element;

// W3e  readings-chart.tsx
export function ReadingsChart(props: { readings: Reading[] }): JSX.Element;

// W3f  event-list.tsx + event-filters.tsx
export function EventFilters(props: {
  value: EventFilterState;
  onChange: (next: EventFilterState) => void;
}): JSX.Element;

export function EventList(props: {
  events: ReportEvent[];
  filter: EventFilterState;
}): JSX.Element;
```

Conteúdo mínimo:

- **Header:** “GasGuard”, status (Ao vivo / Reconectando / Sem dados), `há N s`.
- **RiskCard:** cor do nível, título + orientação via `getScenario`. Pulso em ALERT/HIGH/CRITICAL. Selo **SIMULAÇÃO** se `source === "mock"`. Se `connection === "no_data"` ou `reading === null`: cinza, “Sem dados”, nunca “Ambiente normal”.
- **MetricsGrid:** grade 2 colunas — GLP MQ-6 com delta, MQ-2, chama, temperatura + limite, movimento (`sem movimento há Ns` se fogão ligado), fogão. `reading === null` → travessões.
- **ReadingsChart:** Recharts, últimos 10 min, 3 séries MQ-6 / MQ-2 / temperatura. Eixo X = hora.
- **EventFilters:** chips de nível (vários ao mesmo tempo) + período `Última hora` · `Últimas 6 h` · `Hoje` (padrão `today`).
- **EventList:** aplica `filterEvents`, **mais novo no topo**, lista com scroll interno.

W3c–W3f **não** criam `dashboard.tsx` nem importam o hook. W4 é quem liga.

### Página (W4)

`page.tsx` vira Server Component dinâmico:

```ts
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const initial = await getRecentReadings();
  return <Dashboard initial={initial} />;
}
```

Novo `web/src/components/dashboard/dashboard.tsx` (`"use client"`): chama `useReadings(initial)` e monta header → risk → metrics → chart → filtros+lista → rodapé já existente. **W4 é o único que cria `dashboard.tsx`.**

`layout.tsx`: tema claro/escuro **do sistema**. O CSS atual só pinta `.dark`; W4 copia `prefers-color-scheme` para `.dark` (script mínimo). Sem `next-themes`.

Rodapé obrigatório: `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`

### Auth + e-mail (W5)

Sem pasta nova de primeiro nível: `web/src/services/auth/`, `web/src/services/alerts/`.

Auth (protótipo local, JSON em `web/.data/users.json` ignorado pelo git, senha com `scrypt` de `node:crypto`):

- Server Actions em `app/login/page.tsx` e `app/cadastro/page.tsx`
- cookie httpOnly assinado (HMAC-SHA256 com `AUTH_SECRET`)
- `AccountMenu` em `components/auth/account-menu.tsx`
- W5 **pode** editar `dashboard.tsx` / `page.tsx` só para encaixar o menu

Alertas:

- `watchReadings` no process do Next (`instrumentation.ts` ou equivalente), e-mail ao entrar em `CRITICAL`
- Transport: `fetch` para `https://api.resend.com/emails`. Sem `nodemailer`
- Anti-repetição: ≥ **5 min** entre e-mails para o mesmo usuário
- Assunto com `[SIMULAÇÃO] ` quando `reading.source === "mock"`
- Sem `RESEND_API_KEY` ou sem usuários: logar e não quebrar o dashboard

`web/.env.example` (W0 já deixa as chaves; W5 só usa):

```
DAILY_REPORT_PATH=../daily-report.csv
AUTH_SECRET=
RESEND_API_KEY=
ALERT_FROM_EMAIL=GasGuard <alertas@localhost>
```

## Tabela das branches

| ID | Branch | Base | Owns (só isto + o plano da fatia) | Done when |
|---|---|---|---|---|
| W0 | `chore/web-contracts` | `feat/web` | `web/src/types/connection.ts`, `event-filter.ts`, `recent-readings.ts`, `types/index.ts`, `web/.env.example`; `web/.data/` no `web/.gitignore` | tipos compilam; `npm test`; home ainda abre |
| W1a | `feat/web-lib-pure` | `feat/web` com W0 | `web/src/lib/scenarios.ts`, `events.ts`, `filters.ts`, `format.ts` + `*.test.ts`; `lib/README.md` | testes cobrem ids 0–17, mudança de nível, filtros, format |
| W1b | `feat/web-csv-parse` | `feat/web` com W0 | `web/src/services/report/parse-csv-line.ts`, `tail-report.ts` + `*.test.ts`; `services/report/README.md` | parse PT→EN; linha ruim = `null`; truncamento; meia linha |
| W2 | `feat/web-report-service` | `feat/web` com W1a+W1b | `web/src/services/report/report-service.ts` + `report-service.test.ts` | `getRecentReadings` / `watchReadings` com CSV em tmp |
| W3a | `feat/web-sse` | `feat/web` com W2 | `web/src/app/api/stream/route.ts`, `sse-format.ts` + `sse-format.test.ts`; remove `app/api/README.md` se a rota o substituir | `formatSse` cobre `reading`/`ping`/`reset`; a rota só liga `watchReadings` |
| W3b | `feat/web-use-readings` | `feat/web` com W2 | `web/src/hooks/use-readings.ts` + `use-readings.test.ts`; `hooks/README.md` | duplicata por timestamp; 5 s → `no_data`; `reset` chama `refresh` |
| W3c | `feat/web-ui-risk` | `feat/web` com W1a | `web/src/components/dashboard/dashboard-header.tsx`, `risk-card.tsx` + testes puros de cor/status | `no_data` cinza; selo SIMULAÇÃO; pulso só ALERT+ |
| W3d | `feat/web-ui-metrics` | `feat/web` com W1a | `web/src/components/dashboard/metrics-grid.tsx` | 6 métricas, delta MQ-6, null → "—" |
| W3e | `feat/web-ui-chart` | `feat/web` com W1a | `web/src/components/dashboard/readings-chart.tsx` | 3 séries; array vazio não crasha |
| W3f | `feat/web-ui-events` | `feat/web` com W1a | `web/src/components/dashboard/event-list.tsx`, `event-filters.tsx` | chips + período; mais novo no topo |
| W4 | `feat/web-page-wire` | `feat/web` com W3a–W3f | `web/src/components/dashboard/dashboard.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css` (só se precisar do `.dark` via sistema), `components/README.md` | `await connection()`; tela única mobile-first; rodapé; fluxo no browser com mock |
| W5 | `feat/web-auth-alerts` | `feat/web` com W4 | `web/src/services/auth/**`, `services/alerts/**`, `app/login/**`, `app/cadastro/**`, `components/auth/**`, `instrumentation.ts` se necessário; **patch mínimo** em `dashboard.tsx` / `page.tsx` | cadastro/login; CRITICAL tenta Resend com throttle e `[SIMULAÇÃO]` |

Nome do plano: `docs/superpowers/plans/2026-11-12-<branch-sem-prefixo>.md` (ex.: `2026-11-12-web-lib-pure.md`).

## Prompts

A `feat/web` só dispara a orch da branch (prompt abaixo). A orch da branch dispara os 3 seguintes com `--worktree current`.

### ORCH DA BRANCH (único agente que a `feat/web` sobe)

```text
Você é o orquestrador da fatia <ID> (<BRANCH>). Worktree filho já criado a partir de feat/web.

Leia só: AGENTS.md, docs/superpowers/specs/2026-11-12-web-worktree-map.md
(fatia <ID>, Owns, contratos, prompts PLANNER/IMPLEMENTER/REVIEWER, recibo JSON).

Seu trabalho: o pipeline dos 3 agentes NESTE checkout. Não mergeie em feat/web.

1. PLANNER  — worker-start --worktree current. Espere o plano commitado.
2. IMPLEMENTER — idem. Espere test/lint/build, browser, push.
3. REVIEWER — idem, read-only.
   Critical/Important → implementer de novo. Teto 3 voltas.

worker_done = SOMENTE o JSON do recibo (id, branch, verdict, head, plan, files,
tests, browser, review, notes). Sem diff, sem plano, sem log.

Proibido: editar código você mesmo; instalar pacote; tocar hardware/mock.
```

### PLANNER

```text
Você é o PLANNER da fatia <ID> (<BRANCH>) no worktree <WORKTREE_PATH>.

REQUIRED SKILL: superpowers:writing-plans.
Anuncie a skill e siga o formato dela (header, tasks com checkboxes, TDD, código completo, sem TBD).

Leia:
- AGENTS.md
- docs/superpowers/specs/2026-11-12-web-worktree-map.md  → fatia <ID> + Contratos congelados + Owns
- docs/architecture.md
- docs/csv-contract.md e docs/scenarios.md se a fatia usar

Spec da fatia = a seção deste mapa. Não reabra decisões. Não implemente.

Não pergunte se o humano quer subagent-driven ou inline: a execução já está decidida
(executing-plans nesta branch, depois reviewer, merge em feat/web).

Owns de código: <lista>
Plano em: docs/superpowers/plans/<ARQUIVO>

Commit só o plano (e spec curta da fatia se o mapa tiver buraco real).
Não mexa em web/src. Não faça merge. Não abra PR.

Devolva: caminho do plano, quantas tasks, riscos.
```

### IMPLEMENTER

```text
Você é o IMPLEMENTER da fatia <ID> (<BRANCH>) no worktree <WORKTREE_PATH>.

REQUIRED SKILL: superpowers:executing-plans.
Anuncie a skill. NÃO use subagent-driven-development — o plano já foi escrito para executing-plans.

Plano: docs/superpowers/plans/<ARQUIVO>
Mapa: docs/superpowers/specs/2026-11-12-web-worktree-map.md (fatia <ID> + contratos)

Owns: <lista>
Não toque em mais nada. Não instale pacote. Não mexa em hardware/ nem no mock.

Siga o plano task a task. TDD. Spec-driven: teste afirma o contrato do mapa, não o código que você escreveu.
Ao final de todas as tasks, em web/: npm test && npm run lint && npm run build
Browser: siga a seção Browser do mapa. Exercite o Done when da fatia.
Push: git push -u origin <BRANCH>
Não faça merge em feat/web. Não abra PR. Não chame finishing-a-development-branch
(o orquestrador mergeia depois do reviewer).

Devolva: tasks feitas, SHA HEAD, evidência de test/lint/build, o que clicou no browser.
```

### REVIEWER

```text
Você é o REVIEWER da fatia <ID> (<BRANCH>). Read-only: não commit, não checkout que mova HEAD, não merge.

REQUIRED SKILL: superpowers:requesting-code-review (template code-reviewer.md).

Base: feat/web
Head: <BRANCH>
  git diff --stat feat/web..<BRANCH>
  git diff feat/web..<BRANCH>

Plano: docs/superpowers/plans/<ARQUIVO>
Mapa: docs/superpowers/specs/2026-11-12-web-worktree-map.md fatia <ID>

Cheque além do template:
- Só arquivos da coluna Owns (+ o plano)?
- Contratos de assinatura intactos?
- Hook/componente importou services? Pacote novo?
- Testes afirmam o spec, ou só espelham o código?
- Browser: a evidência do implementer cobre o Done when?

Veredito único no final:
- PASS — pode mergear em feat/web
- FAIL — lista Critical e Important (bloqueiam merge) e Minor (não bloqueia)

Não mergeie. Devolva o veredito ao orquestrador.
```

## Verificação na pai (depois de W4; W5 à parte)

Com o mock (`node mock-daily-report.js --scenario tour`) e `npm run dev` em `web/`, no browser:

1. `/` já vem com gráfico/métricas; SSE atualiza.
2. Parar o mock > 5 s → “Sem dados”, nunca NORMAL.
3. Religar o mock → ao vivo; sem duplicar pontos.
4. `--scenario gas_leak_flame` → CRITICAL, pulso, evento no topo.
5. W5: cadastrar e-mail; CRITICAL tenta envio ou loga se não houver chave.

## Fora deste mapa

- Etapa 2 (firmware + filtro Python)
- MQTT / Wi-Fi
- Deploy em nuvem
- Recalcular regras de risco no web
- Merge de `feat/web` em `main` (passo humano depois da pai pronta)
