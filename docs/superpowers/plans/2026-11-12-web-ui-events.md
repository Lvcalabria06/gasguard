# Lista e filtros de eventos do dashboard — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os filtros (`EventFilters`) e a lista (`EventList`) como componentes só de props — chips de nível (vários ao mesmo tempo), período `Última hora` · `Últimas 6 h` · `Hoje`, `filterEvents` no cliente, mais novo no topo, scroll interno — sem buscar dado e sem ligar o hook.

**Architecture:** Dois arquivos em `web/src/components/dashboard/`. Filtro controlado (`value` + `onChange`): sem `useState`, sem `"use client"`. Lista chama `filterEvents` de `@/lib/filters` e inverte a subsequência. Cada arquivo exporta um view-model puro (`filterView` / `eventListView`) e o JSX que só pinta. Sem `dashboard.tsx`. Sem Testing Library: o Vitest em `node` afirma o view-model; o `build` type-checka o JSX. Visual quieto: o mesmo `rounded-2xl border` do gráfico; cor de nível só no ponto da linha (`to`), nunca no chip — o cartão de risco (W3c) continua sendo o alarme.

**Tech Stack:** TypeScript 5 (`strict`), React 19 (JSX automático), Tailwind CSS 4, Vitest 5.1.0 ambiente `node`, Next.js 16.4.6 só para o smoke da home. `filterEvents` de `@/lib/filters`. `getScenario` de `@/lib/scenarios`. `RISK_LEVELS` de `@/lib/risk-level`. `cn` de `@/lib/utils`. Sem jsdom, sem Testing Library, sem pacote novo, sem `shadcn add`, sem lucide, sem `Button`.

**Spec:** fatia W3f + Contratos congelados Componentes + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Tela em [`docs/architecture.md`](../../architecture.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-ui-events` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-ui-events`.
- Baseline: em `web/`, `npm test` já passou (15 files / 91 tests). Não edite `web/src/lib/**`, `web/src/types/**`, `web/src/hooks/**`, `web/src/services/**`, `web/src/app/**`.
- `web/src/components/dashboard/` já tem header, cartão, grade e gráfico (W3c–W3e, congelados). **Não edite esses arquivos.**
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.** Ninguém desta fatia monta filtros/lista na tela (W4).
- `filterEvents`, `getScenario` e `RISK_LEVELS` já existem. Importe; não recopie a regra de período/nível; não recopie os 18 textos de cenário.

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
├── event-filters.tsx           [T1] filterView + toggle/set + EventFilters
├── event-filters.test.ts       [T1]
├── event-list.tsx              [T2] eventListView + EventList
└── event-list.test.ts          [T2]
```

Nada fora desta lista. Sem `dashboard.tsx`. Sem `index.ts`. Sem `event-copy.ts`. Sem `risk-tone.ts`. Sem `README.md` novo. Sem `"use client"`. Fixtures de `ReportEvent` **dentro** do próprio `*.test.ts`.

Os testes são `*.test.ts` (o Vitest só inclui `src/**/*.test.ts`). Eles importam as funções puras do `.tsx`. Não criam `.test.tsx`. Não renderizam JSX. Não editam `vitest.config.mts`.

W4 importa **somente** `EventFilters`, `EventList` e `DEFAULT_EVENT_FILTER`. Os view-models existem para o teste rodar em `node` sem jsdom.

Os dois arquivos **não se importam**. Os 6 rótulos pt-BR de nível se repetem nos dois (seis linhas, igual ao `parseLocalIso` duplicado em W1a). Não crie um terceiro arquivo para DRY.

## Global Constraints

- **Owns:** só `web/src/components/dashboard/event-list.tsx`, `event-filters.tsx` e os dois `*.test.ts` ao lado (o mapa lista os `.tsx`; o teste colado é a regra de “UI extrai função pura testável”, igual W3c–W3e). Precisou de outro arquivo → parar.
- **Assinaturas congeladas:**
  ```ts
  export function EventFilters(props: {
    value: EventFilterState;
    onChange: (next: EventFilterState) => void;
  }): JSX.Element;

  export function EventList(props: {
    events: ReportEvent[];
    filter: EventFilterState;
  }): JSX.Element;
  ```
  Não acrescente prop (`now`, `className`, `connection`, `onFilter`). Não busque dado. Não chame `useReadings`. Não chame `detectEvents`.
- **Camadas:** kebab-case; imports `@/lib/filters`, `@/lib/scenarios`, `@/lib/risk-level`, `@/lib/utils`, `@/types`. `components/` **nunca** importa `services/` nem `node:*`. Sem colunas em português.
- **O web não recalcula risco.** A lista pinta `event.to` / `event.from` / `event.scenarioId` já classificados. `getScenario` só traduz o id. `filterEvents` filtra `to`, não `from`.
- **Sem Testing Library e sem jsdom novo.** Não edite `vitest.config.mts` nem `package.json`. Não instale pacote. Não rode `shadcn add`. Não importe `lucide-react`. Não importe `Button` de `@/components/ui/button`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `page.tsx`, `layout.tsx`, `globals.css`, `components/README.md`, `components/ui/button.tsx`, os oito arquivos W3c–W3e.
- **Idioma:** identificadores em inglês; textos da UI em pt-BR com acentos; este plano em pt-BR.
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real. Não escreva “Ambiente normal” nem “Sem dados” nestes componentes — isso é do `RiskCard`.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** chips + período; mais novo no topo; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá as props e o conteúdo mínimo (“chips de nível (vários ao mesmo tempo) + período `Última hora` · `Últimas 6 h` · `Hoje` (padrão `today`)”; “aplica `filterEvents`, **mais novo no topo**, lista com scroll interno”). Isto não reabre decisão — só impede o implementer de inventar formato:

1. **Controlado, sem estado local, sem `"use client"`.** `EventFilters` não chama `useState`. O pai (W4) guarda o filtro. Clique = `onChange(próximo)`. Sem `useEffect`. W4 é client e importa estes arquivos; o Next coloca o JSX no bundle do cliente. Não adicione a diretiva “por precaução”.
2. **Padrão `today` é a constante, não um `useState` interno.**
   ```ts
   export const DEFAULT_EVENT_FILTER: EventFilterState = {
     levels: [],
     period: "today",
   };
   ```
   W4 faz `useState(DEFAULT_EVENT_FILTER)`. Esta fatia não monta o pai. `levels: []` = todos os níveis (já é o contrato de `filterEvents`).
3. **Chips de nível são toggle, vários ao mesmo tempo.** Clique num chip desligado → inclui; clique num ligado → tira. A ordem de `levels` segue `RISK_LEVELS` (não a ordem do clique). Período não muda no toggle.
4. **Chip desligado quando `levels` é `[]`.** Visual: nenhum pressionado = “mostrar todos”. Não invente chip “Todos”. Não marque os seis como selecionados quando a lista está vazia — isso mentiria o `value` e quebraria o toggle (o primeiro clique teria que desligar cinco).
5. **Período é exclusivo.** Clique troca `period` e mantém `levels`. Clicar o já ativo devolve o mesmo `period` (não limpa para um default). Rótulos, exatamente:
   | `id` | `label` |
   |---|---|
   | `last-hour` | `Última hora` |
   | `last-6h` | `Últimas 6 h` |
   | `today` | `Hoje` |
6. **Rótulos de nível, exatamente estes** (UI em pt-BR; copiar nos dois arquivos):
   | `RiskLevel` | `label` |
   |---|---|
   | `NORMAL` | `Normal` |
   | `ATTENTION` | `Atenção` |
   | `ALERT` | `Alerta` |
   | `HIGH` | `Alto` |
   | `CRITICAL` | `Crítico` |
   | `FAILURE` | `Falha` |
   Ordem dos chips = `RISK_LEVELS`. Sem caixa alta no chip (o selo **SIMULAÇÃO** é do cartão).
7. **`EventList` não recebe `now`.** A assinatura do mapa não tem. O JSX chama `eventListView(events, filter, new Date())` uma vez por render. O teste **nunca** chama `EventList(...)` — injeta `now` em `eventListView`. Nos testes, `now` é `new Date(y, m, d, h, min, s)`, nunca string ISO (igual W1a: o timestamp do CSV não tem fuso).
8. **Aplica `filterEvents`, depois inverte.** Não reimplemente período/nível. Não ordene por `timestamp`. Entrada cronológica (service/hook) → `filterEvents` devolve subsequência na mesma ordem → `[...filtered].reverse()` põe o mais novo no topo. Não mutar o array de entrada.
9. **Não recorte 10 min.** Eventos das 08:00 entram em `today` mesmo se o gráfico só tiver 10 min. Quem recorta leituras é o W3b; eventos do dia vêm prontos na prop.
10. **Linha da lista, exatamente:** `id` = `event.id`; `time` = a parte depois do `T` (`"2026-11-12T14:32:08"` → `"14:32:08"`; sem `T`, o string inteiro); `fromLabel` / `toLabel` = tabela do item 6; `from === null` → `"—"` (U+2014); `title` = `getScenario(event.scenarioId).title`; `toneClass` = cor de `event.to` (não de `from`). Não mostre guidance, `source`, selo SIMULAÇÃO, `formatAge` nem o id do cenário.
11. **Cores do ponto, exatamente estas** (as mesmas do `RiskCard`; o teste afirma a string; não extraia `risk-tone.ts`):
    | `to` | `toneClass` |
    |---|---|
    | NORMAL | `bg-emerald-600` |
    | ATTENTION | `bg-amber-400` |
    | ALERT | `bg-orange-500` |
    | HIGH | `bg-red-600` |
    | CRITICAL | `bg-red-900` |
    | FAILURE | `bg-zinc-500` |
    Chips **não** usam essas cores. Chip selecionado = `border-foreground bg-foreground text-background`. O cartão de risco é o sinal; a lista é o diário.
12. **Lista vazia (sem eventos, ou filtro sem match):** `eventListView` devolve `[]`. O JSX **não monta** `<ul>` — um `—` (U+2014) centrado na altura da área. Não escreva “Sem dados”, “Nenhum evento” nem “Ambiente normal”.
13. **Scroll interno.** `<ul className="max-h-64 overflow-y-auto overscroll-contain">`. A página não cresce com dezenas de mudanças de nível. Sem `max-w-*` (o W4 define a coluna).
14. **JSX mínimo, mobile-first.**
    - `EventFilters`: `<section aria-label="Filtros dos eventos">`, título `h2` “Eventos do dia” em `text-xs font-medium text-muted-foreground` (o mesmo peso do gráfico). Chips `type="button"` com `aria-pressed`. Período `role="radiogroup"` + `role="radio"` `aria-checked`, um trilho `inline-flex rounded-full border p-0.5` — não é “A · B · C” com middle dot. Sem card em volta (W4 empilha filtros + lista). Sem ícone. Sem `Button`.
    - `EventList`: `<section aria-label="Eventos do dia">` com `overflow-hidden rounded-2xl border bg-card`. Cada linha: ponto `size-2 rounded-full` + `time` em `tabular-nums text-muted-foreground` + `{fromLabel} → {toLabel}` + título `truncate`. `border-b` entre linhas, `last:border-b-0`. Sem pulso. Sem `Card` do shadcn.
15. **Travessão.** Vazio e `from === null` usam `"—"` (U+2014), nunca `"-"` nem `"–"`.
16. **Testes importam o `.tsx` e só chamam o view-model / as funções de próximo filtro.** Vite/esbuild transforma JSX sem jsdom. Não chame `EventFilters(...)` / `EventList(...)` no teste. Se o módulo não carregar, **não** instale jsdom e **não** edite o Vitest — pare e devolva; o Owns não permite outro arquivo.

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, o W4 mostra evento velho no topo ou esconde mudança de nível:

1. **Chips: `levels: []` → nenhum selecionado; vários ids podem ficar ligados; toggle respeita `RISK_LEVELS`.** Período padrão na constante é `today`. Task 1.
2. **Rótulos exatamente** Normal / Atenção / Alerta / Alto / Crítico / Falha e Última hora / Últimas 6 h / Hoje. Task 1.
3. **Mais novo no topo.** Entrada `[08:00, 12:00]` + `today` → ids `[12:00, 08:00]`. Ontem sai. Task 2.
4. **Filtro olha `to`, não `from`.** Evento `from: ALERT, to: NORMAL` não aparece no chip Alerta. Task 2.
5. **`eventListView` delega a `filterEvents`.** Às 00:30, 23:45 de ontem entra em `last-hour` e *não* em `today`. Não reimplemente a janela. Task 2.
6. **Linha: hora depois do `T`, `from === null` → `—`, id desconhecido → título de `getScenario`, cor de `to`.** Task 2.

---

### Task 1: `EventFilters` (chips + período)

**Files:**
- Create: `web/src/components/dashboard/event-filters.test.ts`
- Create: `web/src/components/dashboard/event-filters.tsx`

**Interfaces:**
- Consumes: `RISK_LEVELS` de `@/lib/risk-level`. `cn` de `@/lib/utils`. Tipos `EventFilterState`, `EventPeriod`, `RiskLevel` de `@/types`. Nada de `filterEvents`, nada do hook, nada de `connection`.
- Produces:
  - `export const DEFAULT_EVENT_FILTER: EventFilterState` — `{ levels: []; period: "today" }`
  - `export function filterView(value: EventFilterState): { title: "Eventos do dia"; levels: { id: RiskLevel; label: string; selected: boolean }[]; periods: { id: EventPeriod; label: string; selected: boolean }[] }`
  - `export function toggleFilterLevel(value: EventFilterState, level: RiskLevel): EventFilterState`
  - `export function setFilterPeriod(value: EventFilterState, period: EventPeriod): EventFilterState`
  - `export function EventFilters(props: { value: EventFilterState; onChange: (next: EventFilterState) => void }): JSX.Element`

O JSX faz `const view = filterView(value)` e pinta. Clique de nível = `onChange(toggleFilterLevel(value, id))`. Clique de período = `onChange(setFilterPeriod(value, id))`. W4 importa `EventFilters` e `DEFAULT_EVENT_FILTER`.

- [ ] **Step 1: Write the failing test**

Crie `web/src/components/dashboard/event-filters.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import { RISK_LEVELS } from "@/lib/risk-level";
import type { EventFilterState } from "@/types";

import {
  DEFAULT_EVENT_FILTER,
  filterView,
  setFilterPeriod,
  toggleFilterLevel,
} from "./event-filters";

describe("filterView", () => {
  it("lists every level and period label, with Hoje selected and no level pressed", () => {
    const view = filterView(DEFAULT_EVENT_FILTER);

    expect(view.title).toBe("Eventos do dia");
    expect(DEFAULT_EVENT_FILTER).toEqual({ levels: [], period: "today" });
    expect(view.levels.map((chip) => chip.id)).toEqual([...RISK_LEVELS]);
    expect(view.levels.map((chip) => chip.label)).toEqual([
      "Normal",
      "Atenção",
      "Alerta",
      "Alto",
      "Crítico",
      "Falha",
    ]);
    expect(view.levels.every((chip) => chip.selected === false)).toBe(true);
    expect(view.periods).toEqual([
      { id: "last-hour", label: "Última hora", selected: false },
      { id: "last-6h", label: "Últimas 6 h", selected: false },
      { id: "today", label: "Hoje", selected: true },
    ]);
  });

  it("marks only the levels in value and the active period", () => {
    const view = filterView({
      levels: ["ALERT", "CRITICAL"],
      period: "last-hour",
    });

    expect(view.levels.filter((chip) => chip.selected).map((chip) => chip.id)).toEqual(
      ["ALERT", "CRITICAL"],
    );
    expect(view.periods.find((chip) => chip.id === "last-hour")?.selected).toBe(
      true,
    );
    expect(view.periods.find((chip) => chip.id === "today")?.selected).toBe(
      false,
    );
  });
});

describe("toggleFilterLevel", () => {
  it("adds and removes levels in RISK_LEVELS order without changing the period", () => {
    const start: EventFilterState = DEFAULT_EVENT_FILTER;
    const withAlert = toggleFilterLevel(start, "ALERT");
    expect(withAlert).toEqual({ levels: ["ALERT"], period: "today" });

    const withHigh = toggleFilterLevel(withAlert, "HIGH");
    expect(withHigh.levels).toEqual(["ALERT", "HIGH"]);

    const withNormal = toggleFilterLevel(withHigh, "NORMAL");
    expect(withNormal.levels).toEqual(["NORMAL", "ALERT", "HIGH"]);

    const withoutAlert = toggleFilterLevel(withNormal, "ALERT");
    expect(withoutAlert).toEqual({
      levels: ["NORMAL", "HIGH"],
      period: "today",
    });
  });
});

describe("setFilterPeriod", () => {
  it("changes only the period", () => {
    const value: EventFilterState = { levels: ["HIGH"], period: "today" };

    expect(setFilterPeriod(value, "last-6h")).toEqual({
      levels: ["HIGH"],
      period: "last-6h",
    });
    expect(setFilterPeriod(value, "today")).toEqual(value);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/dashboard/event-filters.test.ts
```

Expected: FAIL — módulo `./event-filters` não existe (ou `filterView` não é função). Não passe. Não edite `vitest.config.mts`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/components/dashboard/event-filters.tsx` inteiro:

```tsx
import { RISK_LEVELS } from "@/lib/risk-level";
import { cn } from "@/lib/utils";
import type { EventFilterState, EventPeriod, RiskLevel } from "@/types";

const LEVEL_LABEL: Record<RiskLevel, string> = {
  NORMAL: "Normal",
  ATTENTION: "Atenção",
  ALERT: "Alerta",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  FAILURE: "Falha",
};

const PERIODS: { id: EventPeriod; label: string }[] = [
  { id: "last-hour", label: "Última hora" },
  { id: "last-6h", label: "Últimas 6 h" },
  { id: "today", label: "Hoje" },
];

export const DEFAULT_EVENT_FILTER: EventFilterState = {
  levels: [],
  period: "today",
};

export function filterView(value: EventFilterState) {
  return {
    title: "Eventos do dia" as const,
    levels: RISK_LEVELS.map((id) => ({
      id,
      label: LEVEL_LABEL[id],
      selected: value.levels.includes(id),
    })),
    periods: PERIODS.map((period) => ({
      ...period,
      selected: value.period === period.id,
    })),
  };
}

export function toggleFilterLevel(
  value: EventFilterState,
  level: RiskLevel,
): EventFilterState {
  const selected = new Set(value.levels);
  if (selected.has(level)) {
    selected.delete(level);
  } else {
    selected.add(level);
  }
  return {
    ...value,
    levels: RISK_LEVELS.filter((item) => selected.has(item)),
  };
}

export function setFilterPeriod(
  value: EventFilterState,
  period: EventPeriod,
): EventFilterState {
  return { ...value, period };
}

export function EventFilters({
  value,
  onChange,
}: {
  value: EventFilterState;
  onChange: (next: EventFilterState) => void;
}) {
  const view = filterView(value);

  return (
    <section aria-label="Filtros dos eventos" className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground">{view.title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {view.levels.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={chip.selected}
            onClick={() => onChange(toggleFilterLevel(value, chip.id))}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              chip.selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div
        role="radiogroup"
        aria-label="Período"
        className="inline-flex rounded-full border border-border p-0.5"
      >
        {view.periods.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="radio"
            aria-checked={chip.selected}
            onClick={() => onChange(setFilterPeriod(value, chip.id))}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              chip.selected
                ? "bg-foreground text-background"
                : "text-muted-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}
```

Sem `"use client"`. Sem lucide. Sem `Button`. Sem cor de `RiskLevel` no chip. Sem card — o `rounded-2xl` fica na lista.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/components/dashboard/event-filters.test.ts
```

Expected: PASS (3 `describe`, 4 `it`).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/dashboard/event-filters.tsx web/src/components/dashboard/event-filters.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add level and period chips for the event list

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 2: `EventList` (filterEvents, mais novo no topo, scroll)

**Files:**
- Create: `web/src/components/dashboard/event-list.test.ts`
- Create: `web/src/components/dashboard/event-list.tsx`

**Interfaces:**
- Consumes: `filterEvents(events, filter, now)` de `@/lib/filters`. `getScenario(id)` de `@/lib/scenarios`. `cn` de `@/lib/utils`. Tipos `EventFilterState`, `ReportEvent`, `RiskLevel` de `@/types`. **Não** importa `./event-filters`. Nada de `formatAge`. Nada do hook. Nada de `connection`.
- Produces:
  - `export type EventRow = { id: string; time: string; fromLabel: string; toLabel: string; title: string; toneClass: string }`
  - `export function eventListView(events: ReportEvent[], filter: EventFilterState, now: Date): EventRow[]`
  - `export function EventList(props: { events: ReportEvent[]; filter: EventFilterState }): JSX.Element`

O JSX faz `const rows = eventListView(events, filter, new Date())` e pinta. W4 só importa `EventList`.

- [ ] **Step 1: Write the failing test**

Crie `web/src/components/dashboard/event-list.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import { getScenario } from "@/lib/scenarios";
import type { EventFilterState, ReportEvent, RiskLevel } from "@/types";

import { eventListView } from "./event-list";

function event(
  timestamp: string,
  to: RiskLevel,
  extras: Partial<Pick<ReportEvent, "from" | "scenarioId" | "source">> = {},
): ReportEvent {
  return {
    id: timestamp,
    timestamp,
    from: extras.from === undefined ? "NORMAL" : extras.from,
    to,
    scenarioId: extras.scenarioId ?? 0,
    source: extras.source ?? "mock",
  };
}

const NOON = new Date(2026, 10, 12, 12, 0, 0);
const TODAY: EventFilterState = { levels: [], period: "today" };

describe("eventListView", () => {
  it("returns no rows when there are no events", () => {
    expect(eventListView([], TODAY, NOON)).toEqual([]);
  });

  it("puts the newest matching event first and drops other calendar days", () => {
    const morning = event("2026-11-12T08:00:00", "ATTENTION");
    const noon = event("2026-11-12T12:00:00", "ALERT");
    const yesterday = event("2026-11-11T12:00:00", "HIGH");

    expect(
      eventListView([morning, noon, yesterday], TODAY, NOON).map((row) => row.id),
    ).toEqual(["2026-11-12T12:00:00", "2026-11-12T08:00:00"]);
  });

  it("filters by event.to, not from", () => {
    const recovered = event("2026-11-12T11:00:00", "NORMAL", { from: "ALERT" });
    const noonAlert = event("2026-11-12T12:00:00", "ALERT");
    const onlyAlert: EventFilterState = { levels: ["ALERT"], period: "today" };

    expect(
      eventListView([recovered, noonAlert], onlyAlert, NOON).map((row) => row.id),
    ).toEqual(["2026-11-12T12:00:00"]);
  });

  it("maps time, pt-BR labels, scenario title and to-color, with a dash when from is null", () => {
    const rows = eventListView(
      [
        event("2026-11-12T14:32:08", "ALERT", {
          from: null,
          scenarioId: 7,
        }),
        event("2026-11-12T14:32:09", "ALERT", { scenarioId: 99 }),
      ],
      TODAY,
      new Date(2026, 10, 12, 14, 32, 10),
    );

    expect(rows[0]).toEqual({
      id: "2026-11-12T14:32:09",
      time: "14:32:09",
      fromLabel: "Normal",
      toLabel: "Alerta",
      title: getScenario(99).title,
      toneClass: "bg-orange-500",
    });
    expect(rows[0].title).toBe("Cenário desconhecido");
    expect(rows[1]).toMatchObject({
      id: "2026-11-12T14:32:08",
      time: "14:32:08",
      fromLabel: "—",
      toLabel: "Alerta",
      title: getScenario(7).title,
      toneClass: "bg-orange-500",
    });
  });

  it("uses filterEvents local windows instead of reimplementing them", () => {
    const now = new Date(2026, 10, 13, 0, 30, 0);
    const lastNight = event("2026-11-12T23:45:00", "ALERT");
    const tonight = event("2026-11-13T00:10:00", "ALERT");
    const sample = [lastNight, tonight];

    expect(
      eventListView(sample, { levels: [], period: "today" }, now).map(
        (row) => row.id,
      ),
    ).toEqual(["2026-11-13T00:10:00"]);
    expect(
      eventListView(sample, { levels: [], period: "last-hour" }, now).map(
        (row) => row.id,
      ),
    ).toEqual(["2026-11-13T00:10:00", "2026-11-12T23:45:00"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/dashboard/event-list.test.ts
```

Expected: FAIL — módulo `./event-list` não existe (ou `eventListView` não é função). Não passe. Não edite `vitest.config.mts`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/components/dashboard/event-list.tsx` inteiro:

```tsx
import { filterEvents } from "@/lib/filters";
import { getScenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import type { EventFilterState, ReportEvent, RiskLevel } from "@/types";

const LEVEL_LABEL: Record<RiskLevel, string> = {
  NORMAL: "Normal",
  ATTENTION: "Atenção",
  ALERT: "Alerta",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  FAILURE: "Falha",
};

const TONE: Record<RiskLevel, string> = {
  NORMAL: "bg-emerald-600",
  ATTENTION: "bg-amber-400",
  ALERT: "bg-orange-500",
  HIGH: "bg-red-600",
  CRITICAL: "bg-red-900",
  FAILURE: "bg-zinc-500",
};

export type EventRow = {
  id: string;
  time: string;
  fromLabel: string;
  toLabel: string;
  title: string;
  toneClass: string;
};

function eventTime(timestamp: string): string {
  const [, time] = timestamp.split("T");
  return time ?? timestamp;
}

function levelLabel(level: RiskLevel | null): string {
  return level === null ? "—" : LEVEL_LABEL[level];
}

export function eventListView(
  events: ReportEvent[],
  filter: EventFilterState,
  now: Date,
): EventRow[] {
  const filtered = filterEvents(events, filter, now);
  const newestFirst = filtered.slice().reverse();
  return newestFirst.map((item) => ({
    id: item.id,
    time: eventTime(item.timestamp),
    fromLabel: levelLabel(item.from),
    toLabel: LEVEL_LABEL[item.to],
    title: getScenario(item.scenarioId).title,
    toneClass: TONE[item.to],
  }));
}

export function EventList({
  events,
  filter,
}: {
  events: ReportEvent[];
  filter: EventFilterState;
}) {
  const rows = eventListView(events, filter, new Date());

  return (
    <section
      aria-label="Eventos do dia"
      className="overflow-hidden rounded-2xl border bg-card"
    >
      {rows.length === 0 ? (
        <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          —
        </p>
      ) : (
        <ul className="max-h-64 overflow-y-auto overscroll-contain">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  row.toneClass,
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <time
                    className="tabular-nums text-muted-foreground"
                    dateTime={row.id}
                  >
                    {row.time}
                  </time>
                  <span>
                    {row.fromLabel} → {row.toLabel}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {row.title}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Sem `"use client"`. Sem lucide. Sem `Button`. Sem `formatAge`. Sem importar `./event-filters`. Sem pulso. O `rounded-2xl border` casa com o gráfico; o ponto de cor não compete com o cartão de risco.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/components/dashboard/event-list.test.ts
```

Expected: PASS (1 `describe`, 5 `it`).

- [ ] **Step 5: Full suite, lint and build**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: `npm test` exit 0 (os 15 arquivos anteriores + 2 novos = 17; 91 + 9 = 100 tests). `npm run lint` exit 0. `npm run build` exit 0. O build type-checka o JSX mesmo sem ninguém montar `EventFilters` / `EventList`.

- [ ] **Step 6: Browser — a home ainda abre**

O mapa pede smoke em toda branch. Filtros e lista **não** entram na home (Owns de `page.tsx` / `dashboard.tsx` é W4). O Done when visível (chips + período; mais novo no topo) está nos testes puros desta fatia; no browser só confirme que o placeholder não quebrou.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Confirme que esta fatia **não** montou filtros/lista: a home continua o placeholder. Não crie rota de preview. Não ligue o mock para “ver o chip”.

Se não houver browser tool: **não** substitua a home por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto — não se a lista não tiver aparecido (ela não pode aparecer nesta fatia).

- [ ] **Step 7: Commit**

```bash
git add web/src/components/dashboard/event-list.tsx web/src/components/dashboard/event-list.test.ts
git commit -m "$(cat <<'EOF'
feat(web): list day events newest-first with client filters

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `dashboard.tsx`, `globals.css`, `package.json`, `package-lock.json`, `vitest.config.mts`, `types/`, `lib/`, `hooks/`, `services/`, os arquivos W3c–W3e, `hardware/` nem o mock.

---

## Fora desta fatia (não fazer)

- `dashboard.tsx`, `page.tsx` dinâmico, `layout.tsx`, `globals.css` (W4). Quem empilha `EventFilters` + `EventList` e guarda `useState(DEFAULT_EVENT_FILTER)` é o W4.
- Recalcular risco. Chamar `useReadings` / `detectEvents`. Importar `services/`.
- Prop `now` / `connection`. `"use client"`. `useState` dentro de `EventFilters`.
- Chip colorido com paleta de `RiskLevel`. Pulso na linha. Texto “Sem dados” / “Nenhum evento” / “Ambiente normal”.
- `formatAge` na linha. Guidance do cenário. Selo SIMULAÇÃO por evento. Chip “Todos”.
- `npx shadcn add`. `Button`. lucide. Terceiro arquivo (`event-copy.ts`, `risk-tone.ts`).
- Editar `filters.ts`, `scenarios.ts`, `format.ts`, `vitest.config.mts`, `package.json`, `components/ui/button.tsx`, `components/README.md`, header, cartão, grade e gráfico.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
