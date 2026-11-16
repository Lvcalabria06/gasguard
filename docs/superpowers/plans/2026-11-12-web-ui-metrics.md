# Grade de métricas do dashboard — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a grade de 6 métricas (`MetricsGrid`) como componente só de props — MQ-6 com delta, MQ-2, chama, temperatura + limite, movimento e fogão — sem buscar dado e sem ligar o hook.

**Architecture:** Um arquivo em `web/src/components/dashboard/`. Exporta a função pura `metricsView` (o que cada célula mostra) e o JSX que só pinta esse array. Sem `"use client"` (não há estado local). Sem `dashboard.tsx`. Sem Testing Library: o Vitest em `node` afirma o view-model; o `build` type-checka o JSX. Visual quieto: grade 2 colunas com filete (`gap-px` + `bg-border`), tokens de tema, nenhum ícone — o cartão de risco (W3c) já é o sinal de cor.

**Tech Stack:** TypeScript 5 (`strict`), React 19 (JSX automático), Tailwind CSS 4, Vitest 5.1.0 ambiente `node`, Next.js 16.4.6 só para o smoke da home. `formatGasDelta` e `formatTemperature` de `@/lib/format`. Sem jsdom, sem Testing Library, sem pacote novo, sem `shadcn add`, sem lucide.

**Spec:** fatia W3d + Contratos congelados Componentes + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Tela em [`docs/architecture.md`](../../architecture.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-ui-metrics` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-ui-metrics`.
- Baseline: em `web/`, `npm test` já passou (13 files / 82 tests). Não edite `web/src/lib/**`, `web/src/types/**`, `web/src/hooks/**`, `web/src/services/**`, `web/src/app/**`.
- `web/src/components/dashboard/` já tem `dashboard-header.tsx` e `risk-card.tsx` (W3c, congelados). **Não edite esses arquivos.**
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.** Ninguém desta fatia monta a grade na tela (W4).
- `formatGasDelta` e `formatTemperature` já existem em `@/lib/format`. Importe; não recopie. `formatAge` **não** entra — o mapa pede `sem movimento há Ns` sempre em segundos.

## Arquivos (decomposição)

```
web/src/components/dashboard/
├── dashboard-header.tsx        (congelado — não mexer)
├── dashboard-header.test.ts    (congelado — não mexer)
├── risk-card.tsx               (congelado — não mexer)
├── risk-card.test.ts           (congelado — não mexer)
├── metrics-grid.tsx            [T1] metricsView + MetricsGrid
└── metrics-grid.test.ts        [T1]
```

Nada fora desta lista. Sem `dashboard.tsx`. Sem `index.ts`. Sem `metric-item.ts`. Sem `README.md` novo. Sem `"use client"`. Fixtures de `Reading` **dentro** do próprio `*.test.ts`.

Os testes são `*.test.ts` (o Vitest só inclui `src/**/*.test.ts`). Eles importam a função pura do `.tsx`. Não criam `.test.tsx`. Não renderizam JSX. Não editam `vitest.config.mts`.

W4 importa **somente** `MetricsGrid`. `metricsView` existe para o teste rodar em `node` sem jsdom.

## Global Constraints

- **Owns:** só `web/src/components/dashboard/metrics-grid.tsx` e o `metrics-grid.test.ts` ao lado (o mapa lista o `.tsx`; o teste colado é a regra de “UI extrai função pura testável”, igual W3c). Precisou de outro arquivo → parar.
- **Assinatura congelada:**
  ```ts
  export function MetricsGrid(props: { reading: Reading | null }): JSX.Element;
  ```
  Não acrescente prop (`connection`, `className`, `previous`). Não busque dado. Não chame `useReadings`.
- **Camadas:** kebab-case; imports `@/lib/format`, `@/types`. `components/` **nunca** importa `services/` nem `node:*`. Sem colunas em português.
- **O web não recalcula risco.** A grade não lê `reading.level`, `scenarioId`, `mq6.level`, `mq2.level` nem `temperature.high`. Só exibe os valores já medidos.
- **Sem Testing Library e sem jsdom novo.** Não edite `vitest.config.mts` nem `package.json`. Não instale pacote. Não rode `shadcn add`. Não importe `lucide-react`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `page.tsx`, `layout.tsx`, `globals.css`, `components/README.md`, `components/ui/button.tsx`, os quatro arquivos W3c.
- **Idioma:** identificadores em inglês; textos da UI em pt-BR com acentos; este plano em pt-BR.
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** 6 métricas, delta MQ-6, `reading === null` → `"—"`; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá as props e o conteúdo mínimo. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **Uma prop só.** `MetricsGrid` não recebe `connection`. Sem leitura → travessões. Com leitura → números, mesmo que o hook (lá no W4) esteja `no_data`. Quem decide passar `null` ou a última leitura é o W4. Esta fatia não cinza a grade.
2. **Sem `"use client"`. Sem estado local.** Sem `useState` / `useEffect` / `useRef`. Sem flash quando o valor muda (o “destaque rápido” de `architecture.md` não está no Done when desta fatia; precisaria guardar o valor anterior).
3. **Sempre 6 células, nesta ordem:** `mq6`, `mq2`, `flame`, `temperature`, `motion`, `stove`. Grade `grid-cols-2` (3 fileiras). Não condicione a quantidade ao `reading`.
4. **Rótulos, exatamente:**
   | `id` | `label` |
   |---|---|
   | `mq6` | `GLP (MQ-6)` |
   | `mq2` | `Gases / fumaça (MQ-2)` |
   | `flame` | `Chama` |
   | `temperature` | `Temperatura` |
   | `motion` | `Movimento` |
   | `stove` | `Fogão` |
5. **`reading === null`:** as 6 células têm `value: "—"` (U+2014, o mesmo de `formatTemperature(null)`) e `hint: null`. Os rótulos continuam visíveis. Não escreva “Sem dados” aqui — isso é do `RiskCard`.
6. **MQ-6 (com leitura):** `value` = `String(reading.mq6.value)` (ADC cru, sem unidade). `hint` = `formatGasDelta(value, base)` (`"+830"`, `"-15"`, `"+0"`). Não mostre `mq6.level`.
7. **MQ-2:** só o ADC em `value`. `hint: null`. O Done when pede delta só no MQ-6. Não chame `formatGasDelta` no MQ-2.
8. **Chama:** `true` → `"Sim"`; `false` → `"Não"`. Sem `hint`. Sem SIM/NÃO em caixa alta (o selo **SIMULAÇÃO** é do cartão).
9. **Temperatura:** `value` = `formatTemperature(celsius)` (`"29.1 °C"` ou `"—"`). `hint` = `` `limite ${formatTemperature(limit)}` `` (`"limite 28.4 °C"` ou `"limite —"`). `0` é leitura válida (`"0 °C"`), só `null` vira travessão. Ignore `temperature.high`.
10. **Movimento.** Fogão **ligado** → sempre `` `sem movimento há ${secondsWithoutMotion} s` `` (espaço antes de `s`, “sem” minúsculo, como no mapa). Inclusive `0` → `"sem movimento há 0 s"`. Fogão **desligado** → `"Com movimento"` / `"Sem movimento"` conforme `reading.motion`. Ignore `secondsWithoutMotion` com o fogão off (o CSV zera o campo; se vier sujo, ainda assim não mostre o contador).
11. **Fogão:** `stoveOn` → `"Ligado"`; senão `"Desligado"`. Sem `hint`.
12. **Não use `formatAge`.** Ele muda para min/h; o mapa pede `há Ns`.
13. **JSX mínimo, mobile-first.** Uma `<section aria-label="Métricas">` com `grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border`. Cada célula é `<article className="bg-background px-4 py-3">`: rótulo `text-xs text-muted-foreground`, valor `text-lg font-medium tabular-nums tracking-tight`, hint na mesma linha `ml-2 text-sm font-normal text-muted-foreground`. Sem `max-w-*` (o W4 define a coluna). Sem `Card` do shadcn. Sem ícone. Sem `Button`. Sem cor de nível — a grade é o instrumento, o cartão é o alarme.
14. **Travessão.** `"—"` (U+2014), nunca `"-"` nem `"–"`.
15. **Testes importam o `.tsx` e só chamam `metricsView`.** Vite/esbuild transforma JSX sem jsdom. Não chame `MetricsGrid(...)` no teste. Se o módulo não carregar, **não** instale jsdom — pare e devolva; o Owns não permite outro arquivo nem mudar o Vitest.

## Review Focus

Cada linha abaixo tem teste na Task 1. São os casos que o mapa implica e que, se errados, o W4 mostra número podre ou copy inventada:

1. **`reading === null` → 6 travessões, na ordem certa, sem hint.** Nunca “Sem dados” nesta grade.
2. **MQ-6 mostra ADC + delta com sinal.** O exemplo do contrato (`1120` / base `290`) vira `"1120"` e `"+830"`. Delta `0` vira `"+0"`. MQ-2 **não** leva delta.
3. **Temperatura `null` vs `0`.** `celsius: null` → `"—"`; `celsius: 0` → `"0 °C"`. Limite ausente → hint `"limite —"`.
4. **Movimento com fogão ligado usa o contador em segundos.** `stoveOn: true`, `42` → `"sem movimento há 42 s"`. Fogão desligado **não** usa o contador, mesmo se `secondsWithoutMotion` vier ≠ 0.
5. **Booleanos em pt-BR.** Chama `"Sim"` / `"Não"`; fogão `"Ligado"` / `"Desligado"`.

---

### Task 1: `MetricsGrid` (6 células, delta MQ-6, travessão)

**Files:**
- Create: `web/src/components/dashboard/metrics-grid.test.ts`
- Create: `web/src/components/dashboard/metrics-grid.tsx`

**Interfaces:**
- Consumes: `formatGasDelta(value: number, base: number): string` e `formatTemperature(celsius: number | null): string` de `@/lib/format`. Tipo `Reading` de `@/types`. Nada de `formatAge`, nada do hook, nada de `connection`.
- Produces:
  - `export type MetricId = "mq6" | "mq2" | "flame" | "temperature" | "motion" | "stove"`
  - `export type MetricItem = { id: MetricId; label: string; value: string; hint: string | null }`
  - `export function metricsView(reading: Reading | null): MetricItem[]` — sempre length 6, nessa ordem de `id`
  - `export function MetricsGrid(props: { reading: Reading | null }): JSX.Element`

O JSX faz `metricsView(reading).map(...)`. W4 só importa `MetricsGrid`.

- [ ] **Step 1: Write the failing test**

Crie `web/src/components/dashboard/metrics-grid.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import { formatGasDelta, formatTemperature } from "@/lib/format";
import type { Reading } from "@/types";

import { metricsView } from "./metrics-grid";

function reading(extras: Partial<Reading> = {}): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source: "board",
    level: "NORMAL",
    scenarioId: 0,
    mq6: { value: 200, base: 180, level: 0 },
    mq2: { value: 150, base: 140, level: 0 },
    flame: false,
    temperature: { celsius: 24, limit: 35, high: false },
    motion: true,
    stoveOn: false,
    secondsWithoutMotion: 0,
    ...extras,
  };
}

function item(
  view: ReturnType<typeof metricsView>,
  id: (typeof view)[number]["id"],
) {
  const found = view.find((row) => row.id === id);
  expect(found).toBeDefined();
  return found!;
}

describe("metricsView", () => {
  it("returns six labeled dashes and no hints when there is no reading", () => {
    const view = metricsView(null);

    expect(view.map((row) => row.id)).toEqual([
      "mq6",
      "mq2",
      "flame",
      "temperature",
      "motion",
      "stove",
    ]);
    expect(view.map((row) => row.label)).toEqual([
      "GLP (MQ-6)",
      "Gases / fumaça (MQ-2)",
      "Chama",
      "Temperatura",
      "Movimento",
      "Fogão",
    ]);
    expect(view.every((row) => row.value === "—" && row.hint === null)).toBe(
      true,
    );
    expect(view.some((row) => row.value === "Sem dados")).toBe(false);
  });

  it("shows MQ-6 with a signed delta and MQ-2 without one", () => {
    const view = metricsView(
      reading({
        mq6: { value: 1120, base: 290, level: 2 },
        mq2: { value: 1350, base: 900, level: 1 },
      }),
    );

    expect(item(view, "mq6")).toMatchObject({
      value: "1120",
      hint: formatGasDelta(1120, 290),
    });
    expect(item(view, "mq6").hint).toBe("+830");
    expect(item(view, "mq2")).toMatchObject({
      value: "1350",
      hint: null,
    });
  });

  it("keeps a +0 gas delta and does not hide a zero temperature", () => {
    const view = metricsView(
      reading({
        mq6: { value: 180, base: 180, level: 0 },
        temperature: { celsius: 0, limit: null, high: false },
      }),
    );

    expect(item(view, "mq6").hint).toBe("+0");
    expect(item(view, "temperature")).toMatchObject({
      value: "0 °C",
      hint: "limite —",
    });
  });

  it("formats flame, stove and temperature limit from the firmware fields", () => {
    const on = metricsView(
      reading({
        flame: true,
        stoveOn: true,
        temperature: { celsius: 29.1, limit: 28.4, high: true },
      }),
    );
    expect(item(on, "flame").value).toBe("Sim");
    expect(item(on, "stove").value).toBe("Ligado");
    expect(item(on, "temperature")).toMatchObject({
      value: formatTemperature(29.1),
      hint: `limite ${formatTemperature(28.4)}`,
    });
    expect(item(on, "temperature").hint).toBe("limite 28.4 °C");

    const off = metricsView(
      reading({
        flame: false,
        stoveOn: false,
        temperature: { celsius: null, limit: 28.4, high: false },
      }),
    );
    expect(item(off, "flame").value).toBe("Não");
    expect(item(off, "stove").value).toBe("Desligado");
    expect(item(off, "temperature")).toMatchObject({
      value: "—",
      hint: "limite 28.4 °C",
    });
  });

  it("uses the seconds-without-motion phrase only while the stove is on", () => {
    expect(
      item(
        metricsView(
          reading({
            stoveOn: true,
            motion: false,
            secondsWithoutMotion: 42,
          }),
        ),
        "motion",
      ).value,
    ).toBe("sem movimento há 42 s");

    expect(
      item(
        metricsView(
          reading({
            stoveOn: true,
            motion: true,
            secondsWithoutMotion: 0,
          }),
        ),
        "motion",
      ).value,
    ).toBe("sem movimento há 0 s");

    expect(
      item(
        metricsView(
          reading({
            stoveOn: false,
            motion: true,
            secondsWithoutMotion: 99,
          }),
        ),
        "motion",
      ).value,
    ).toBe("Com movimento");

    expect(
      item(
        metricsView(
          reading({
            stoveOn: false,
            motion: false,
            secondsWithoutMotion: 99,
          }),
        ),
        "motion",
      ).value,
    ).toBe("Sem movimento");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/dashboard/metrics-grid.test.ts
```

Expected: FAIL — módulo `./metrics-grid` não existe (ou `metricsView` não é função). Não passe. Não edite `vitest.config.mts`.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/components/dashboard/metrics-grid.tsx` inteiro:

```tsx
import { formatGasDelta, formatTemperature } from "@/lib/format";
import type { Reading } from "@/types";

const DASH = "—";

const LABELS = {
  mq6: "GLP (MQ-6)",
  mq2: "Gases / fumaça (MQ-2)",
  flame: "Chama",
  temperature: "Temperatura",
  motion: "Movimento",
  stove: "Fogão",
} as const;

export type MetricId = keyof typeof LABELS;

export type MetricItem = {
  id: MetricId;
  label: string;
  value: string;
  hint: string | null;
};

function emptyItem(id: MetricId): MetricItem {
  return { id, label: LABELS[id], value: DASH, hint: null };
}

function motionValue(reading: Reading): string {
  if (reading.stoveOn) {
    return `sem movimento há ${reading.secondsWithoutMotion} s`;
  }
  return reading.motion ? "Com movimento" : "Sem movimento";
}

export function metricsView(reading: Reading | null): MetricItem[] {
  if (reading === null) {
    return [
      emptyItem("mq6"),
      emptyItem("mq2"),
      emptyItem("flame"),
      emptyItem("temperature"),
      emptyItem("motion"),
      emptyItem("stove"),
    ];
  }

  return [
    {
      id: "mq6",
      label: LABELS.mq6,
      value: String(reading.mq6.value),
      hint: formatGasDelta(reading.mq6.value, reading.mq6.base),
    },
    {
      id: "mq2",
      label: LABELS.mq2,
      value: String(reading.mq2.value),
      hint: null,
    },
    {
      id: "flame",
      label: LABELS.flame,
      value: reading.flame ? "Sim" : "Não",
      hint: null,
    },
    {
      id: "temperature",
      label: LABELS.temperature,
      value: formatTemperature(reading.temperature.celsius),
      hint: `limite ${formatTemperature(reading.temperature.limit)}`,
    },
    {
      id: "motion",
      label: LABELS.motion,
      value: motionValue(reading),
      hint: null,
    },
    {
      id: "stove",
      label: LABELS.stove,
      value: reading.stoveOn ? "Ligado" : "Desligado",
      hint: null,
    },
  ];
}

export function MetricsGrid({ reading }: { reading: Reading | null }) {
  const items = metricsView(reading);

  return (
    <section
      aria-label="Métricas"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border"
    >
      {items.map((item) => (
        <article key={item.id} className="bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-medium tabular-nums tracking-tight">
            {item.value}
            {item.hint ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {item.hint}
              </span>
            ) : null}
          </p>
        </article>
      ))}
    </section>
  );
}
```

Sem `"use client"`. Sem lucide. Sem `cn`. Sem editar `globals.css`. Sem cor de `RiskLevel`. O `rounded-2xl` casa com o `RiskCard`; o filete `gap-px` evita seis cards iguais.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/components/dashboard/metrics-grid.test.ts
```

Expected: PASS (1 `describe`, 5 `it`).

- [ ] **Step 5: Full suite, lint and build**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: `npm test` exit 0 (os 13 arquivos anteriores + 1 novo = 14). `npm run lint` exit 0. `npm run build` exit 0. O build type-checka o JSX mesmo sem ninguém montar `MetricsGrid`.

- [ ] **Step 6: Browser — a home ainda abre**

O mapa pede smoke em toda branch. Esta grade **não** entra na home (Owns de `page.tsx` / `dashboard.tsx` é W4). O Done when visível (6 métricas / delta / travessão) está nos testes puros desta task; no browser desta fatia só confirme que o placeholder não quebrou.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Confirme que esta fatia **não** montou a grade: a home continua o placeholder. Não crie rota de preview. Não ligue o mock para “ver o delta”.

Se não houver browser tool: **não** substitua a home por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto — não se a grade não tiver aparecido (ela não pode aparecer nesta fatia).

- [ ] **Step 7: Commit**

```bash
git add web/src/components/dashboard/metrics-grid.tsx web/src/components/dashboard/metrics-grid.test.ts
git commit -m "$(cat <<'EOF'
feat(web): show six live sensor metrics in a two-column grid

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `dashboard.tsx`, `globals.css`, `package.json`, `vitest.config.mts`, `types/`, `lib/`, `hooks/`, `services/`, os arquivos W3c, `hardware/` nem o mock.

---

## Fora desta fatia (não fazer)

- `dashboard.tsx`, `page.tsx` dinâmico, `layout.tsx`, `globals.css`, gráfico, eventos, filtros (W3e–W4). Quem monta a grade é o W4.
- Recalcular risco. Chamar `useReadings`. Importar `services/`. Pintar célula com cor de `RiskLevel` / `mq6.level` / `temperature.high`.
- Flash / “destaque rápido quando o valor muda” (`architecture.md`). Sem estado anterior nesta fatia.
- Prop `connection`. Cinzar a grade. Texto “Sem dados” nas células.
- Delta no MQ-2. `formatAge` no movimento. Ícone lucide. `npx shadcn add card`.
- Editar `format.ts`, `vitest.config.mts`, `package.json`, `components/ui/button.tsx`, `components/README.md`, header e cartão de risco.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
