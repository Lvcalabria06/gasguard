# Página do dashboard (W4) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar a tela única: Server Component dinâmico carrega o CSV, o client `Dashboard` chama `useReadings` e empilha as peças já prontas (header → risco → métricas → gráfico → filtros + lista → rodapé), com tema claro/escuro do sistema.

**Architecture:** `page.tsx` fica fino — `await connection()` depois `getRecentReadings()` depois `<Dashboard initial={...} />`. `dashboard.tsx` é o único `"use client"` novo: hook + `useState` do filtro + layout em coluna. `layout.tsx` copia `prefers-color-scheme` para a classe `.dark` com um script mínimo. Sem `next-themes`. Sem pasta nova. Sem recálculo de risco. As peças W3c–W3f entram só como imports.

**Tech Stack:** Next.js 16.4.6 App Router (`connection()` de `next/server`), React 19 (JSX automático), TypeScript 5 (`strict`), Tailwind CSS 4 (tokens já no `globals.css`), Vitest 5.1.0 ambiente `node`. Sem jsdom, sem Testing Library, sem pacote novo, sem `shadcn add`, sem `next-themes`.

**Spec:** fatia W4 + Contratos congelados Página + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Tela e camadas em [`docs/architecture.md`](../../architecture.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-page-wire` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-page-wire`.
- Baseline: em `web/`, `npm test` já passou (17 files / 100 tests). Não edite `web/src/lib/**`, `web/src/types/**`, `web/src/hooks/**`, `web/src/services/**`, `web/src/app/api/**`, nem os oito arquivos W3c–W3f em `components/dashboard/`.
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção.” + rodapé acadêmico). Esta fatia **substitui** o placeholder.
- `layout.tsx` já tem `lang="pt-BR"`, Geist, metadata. **Não existe** classe `.dark` no `<html>` — o CSS em `globals.css` só pinta `.dark { ... }`, então o modo escuro do sistema hoje não liga. W4 adiciona o script; **não** reescreve os tokens.
- `useReadings`, `getRecentReadings`, `DashboardHeader`, `RiskCard`, `MetricsGrid`, `ReadingsChart`, `EventFilters` (`DEFAULT_EVENT_FILTER`), `EventList` já existem. Importe; não copie regra, cor, texto de cenário nem parse de CSV.
- `EventFilters` / `EventList` **não** têm `"use client"` (W3f). O Next coloca o JSX no bundle do cliente porque `Dashboard` é client e os importa. Não adicione a diretiva nos filhos.

## Arquivos (decomposição)

```
web/src/components/dashboard/
├── dashboard-header.tsx        (congelado — não mexer)
├── dashboard-header.test.ts    (congelado — não mexer)
├── risk-card.tsx               (congelado — não mexer)
├── risk-card.test.ts           (congelado — não mexer)
├── metrics-grid.tsx            (congelado — não mexer)
├── metrics-grid.test.ts        (congelado — não mexer)
├── readings-chart.tsx          (congelado — não mexer)
├── readings-chart.test.ts      (congelado — não mexer)
├── event-filters.tsx           (congelado — não mexer)
├── event-filters.test.ts       (congelado — não mexer)
├── event-list.tsx              (congelado — não mexer)
├── event-list.test.ts          (congelado — não mexer)
├── dashboard.tsx               [T1] dashboardView + Dashboard
└── dashboard.test.ts           [T1]

web/src/app/
├── page.tsx                    [T2] Server Component dinâmico
├── page.test.ts                [T2]
├── layout.tsx                  [T3] script .dark do sistema
├── layout.test.ts              [T3]
└── globals.css                 NÃO EDITAR

web/src/components/README.md    [T3]
```

Nada fora desta lista. Sem `index.ts`. Sem `theme-script.ts`. Sem `providers.tsx`. Sem `next-themes`. Sem pasta nova em `web/src`. Fixtures de `Reading` **dentro** do próprio `*.test.ts`.

Os testes são `*.test.ts` (o Vitest só inclui `src/**/*.test.ts`). Eles importam funções puras / o Server Component mockado. Não criam `.test.tsx`. Não renderizam JSX com Testing Library. Não editam `vitest.config.mts`.

`page.tsx` **pode** importar `@/services/report/report-service`. `dashboard.tsx` **não pode**.

## Global Constraints

- **Owns:** só `web/src/components/dashboard/dashboard.tsx`, `web/src/app/page.tsx`, `web/src/app/layout.tsx`, `web/src/app/globals.css` (só se o script não bastar — nesta fatia **não basta editar o CSS**; o mapa pede o script), `web/src/components/README.md`, e os `*.test.ts` colados em `dashboard.tsx` / `page.tsx` / `layout.tsx`. Precisou de outro arquivo → parar.
- **Assinaturas congeladas:**
  ```ts
  import { connection } from "next/server";

  export default async function Home() {
    await connection();
    const initial = await getRecentReadings();
    return <Dashboard initial={initial} />;
  }

  export function Dashboard(props: {
    initial: RecentReadings | null;
  }): JSX.Element;
  ```
  `useReadings(initial)` devolve `{ readings, events, connection, secondsSinceLast }`. Não acrescente prop em `Dashboard` (`className`, `now`, `filter`). Não busque CSV no client.
- **Camadas:** kebab-case; imports `@/`. `app/` → `components` / `services` / `lib` / `types`. `components/` e `hooks/` **nunca** importam `services/` nem `node:*`. Sem colunas em português.
- **O web não recalcula risco.** O dashboard pinta `reading.level` / `scenarioId` já classificados. Não chame `detectEvents` (o hook já chama). Não filtre eventos no pai (a `EventList` já chama `filterEvents`).
- **Sem dado há > 5 s:** o hook entrega `connection: "no_data"`. O `RiskCard` já pinta “Sem dados”. O dashboard **não** inventa leitura NORMAL e **não** zera `reading` só porque a conexão envelheceu.
- **Sem Testing Library e sem jsdom novo.** Não edite `vitest.config.mts` nem `package.json`. Não instale pacote. Não rode `shadcn add`. Não importe `lucide-react`. Não importe `Button`.
- **Tema:** claro/escuro **do sistema**. Sem `next-themes`. Sem toggle. Sem cookie. O CSS atual só pinta `.dark`; um script mínimo copia `prefers-color-scheme` para `document.documentElement.classList.toggle("dark", ...)`. **Não edite `globals.css`.**
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, os doze arquivos W3c–W3f, `hooks/use-readings.ts`, `services/report/**`, `app/api/**`.
- **Idioma:** identificadores em inglês; textos da UI em pt-BR com acentos; este plano em pt-BR.
- **Protótipo acadêmico.** Rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.` Nenhum texto novo promete proteção real. Não escreva “Ambiente normal” no dashboard.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** `await connection()`; tela única mobile-first; rodapé; fluxo no browser com mock; `npm test` / `lint` / `build`.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá o `Home`, o `Dashboard` e o script de tema. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **`page.tsx` é o snippet do mapa, inteiro.** `await connection()` **depois** `const initial = await getRecentReadings()` **depois** `return <Dashboard initial={initial} />`. Sem `export const dynamic`. Sem `force-dynamic`. Sem `revalidate`. Sem rota `/api/report`. Sem `"use client"` na page.
2. **`connection()` de `next/server` (Next 16.4.6).** A Promise não resolve no prerender e resolve no request. Por isso o CSV não entra no HTML do `next build`. Chamar `getRecentReadings()` **antes** de a Promise resolver (ou em `Promise.all` com ela) lê o arquivo no build — o teste da Task 2 pina a ordem.
3. **`Dashboard` é o único `"use client"` desta fatia.** É quem chama `useReadings(initial)` e guarda o filtro. Filhos continuam sem a diretiva.
4. **Leitura corrente = última do array.** `readings` já vem cronológico (mais antigo primeiro). `latest = readings[readings.length - 1] ?? null`. Não pegue `[0]`. Não escolha pelo `level`. Array vazio → `null` (métricas viram travessão; cartão vira “Sem dados”).
5. **`no_data` não zera a leitura no pai.** Sempre passe `latest` para `RiskCard` e `MetricsGrid`, e `connection` para `Header`/`RiskCard`. Quem cinza o cartão é `riskView` (`connection === "no_data" || reading === null`). Um `NORMAL` velho **não** pode virar “Ambiente normal” — o hook já mandou `no_data`.
6. **Filtro vive no dashboard, padrão `DEFAULT_EVENT_FILTER`.** Importe a constante de `./event-filters`. Não recopie `{ levels: [], period: "today" }`. `useState<EventFilterState>(DEFAULT_EVENT_FILTER)`. `onChange={setFilter}`. Não persista em URL/localStorage.
7. **Ordem visual, exatamente:** header → `RiskCard` → `MetricsGrid` → `ReadingsChart` → `EventFilters` + `EventList` (os dois num `div` sem chrome extra) → `<footer>` acadêmico. Sem sidebar. Sem segunda rota. Sem `AccountMenu` (W5).
8. **Coluna mobile-first.** `mx-auto flex min-h-dvh w-full max-w-md flex-col`. `main` com `flex-1 flex-col gap-4 px-4 py-6`. Rodapé `px-4 pb-6 text-xs text-muted-foreground`. É a mesma coluna do placeholder (`max-w-md`); as peças W3c–W3f já foram desenhadas nela. Sem `max-w-4xl`. Sem grid de 2 colunas no desktop — a tela é única e estreita, também no laptop.
9. **Rodapé sai da page e entra no dashboard.** A page não renderiza `<footer>` nem `<h1>`. Texto idêntico ao que já está no placeholder, com travessão `—` (U+2014) e “Não é um detector certificado.”
10. **Não passe `now` para `EventList`.** Ela já faz `new Date()` por dentro. Não chame `filterEvents` / `detectEvents` / `getScenario` no dashboard.
11. **Tema = script no `layout.tsx`, não CSS novo.** `SYSTEM_THEME_SCRIPT` exportado (o teste avalia o texto). IIFE: `matchMedia("(prefers-color-scheme: dark)")`, `document.documentElement.classList.toggle("dark", mq.matches)`, `addEventListener("change", sync)`. `<html suppressHydrationWarning>` para o React não apagar a classe no hydrate. `<script dangerouslySetInnerHTML>` dentro de `<head>`. Sem `next/script`. Sem `useEffect` de tema.
12. **Não edite `globals.css`.** `@custom-variant dark (&:is(.dark *));` e o bloco `.dark { ... }` já existem. O script liga a classe; os tokens seguem. Sem `@media (prefers-color-scheme)` duplicando variáveis.
13. **Testes não chamam `Dashboard(...)` / `RootLayout` como RTL.** Task 1: só `dashboardView` / `latestReading`. Task 2: `await Home()` com `connection`, `getRecentReadings` e `Dashboard` mockados — o retorno é o elemento React `{ type, props }`. Task 3: avalia `SYSTEM_THEME_SCRIPT` com `new Function` e um `document` falso; não importa `globals.css` de verdade (`vi.mock("./globals.css")`) nem `next/font/google`.
14. **Mock `next/navigation` no teste do dashboard.** Importar `./dashboard` puxa `useReadings` → `useRouter`. Igual W3b: mock hoistado **antes** do import. Não chame `useReadings` no teste.
15. **Sem lucide, sem `Button`, sem `Card` do shadcn.** As peças já têm `rounded-2xl`. O pai só dá coluna, `gap-4` e fundo do `body` (`bg-background` já está no CSS). Sem pulso extra, sem gradient, sem “hero”.

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, a home mostra o CSV do `next build` ou “Ambiente normal” com o mock parado:

1. **`getRecentReadings` não corre até `connection()` resolver.** Senão o `next build` congela o CSV daquele instante. Task 2.
2. **Array vazio / `initial === null` → `latest === null`.** Nunca inventar uma leitura NORMAL. Task 1.
3. **A leitura corrente é a última do array cronológico, não a `[0]`.** Task 1.
4. **`latest` de um NORMAL velho continua sendo essa leitura** — o pai não a anula. “Sem dados” é `connection` no `RiskCard`. Task 1.
5. **O script liga/desliga `.dark` com `prefers-color-scheme` e no `change`.** `html` tem `suppressHydrationWarning`. Task 3.

O rodapé acadêmico e o filtro padrão `today` entram nos testes da Task 1. O browser da Task 3 exercita o Done when visível (mock ligado, mock parado > 5 s, coluna mobile).

---

### Task 1: `Dashboard` (hook + coluna + filtro + rodapé)

**Files:**
- Create: `web/src/components/dashboard/dashboard.test.ts`
- Create: `web/src/components/dashboard/dashboard.tsx`

**Interfaces:**
- Consumes:
  - `useReadings(initial: RecentReadings | null): { readings: Reading[]; events: ReportEvent[]; connection: ConnectionStatus; secondsSinceLast: number | null }` de `@/hooks/use-readings`
  - `DashboardHeader({ connection, secondsSinceLast })` de `./dashboard-header`
  - `RiskCard({ reading, connection })` de `./risk-card`
  - `MetricsGrid({ reading })` de `./metrics-grid`
  - `ReadingsChart({ readings })` de `./readings-chart`
  - `EventFilters({ value, onChange })` e `DEFAULT_EVENT_FILTER` de `./event-filters`
  - `EventList({ events, filter })` de `./event-list`
  - `RecentReadings`, `Reading`, `EventFilterState` de `@/types`
- Produces:
  - `export const ACADEMIC_FOOTER: string`
  - `export function latestReading(readings: Reading[]): Reading | null`
  - `export function dashboardView(readings: Reading[], filter: EventFilterState): { latest: Reading | null; readings: Reading[]; filter: EventFilterState; footer: string }`
  - `export function Dashboard(props: { initial: RecentReadings | null }): JSX.Element`

- [ ] **Step 1: Write the failing test**

Crie `web/src/components/dashboard/dashboard.test.ts` inteiro:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import type { EventFilterState, Reading, RiskLevel } from "@/types";

import { DEFAULT_EVENT_FILTER } from "./event-filters";
import {
  ACADEMIC_FOOTER,
  dashboardView,
  latestReading,
} from "./dashboard";

function reading(
  timestamp: string,
  level: RiskLevel = "NORMAL",
): Reading {
  return {
    timestamp,
    source: "mock",
    level,
    scenarioId: 0,
    mq6: { value: 200, base: 180, level: 0 },
    mq2: { value: 150, base: 140, level: 0 },
    flame: false,
    temperature: { celsius: 24, limit: 35, high: false },
    motion: true,
    stoveOn: false,
    secondsWithoutMotion: 0,
  };
}

describe("latestReading", () => {
  it("returns null when there are no readings", () => {
    expect(latestReading([])).toBeNull();
  });

  it("returns the last chronological reading, not the first", () => {
    const first = reading("2026-11-12T14:31:00", "CRITICAL");
    const last = reading("2026-11-12T14:32:08", "NORMAL");

    expect(latestReading([first, last])).toBe(last);
    expect(latestReading([first, last])).not.toBe(first);
  });
});

describe("dashboardView", () => {
  it("keeps an old NORMAL latest instead of inventing a blank reading", () => {
    const stale = reading("2026-11-12T14:32:00", "NORMAL");
    const view = dashboardView([stale], DEFAULT_EVENT_FILTER);

    expect(view.latest).toBe(stale);
    expect(view.latest?.level).toBe("NORMAL");
  });

  it("uses the academic footer and the default today filter", () => {
    const filter: EventFilterState = { levels: ["ALERT"], period: "last-hour" };
    const view = dashboardView([], filter);

    expect(view.latest).toBeNull();
    expect(view.readings).toEqual([]);
    expect(view.filter).toBe(filter);
    expect(view.footer).toBe(
      "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.",
    );
    expect(view.footer).toBe(ACADEMIC_FOOTER);
    expect(DEFAULT_EVENT_FILTER).toEqual({ levels: [], period: "today" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/dashboard/dashboard.test.ts
```

Expected: FAIL — módulo `./dashboard` não existe (ou `latestReading` / `dashboardView` não são função). Não passe. Não edite `vitest.config.mts`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/components/dashboard/dashboard.tsx` inteiro:

```tsx
"use client";

import { useState } from "react";

import { useReadings } from "@/hooks/use-readings";
import type { EventFilterState, Reading, RecentReadings } from "@/types";

import { DashboardHeader } from "./dashboard-header";
import { DEFAULT_EVENT_FILTER, EventFilters } from "./event-filters";
import { EventList } from "./event-list";
import { MetricsGrid } from "./metrics-grid";
import { ReadingsChart } from "./readings-chart";
import { RiskCard } from "./risk-card";

export const ACADEMIC_FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

export function latestReading(readings: Reading[]): Reading | null {
  return readings.length === 0 ? null : readings[readings.length - 1];
}

export function dashboardView(
  readings: Reading[],
  filter: EventFilterState,
) {
  return {
    latest: latestReading(readings),
    readings,
    filter,
    footer: ACADEMIC_FOOTER,
  };
}

export function Dashboard({
  initial,
}: {
  initial: RecentReadings | null;
}) {
  const { readings, events, connection, secondsSinceLast } =
    useReadings(initial);
  const [filter, setFilter] = useState<EventFilterState>(DEFAULT_EVENT_FILTER);
  const view = dashboardView(readings, filter);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <DashboardHeader
          connection={connection}
          secondsSinceLast={secondsSinceLast}
        />
        <RiskCard reading={view.latest} connection={connection} />
        <MetricsGrid reading={view.latest} />
        <ReadingsChart readings={view.readings} />
        <div className="space-y-3">
          <EventFilters value={view.filter} onChange={setFilter} />
          <EventList events={events} filter={view.filter} />
        </div>
      </main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground">
        {view.footer}
      </footer>
    </div>
  );
}
```

Não passe `connection === "no_data" ? null : view.latest`. Não envolva as peças em `Card`. Não importe `services/`. Não adicione `"use client"` nos filhos. Não chame `detectEvents` / `filterEvents` / `getScenario`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/components/dashboard/dashboard.test.ts
```

Expected: PASS (2 `describe`, 4 `it`).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/dashboard/dashboard.tsx web/src/components/dashboard/dashboard.test.ts
git commit -m "$(cat <<'EOF'
feat(web): compose the live dashboard from existing pieces

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 2: `page.tsx` (carga inicial dinâmica)

**Files:**
- Create: `web/src/app/page.test.ts`
- Modify: `web/src/app/page.tsx` (substituir o placeholder inteiro)

**Interfaces:**
- Consumes:
  - `connection(): Promise<void>` de `next/server`
  - `getRecentReadings(): Promise<RecentReadings | null>` de `@/services/report/report-service`
  - `Dashboard({ initial }: { initial: RecentReadings | null })` da Task 1
- Produces:
  - `export default async function Home(): Promise<JSX.Element>` — elemento `<Dashboard initial={...} />`

- [ ] **Step 1: Write the failing test**

Crie `web/src/app/page.test.ts` inteiro:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock("@/services/report/report-service", () => ({
  getRecentReadings: vi.fn(),
}));

vi.mock("@/components/dashboard/dashboard", () => ({
  Dashboard: function Dashboard() {
    return null;
  },
}));

import { Dashboard } from "@/components/dashboard/dashboard";
import { getRecentReadings } from "@/services/report/report-service";
import type { RecentReadings } from "@/types";
import { connection } from "next/server";

import Home from "./page";

type HomeElement = {
  type: unknown;
  props: { initial: RecentReadings | null };
};

const getRecent = vi.mocked(getRecentReadings);
const waitForRequest = vi.mocked(connection);

const SNAPSHOT: RecentReadings = {
  date: "2026-11-12",
  readings: [],
  events: [],
};

describe("Home", () => {
  beforeEach(() => {
    waitForRequest.mockReset();
    waitForRequest.mockResolvedValue(undefined);
    getRecent.mockReset();
    getRecent.mockResolvedValue(null);
  });

  it("does not read the CSV until connection() resolves", async () => {
    let release = () => {};
    waitForRequest.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const pending = Home();
    await Promise.resolve();

    expect(waitForRequest).toHaveBeenCalledOnce();
    expect(getRecent).not.toHaveBeenCalled();

    release();
    const ui = (await pending) as HomeElement;

    expect(getRecent).toHaveBeenCalledOnce();
    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBeNull();
  });

  it("passes the snapshot from getRecentReadings to Dashboard", async () => {
    getRecent.mockResolvedValue(SNAPSHOT);

    const ui = (await Home()) as HomeElement;

    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBe(SNAPSHOT);
  });
});
```

O placeholder atual de `page.tsx` é síncrono (`export default function Home`) e não importa `Dashboard`. O teste deve falhar ao importar ou ao achar `ui.type !== Dashboard` / `getRecent` chamado cedo demais.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/app/page.test.ts
```

Expected: FAIL — `Home` ainda é o placeholder (não é async, não chama `connection`, não devolve `Dashboard`). Não passe. Se `import "server-only"` estourar, o mock de `@/services/report/report-service` não está hoistado — não remova o `vi.mock` e não edite o service.

- [ ] **Step 3: Write minimal implementation**

Substitua `web/src/app/page.tsx` inteiro:

```tsx
import { connection } from "next/server";

import { Dashboard } from "@/components/dashboard/dashboard";
import { getRecentReadings } from "@/services/report/report-service";

export default async function Home() {
  await connection();
  const initial = await getRecentReadings();
  return <Dashboard initial={initial} />;
}
```

Sem `<main>`. Sem `<footer>`. Sem `<h1>`. Sem `"use client"`. Sem `dynamic = "force-dynamic"`. Sem `Promise.all`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/app/page.test.ts
```

Expected: PASS (1 `describe`, 2 `it`).

- [ ] **Step 5: Commit**

```bash
git add web/src/app/page.tsx web/src/app/page.test.ts
git commit -m "$(cat <<'EOF'
feat(web): load dashboard readings on each request

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 3: tema do sistema + README + verificação

**Files:**
- Create: `web/src/app/layout.test.ts`
- Modify: `web/src/app/layout.tsx` (script + `suppressHydrationWarning`; manter fontes e metadata)
- Modify: `web/src/components/README.md`
- Test: não criar arquivo em `globals.css` — **não modificar** `web/src/app/globals.css`

**Interfaces:**
- Consumes: `window.matchMedia`, `document.documentElement.classList`. Geist / metadata já existentes.
- Produces:
  - `export const SYSTEM_THEME_SCRIPT: string` — IIFE que sincroniza `.dark` com `prefers-color-scheme` e escuta `change`
  - `RootLayout` renderiza `<html lang="pt-BR" suppressHydrationWarning>` e o `<script>` no `<head>`

- [ ] **Step 1: Write the failing test**

Crie `web/src/app/layout.test.ts` inteiro:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("./globals.css", () => ({}));

import RootLayout, { SYSTEM_THEME_SCRIPT } from "./layout";

type LayoutElement = {
  type: unknown;
  props: {
    lang: string;
    suppressHydrationWarning: boolean;
    children: [
      {
        type: unknown;
        props: {
          children: {
            type: unknown;
            props: { dangerouslySetInnerHTML: { __html: string } };
          };
        };
      },
      { type: unknown; props: { children: string } },
    ];
  };
};

describe("SYSTEM_THEME_SCRIPT", () => {
  it("toggles .dark from prefers-color-scheme and follows change", () => {
    const toggles: Array<[string, boolean | undefined]> = [];
    const listeners: Array<() => void> = [];
    let matches = true;

    const window = {
      matchMedia: (query: string) => {
        expect(query).toBe("(prefers-color-scheme: dark)");
        return {
          get matches() {
            return matches;
          },
          addEventListener: (type: string, fn: () => void) => {
            expect(type).toBe("change");
            listeners.push(fn);
          },
        };
      },
    };
    const document = {
      documentElement: {
        classList: {
          toggle: (token: string, force?: boolean) => {
            toggles.push([token, force]);
          },
        },
      },
    };

    const run = new Function("window", "document", SYSTEM_THEME_SCRIPT);
    run(window, document);

    expect(toggles).toEqual([["dark", true]]);

    matches = false;
    expect(listeners).toHaveLength(1);
    listeners[0]();
    expect(toggles).toEqual([
      ["dark", true],
      ["dark", false],
    ]);
  });
});

describe("RootLayout", () => {
  it("applies the system theme script before paint and keeps pt-BR", () => {
    const tree = RootLayout({ children: "child" } as never) as LayoutElement;

    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("pt-BR");
    expect(tree.props.suppressHydrationWarning).toBe(true);

    const [head, body] = tree.props.children;
    expect(head.type).toBe("head");
    expect(head.props.children.type).toBe("script");
    expect(head.props.children.props.dangerouslySetInnerHTML).toEqual({
      __html: SYSTEM_THEME_SCRIPT,
    });
    expect(body.type).toBe("body");
    expect(body.props.children).toBe("child");
  });
});
```

O `layout.tsx` atual não exporta `SYSTEM_THEME_SCRIPT` e o `<html>` não tem `suppressHydrationWarning`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/app/layout.test.ts
```

Expected: FAIL — `SYSTEM_THEME_SCRIPT` não exportado, ou `suppressHydrationWarning` ausente. Não passe. Não edite `globals.css`. Não instale `next-themes`. Se o import de `./layout` explodir por causa do CSS mesmo com o mock, **não** mude `vitest.config.mts` — o `vi.mock("./globals.css")` tem que estar hoistado no topo, como acima.

- [ ] **Step 3: Write minimal implementation**

Substitua `web/src/app/layout.tsx` inteiro (fontes e metadata iguais; só entram o script e `suppressHydrationWarning`):

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GasGuard",
  description: "Monitoramento de gás e risco de incêndio — protótipo acadêmico.",
};

export const SYSTEM_THEME_SCRIPT = `(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var sync = function () {
    document.documentElement.classList.toggle("dark", mq.matches);
  };
  sync();
  mq.addEventListener("change", sync);
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

Substitua `web/src/components/README.md` inteiro:

```md
# components

**Interface.**

- `ui/`: componentes do shadcn, gerados pelo CLI (`npx shadcn add ...`). Não edite à mão sem motivo.
- `dashboard/`: a tela única. `dashboard.tsx` é o container (`"use client"`): chama `useReadings` e empilha header → risco → métricas → gráfico → filtros + lista → rodapé. Os outros arquivos da pasta são as partes, só de props.

Container/presentation é convenção, não regra: um componente simples pode usar o hook e renderizar no mesmo arquivo.

- Pode importar: `hooks/`, `lib/`, `types/`, `components/ui`.
- Não pode: `services/`, `node:*`. Regra de negócio nunca fica em componente: vai para `lib/`, com teste.
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/app/layout.test.ts
```

Expected: PASS (2 `describe`, 2 `it`).

- [ ] **Step 5: Full suite, lint and build**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: `npm test` exit 0 (os 17 arquivos anteriores + 3 novos = 20; 100 + 8 = 108 tests). `npm run lint` exit 0. `npm run build` exit 0. O build **não** deve imprimir o HTML da home com um CSV congelado — `connection()` torna a page dinâmica. Não edite `globals.css`. O diff da fatia não inclui `package.json` nem `vitest.config.mts`.

- [ ] **Step 6: Browser — Done when da fatia**

O mapa pede o fluxo da tabela Done when como um usuário. Não declare feito com um screenshot estático.

1. Na raiz: `node mock-daily-report.js --scenario tour`.
2. Em `web/`: `npm run dev`.
3. Abra `http://localhost:3000` nas browser tools.
4. Confirme, como usuário:
   - a página carrega **sem** overlay vermelho do Next e **sem** “Painel em construção.”;
   - topo **GasGuard** + status (Ao vivo / Reconectando / Sem dados) + `há N s` quando há idade;
   - cartão de risco com título de cenário (não “Ambiente normal” se o mock estiver parado);
   - selo **SIMULAÇÃO** enquanto o mock grava (`source === "mock"`);
   - grade 2×3 de métricas;
   - gráfico “Últimos 10 min”;
   - chips de nível + período (padrão **Hoje**);
   - lista de eventos com scroll interno, mais novo no topo quando houver mudança de nível no `tour`;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
5. Viewport estreita (~390×844) e larga (~1280×800): a coluna continua `max-w-md` centrada, uma só, sem quebrar o gráfico.
6. Pare o mock e espere **mais de 5 s**: o cartão vira **Sem dados** (cinza). Nunca “Ambiente normal”.
7. Religue `node mock-daily-report.js --scenario tour`: volta **Ao vivo**; o gráfico não duplica o mesmo timestamp (o hook já descarta).
8. Tema: no SO (ou nas DevTools → `prefers-color-scheme: dark`) o fundo do `body` escurece via classe `.dark` no `<html>`. Sem botão de tema na página.

Se não houver browser tool: **não** substitua a UI por `curl -sI`. Declare o que não conseguiu clicar. O revisor trata como gap — esta fatia é visível.

- [ ] **Step 7: Commit**

```bash
git add web/src/app/layout.tsx web/src/app/layout.test.ts web/src/components/README.md
git commit -m "$(cat <<'EOF'
feat(web): follow the system light and dark theme

EOF
)"
```

Expected: o commit contém **somente** esses 3 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns + testes colados) não inclui `globals.css`, `package.json`, `package-lock.json`, `vitest.config.mts`, `types/`, `lib/`, `hooks/`, `services/`, `app/api/`, os doze arquivos W3c–W3f, `hardware/` nem o mock.

---

## Fora desta fatia (não fazer)

- Recalcular risco. Chamar `detectEvents` / `filterEvents` no dashboard. Importar `services/` a partir de `components/`.
- Editar `globals.css`, `use-readings.ts`, `report-service.ts`, `route.ts`, qualquer arquivo W3c–W3f.
- `next-themes`, toggle de tema, cookie de tema, `@media (prefers-color-scheme)` duplicando tokens.
- `npx shadcn add`. `Button`. lucide. `AccountMenu` / login / e-mail (W5).
- `/api/report`. `Last-Event-ID`. `dynamic = "force-dynamic"`. `"use client"` em `page.tsx`.
- Testing Library, jsdom, pacote npm, mudar `vitest.config.mts`.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
