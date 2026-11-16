# Hook `useReadings` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `useReadings(initial)` — o estado do dashboard no navegador: junta a carga inicial com o SSE, descarta duplicata por timestamp, recorta 10 min, deriva eventos com `detectEvents`, marca `no_data` após 5 s e chama `router.refresh()` em `reset` ou reconexão.

**Architecture:** Um arquivo. A regra vive num reducer puro (`initReadings` + `readingsReducer`); `bindReadingsStream` só traduz `EventSource` → actions + `refresh`; `useReadings` é a cola React (`useReducer` + `EventSource("/api/stream")` + tick de 1 s). Sem Testing Library e sem jsdom: o teste afirma o reducer e o bind. O `build` type-checka o hook. W4 é quem monta o hook na tela.

**Tech Stack:** TypeScript 5 (`strict`), Vitest 5.1.0 ambiente `node`, React 19 hooks, Next.js 16.4.6 `next/navigation` (`useRouter().refresh`), `EventSource` nativo. Sem jsdom, sem `@testing-library/react`, sem pacote `eventsource`.

**Spec:** fatia W3b + Contratos congelados Hook + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Camada `hooks/` em [`docs/architecture.md`](../../architecture.md). Assinatura de `useReadings` copia o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-use-readings` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-use-readings`.
- Baseline: em `web/`, `npm test` já passou (lib W1a + parse/tail W1b + report-service W2 + SSE W3a). Não edite `web/src/lib/**`, `web/src/types/**`, `web/src/services/**`, `web/src/app/**`.
- `web/src/hooks/` só tem `README.md` (placeholder da Etapa 3). **Não existe** `use-readings.ts`.
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.** Ninguém desta fatia monta o hook na UI (W4).
- `detectEvents` já existe em `@/lib/events`. Importe; não copie; não recrie eventos à mão.

## Arquivos (decomposição)

```
web/src/hooks/
├── README.md                 [T2] descreve o módulo real
├── use-readings.ts           [T1 reducer; T2 bind + hook]
└── use-readings.test.ts      [T1 reducer; T2 bind]
```

Nada fora desta lista. Sem `use-readings-state.ts`. Sem `readings-reducer.ts`. Sem `index.ts`. Sem constante exportada (`STALE_SECONDS`). Fixtures de `Reading` **dentro** do próprio `*.test.ts`.

O mapa nomeia `use-readings.test.ts` porque o Done when (duplicata, 5 s, `refresh`) cabe nesse arquivo. Funções extras exportadas (`initReadings`, `readingsReducer`, `bindReadingsStream`) existem **só** para o teste rodar em `node` sem jsdom. W4 importa **somente** `useReadings`.

## Global Constraints

- **Owns:** só `web/src/hooks/use-readings.ts`, `use-readings.test.ts` e `hooks/README.md`. Precisou de outro arquivo → parar.
- **Assinatura congelada:**
  ```ts
  export function useReadings(initial: RecentReadings | null): {
    readings: Reading[];
    events: ReportEvent[];
    connection: ConnectionStatus;
    secondsSinceLast: number | null;
  };
  ```
  Não acrescente parâmetro, não devolva `date` / `streamOpen` / o `EventSource`.
- **Camadas:** `"use client"` no topo de `use-readings.ts`; kebab-case; imports `@/lib/events`, `@/types`, `next/navigation`, `react`. `hooks/` **nunca** importa `services/` nem `node:*`. Sem `fs`. Sem colunas em português.
- **Regra de risco:** o hook **não** recalcula nível. `detectEvents` só compara `level` já classificado. Eventos do dia inteiro vêm de `initial.events`; o live **acrescenta**, não substitui pelo recorte de 10 min.
- **Sem Testing Library e sem jsdom novo.** Não edite `vitest.config.mts` nem `package.json`. Não instale pacote.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `page.tsx`, a rota SSE.
- **Idioma:** identificadores em inglês; este plano em pt-BR; UI intocada (continua pt-BR).
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** duplicata por timestamp; 5 s → `no_data`; `reset` chama `refresh`; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá a assinatura e as cinco regras. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **Relógio sempre entra como `now: number` (epoch ms).** O reducer não chama `Date.now()`. Nos testes, `now` é `new Date(2026, 10, 12, 14, 32, 20).getTime()` — mês `10` = novembro, construtor local, nunca `Date.parse` de ISO sem fuso.
2. **ISO local sem fuso.** `Reading.timestamp` é `"2026-11-12T14:32:08"` (sem `Z`). Não passe essa string para `new Date(iso)`. Parseie componentes locais — a mesma função privada de `lib/format.ts` / `lib/filters.ts`, copiada neste arquivo (Owns não permite um quinto helper em `lib/`).
3. **Duplicata:** `incoming.timestamp <= último timestamp aceito` → descartar. Comparação de **string** (D18: `hora` identifica a linha; o formato `AAAA-MM-DDTHH:MM:SS` é lexicográfico = cronológico). Não parseie para deduplicar. Vale `=` e vale mais antigo.
4. **Janela de 10 min:** inclusiva, relativa à **última leitura do buffer**, não ao relógio de parede (igual ao service). `T` e `T - 600_000 ms` ficam; `T - 600_001 ms` sai. Recorte só `readings`. `events` do dia **não** se recortam.
5. **Eventos ao vivo:** `detectEvents([leituraAnterior, incoming])` e concatena. Lista vazia / primeira leitura do buffer → nenhum evento novo (W1a). **Proibido** `detectEvents(readings)` no buffer de 10 min — apagaria o evento das 08:00 que veio em `initial.events`.
6. **`connection`, uma função, nesta ordem:**
   - `secondsSinceLast === null` **ou** `secondsSinceLast >= 5` → `"no_data"`
   - senão, se o stream não está aberto → `"reconnecting"`
   - senão → `"live"`
   `no_data` ganha de socket aberto. Nunca `"live"` com dado velho. `initial === null` e nada chegou ≡ `readings` vazio ≡ `secondsSinceLast === null` ≡ `"no_data"` na hora, sem esperar 5 s.
7. **`secondsSinceLast`:** floor dos segundos entre o timestamp da última leitura e `now`. `null` só quando não há última leitura. Dado velho **continua** com o número (5, 6, 7…) — quem pinta “Sem dados” é `connection`. Timestamp futuro ou ISO inválida → `0` (não `NaN`, não throw).
8. **Tick de 1 s** no hook (`setInterval` 1000) dispara `{ type: "tick", now }`. Sem isso o header trava em “há 0 s” e o `no_data` só mudaria na próxima linha SSE.
9. **`reset` SSE:** `dispatch({ type: "reset" })` zera `readings` e `events` (arquivo novo) **e** `refresh()`. `streamOpen` permanece como está. Não feche o `EventSource`.
10. **`EventSource.onerror` seguido de `onopen`:** `refresh()`. O **primeiro** `onopen` (nunca houve `onerror` nesta conexão) **não** chama `refresh` — senão mount → open → refresh → hydrate → loop.
11. **`ping`:** ignorar. Não dê `addEventListener("ping")`. Não dispare action.
12. **JSON de `reading` inválido:** `JSON.parse` em try/catch; se não for objeto com `timestamp: string`, pular. Não throw. Não dispare action.
13. **Hydrate depois de `refresh`:** `router.refresh()` **não** desmonta o client component. O hook reage quando a prop `initial` muda de identidade (ref: se é a mesma referência, não-op). Hydrate **mescla**: snapshot do servidor + leituras/eventos locais com timestamp **estritamente maior** que o último do snapshot (a linha que chegou no SSE enquanto o refresh andava não some). `reset` já zerou o local, então o hydrate do dia novo é só o snapshot.
14. **`EventSource("/api/stream")`.** URL relativa. Não importe `route.ts`. Não use `Last-Event-ID`. `new EventSource` só dentro do `useEffect` — cada mount = uma conexão; o cleanup chama o unbind (que dá `close()`).
15. **Testes mockam `next/navigation` só na Task 2** (quando o módulo passa a importar `useRouter`). Task 1 ainda não importa `react` nem `next`. Restaure mocks no `afterEach` da Task 2.

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, quebram o dashboard no W4 sem o implementer perceber:

1. **Duplicata e linha atrasada.** `14:32:20` duas vezes e `14:32:19` depois de `14:32:20` não entram. Task 1.
2. **Evento da manhã sobrevive ao recorte de 10 min.** `initial.events` com mudança às 08:00 continua depois de um `reading` às 14:32. Task 1.
3. **5 s → `no_data`, 4 s ainda não.** Com stream aberto e última leitura em `14:32:15` vs `now = 14:32:20` → `"no_data"`; `14:32:16` → `"live"`. Sem leitura → `"no_data"` imediato, `secondsSinceLast === null`. Task 1.
4. **`reset` chama `refresh` uma vez.** Task 2.
5. **Primeiro `open` não chama `refresh`; `error` + `open` chama.** Task 2.

---

### Task 1: Reducer puro (duplicata, janela, eventos, `no_data`)

**Files:**
- Create: `web/src/hooks/use-readings.test.ts`
- Create: `web/src/hooks/use-readings.ts`

**Interfaces:**
- Consumes: `detectEvents(readings: Reading[]): ReportEvent[]` de `@/lib/events`. Tipos `ConnectionStatus`, `Reading`, `RecentReadings`, `ReportEvent` de `@/types`.
- Produces:
  - `export function initReadings(initial: RecentReadings | null, now: number): ReadingsState`
  - `export function readingsReducer(state: ReadingsState, action: ReadingsAction): ReadingsState`
  - `ReadingsState` com `readings`, `events`, `connection`, `secondsSinceLast`, `streamOpen`
  - `ReadingsAction`: `"hydrate" | "reading" | "tick" | "open" | "error" | "reset"`, todas com `now: number`; `"reading"` traz `reading: Reading`; `"hydrate"` traz `initial: RecentReadings | null`

O hook, o `EventSource` e o README **não** entram nesta task.

- [ ] **Step 1: Write the failing test**

Crie `web/src/hooks/use-readings.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import type { Reading, RecentReadings, ReportEvent, RiskLevel } from "@/types";

import { initReadings, readingsReducer } from "./use-readings";

const NOW = new Date(2026, 10, 12, 14, 32, 20).getTime();

function reading(
  timestamp: string,
  level: RiskLevel = "NORMAL",
  extras: Partial<Pick<Reading, "scenarioId" | "source">> = {},
): Reading {
  return {
    timestamp,
    source: extras.source ?? "mock",
    level,
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

function snapshot(
  readings: Reading[],
  events: ReportEvent[] = [],
): RecentReadings {
  return { date: "2026-11-12", readings, events };
}

const MORNING_EVENT: ReportEvent = {
  id: "2026-11-12T08:00:00",
  timestamp: "2026-11-12T08:00:00",
  from: "NORMAL",
  to: "ALERT",
  scenarioId: 7,
  source: "mock",
};

describe("initReadings", () => {
  it("is no_data with empty buffers when initial is null", () => {
    const state = initReadings(null, NOW);

    expect(state).toMatchObject({
      readings: [],
      events: [],
      connection: "no_data",
      secondsSinceLast: null,
      streamOpen: false,
    });
  });

  it("keeps the day's events and marks reconnecting while the stream is closed", () => {
    const last = reading("2026-11-12T14:32:20");
    const state = initReadings(snapshot([last], [MORNING_EVENT]), NOW);

    expect(state.readings).toEqual([last]);
    expect(state.events).toEqual([MORNING_EVENT]);
    expect(state.connection).toBe("reconnecting");
    expect(state.secondsSinceLast).toBe(0);
    expect(state.streamOpen).toBe(false);
  });

  it("drops readings older than 10 minutes relative to the latest", () => {
    const kept = reading("2026-11-12T14:22:20");
    const latest = reading("2026-11-12T14:32:20");
    const state = initReadings(
      snapshot([
        reading("2026-11-12T14:22:19"),
        kept,
        latest,
      ]),
      NOW,
    );

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:22:20",
      "2026-11-12T14:32:20",
    ]);
  });
});

describe("readingsReducer", () => {
  it("discards duplicate and older timestamps", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:20")]), NOW);
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20", "ALERT", { scenarioId: 7 }),
      now: NOW,
    });
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:19"),
      now: NOW,
    });

    expect(state.readings).toHaveLength(1);
    expect(state.readings[0]?.level).toBe("NORMAL");
    expect(state.events).toEqual([]);
  });

  it("appends a newer reading, a level-change event, and keeps morning events", () => {
    const previous = reading("2026-11-12T14:32:19");
    let state = initReadings(snapshot([previous], [MORNING_EVENT]), NOW);
    const incoming = reading("2026-11-12T14:32:20", "ALERT", { scenarioId: 7 });
    state = readingsReducer(state, { type: "reading", reading: incoming, now: NOW });

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:32:19",
      "2026-11-12T14:32:20",
    ]);
    expect(state.events).toEqual([
      MORNING_EVENT,
      {
        id: "2026-11-12T14:32:20",
        timestamp: "2026-11-12T14:32:20",
        from: "NORMAL",
        to: "ALERT",
        scenarioId: 7,
        source: "mock",
      },
    ]);
  });

  it("does not add an event when the level stays the same", () => {
    let state = initReadings(
      snapshot([reading("2026-11-12T14:32:19")], [MORNING_EVENT]),
      NOW,
    );
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });

    expect(state.events).toEqual([MORNING_EVENT]);
  });

  it("trims the chart buffer to the last 10 minutes after a live reading", () => {
    let state = initReadings(
      snapshot([
        reading("2026-11-12T14:22:19"),
        reading("2026-11-12T14:22:20"),
      ]),
      NOW,
    );
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:22:20",
      "2026-11-12T14:32:20",
    ]);
  });

  it("is live at 4 s and no_data at 5 s when the stream is open", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:16")]), NOW);
    state = readingsReducer(state, { type: "open", now: NOW });
    expect(state.connection).toBe("live");
    expect(state.secondsSinceLast).toBe(4);

    state = readingsReducer(state, {
      type: "tick",
      now: new Date(2026, 10, 12, 14, 32, 21).getTime(),
    });
    expect(state.connection).toBe("no_data");
    expect(state.secondsSinceLast).toBe(5);
  });

  it("is reconnecting on error while data is fresh, and no_data when it goes stale", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:20")]), NOW);
    state = readingsReducer(state, { type: "open", now: NOW });
    state = readingsReducer(state, { type: "error", now: NOW });
    expect(state.connection).toBe("reconnecting");

    state = readingsReducer(state, {
      type: "tick",
      now: new Date(2026, 10, 12, 14, 32, 25).getTime(),
    });
    expect(state.connection).toBe("no_data");
  });

  it("clears readings and events on reset and stays no_data", () => {
    let state = initReadings(
      snapshot([reading("2026-11-12T14:32:20")], [MORNING_EVENT]),
      NOW,
    );
    state = readingsReducer(state, { type: "open", now: NOW });
    state = readingsReducer(state, { type: "reset", now: NOW });

    expect(state.readings).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.connection).toBe("no_data");
    expect(state.secondsSinceLast).toBe(null);
    expect(state.streamOpen).toBe(true);
  });

  it("hydrates from the server snapshot and keeps a newer local reading", () => {
    let state = initReadings(snapshot([reading("2026-11-12T14:32:19")]), NOW);
    state = readingsReducer(state, { type: "open", now: NOW });
    state = readingsReducer(state, {
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });
    state = readingsReducer(state, {
      type: "hydrate",
      initial: snapshot([reading("2026-11-12T14:32:19")], [MORNING_EVENT]),
      now: NOW,
    });

    expect(state.readings.map((item) => item.timestamp)).toEqual([
      "2026-11-12T14:32:19",
      "2026-11-12T14:32:20",
    ]);
    expect(state.events).toEqual([MORNING_EVENT]);
    expect(state.streamOpen).toBe(true);
    expect(state.connection).toBe("live");
  });
});
```

Não importe `react`. Não importe `next/navigation`. Não use fake timers. Não chame `useReadings`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/hooks/use-readings.test.ts
```

Expected: FAIL. Mensagem no espírito de `Cannot find module './use-readings'` / `initReadings is not a function`. Se os `it` passarem, o Step 1 não foi feito — não avance.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/hooks/use-readings.ts` inteiro:

```ts
import { detectEvents } from "@/lib/events";
import type {
  ConnectionStatus,
  Reading,
  RecentReadings,
  ReportEvent,
} from "@/types";

const STALE_SECONDS = 5;
const WINDOW_MS = 10 * 60 * 1000;

export type ReadingsState = {
  readings: Reading[];
  events: ReportEvent[];
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
  streamOpen: boolean;
};

export type ReadingsAction =
  | { type: "hydrate"; initial: RecentReadings | null; now: number }
  | { type: "reading"; reading: Reading; now: number }
  | { type: "tick"; now: number }
  | { type: "open"; now: number }
  | { type: "error"; now: number }
  | { type: "reset"; now: number };

function parseLocalIso(iso: string): Date | null {
  const [datePart, timePart] = iso.split("T");
  if (
    !datePart ||
    !timePart ||
    timePart.includes("Z") ||
    timePart.includes("+")
  ) {
    return null;
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if (
    [year, month, day, hour, minute, second].some(
      (value) => !Number.isFinite(value),
    )
  ) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, second);
}

function keepLastMinutes(readings: Reading[]): Reading[] {
  if (readings.length === 0) return [];
  const latest = parseLocalIso(readings[readings.length - 1].timestamp);
  if (!latest) return readings;
  const earliest = latest.getTime() - WINDOW_MS;
  return readings.filter((item) => {
    const at = parseLocalIso(item.timestamp);
    return at !== null && at.getTime() >= earliest;
  });
}

function ageSeconds(timestamp: string | undefined, now: number): number | null {
  if (!timestamp) return null;
  const then = parseLocalIso(timestamp);
  if (!then) return null;
  return Math.max(0, Math.floor((now - then.getTime()) / 1000));
}

function view(
  readings: Reading[],
  events: ReportEvent[],
  streamOpen: boolean,
  now: number,
): ReadingsState {
  const secondsSinceLast = ageSeconds(
    readings[readings.length - 1]?.timestamp,
    now,
  );
  const connection: ConnectionStatus =
    secondsSinceLast === null || secondsSinceLast >= STALE_SECONDS
      ? "no_data"
      : streamOpen
        ? "live"
        : "reconnecting";
  return { readings, events, connection, secondsSinceLast, streamOpen };
}

export function initReadings(
  initial: RecentReadings | null,
  now: number,
): ReadingsState {
  return view(
    keepLastMinutes(initial?.readings ?? []),
    initial?.events ?? [],
    false,
    now,
  );
}

export function readingsReducer(
  state: ReadingsState,
  action: ReadingsAction,
): ReadingsState {
  switch (action.type) {
    case "tick":
      return view(
        state.readings,
        state.events,
        state.streamOpen,
        action.now,
      );
    case "open":
      return view(state.readings, state.events, true, action.now);
    case "error":
      return view(state.readings, state.events, false, action.now);
    case "reset":
      return view([], [], state.streamOpen, action.now);
    case "hydrate": {
      const incoming = initReadings(action.initial, action.now);
      const lastReadingAt =
        incoming.readings[incoming.readings.length - 1]?.timestamp ?? "";
      const lastEventAt =
        incoming.events[incoming.events.length - 1]?.timestamp ?? "";
      const readings = keepLastMinutes([
        ...incoming.readings,
        ...state.readings.filter((item) => item.timestamp > lastReadingAt),
      ]);
      const events = [
        ...incoming.events,
        ...state.events.filter((item) => item.timestamp > lastEventAt),
      ];
      return view(readings, events, state.streamOpen, action.now);
    }
    case "reading": {
      const last = state.readings[state.readings.length - 1]?.timestamp;
      if (last !== undefined && action.reading.timestamp <= last) {
        return view(
          state.readings,
          state.events,
          state.streamOpen,
          action.now,
        );
      }
      const previous = state.readings[state.readings.length - 1];
      const readings = keepLastMinutes([...state.readings, action.reading]);
      const extra = previous
        ? detectEvents([previous, action.reading])
        : [];
      return view(
        readings,
        extra.length === 0 ? state.events : [...state.events, ...extra],
        state.streamOpen,
        action.now,
      );
    }
  }
}
```

Sem `"use client"` ainda. Sem `react`. Sem `next/navigation`. Sem exportar `STALE_SECONDS` / `WINDOW_MS` / `parseLocalIso`. Sem `Date.now()`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/hooks/use-readings.test.ts
```

Expected: PASS (2 `describe`, 10 `it`).

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/use-readings.ts web/src/hooks/use-readings.test.ts
git commit -m "$(cat <<'EOF'
feat(web): reduce live readings without duplicate timestamps

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 2: `bindReadingsStream` + `useReadings` + README

**Files:**
- Modify: `web/src/hooks/use-readings.ts` (arquivo da Task 1 — vira o módulo completo)
- Modify: `web/src/hooks/use-readings.test.ts` (acrescente os `describe` abaixo; **não apague** os da Task 1)
- Modify: `web/src/hooks/README.md`

**Interfaces:**
- Consumes: `initReadings`, `readingsReducer` (Task 1). `useRouter` de `next/navigation`. `EventSource` do browser.
- Produces:
  - `export function bindReadingsStream(args: { source: ReadingsSource; dispatch: (action: ReadingsAction) => void; refresh: () => void; now: () => number }): () => void`
  - `export function useReadings(initial: RecentReadings | null): { readings: Reading[]; events: ReportEvent[]; connection: ConnectionStatus; secondsSinceLast: number | null }`
  - `ReadingsSource`: o recorte de `EventSource` que o bind usa (`addEventListener`, `removeEventListener`, `close`, `onopen`, `onerror`)

- [ ] **Step 1: Write the failing test**

No **topo** de `web/src/hooks/use-readings.test.ts`, **substitua** os imports por:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Reading, RecentReadings, ReportEvent, RiskLevel } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import {
  bindReadingsStream,
  initReadings,
  readingsReducer,
  useReadings,
} from "./use-readings";
```

Não mova o mock para baixo dos imports do módulo — o arquivo vai passar a carregar `next/navigation`.

No **final** do mesmo arquivo, **acrescente** (os `describe` da Task 1 ficam):

```ts
class FakeStream {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: string) {
    const event = { data } as MessageEvent;
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe("bindReadingsStream", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches a parsed reading and ignores ping and bad json", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    source.emit("reading", JSON.stringify(reading("2026-11-12T14:32:20")));
    source.emit("ping", "");
    source.emit("reading", "{");
    source.emit("reading", "null");
    source.emit("reading", JSON.stringify({ level: "NORMAL" }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "reading",
      reading: reading("2026-11-12T14:32:20"),
      now: NOW,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("dispatches reset and calls refresh on the reset event", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    source.emit("reset", "");

    expect(dispatch).toHaveBeenCalledWith({ type: "reset", now: NOW });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on the first open, and refreshes on open after error", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    source.onopen?.(new Event("open"));
    expect(dispatch).toHaveBeenCalledWith({ type: "open", now: NOW });
    expect(refresh).not.toHaveBeenCalled();

    source.onerror?.(new Event("error"));
    expect(dispatch).toHaveBeenCalledWith({ type: "error", now: NOW });

    source.onopen?.(new Event("open"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("closes the source on unbind and ignores later events", () => {
    const source = new FakeStream();
    const dispatch = vi.fn();
    const refresh = vi.fn();
    const unbind = bindReadingsStream({
      source,
      dispatch,
      refresh,
      now: () => NOW,
    });

    unbind();
    source.emit("reset", "");
    source.emit("reading", JSON.stringify(reading("2026-11-12T14:32:20")));

    expect(source.closed).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("useReadings", () => {
  it("is the frozen client entry that W4 will call", () => {
    expect(typeof useReadings).toBe("function");
  });
});
```

O `unbind` tem que remover os listeners **ou** ignorar emits depois do `close` — o teste só afirma `close()`. Se o fake ainda entregar `reset` depois do unbind e o bind ainda chamar `refresh`, o teste de `reset` (o `it` anterior) não é este; este `it` não espia `refresh`. Mesmo assim o unbind **deve** remover listeners para não vazar no browser. A implementação abaixo remove.

Não renderize o hook. Não use `@testing-library/react`. Não instancie `EventSource` real.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/hooks/use-readings.test.ts
```

Expected: FAIL. Mensagem no espírito de `bindReadingsStream is not a function` / `useReadings is not a function`. Os 10 `it` da Task 1 continuam PASS se o reducer não foi apagado. Se os `it` novos passarem, o Step 1 não foi feito — não avance.

- [ ] **Step 3: Write minimal implementation**

Substitua `web/src/hooks/use-readings.ts` **inteiro** por:

```ts
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";

import { detectEvents } from "@/lib/events";
import type {
  ConnectionStatus,
  Reading,
  RecentReadings,
  ReportEvent,
} from "@/types";

const STALE_SECONDS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const TICK_MS = 1000;

export type ReadingsState = {
  readings: Reading[];
  events: ReportEvent[];
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
  streamOpen: boolean;
};

export type ReadingsAction =
  | { type: "hydrate"; initial: RecentReadings | null; now: number }
  | { type: "reading"; reading: Reading; now: number }
  | { type: "tick"; now: number }
  | { type: "open"; now: number }
  | { type: "error"; now: number }
  | { type: "reset"; now: number };

export type ReadingsSource = {
  addEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void;
  close(): void;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

function parseLocalIso(iso: string): Date | null {
  const [datePart, timePart] = iso.split("T");
  if (
    !datePart ||
    !timePart ||
    timePart.includes("Z") ||
    timePart.includes("+")
  ) {
    return null;
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if (
    [year, month, day, hour, minute, second].some(
      (value) => !Number.isFinite(value),
    )
  ) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, second);
}

function keepLastMinutes(readings: Reading[]): Reading[] {
  if (readings.length === 0) return [];
  const latest = parseLocalIso(readings[readings.length - 1].timestamp);
  if (!latest) return readings;
  const earliest = latest.getTime() - WINDOW_MS;
  return readings.filter((item) => {
    const at = parseLocalIso(item.timestamp);
    return at !== null && at.getTime() >= earliest;
  });
}

function ageSeconds(timestamp: string | undefined, now: number): number | null {
  if (!timestamp) return null;
  const then = parseLocalIso(timestamp);
  if (!then) return null;
  return Math.max(0, Math.floor((now - then.getTime()) / 1000));
}

function view(
  readings: Reading[],
  events: ReportEvent[],
  streamOpen: boolean,
  now: number,
): ReadingsState {
  const secondsSinceLast = ageSeconds(
    readings[readings.length - 1]?.timestamp,
    now,
  );
  const connection: ConnectionStatus =
    secondsSinceLast === null || secondsSinceLast >= STALE_SECONDS
      ? "no_data"
      : streamOpen
        ? "live"
        : "reconnecting";
  return { readings, events, connection, secondsSinceLast, streamOpen };
}

export function initReadings(
  initial: RecentReadings | null,
  now: number,
): ReadingsState {
  return view(
    keepLastMinutes(initial?.readings ?? []),
    initial?.events ?? [],
    false,
    now,
  );
}

export function readingsReducer(
  state: ReadingsState,
  action: ReadingsAction,
): ReadingsState {
  switch (action.type) {
    case "tick":
      return view(
        state.readings,
        state.events,
        state.streamOpen,
        action.now,
      );
    case "open":
      return view(state.readings, state.events, true, action.now);
    case "error":
      return view(state.readings, state.events, false, action.now);
    case "reset":
      return view([], [], state.streamOpen, action.now);
    case "hydrate": {
      const incoming = initReadings(action.initial, action.now);
      const lastReadingAt =
        incoming.readings[incoming.readings.length - 1]?.timestamp ?? "";
      const lastEventAt =
        incoming.events[incoming.events.length - 1]?.timestamp ?? "";
      const readings = keepLastMinutes([
        ...incoming.readings,
        ...state.readings.filter((item) => item.timestamp > lastReadingAt),
      ]);
      const events = [
        ...incoming.events,
        ...state.events.filter((item) => item.timestamp > lastEventAt),
      ];
      return view(readings, events, state.streamOpen, action.now);
    }
    case "reading": {
      const last = state.readings[state.readings.length - 1]?.timestamp;
      if (last !== undefined && action.reading.timestamp <= last) {
        return view(
          state.readings,
          state.events,
          state.streamOpen,
          action.now,
        );
      }
      const previous = state.readings[state.readings.length - 1];
      const readings = keepLastMinutes([...state.readings, action.reading]);
      const extra = previous
        ? detectEvents([previous, action.reading])
        : [];
      return view(
        readings,
        extra.length === 0 ? state.events : [...state.events, ...extra],
        state.streamOpen,
        action.now,
      );
    }
  }
}

function parseReading(data: string): Reading | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { timestamp?: unknown }).timestamp !== "string"
    ) {
      return null;
    }
    return parsed as Reading;
  } catch {
    return null;
  }
}

export function bindReadingsStream(args: {
  source: ReadingsSource;
  dispatch: (action: ReadingsAction) => void;
  refresh: () => void;
  now: () => number;
}): () => void {
  const { source, dispatch, refresh, now } = args;
  let seenError = false;

  const onReading = (event: MessageEvent) => {
    const reading = parseReading(event.data);
    if (reading === null) return;
    dispatch({ type: "reading", reading, now: now() });
  };

  const onReset = () => {
    dispatch({ type: "reset", now: now() });
    refresh();
  };

  source.addEventListener("reading", onReading);
  source.addEventListener("reset", onReset);

  source.onopen = () => {
    dispatch({ type: "open", now: now() });
    if (!seenError) return;
    seenError = false;
    refresh();
  };

  source.onerror = () => {
    seenError = true;
    dispatch({ type: "error", now: now() });
  };

  return () => {
    source.removeEventListener("reading", onReading);
    source.removeEventListener("reset", onReset);
    source.onopen = null;
    source.onerror = null;
    source.close();
  };
}

export function useReadings(initial: RecentReadings | null): {
  readings: Reading[];
  events: ReportEvent[];
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
} {
  const router = useRouter();
  const initialRef = useRef(initial);
  const [state, dispatch] = useReducer(
    readingsReducer,
    initial,
    (value) => initReadings(value, Date.now()),
  );

  useEffect(() => {
    if (initialRef.current === initial) return;
    initialRef.current = initial;
    dispatch({ type: "hydrate", initial, now: Date.now() });
  }, [initial]);

  useEffect(() => {
    const source = new EventSource("/api/stream") as ReadingsSource;
    const unbind = bindReadingsStream({
      source,
      dispatch,
      refresh: () => router.refresh(),
      now: () => Date.now(),
    });
    const tickId = setInterval(
      () => dispatch({ type: "tick", now: Date.now() }),
      TICK_MS,
    );
    return () => {
      unbind();
      clearInterval(tickId);
    };
  }, [router]);

  return {
    readings: state.readings,
    events: state.events,
    connection: state.connection,
    secondsSinceLast: state.secondsSinceLast,
  };
}
```

O `as ReadingsSource` no `new EventSource` é o único cast: os overloads de `addEventListener` do DOM não batem com o listener `(event: MessageEvent) => void` do FakeStream. Não alargue o tipo. Sem `Last-Event-ID`. Sem importar `@/app/api/stream/route`. Sem importar `services/`.

Substitua `web/src/hooks/README.md` inteiro por:

```md
# hooks

**Estado no cliente** (`"use client"`). Só `useReadings`.

| Arquivo | Exporta |
|---|---|
| `use-readings.ts` | `useReadings(initial)` — carga inicial + `EventSource("/api/stream")`. Duplicata por timestamp, buffer de 10 min, `detectEvents` só no par ao vivo, `no_data` com ≥ 5 s sem leitura, `router.refresh()` em `reset` e em reconexão (`onerror` + `onopen`). |

W4 é quem chama o hook. Esta pasta não monta UI.

- Pode importar: `lib/` e `types/`.
- Não pode: `services/`, `node:*`. Regra de risco fica em `lib/`, não aqui.

Regras de camadas: [docs/architecture.md](../../../docs/architecture.md#camadas-do-web).
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/hooks/use-readings.test.ts
```

Expected: PASS (4 `describe`, 15 `it`: 10 da Task 1 + 4 do bind + 1 do `typeof useReadings`).

- [ ] **Step 5: test + lint + build (Done when)**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: os três com exit 0. `npm test` inclui lib + parse/tail + report-service + SSE + estes 15 `it`. `lint` sem aviso nos arquivos desta fatia. `build` type-checka `"use client"` + `useRouter` + `EventSource`. Não rode `npm install`.

- [ ] **Step 6: Browser — a home ainda abre**

O mapa exige smoke mesmo em W3b. Dashboard ainda não existe; o contrato do hook está nos testes. CSV/mock **não** são necessários para a home.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Confirme que esta fatia **não** ligou o hook na home: a página continua o placeholder. Não abra `/api/stream` como substituto do browser.

Se não houver browser tool: **não** substitua a home por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto.

- [ ] **Step 7: Commit**

```bash
git add web/src/hooks/use-readings.ts web/src/hooks/use-readings.test.ts web/src/hooks/README.md
git commit -m "$(cat <<'EOF'
feat(web): subscribe to SSE readings in the client hook

EOF
)"
```

Expected: o commit contém **somente** esses 3 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `package.json`, `vitest.config.mts`, `types/`, `lib/`, `services/`, `app/api/stream/**`, `hardware/` nem o mock.

---

## Fora desta fatia (não fazer)

- `dashboard.tsx`, cartão de risco, gráfico, `page.tsx` dinâmico (W3c–W4). Quem chama `useReadings` é o W4.
- Recalcular risco. Snapshot inicial no SSE. `Last-Event-ID`. Rota `/api/report`.
- Editar `route.ts`, `report-service.ts`, `vitest.config.mts`, `package.json`.
- Instalar Testing Library / jsdom / `eventsource`.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
