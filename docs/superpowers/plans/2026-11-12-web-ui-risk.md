# Cartão de risco e header do dashboard — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o topo do dashboard (`DashboardHeader`) e o cartão de risco (`RiskCard`) como componentes só de props — cor, pulso, selo SIMULAÇÃO e “Sem dados” — sem buscar dado e sem ligar o hook.

**Architecture:** Dois arquivos em `web/src/components/dashboard/`. Cada um exporta uma função pura de view-model (`headerView`, `riskView`) e o JSX que só pinta esse objeto. Sem `"use client"` (não há estado local). Sem `dashboard.tsx`. Sem Testing Library: o Vitest em `node` afirma o view-model; o `build` type-checka o JSX. A cor e o pulso são classes Tailwind no próprio arquivo — CRITICAL alterna vermelho/laranja com uma camada `absolute` + `animate-pulse`, sem tocar `globals.css`.

**Tech Stack:** TypeScript 5 (`strict`), React 19 (JSX automático), Tailwind CSS 4 (`animate-pulse` já existe), Vitest 5.1.0 ambiente `node`, Next.js 16.4.6 só para o smoke da home. `cn` de `@/lib/utils`. `getScenario` de `@/lib/scenarios`. Sem jsdom, sem Testing Library, sem pacote novo, sem `shadcn add`.

**Spec:** fatia W3c + Contratos congelados Componentes + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Cores e o “nunca Ambiente normal” em [`docs/scenarios.md`](../../scenarios.md). Tela em [`docs/architecture.md`](../../architecture.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-ui-risk` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-ui-risk`.
- Baseline: em `web/`, `npm test` já passou (11 files / 73 tests). Não edite `web/src/lib/**`, `web/src/types/**`, `web/src/hooks/**`, `web/src/services/**`, `web/src/app/**`.
- `web/src/components/` só tem `ui/button.tsx` (shadcn, congelado) e `README.md` (W4). **Não existe** `components/dashboard/`.
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.** Ninguém desta fatia monta os componentes na tela (W4).
- `getScenario` já existe em `@/lib/scenarios`. Importe; não copie os 18 textos. `formatAge` **não** entra no header — o hook já entrega segundos inteiros.

## Arquivos (decomposição)

```
web/src/components/dashboard/
├── dashboard-header.tsx        [T1] headerView + DashboardHeader
├── dashboard-header.test.ts    [T1]
├── risk-card.tsx               [T2] riskView + RiskCard
└── risk-card.test.ts           [T2]
```

Nada fora desta lista. Sem `dashboard.tsx`. Sem `index.ts`. Sem `risk-tone.ts`. Sem `README.md` novo. Sem `"use client"`. Fixtures de `Reading` **dentro** do próprio `*.test.ts`.

Os testes são `*.test.ts` (o Vitest só inclui `src/**/*.test.ts`). Eles importam as funções puras do `.tsx`. Não criam `.test.tsx`. Não renderizam JSX. Não editam `vitest.config.mts`.

W4 importa **somente** `DashboardHeader` e `RiskCard`. `headerView` / `riskView` existem para o teste rodar em `node` sem jsdom.

## Global Constraints

- **Owns:** só `web/src/components/dashboard/dashboard-header.tsx`, `risk-card.tsx` e os dois `*.test.ts` ao lado. Precisou de outro arquivo → parar.
- **Assinaturas congeladas:**
  ```ts
  export function DashboardHeader(props: {
    connection: ConnectionStatus;
    secondsSinceLast: number | null;
  }): JSX.Element;

  export function RiskCard(props: {
    reading: Reading | null;
    connection: ConnectionStatus;
  }): JSX.Element;
  ```
  Não acrescente prop (`className`, `now`, `scenario`). Não busque dado. Não chame `useReadings`.
- **Camadas:** kebab-case; imports `@/lib/utils`, `@/lib/scenarios`, `@/types`. `components/` **nunca** importa `services/` nem `node:*`. Sem colunas em português.
- **O web não recalcula risco.** O cartão pinta `reading.level` e `reading.scenarioId` já classificados. `getScenario` só traduz o id.
- **Sem dado:** `connection === "no_data"` **ou** `reading === null` → cinza, título `"Sem dados"`, nunca `"Ambiente normal"`.
- **Sem Testing Library e sem jsdom novo.** Não edite `vitest.config.mts` nem `package.json`. Não instale pacote. Não rode `shadcn add`.
- **Animações no arquivo do componente** (Tailwind `animate-pulse`). Não edite `web/src/app/globals.css`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `page.tsx`, `layout.tsx`, `components/README.md`, `components/ui/button.tsx`.
- **Idioma:** identificadores em inglês; textos da UI em pt-BR com acentos; este plano em pt-BR.
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real. Selo **SIMULAÇÃO** (não “simulado”, não `[SIMULAÇÃO]`).
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** `no_data` cinza; selo SIMULAÇÃO; pulso só ALERT+; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá as props e o conteúdo mínimo. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **Sem `"use client"`. Sem estado local.** Header e cartão são funções de props. W4 é client e os importa; o Next coloca o JSX no bundle do cliente. Não use `useState` / `useEffect`.
2. **Header não reaplica a regra dos 5 s.** `connection` e `secondsSinceLast` já vêm prontos do hook. `live` + `8` continua “Ao vivo · há 8 s”. Quem pinta “Sem dados” no cartão é `connection === "no_data"`, não o número.
3. **Idade do header é sempre segundos.** `secondsSinceLast === null` → não renderiza a idade. Caso contrário → `` `há ${secondsSinceLast} s` `` (espaço antes de `s`). Não chame `formatAge` (ele muda para min/h; o mapa pede `há N s`). `0` → `"há 0 s"`. `60` → `"há 60 s"`.
4. **Rótulos do header, exatamente:** `live` → `"Ao vivo"`; `reconnecting` → `"Reconectando"`; `no_data` → `"Sem dados"`. Título `"GasGuard"`.
5. **`riskView` decide no_data primeiro.** `connection === "no_data" || reading === null` ganha de qualquer `level`/`scenarioId`. Título `"Sem dados"`, guidance `"—"` (U+2014, o mesmo do cenário 0), cinza, sem pulso, sem selo. Um `reading` NORMAL com `no_data` **não** chama o título do cenário.
6. **`reconnecting` / `live` com `reading` presente:** pintam o nível da leitura. Só `no_data` e `reading === null` cinzam o cartão.
7. **FAILURE ≠ sem dados.** `level === "FAILURE"` com conexão viva: cinza, sem pulso, título e orientação de `getScenario(16)`. Não substitua por `"Sem dados"`.
8. **Pulso só ALERT+.** `ALERT` e `HIGH`: `pulse: true`, `alternate: false`. `CRITICAL`: `pulse: true`, `alternate: true`. `NORMAL`, `ATTENTION`, `FAILURE`, `no_data`: os dois `false`.
9. **CRITICAL alterna no JSX, não no CSS global.** Base `bg-red-900`; uma `div` irmã `absolute inset-0 animate-pulse bg-orange-500` (aria-hidden). O artigo em si **não** leva `animate-pulse` quando `alternate` (o overlay já pulsa; o texto fica legível). ALERT/HIGH: `animate-pulse` no artigo.
10. **Selo SIMULAÇÃO** só quando o cartão está *exibindo* uma leitura com `source === "mock"`. `no_data` / `reading === null` → `simulation: false` mesmo se o objeto morto for mock. `source === "board"` → nunca.
11. **Copy do cenário vem de `getScenario(reading.scenarioId)`.** Não recopie a tabela 0–17. Id desconhecido → `"Cenário desconhecido"` / `"—"` (já é o contrato do W1a), cor continua a de `reading.level`.
12. **Classes de cor, exatamente estas** (o teste afirma a string; não troque paleta):

    | Estado | `surfaceClass` | `textClass` |
    |---|---|---|
    | NORMAL | `bg-emerald-600` | `text-white` |
    | ATTENTION | `bg-amber-400` | `text-zinc-950` |
    | ALERT | `bg-orange-500` | `text-white` |
    | HIGH | `bg-red-600` | `text-white` |
    | CRITICAL | `bg-red-900` | `text-white` |
    | FAILURE e no_data | `bg-zinc-500` | `text-white` |

    ATTENTION é amarelo com texto escuro (branco em `amber-400` não lê). Não use `bg-card` / token de tema para a cor do nível — o cartão é o sinal, nos dois modos.
13. **JSX mínimo, mobile-first.** Header: uma linha, título à esquerda, ponto + rótulo + idade à direita. Cartão: `rounded-2xl p-5`, selo opcional, `h2` do título, `p` da orientação. Sem ícone lucide. Sem `Button`. Sem chip extra com o nome do nível — a cor e o título do cenário bastam. Sem `max-w-*` (o W4 define a coluna).
14. **Travessão.** Guidance de no_data e de cenário vazio é `"—"` (U+2014), nunca `"-"` nem `"–"`.
15. **Testes importam o `.tsx` e só chamam o view-model.** Vite/esbuild transforma JSX sem jsdom. Não chame `DashboardHeader(...)` / `RiskCard(...)` no teste. Se o módulo não carregar, **não** instale jsdom — pare e devolva; o Owns não permite outro arquivo nem mudar o Vitest.

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, o W4 mostra “Ambiente normal” com CSV parado:

1. **`no_data` com leitura NORMAL (cenário 0, mock).** Título `"Sem dados"`, cinza, sem pulso, sem selo. Nunca `"Ambiente normal"`. Task 2.
2. **`reading === null` com `connection: "live"`.** Mesmo estado de sem dados (cinza, `"Sem dados"`, sem pulso, sem selo). Task 2.
3. **Pulso só ALERT / HIGH / CRITICAL.** NORMAL, ATTENTION, FAILURE e no_data têm `pulse: false`. CRITICAL também tem `alternate: true`; ALERT/HIGH não. Task 2.
4. **Selo só na leitura mock visível.** Mock + live → `simulation: true`. Board + live → `false`. Mock + `no_data` → `false`. Task 2.
5. **Header: `null` esconde a idade; `0` mostra `"há 0 s"`; rótulos exatamente Ao vivo / Reconectando / Sem dados.** O header não infere `no_data` a partir dos segundos. Task 1.

---

### Task 1: `DashboardHeader` (status + idade)

**Files:**
- Create: `web/src/components/dashboard/dashboard-header.test.ts`
- Create: `web/src/components/dashboard/dashboard-header.tsx`

**Interfaces:**
- Consumes: `ConnectionStatus` de `@/types`. `cn` de `@/lib/utils`. Nada de `formatAge`, nada do hook.
- Produces:
  - `export function headerView(connection: ConnectionStatus, secondsSinceLast: number | null): HeaderView`
  - `HeaderView`: `{ title: "GasGuard"; statusLabel: string; dotClass: string; ageLabel: string | null }`
  - `export function DashboardHeader(props: { connection: ConnectionStatus; secondsSinceLast: number | null })`

`dotClass` (o teste de cor do status): `live` → `"bg-emerald-500"`; `reconnecting` → `"bg-amber-400"`; `no_data` → `"bg-zinc-400"`. Sem `animate-pulse` no ponto — pulso é do cartão.

- [ ] **Step 1: Write the failing test**

Crie `web/src/components/dashboard/dashboard-header.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import type { ConnectionStatus } from "@/types";

import { headerView } from "./dashboard-header";

describe("headerView", () => {
  it("maps each connection status to the pt-BR label and dot color", () => {
    const cases: [ConnectionStatus, string, string][] = [
      ["live", "Ao vivo", "bg-emerald-500"],
      ["reconnecting", "Reconectando", "bg-amber-400"],
      ["no_data", "Sem dados", "bg-zinc-400"],
    ];

    for (const [connection, statusLabel, dotClass] of cases) {
      expect(headerView(connection, 3)).toMatchObject({
        title: "GasGuard",
        statusLabel,
        dotClass,
      });
    }
  });

  it("formats age as há N s and hides it when secondsSinceLast is null", () => {
    expect(headerView("live", 0).ageLabel).toBe("há 0 s");
    expect(headerView("live", 12).ageLabel).toBe("há 12 s");
    expect(headerView("no_data", 8).ageLabel).toBe("há 8 s");
    expect(headerView("reconnecting", 60).ageLabel).toBe("há 60 s");
    expect(headerView("no_data", null).ageLabel).toBeNull();
  });

  it("does not infer no_data from a stale second count", () => {
    const view = headerView("live", 8);

    expect(view.statusLabel).toBe("Ao vivo");
    expect(view.ageLabel).toBe("há 8 s");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/dashboard/dashboard-header.test.ts
```

Expected: FAIL — módulo `./dashboard-header` não existe (ou `headerView` não é função). Não passe. Não edite `vitest.config.mts`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/components/dashboard/dashboard-header.tsx` inteiro:

```tsx
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";

const STATUS: Record<
  ConnectionStatus,
  { statusLabel: string; dotClass: string }
> = {
  live: { statusLabel: "Ao vivo", dotClass: "bg-emerald-500" },
  reconnecting: { statusLabel: "Reconectando", dotClass: "bg-amber-400" },
  no_data: { statusLabel: "Sem dados", dotClass: "bg-zinc-400" },
};

export function headerView(
  connection: ConnectionStatus,
  secondsSinceLast: number | null,
) {
  const { statusLabel, dotClass } = STATUS[connection];
  return {
    title: "GasGuard" as const,
    statusLabel,
    dotClass,
    ageLabel: secondsSinceLast === null ? null : `há ${secondsSinceLast} s`,
  };
}

export function DashboardHeader({
  connection,
  secondsSinceLast,
}: {
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
}) {
  const view = headerView(connection, secondsSinceLast);

  return (
    <header className="flex items-baseline justify-between gap-3">
      <h1 className="text-xl font-semibold tracking-tight">{view.title}</h1>
      <p className="flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", view.dotClass)}
        />
        <span>{view.statusLabel}</span>
        {view.ageLabel ? (
          <span className="text-muted-foreground">{view.ageLabel}</span>
        ) : null}
      </p>
    </header>
  );
}
```

Sem `"use client"`. Sem `formatAge`. Sem lucide. Sem `Button`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/components/dashboard/dashboard-header.test.ts
```

Expected: PASS (1 `describe`, 3 `it`).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/dashboard/dashboard-header.tsx web/src/components/dashboard/dashboard-header.test.ts
git commit -m "$(cat <<'EOF'
feat(web): show live connection status in the dashboard header

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 2: `RiskCard` (cor, pulso, SIMULAÇÃO, sem dados)

**Files:**
- Create: `web/src/components/dashboard/risk-card.test.ts`
- Create: `web/src/components/dashboard/risk-card.tsx`

**Interfaces:**
- Consumes: `getScenario(id: number): ScenarioCopy` de `@/lib/scenarios`. Tipos `ConnectionStatus`, `Reading`, `RiskLevel` de `@/types`. `cn` de `@/lib/utils`. `headerView` **não** entra aqui.
- Produces:
  - `export function riskView(reading: Reading | null, connection: ConnectionStatus): RiskView`
  - `RiskView`: `{ title: string; guidance: string; surfaceClass: string; textClass: string; pulse: boolean; alternate: boolean; simulation: boolean }`
  - `export function RiskCard(props: { reading: Reading | null; connection: ConnectionStatus })`

O JSX aplica `view.pulse && !view.alternate && "animate-pulse"` no `<article>` e, se `view.alternate`, a overlay laranja absoluta. W4 só importa `RiskCard`.

- [ ] **Step 1: Write the failing test**

Crie `web/src/components/dashboard/risk-card.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import { getScenario } from "@/lib/scenarios";
import type { Reading, RiskLevel } from "@/types";

import { riskView } from "./risk-card";

function reading(
  extras: Partial<Pick<Reading, "level" | "scenarioId" | "source">> = {},
): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source: extras.source ?? "board",
    level: extras.level ?? "NORMAL",
    scenarioId: extras.scenarioId ?? 0,
    mq6: { value: 200, base: 180, level: 0 },
    mq2: { value: 150, base: 140, level: 0 },
    flame: false,
    temperature: { celsius: 24, limit: 35, high: false },
    motion: true,
    stoveOn: false,
    secondsWithoutMotion: 0,
  };
}

const NO_DATA = {
  title: "Sem dados",
  guidance: "—",
  surfaceClass: "bg-zinc-500",
  textClass: "text-white",
  pulse: false,
  alternate: false,
  simulation: false,
} as const;

describe("riskView", () => {
  it("paints each firmware level with the spec color and pulse", () => {
    const cases: {
      level: RiskLevel;
      scenarioId: number;
      surfaceClass: string;
      textClass: string;
      pulse: boolean;
      alternate: boolean;
    }[] = [
      {
        level: "NORMAL",
        scenarioId: 0,
        surfaceClass: "bg-emerald-600",
        textClass: "text-white",
        pulse: false,
        alternate: false,
      },
      {
        level: "ATTENTION",
        scenarioId: 10,
        surfaceClass: "bg-amber-400",
        textClass: "text-zinc-950",
        pulse: false,
        alternate: false,
      },
      {
        level: "ALERT",
        scenarioId: 7,
        surfaceClass: "bg-orange-500",
        textClass: "text-white",
        pulse: true,
        alternate: false,
      },
      {
        level: "HIGH",
        scenarioId: 4,
        surfaceClass: "bg-red-600",
        textClass: "text-white",
        pulse: true,
        alternate: false,
      },
      {
        level: "CRITICAL",
        scenarioId: 1,
        surfaceClass: "bg-red-900",
        textClass: "text-white",
        pulse: true,
        alternate: true,
      },
      {
        level: "FAILURE",
        scenarioId: 16,
        surfaceClass: "bg-zinc-500",
        textClass: "text-white",
        pulse: false,
        alternate: false,
      },
    ];

    for (const row of cases) {
      const scenario = getScenario(row.scenarioId);
      expect(
        riskView(reading({ level: row.level, scenarioId: row.scenarioId }), "live"),
      ).toEqual({
        title: scenario.title,
        guidance: scenario.guidance,
        surfaceClass: row.surfaceClass,
        textClass: row.textClass,
        pulse: row.pulse,
        alternate: row.alternate,
        simulation: false,
      });
    }
  });

  it("uses Sem dados instead of Ambiente normal when the connection is stale", () => {
    const staleNormal = reading({
      level: "NORMAL",
      scenarioId: 0,
      source: "mock",
    });

    expect(riskView(staleNormal, "no_data")).toEqual(NO_DATA);
    expect(riskView(staleNormal, "no_data").title).not.toBe("Ambiente normal");
  });

  it("uses Sem dados when there is no reading, even if the socket is live", () => {
    expect(riskView(null, "live")).toEqual(NO_DATA);
    expect(riskView(null, "reconnecting")).toEqual(NO_DATA);
    expect(riskView(null, "no_data")).toEqual(NO_DATA);
  });

  it("keeps FAILURE copy when data is fresh, and still shows risk while reconnecting", () => {
    const failure = reading({ level: "FAILURE", scenarioId: 16 });
    const scenario = getScenario(16);

    expect(riskView(failure, "live")).toMatchObject({
      title: scenario.title,
      guidance: scenario.guidance,
      surfaceClass: "bg-zinc-500",
      pulse: false,
      simulation: false,
    });
    expect(riskView(failure, "live").title).not.toBe("Sem dados");

    const critical = reading({ level: "CRITICAL", scenarioId: 1 });
    expect(riskView(critical, "reconnecting")).toMatchObject({
      title: getScenario(1).title,
      surfaceClass: "bg-red-900",
      pulse: true,
      alternate: true,
    });
  });

  it("shows SIMULAÇÃO only for a visible mock reading", () => {
    expect(
      riskView(reading({ source: "mock", scenarioId: 0 }), "live").simulation,
    ).toBe(true);
    expect(
      riskView(reading({ source: "board", scenarioId: 0 }), "live").simulation,
    ).toBe(false);
    expect(
      riskView(reading({ source: "mock", scenarioId: 0 }), "no_data").simulation,
    ).toBe(false);
  });

  it("keeps the level color when the scenario id is unknown", () => {
    const view = riskView(
      reading({ level: "ALERT", scenarioId: 99 }),
      "live",
    );
    const unknown = getScenario(99);

    expect(view.title).toBe(unknown.title);
    expect(view.guidance).toBe(unknown.guidance);
    expect(view.surfaceClass).toBe("bg-orange-500");
    expect(view.pulse).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/dashboard/risk-card.test.ts
```

Expected: FAIL — módulo `./risk-card` não existe (ou `riskView` não é função). Não passe.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/components/dashboard/risk-card.tsx` inteiro:

```tsx
import { getScenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import type { ConnectionStatus, Reading, RiskLevel } from "@/types";

type Tone = {
  surfaceClass: string;
  textClass: string;
  pulse: boolean;
  alternate: boolean;
};

const TONE: Record<RiskLevel, Tone> = {
  NORMAL: {
    surfaceClass: "bg-emerald-600",
    textClass: "text-white",
    pulse: false,
    alternate: false,
  },
  ATTENTION: {
    surfaceClass: "bg-amber-400",
    textClass: "text-zinc-950",
    pulse: false,
    alternate: false,
  },
  ALERT: {
    surfaceClass: "bg-orange-500",
    textClass: "text-white",
    pulse: true,
    alternate: false,
  },
  HIGH: {
    surfaceClass: "bg-red-600",
    textClass: "text-white",
    pulse: true,
    alternate: false,
  },
  CRITICAL: {
    surfaceClass: "bg-red-900",
    textClass: "text-white",
    pulse: true,
    alternate: true,
  },
  FAILURE: {
    surfaceClass: "bg-zinc-500",
    textClass: "text-white",
    pulse: false,
    alternate: false,
  },
};

const NO_DATA_VIEW = {
  title: "Sem dados",
  guidance: "—",
  surfaceClass: "bg-zinc-500",
  textClass: "text-white",
  pulse: false,
  alternate: false,
  simulation: false,
} as const;

export function riskView(
  reading: Reading | null,
  connection: ConnectionStatus,
) {
  if (connection === "no_data" || reading === null) {
    return { ...NO_DATA_VIEW };
  }

  const scenario = getScenario(reading.scenarioId);
  const tone = TONE[reading.level];
  return {
    title: scenario.title,
    guidance: scenario.guidance,
    surfaceClass: tone.surfaceClass,
    textClass: tone.textClass,
    pulse: tone.pulse,
    alternate: tone.alternate,
    simulation: reading.source === "mock",
  };
}

export function RiskCard({
  reading,
  connection,
}: {
  reading: Reading | null;
  connection: ConnectionStatus;
}) {
  const view = riskView(reading, connection);

  return (
    <article
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 shadow-sm",
        view.surfaceClass,
        view.textClass,
        view.pulse && !view.alternate && "animate-pulse",
      )}
    >
      {view.alternate ? (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-orange-500"
        />
      ) : null}
      <div className="relative space-y-2">
        {view.simulation ? (
          <span className="inline-flex rounded-full border border-current/40 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wider">
            SIMULAÇÃO
          </span>
        ) : null}
        <h2 className="text-lg font-semibold leading-snug">{view.title}</h2>
        <p className="text-sm/6 opacity-90">{view.guidance}</p>
      </div>
    </article>
  );
}
```

Sem `"use client"`. Sem recópia dos 18 textos. Sem editar `globals.css`. Sem lucide. O overlay CRITICAL fica **atrás** do texto (`relative` no conteúdo).

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/components/dashboard/risk-card.test.ts
```

Expected: PASS (1 `describe`, 6 `it`).

- [ ] **Step 5: Full suite, lint and build**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: `npm test` exit 0 (os 11 arquivos anteriores + 2 novos). `npm run lint` exit 0. `npm run build` exit 0. O build type-checka o JSX dos dois componentes mesmo sem ninguém os montar.

- [ ] **Step 6: Browser — a home ainda abre**

O mapa pede smoke em toda branch. Estes componentes **não** entram na home (Owns de `page.tsx` / `dashboard.tsx` é W4). O Done when visível (cinza / selo / pulso) está nos testes puros desta task; no browser desta fatia só confirme que o placeholder não quebrou.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Confirme que esta fatia **não** montou o cartão: a home continua o placeholder. Não crie rota de preview. Não ligue o mock para “ver o pulso”.

Se não houver browser tool: **não** substitua a home por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto — não se o cartão não tiver aparecido (ele não pode aparecer nesta fatia).

- [ ] **Step 7: Commit**

```bash
git add web/src/components/dashboard/risk-card.tsx web/src/components/dashboard/risk-card.test.ts
git commit -m "$(cat <<'EOF'
feat(web): render risk color, pulse and simulation on the card

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `dashboard.tsx`, `globals.css`, `package.json`, `vitest.config.mts`, `types/`, `lib/`, `hooks/`, `services/`, `hardware/` nem o mock.

---

## Fora desta fatia (não fazer)

- `dashboard.tsx`, `page.tsx` dinâmico, `layout.tsx`, `globals.css`, métricas, gráfico, eventos, filtros (W3d–W4). Quem monta header + cartão é o W4.
- Recalcular risco. Chamar `useReadings`. Importar `services/`.
- Editar `getScenario`, `formatAge`, `vitest.config.mts`, `package.json`, `components/ui/button.tsx`, `components/README.md`.
- Instalar Testing Library / jsdom / ícone extra. `npx shadcn add card`.
- Keyframes de CRITICAL em `globals.css`.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
