# Funções puras do web (`lib/`) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as quatro funções puras que o dashboard, o hook e o service vão importar — dicionário de cenários, detecção de eventos, filtro da lista e formatação — com teste ao lado e sem recalcular risco.

**Architecture:** Quatro arquivos em `web/src/lib/`, cada um com uma responsabilidade e um `*.test.ts` colado. Sem barrel, sem arquivo extra de helper (o Owns não permite). `getScenario` é um array indexado pelo id. `detectEvents` percorre pares consecutivos e não ordena. `filterEvents` é `Array.filter` estável (nível `to` AND período local). `format*` são três funções de uma linha de regra. O parser de ISO local (sem fuso) se repete em `filters.ts` e `format.ts` — seis linhas, não um quinto arquivo.

**Tech Stack:** TypeScript 5 (`strict`), Vitest 5.1.0 ambiente `node`, Next.js 16.4.6 só para o smoke da home. Sem jsdom, sem Testing Library, sem pacote novo.

**Spec:** fatia W1a + Contratos congelados `lib/` + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Textos 0–17 em [`docs/scenarios.md`](../../scenarios.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-lib-pure` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-lib-pure`.
- Baseline: em `web/`, `npm test` já passou (3 testes em `src/lib/risk-level.test.ts`).
- Já existem e estão congelados: `web/src/types/**` (W0), `web/src/lib/risk-level.ts`, `utils.ts`. **Não edite esses arquivos.**
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.**
- `web/src/lib/README.md` já descreve a pasta em geral; a Task 4 lista os quatro módulos novos.

## Arquivos (decomposição)

```
web/src/lib/
├── utils.ts              (congelado — não mexer)
├── risk-level.ts         (congelado — não mexer)
├── risk-level.test.ts    (congelado — não mexer)
├── README.md             [T4] lista os quatro módulos
├── scenarios.ts          [T1] ScenarioCopy, getScenario
├── scenarios.test.ts     [T1]
├── events.ts             [T2] detectEvents
├── events.test.ts        [T2]
├── filters.ts            [T3] filterEvents
├── filters.test.ts       [T3]
├── format.ts             [T4] formatAge, formatGasDelta, formatTemperature
└── format.test.ts        [T4]
```

Nada fora desta lista. Sem `lib/index.ts`. Sem `parse-local-iso.ts`. Sem constante extra exportada. Fixtures de `Reading` / `ReportEvent` **dentro** do próprio `*.test.ts`.

## Global Constraints

- **Owns:** só `web/src/lib/scenarios.ts`, `events.ts`, `filters.ts`, `format.ts`, os quatro `*.test.ts` ao lado, e `web/src/lib/README.md`. Precisou de outro arquivo → parar.
- **Assinaturas congeladas:** copiar o bloco `lib/` do mapa. Não renomear, não acrescentar parâmetro, não exportar `SCENARIOS`, `parseLocalIso`, type guard nem barrel.
- **`lib/` só funções puras:** sem React, sem `node:*`, sem `Date.now()` (o relógio entra como argumento `now`), sem I/O, sem CSV em português.
- **O web não recalcula risco.** `getScenario` só traduz o id; `detectEvents` só compara `level` já classificado.
- **Camadas:** kebab-case; imports `@/lib/...` e `@/types` nos testes e no código. `lib/` só importa `types/`.
- **Não instalar pacote.** Sem `shadcn add`. Sem jsdom novo.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano.
- **Idioma:** identificadores em inglês; textos de cenário e de format em pt-BR com acentos; este plano em pt-BR.
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real. Não use "detector certificado" fora do rodapé que já existe.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** testes cobrem ids 0–17, mudança de nível, filtros, format; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá as assinaturas e os exemplos. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **`filterEvents` filtra `event.to`.** Chip de nível olha o nível *em que a leitura chegou*. `from` não entra no filtro. `levels: []` = todos os níveis.
2. **`filterEvents` não inverte.** A saída é subsequência da entrada. W3f/W4 é que põe o mais novo no topo.
3. **Períodos em relógio local, inclusivos.** `last-hour` = `timestamp >= now - 1 h`. `last-6h` = `timestamp >= now - 6 h`. `today` = mesma data de calendário local de `now` (`AAAA-MM-DD`), não "desde meia-noite UTC".
4. **ISO sem fuso.** `Reading.timestamp` é `"2026-11-10T14:32:08"` (sem `Z`). Não passe essa string para `new Date(iso)` — uns engines tratam como UTC. Parseie componentes locais (função privada, igual em `filters.ts` e `format.ts`). Nos testes, construa `now` com `new Date(y, m, d, h, min, s)`, nunca com string ISO.
5. **`formatAge` usa floor em três faixas:** `0–59 s` → `"há N s"`; `60–3599 s` → `"há N min"`; `≥ 3600 s` → `"há N h"`. Sem plural, sem "dia". Espaço antes da unidade. Timestamp no futuro ou inválido → `"há 0 s"` (não `"há NaN s"`, não throw).
6. **`formatGasDelta`:** `Math.round(value - base)`, sempre com sinal: `"+120"`, `"-15"`, `"+0"`.
7. **`formatTemperature`:** `null` → `"—"` (em dash U+2014, o mesmo do cenário 0). `0` é leitura válida → `"0 °C"`. Qualquer outro número → `` `${celsius} °C` `` (espaço antes de `°C`; sem `Math.round`).
8. **`detectEvents` não emite a primeira leitura** e **não ordena**. `from` sai sempre preenchido (o tipo permite `null` por comentário antigo em `report-event.ts`; esta fatia não mexe no tipo e não produz `from: null`). `id` e `timestamp` = timestamp da leitura que mudou; `scenarioId` e `source` vêm dela, não da anterior.
9. **Travessão.** Use `"—"` (U+2014), nunca `"-"` nem `"–"`, em guidance desconhecida e em `formatTemperature(null)`.

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, quebram W3c/W3f/W4 sem o implementer perceber:

1. **Id de cenário fora de 0–17 (negativo, 18, NaN) e o id 0.** Desconhecido não pode virar "Ambiente normal"; 0 é o cenário normal. Task 1.
2. **`0 °C` vs `null`.** `formatTemperature(0) === "0 °C"`; só `null` vira `"—"`. Task 4.
3. **Fronteiras de `formatAge`:** 0 s, 59 s, 60 s, 3599 s, 3600 s, 25 h; ISO malformada. Task 4.
4. **Meia-noite em `filterEvents`:** às 00:30, um evento de 23:45 de ontem entra em `last-hour` e *não* em `today`. Task 3.
5. **`detectEvents` não ordena e não emite a primeira leitura.** Um array de um elemento (mesmo CRITICAL) devolve `[]`. Pares consecutivos seguem a ordem do array, não a ordem lexicográfica do timestamp. Task 2.

---

### Task 1: Dicionário de cenários (`getScenario`)

**Files:**
- Create: `web/src/lib/scenarios.test.ts`
- Create: `web/src/lib/scenarios.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores. Textos de [`docs/scenarios.md`](../../scenarios.md) (título e orientação, ids 0–17). Não leia `hardware/`.
- Produces:
  - `export interface ScenarioCopy { id: number; title: string; guidance: string }`
  - `export function getScenario(id: number): ScenarioCopy`

Id conhecido devolve o texto do spec. Id desconhecido devolve `{ id, title: "Cenário desconhecido", guidance: "—" }` — o `id` original se preserva (W3c mostra o que chegou no CSV).

- [ ] **Step 1: Write the failing test**

Crie `web/src/lib/scenarios.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";
import { getScenario } from "@/lib/scenarios";
import type { ScenarioCopy } from "@/lib/scenarios";

const EXPECTED: ScenarioCopy[] = [
  {
    id: 0,
    title: "Ambiente normal",
    guidance: "—",
  },
  {
    id: 1,
    title: "Alto risco de incêndio pela chama e pelo vazamento de gás",
    guidance:
      "Não acione interruptores, feche o registro de gás se for seguro, ventile e saia do local.",
  },
  {
    id: 2,
    title: "Alto risco de incêndio: chama com gases ou fumaça no ambiente",
    guidance:
      "Verifique a origem da chama e da fumaça, ventile e afaste materiais inflamáveis.",
  },
  {
    id: 3,
    title: "Alto risco: vazamento de gás com aumento de temperatura",
    guidance: "Feche o registro de gás, ventile e afaste fontes de calor.",
  },
  {
    id: 4,
    title: "Alto risco: vazamento confirmado pelos dois sensores (MQ-6 e MQ-2)",
    guidance: "Feche o registro de gás, abra portas e janelas e não acenda chamas.",
  },
  {
    id: 5,
    title: "Alto risco: vazamento de gás com fogão ligado e sem supervisão",
    guidance: "Feche o registro de gás e verifique a cozinha imediatamente.",
  },
  {
    id: 6,
    title: "Alto risco: chama com o fogão desligado e temperatura subindo",
    guidance: "Verifique imediatamente a origem da chama.",
  },
  {
    id: 7,
    title: "Vazamento de gás detectado (MQ-6)",
    guidance: "Feche o registro de gás, ventile o ambiente e não acenda chamas.",
  },
  {
    id: 8,
    title: "Concentração alta de gases ou fumaça (MQ-2)",
    guidance: "Ventile o ambiente e verifique a origem dos gases ou da fumaça.",
  },
  {
    id: 9,
    title: "Fogão ligado sem supervisão: nenhum movimento há muito tempo",
    guidance: "Verifique se há alguém na cozinha ou desligue o fogão.",
  },
  {
    id: 10,
    title: "Possível vazamento de gás: MQ-6 acima do normal",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 11,
    title: "Gases ou fumaça acima do normal (MQ-2)",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 12,
    title: "Fogão ligado sem chama: possível boca apagada",
    guidance: "Verifique o fogão.",
  },
  {
    id: 13,
    title: "Fogão ligado e sem movimento recente: possível ausência",
    guidance: "Confirme se há alguém na cozinha.",
  },
  {
    id: 14,
    title: "Chama detectada com o fogão desligado",
    guidance: "Verifique a origem da chama.",
  },
  {
    id: 15,
    title: "Temperatura acima do normal",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 16,
    title: "Falha no sensor de temperatura: monitoramento comprometido",
    guidance: "Confira a ligação do sensor.",
  },
  {
    id: 17,
    title: "Fogão em uso com supervisão",
    guidance: "—",
  },
];

describe("getScenario", () => {
  it("covers ids 0 through 17 with the copy from scenarios.md", () => {
    expect(EXPECTED).toHaveLength(18);
    for (const row of EXPECTED) {
      expect(getScenario(row.id)).toEqual(row);
    }
  });

  it("returns unknown copy and keeps the given id", () => {
    for (const id of [-1, 18, 99, Number.NaN]) {
      expect(getScenario(id)).toEqual({
        id,
        title: "Cenário desconhecido",
        guidance: "—",
      });
    }
  });

  it("does not treat id 0 as unknown", () => {
    expect(getScenario(0).title).toBe("Ambiente normal");
    expect(getScenario(0).guidance).toBe("—");
  });
});
```

O `guidance: "—"` é em dash (U+2014). Se o editor trocar por hífen, o teste da Task 1 falha no verde e o da Task 4 também.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/lib/scenarios.test.ts
```

Expected: FAIL. Mensagem no espírito de `Cannot find module '@/lib/scenarios'` (ou `getScenario is not a function` se o arquivo existir vazio). Se passar, o Step 1 não foi feito — não avance.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/lib/scenarios.ts` inteiro. O array é indexado pelo id (`SCENARIOS[0]` é o cenário 0). Não exporte o array. Não calcule nível.

```ts
export interface ScenarioCopy {
  id: number;
  title: string;
  guidance: string;
}

const UNKNOWN_TITLE = "Cenário desconhecido";
const UNKNOWN_GUIDANCE = "—";

const SCENARIOS: readonly ScenarioCopy[] = [
  { id: 0, title: "Ambiente normal", guidance: "—" },
  {
    id: 1,
    title: "Alto risco de incêndio pela chama e pelo vazamento de gás",
    guidance:
      "Não acione interruptores, feche o registro de gás se for seguro, ventile e saia do local.",
  },
  {
    id: 2,
    title: "Alto risco de incêndio: chama com gases ou fumaça no ambiente",
    guidance:
      "Verifique a origem da chama e da fumaça, ventile e afaste materiais inflamáveis.",
  },
  {
    id: 3,
    title: "Alto risco: vazamento de gás com aumento de temperatura",
    guidance: "Feche o registro de gás, ventile e afaste fontes de calor.",
  },
  {
    id: 4,
    title: "Alto risco: vazamento confirmado pelos dois sensores (MQ-6 e MQ-2)",
    guidance: "Feche o registro de gás, abra portas e janelas e não acenda chamas.",
  },
  {
    id: 5,
    title: "Alto risco: vazamento de gás com fogão ligado e sem supervisão",
    guidance: "Feche o registro de gás e verifique a cozinha imediatamente.",
  },
  {
    id: 6,
    title: "Alto risco: chama com o fogão desligado e temperatura subindo",
    guidance: "Verifique imediatamente a origem da chama.",
  },
  {
    id: 7,
    title: "Vazamento de gás detectado (MQ-6)",
    guidance: "Feche o registro de gás, ventile o ambiente e não acenda chamas.",
  },
  {
    id: 8,
    title: "Concentração alta de gases ou fumaça (MQ-2)",
    guidance: "Ventile o ambiente e verifique a origem dos gases ou da fumaça.",
  },
  {
    id: 9,
    title: "Fogão ligado sem supervisão: nenhum movimento há muito tempo",
    guidance: "Verifique se há alguém na cozinha ou desligue o fogão.",
  },
  {
    id: 10,
    title: "Possível vazamento de gás: MQ-6 acima do normal",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 11,
    title: "Gases ou fumaça acima do normal (MQ-2)",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 12,
    title: "Fogão ligado sem chama: possível boca apagada",
    guidance: "Verifique o fogão.",
  },
  {
    id: 13,
    title: "Fogão ligado e sem movimento recente: possível ausência",
    guidance: "Confirme se há alguém na cozinha.",
  },
  {
    id: 14,
    title: "Chama detectada com o fogão desligado",
    guidance: "Verifique a origem da chama.",
  },
  {
    id: 15,
    title: "Temperatura acima do normal",
    guidance: "Verifique o ambiente.",
  },
  {
    id: 16,
    title: "Falha no sensor de temperatura: monitoramento comprometido",
    guidance: "Confira a ligação do sensor.",
  },
  { id: 17, title: "Fogão em uso com supervisão", guidance: "—" },
];

export function getScenario(id: number): ScenarioCopy {
  return SCENARIOS[id] ?? { id, title: UNKNOWN_TITLE, guidance: UNKNOWN_GUIDANCE };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/lib/scenarios.test.ts
```

Expected: PASS, 3 testes. Depois:

```bash
cd web && npm test
```

Expected: exit 0. Os 3 de `risk-level` continuam verdes. Total = 6.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/scenarios.ts web/src/lib/scenarios.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add scenario copy dictionary

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 2: Detecção de eventos (`detectEvents`)

**Files:**
- Create: `web/src/lib/events.test.ts`
- Create: `web/src/lib/events.ts`

**Interfaces:**
- Consumes: `Reading` e `ReportEvent` de `@/types` (W0, não editar). Não importa `getScenario` — evento carrega `scenarioId`, a UI é que traduz.
- Produces: `export function detectEvents(readings: Reading[]): ReportEvent[]`

Uma `ReportEvent` por mudança de `level` entre itens **consecutivos do array**. A primeira leitura não gera evento. Caller entrega já ordenado; esta função não chama `sort`.

- [ ] **Step 1: Write the failing test**

Crie `web/src/lib/events.test.ts` inteiro. O helper `reading` vive só neste arquivo (o mapa pede fixture no `*.test.ts`, não num helper compartilhado).

```ts
import { describe, expect, it } from "vitest";
import { detectEvents } from "@/lib/events";
import type { Reading, RiskLevel } from "@/types";

function reading(
  timestamp: string,
  level: RiskLevel,
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

describe("detectEvents", () => {
  it("returns no events for an empty list or a single reading", () => {
    expect(detectEvents([])).toEqual([]);
    expect(
      detectEvents([reading("2026-11-12T14:32:08", "CRITICAL", { scenarioId: 1 })]),
    ).toEqual([]);
  });

  it("emits one event when NORMAL stays then becomes ALERT", () => {
    const events = detectEvents([
      reading("2026-11-12T14:32:08", "NORMAL"),
      reading("2026-11-12T14:32:09", "NORMAL"),
      reading("2026-11-12T14:32:10", "ALERT", { scenarioId: 7 }),
    ]);
    expect(events).toEqual([
      {
        id: "2026-11-12T14:32:10",
        timestamp: "2026-11-12T14:32:10",
        from: "NORMAL",
        to: "ALERT",
        scenarioId: 7,
        source: "mock",
      },
    ]);
  });

  it("emits one event per consecutive level change and skips repeats", () => {
    const events = detectEvents([
      reading("2026-11-12T14:32:08", "NORMAL"),
      reading("2026-11-12T14:32:09", "ATTENTION", { scenarioId: 10 }),
      reading("2026-11-12T14:32:10", "ALERT", { scenarioId: 7 }),
      reading("2026-11-12T14:32:11", "ALERT", { scenarioId: 7 }),
      reading("2026-11-12T14:32:12", "HIGH", { scenarioId: 4, source: "board" }),
    ]);
    expect(events.map((event) => [event.from, event.to, event.id, event.source])).toEqual([
      ["NORMAL", "ATTENTION", "2026-11-12T14:32:09", "mock"],
      ["ATTENTION", "ALERT", "2026-11-12T14:32:10", "mock"],
      ["ALERT", "HIGH", "2026-11-12T14:32:12", "board"],
    ]);
    expect(events.every((event) => event.from !== null)).toBe(true);
  });

  it("walks array order and does not sort by timestamp", () => {
    const events = detectEvents([
      reading("2026-11-12T14:32:09", "ALERT", { scenarioId: 7 }),
      reading("2026-11-12T14:32:08", "NORMAL"),
    ]);
    expect(events).toEqual([
      {
        id: "2026-11-12T14:32:08",
        timestamp: "2026-11-12T14:32:08",
        from: "ALERT",
        to: "NORMAL",
        scenarioId: 0,
        source: "mock",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/lib/events.test.ts
```

Expected: FAIL com `Cannot find module '@/lib/events'`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/lib/events.ts` inteiro:

```ts
import type { Reading, ReportEvent } from "@/types";

export function detectEvents(readings: Reading[]): ReportEvent[] {
  const events: ReportEvent[] = [];
  for (let index = 1; index < readings.length; index += 1) {
    const previous = readings[index - 1];
    const current = readings[index];
    if (current.level === previous.level) continue;
    events.push({
      id: current.timestamp,
      timestamp: current.timestamp,
      from: previous.level,
      to: current.level,
      scenarioId: current.scenarioId,
      source: current.source,
    });
  }
  return events;
}
```

Não chame `sort`. Não emita nada no índice 0. Não preencha `from: null`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/lib/events.test.ts
```

Expected: PASS, 4 testes.

Run:

```bash
cd web && npm test
```

Expected: exit 0. `risk-level` + `scenarios` + `events` verdes.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/events.ts web/src/lib/events.test.ts
git commit -m "$(cat <<'EOF'
feat(web): detect risk-level change events

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 3: Filtro de eventos (`filterEvents`)

**Files:**
- Create: `web/src/lib/filters.test.ts`
- Create: `web/src/lib/filters.ts`

**Interfaces:**
- Consumes: `ReportEvent`, `EventFilterState`, `EventPeriod` de `@/types`. Não importa `detectEvents` — os testes constroem `ReportEvent` na mão.
- Produces: `export function filterEvents(events: ReportEvent[], filter: EventFilterState, now: Date): ReportEvent[]`

`levels` vazio = todos. Nível olha `to`. Período em horário local, fronteira inclusiva. Ordem da entrada. Timestamp que não parseia como `AAAA-MM-DDTHH:MM:SS` cai fora (não throw).

- [ ] **Step 1: Write the failing test**

Crie `web/src/lib/filters.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";
import { filterEvents } from "@/lib/filters";
import type { EventFilterState, ReportEvent, RiskLevel } from "@/types";

function event(
  timestamp: string,
  to: RiskLevel,
  extras: Partial<Pick<ReportEvent, "from" | "scenarioId" | "source">> = {},
): ReportEvent {
  return {
    id: timestamp,
    timestamp,
    from: extras.from ?? "NORMAL",
    to,
    scenarioId: extras.scenarioId ?? 0,
    source: extras.source ?? "mock",
  };
}

const NOON = new Date(2026, 10, 12, 12, 0, 0);

function filter(
  events: ReportEvent[],
  patch: Partial<EventFilterState> = {},
  now: Date = NOON,
): ReportEvent[] {
  return filterEvents(events, { levels: [], period: "today", ...patch }, now);
}

describe("filterEvents", () => {
  const morning = event("2026-11-12T08:00:00", "ATTENTION");
  const noonAlert = event("2026-11-12T12:00:00", "ALERT");
  const yesterday = event("2026-11-11T12:00:00", "HIGH");
  const sample = [morning, noonAlert, yesterday];

  it("keeps every event when levels is empty, in input order", () => {
    expect(filter(sample, { period: "today" }).map((item) => item.id)).toEqual([
      "2026-11-12T08:00:00",
      "2026-11-12T12:00:00",
    ]);
  });

  it("filters by event.to, not from", () => {
    const recovered = event("2026-11-12T11:00:00", "NORMAL", { from: "ALERT" });
    const onlyAlert = filter([recovered, noonAlert], { levels: ["ALERT"] });
    expect(onlyAlert.map((item) => item.id)).toEqual(["2026-11-12T12:00:00"]);
    const onlyNormal = filter([recovered, noonAlert], { levels: ["NORMAL"] });
    expect(onlyNormal.map((item) => item.id)).toEqual(["2026-11-12T11:00:00"]);
  });

  it("ANDs level chips with the period", () => {
    const result = filter(sample, { levels: ["HIGH"], period: "today" });
    expect(result).toEqual([]);
  });

  it("includes the last-hour boundary and keeps order", () => {
    const now = new Date(2026, 10, 12, 12, 0, 0);
    const hourAgo = event("2026-11-12T11:00:00", "ALERT");
    const older = event("2026-11-12T10:59:59", "ALERT");
    const newer = event("2026-11-12T11:30:00", "HIGH");
    expect(
      filter([older, hourAgo, newer], { period: "last-hour" }, now).map((item) => item.id),
    ).toEqual(["2026-11-12T11:00:00", "2026-11-12T11:30:00"]);
  });

  it("includes the last-6h window", () => {
    const now = new Date(2026, 10, 12, 12, 0, 0);
    const sixHoursAgo = event("2026-11-12T06:00:00", "ATTENTION");
    const older = event("2026-11-12T05:59:59", "ATTENTION");
    expect(
      filter([older, sixHoursAgo], { period: "last-6h" }, now).map((item) => item.id),
    ).toEqual(["2026-11-12T06:00:00"]);
  });

  it("treats today as the local calendar date of now, not last-hour", () => {
    const now = new Date(2026, 10, 13, 0, 30, 0);
    const lastNight = event("2026-11-12T23:45:00", "ALERT");
    const tonight = event("2026-11-13T00:10:00", "ALERT");
    const yesterdayMorning = event("2026-11-12T10:00:00", "ALERT");
    expect(
      filter([lastNight, tonight, yesterdayMorning], { period: "today" }, now).map(
        (item) => item.id,
      ),
    ).toEqual(["2026-11-13T00:10:00"]);
    expect(
      filter([lastNight, tonight, yesterdayMorning], { period: "last-hour" }, now).map(
        (item) => item.id,
      ),
    ).toEqual(["2026-11-12T23:45:00", "2026-11-13T00:10:00"]);
  });

  it("drops timestamps that are not local ISO without timezone", () => {
    const broken = event("not-a-timestamp", "ALERT");
    const zulu = event("2026-11-12T12:00:00Z", "ALERT");
    expect(filter([broken, zulu, noonAlert])).toEqual([noonAlert]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/lib/filters.test.ts
```

Expected: FAIL com `Cannot find module '@/lib/filters'`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/lib/filters.ts` inteiro. O parser local é privado deste arquivo (cópia permitida na Task 4; não extraia para um terceiro módulo).

```ts
import type { EventFilterState, EventPeriod, ReportEvent, RiskLevel } from "@/types";

const HOUR_MS = 60 * 60 * 1000;

function parseLocalIso(iso: string): Date | null {
  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart || timePart.includes("Z") || timePart.includes("+")) {
    return null;
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, second);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchesLevel(event: ReportEvent, levels: RiskLevel[]): boolean {
  return levels.length === 0 || levels.includes(event.to);
}

function matchesPeriod(event: ReportEvent, period: EventPeriod, now: Date): boolean {
  const at = parseLocalIso(event.timestamp);
  if (!at) return false;
  if (period === "today") return localDateKey(at) === localDateKey(now);
  const windowMs = period === "last-hour" ? HOUR_MS : 6 * HOUR_MS;
  return at.getTime() >= now.getTime() - windowMs;
}

export function filterEvents(
  events: ReportEvent[],
  filter: EventFilterState,
  now: Date,
): ReportEvent[] {
  return events.filter(
    (event) => matchesLevel(event, filter.levels) && matchesPeriod(event, filter.period, now),
  );
}
```

Não chame `reverse`. Não filtre `from`. Não use `new Date(event.timestamp)`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/lib/filters.test.ts
```

Expected: PASS, 7 testes.

Run:

```bash
cd web && npm test
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/filters.ts web/src/lib/filters.test.ts
git commit -m "$(cat <<'EOF'
feat(web): filter events by level and local period

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 4: Formatação + README + verificação da fatia

**Files:**
- Create: `web/src/lib/format.test.ts`
- Create: `web/src/lib/format.ts`
- Modify: `web/src/lib/README.md`

**Interfaces:**
- Consumes: nada das tasks 1–3 no runtime (format não importa `getScenario` / eventos). O parser local é a mesma regra da Task 3, copiada — não extraia. O README documenta os quatro módulos já commitados.
- Produces:
  - `export function formatAge(isoTimestamp: string, now: Date): string`
  - `export function formatGasDelta(value: number, base: number): string`
  - `export function formatTemperature(celsius: number | null): string`

- [ ] **Step 1: Write the failing test**

Crie `web/src/lib/format.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";
import { formatAge, formatGasDelta, formatTemperature } from "@/lib/format";

const NOW = new Date(2026, 10, 12, 14, 32, 20);

describe("formatAge", () => {
  it("uses seconds, minutes and hours with a space before the unit", () => {
    expect(formatAge("2026-11-12T14:32:20", NOW)).toBe("há 0 s");
    expect(formatAge("2026-11-12T14:32:08", NOW)).toBe("há 12 s");
    expect(formatAge("2026-11-12T14:31:21", NOW)).toBe("há 59 s");
    expect(formatAge("2026-11-12T14:31:20", NOW)).toBe("há 1 min");
    expect(formatAge("2026-11-12T14:29:20", NOW)).toBe("há 3 min");
    expect(formatAge("2026-11-12T13:32:21", NOW)).toBe("há 59 min");
    expect(formatAge("2026-11-12T13:32:20", NOW)).toBe("há 1 h");
    expect(formatAge("2026-11-12T12:32:20", NOW)).toBe("há 2 h");
    expect(formatAge("2026-11-11T13:32:20", NOW)).toBe("há 25 h");
  });

  it("clamps future and invalid timestamps to há 0 s", () => {
    expect(formatAge("2026-11-12T14:32:21", NOW)).toBe("há 0 s");
    expect(formatAge("not-a-timestamp", NOW)).toBe("há 0 s");
    expect(formatAge("2026-11-12T14:32:08Z", NOW)).toBe("há 0 s");
  });
});

describe("formatGasDelta", () => {
  it("always shows an integer with a sign", () => {
    expect(formatGasDelta(300, 180)).toBe("+120");
    expect(formatGasDelta(165, 180)).toBe("-15");
    expect(formatGasDelta(180, 180)).toBe("+0");
    expect(formatGasDelta(180.4, 180)).toBe("+0");
    expect(formatGasDelta(180.6, 180)).toBe("+1");
  });
});

describe("formatTemperature", () => {
  it("shows a dash only for null, not for zero", () => {
    expect(formatTemperature(null)).toBe("—");
    expect(formatTemperature(0)).toBe("0 °C");
    expect(formatTemperature(24)).toBe("24 °C");
    expect(formatTemperature(24.5)).toBe("24.5 °C");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/lib/format.test.ts
```

Expected: FAIL com `Cannot find module '@/lib/format'`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/lib/format.ts` inteiro:

```ts
function parseLocalIso(iso: string): Date | null {
  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart || timePart.includes("Z") || timePart.includes("+")) {
    return null;
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, second);
}

export function formatAge(isoTimestamp: string, now: Date): string {
  const then = parseLocalIso(isoTimestamp);
  if (!then) return "há 0 s";
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return `há ${seconds} s`;
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  return `há ${Math.floor(seconds / 3600)} h`;
}

export function formatGasDelta(value: number, base: number): string {
  const delta = Math.round(value - base);
  return `${delta >= 0 ? "+" : ""}${delta}`;
}

export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return "—";
  return `${celsius} °C`;
}
```

Não use `Date.now()`. Não importe React. Não arredonde temperatura.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/lib/format.test.ts
```

Expected: PASS (3 `describe`, 4 `it`).

- [ ] **Step 5: Atualizar o README da pasta**

Substitua `web/src/lib/README.md` inteiro por:

```md
# lib

**Funções puras** compartilhadas entre servidor e cliente. Cada arquivo tem um `*.test.ts` ao lado. Sem React, sem `node:*`, sem `Date.now()`.

| Arquivo | Exporta |
|---|---|
| `utils.ts` | `cn()` (shadcn) |
| `risk-level.ts` | `RISK_LEVELS`, `isRiskLevel()` |
| `scenarios.ts` | `ScenarioCopy`, `getScenario(id)` — ids 0–17; desconhecido → "Cenário desconhecido" |
| `events.ts` | `detectEvents(readings)` — uma `ReportEvent` por mudança de `level` |
| `filters.ts` | `filterEvents(events, filter, now)` — chips (`to`) AND período local |
| `format.ts` | `formatAge`, `formatGasDelta`, `formatTemperature` |

- Pode importar: `types/`.
- Não pode: React, Node (`node:*`), `services/`, `hooks/`, `components/`.

Regras de camadas: [docs/architecture.md](../../../docs/architecture.md#camadas-do-web).
```

Não crie `lib/index.ts`. Não edite `types/README.md`.

- [ ] **Step 6: test + lint + build (Done when)**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: os três com exit 0. `npm test` inclui `risk-level` + os quatro arquivos novos. `lint` sem aviso nos arquivos desta fatia. `build` compila o App Router; a home placeholder segue no bundle. Não rode `npm install`.

- [ ] **Step 7: Browser — a home ainda abre**

O mapa exige smoke mesmo em W1a. CSV/mock **não** são necessários. Esta fatia não tem UI nova.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Não clique em nada que não exista: não há dashboard, lista de eventos nem cartão de risco nesta fatia.

Se não houver browser tool: **não** substitua por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/format.ts web/src/lib/format.test.ts web/src/lib/README.md
git commit -m "$(cat <<'EOF'
feat(web): format age, gas delta and temperature

EOF
)"
```

Expected: o commit contém **somente** esses 3 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `package.json`, `types/` nem `hardware/`.

---

## Fora desta fatia (não fazer)

- Parser CSV (`parseCsvLine`, `readNewLines`) — W1b.
- `report-service.ts`, SSE, hook, componentes, `dashboard.tsx`, auth, e-mail.
- Recalcular regras de risco, cores, pulso, selo SIMULAÇÃO (W3c).
- Inverter a lista de eventos (W3f/W4).
- Extraír `parseLocalIso` para um quinto arquivo.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
