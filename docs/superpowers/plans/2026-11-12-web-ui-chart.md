# Gráfico de leituras do dashboard — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o gráfico dos últimos 10 min (`ReadingsChart`) como componente só de props — 3 séries MQ-6 / MQ-2 / temperatura, eixo X em hora, array vazio sem crash — sem buscar dado e sem ligar o hook.

**Architecture:** Um arquivo em `web/src/components/dashboard/`. Exporta a função pura `chartView` (pontos + as 3 séries) e o JSX que só pinta isso com Recharts. Sem estado local. Sem `dashboard.tsx`. Sem Testing Library: o Vitest em `node` afirma o view-model; o `build` type-checka o JSX. Visual quieto: o mesmo cartão `rounded-2xl border` da grade; o cartão de risco (W3c) continua sendo o sinal de cor.

**Tech Stack:** TypeScript 5 (`strict`), React 19 (JSX automático), Tailwind CSS 4, Recharts 3.10.1 (já no `package.json`), Vitest 5.1.0 ambiente `node`, Next.js 16.4.6 só para o smoke da home. Sem jsdom, sem Testing Library, sem pacote novo, sem `shadcn add`, sem lucide.

**Spec:** fatia W3e + Contratos congelados Componentes + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Tela em [`docs/architecture.md`](../../architecture.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-ui-chart` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-ui-chart`.
- Baseline: em `web/`, `npm test` já passou (14 files / 87 tests). Não edite `web/src/lib/**`, `web/src/types/**`, `web/src/hooks/**`, `web/src/services/**`, `web/src/app/**`.
- `web/src/components/dashboard/` já tem header, cartão de risco e grade (W3c/W3d, congelados). **Não edite esses arquivos.**
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.** Ninguém desta fatia monta o gráfico na tela (W4).
- Recharts **já está instalado** (`recharts@^3.10.1`). Não rode `npm install`. Não mexa em `package.json` / `package-lock.json` (o lock pode aparecer sujo neste worktree — ignore).
- A janela de 10 min já é do hook (`WINDOW_MS` em `use-readings.ts`). Este componente **não** recorta o array.

## Arquivos (decomposição)

```
web/src/components/dashboard/
├── dashboard-header.tsx        (congelado — não mexer)
├── dashboard-header.test.ts    (congelado — não mexer)
├── risk-card.tsx               (congelado — não mexer)
├── risk-card.test.ts           (congelado — não mexer)
├── metrics-grid.tsx            (congelado — não mexer)
├── metrics-grid.test.ts        (congelado — não mexer)
├── readings-chart.tsx          [T1] chartView + ReadingsChart
└── readings-chart.test.ts      [T1]
```

Nada fora desta lista. Sem `dashboard.tsx`. Sem `index.ts`. Sem `chart-points.ts`. Sem `README.md` novo. Sem `"use client"` (não há estado local; o W4 é o boundary de cliente e é quem importa). Fixtures de `Reading` **dentro** do próprio `*.test.ts`.

Os testes são `*.test.ts` (o Vitest só inclui `src/**/*.test.ts`). Eles importam a função pura do `.tsx`. Não criam `.test.tsx`. Não renderizam JSX. Não editam `vitest.config.mts`. Importar o `.tsx` puxa `recharts`; o pacote **carrega em Node** sem jsdom — o teste só chama `chartView`, nunca `ReadingsChart(...)`.

W4 importa **somente** `ReadingsChart`. `chartView` existe para o teste rodar em `node` sem jsdom.

## Global Constraints

- **Owns:** só `web/src/components/dashboard/readings-chart.tsx` e o `readings-chart.test.ts` ao lado (o mapa lista o `.tsx`; o teste colado é a regra de “UI extrai função pura testável”, igual W3c/W3d). Precisou de outro arquivo → parar.
- **Assinatura congelada:**
  ```ts
  export function ReadingsChart(props: { readings: Reading[] }): JSX.Element;
  ```
  Não acrescente prop (`connection`, `now`, `className`, `windowMs`). Não busque dado. Não chame `useReadings`.
- **Camadas:** kebab-case; imports `@/types` e `recharts`. `components/` **nunca** importa `services/` nem `node:*`. Sem colunas em português.
- **O web não recalcula risco.** O gráfico não lê `reading.level`, `scenarioId`, `mq6.level`, `mq2.level` nem `temperature.high`. Só plota os valores já medidos.
- **Sem Testing Library e sem jsdom novo.** Não edite `vitest.config.mts` nem `package.json`. Não instale pacote. Não rode `shadcn add`. Não importe `lucide-react`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `page.tsx`, `layout.tsx`, `globals.css`, `components/README.md`, `components/ui/button.tsx`, os seis arquivos W3c/W3d.
- **Idioma:** identificadores em inglês; textos da UI em pt-BR com acentos; este plano em pt-BR.
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real. Não escreva “Ambiente normal” nem “Sem dados” neste componente — isso é do `RiskCard`.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** 3 séries; array vazio não crasha; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá as props e o conteúdo mínimo (“Recharts, últimos 10 min, 3 séries MQ-6 / MQ-2 / temperatura. Eixo X = hora”). Isto não reabre decisão — só impede o implementer de inventar formato:

1. **Uma prop só.** `ReadingsChart` não recebe `connection` nem `now`. Array vazio → cartão quieto com travessão. Array com pontos → plota **todos**, na ordem recebida. Quem recorta 10 min é o W3b; quem passa o array é o W4.
2. **Sem `"use client"`. Sem estado local.** Sem `useState` / `useEffect` / `useRef`. Recharts usa hooks por baixo; o W4 (client) importa este arquivo e o Next coloca no bundle do cliente. Não adicione a diretiva “por precaução”.
3. **Não recorte 10 min aqui.** Dois pontos com 20 min de diferença continuam dois pontos. Sem `Date.now()`, sem filtrar por `timestamp`.
4. **Três séries, nesta ordem, com estes rótulos** (os mesmos da grade, para a tela falar a mesma língua):

   | `id` / `dataKey` | `label` | `yAxisId` |
   |---|---|---|
   | `mq6` | `GLP (MQ-6)` | `gas` |
   | `mq2` | `Gases / fumaça (MQ-2)` | `gas` |
   | `temperature` | `Temperatura` | `temp` |

   Sempre length 3, inclusive com `readings === []`.
5. **Dois eixos Y.** MQ-6/MQ-2 são ADC (~0–4095); temperatura é °C (~0–40). No mesmo eixo a temperatura some. Esquerda = `gas`, direita = `temp`. Não normalize. Não omita a série de temperatura.
6. **Ponto.** `time` = a parte depois do `T` em `reading.timestamp` (`"2026-11-12T14:32:08"` → `"14:32:08"`). Sem `T`, use o string inteiro. `mq6` / `mq2` = `.value` (ADC cru). `temperature` = `celsius` (`number | null`). `0` é leitura válida; só `null` é buraco na linha (`connectNulls` fica no default, `false`).
7. **Eixo X = hora.** `dataKey="time"`. O tick mostra `HH:MM` (`value.slice(0, 5)`), não o ISO completo. O tooltip pode mostrar `HH:MM:SS` (é o `time` cru).
8. **Array vazio:** `points: []`, as 3 séries continuam, `showDot: false`. O JSX **não monta** `LineChart` — renderiza o mesmo casco (título + legenda HTML) e um `—` (U+2014) centrado na altura do gráfico. Não crasha. Não escreva “Sem dados” nem “Ambiente normal”.
9. **Um único ponto:** `showDot: true` (senão `dot={false}` some o ponto). Dois ou mais: `showDot: false` (600 pontos/10 min virariam uma mancha).
10. **Sem animação.** `isAnimationActive={false}` em cada `Line` e no `Tooltip`. O array atualiza ~1/s; animar 600 pontos treme e mente o atraso.
11. **Cores das linhas, exatamente estas** (os tokens `--chart-*` do tema são cinza e as três séries ficariam iguais; o gráfico é instrumento, não alarme — por isso não usa verde/vermelho do `RiskCard`):

    | `id` | `color` |
    |---|---|
    | `mq6` | `#0284c7` (sky-600) |
    | `mq2` | `#d97706` (amber-600) |
    | `temperature` | `#e11d48` (rose-600) |

    Hex no `stroke`. Funciona no claro e no escuro. Não edite `globals.css`.
12. **Legenda HTML, não `<Legend>` do Recharts.** Três itens com bolinha da cor + rótulo, acima da área do gráfico, visíveis também no vazio. O `<Legend>` do Recharts briga com altura fixa no celular.
13. **JSX mínimo, mobile-first.** Uma `<section aria-label="Últimos 10 min">` com `overflow-hidden rounded-2xl border bg-card p-4`. Título `h2` “Últimos 10 min” em `text-xs font-medium text-muted-foreground` (o mesmo peso dos rótulos da grade). Área do gráfico `h-52`. `ResponsiveContainer width="100%" height="100%"` com `initialDimension={{ width: 320, height: 208 }}` para não nascer 0×0. Grid só horizontal (`vertical={false}`), `stroke="var(--color-border)"`. Eixos sem `tickLine` / `axisLine`, tick `fontSize: 11` e `fill: "var(--color-muted-foreground)"`. Y esquerdo `width={36}`; Y direito `width={32}` e `tickFormatter` com `°` (`24°`). Sem `max-w-*` (o W4 define a coluna). Sem `Card` do shadcn. Sem ícone. Sem `Button`. Sem cor de `RiskLevel`.
14. **Travessão.** Vazio usa `"—"` (U+2014), nunca `"-"` nem `"–"`.
15. **Testes importam o `.tsx` e só chamam `chartView`.** Vite/esbuild transforma JSX sem jsdom. Não chame `ReadingsChart(...)` no teste. Se o módulo não carregar por causa do `recharts`, **não** instale jsdom e **não** edite o Vitest — pare e devolva; o Owns não permite outro arquivo.

## Review Focus

Cada linha abaixo tem teste na Task 1. São os casos que o mapa implica e que, se errados, o W4 mostra gráfico mentiroso ou quebra com CSV parado:

1. **Array vazio → 0 pontos, 3 séries, sem crash.** `chartView([])` não joga. Os rótulos das séries continuam os três do contrato. O JSX (coberto pelo `build`) não monta `LineChart`.
2. **As 3 séries existem e MQ-6/MQ-2 compartilham o eixo `gas`; temperatura usa `temp`.** Sem isso a linha de °C some no ADC.
3. **`time` é hora, não o ISO.** `"2026-11-12T14:32:08"` → `"14:32:08"`. O componente não filtra por 10 min: dois pontos 20 min apartados continuam dois.
4. **Temperatura `null` vs `0`.** `celsius: null` permanece `null` (buraco na linha). `celsius: 0` permanece `0`.
5. **Um ponto liga `showDot`; dois ou mais desligam.** Primeira leitura do dia não some.

---

### Task 1: `ReadingsChart` (3 séries, vazio não crasha)

**Files:**
- Create: `web/src/components/dashboard/readings-chart.test.ts`
- Create: `web/src/components/dashboard/readings-chart.tsx`

**Interfaces:**
- Consumes: tipo `Reading` de `@/types`. Componentes `CartesianGrid`, `Line`, `LineChart`, `ResponsiveContainer`, `Tooltip`, `XAxis`, `YAxis` de `recharts`. Nada de `formatAge` / `formatTemperature` / `formatGasDelta`. Nada do hook. Nada de `connection`.
- Produces:
  - `export type ChartPoint = { time: string; mq6: number; mq2: number; temperature: number | null }`
  - `export type ChartSeries = { id: "mq6" | "mq2" | "temperature"; label: string; yAxisId: "gas" | "temp"; color: string }`
  - `export function chartView(readings: Reading[]): { points: ChartPoint[]; series: ChartSeries[]; showDot: boolean }`
  - `export function ReadingsChart(props: { readings: Reading[] }): JSX.Element`

O JSX faz `const { points, series, showDot } = chartView(readings)` e pinta. W4 só importa `ReadingsChart`.

- [ ] **Step 1: Write the failing test**

Crie `web/src/components/dashboard/readings-chart.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import type { Reading } from "@/types";

import { chartView } from "./readings-chart";

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

describe("chartView", () => {
  it("keeps three labeled series and no points when the array is empty", () => {
    const view = chartView([]);

    expect(view.points).toEqual([]);
    expect(view.showDot).toBe(false);
    expect(view.series.map((row) => row.id)).toEqual([
      "mq6",
      "mq2",
      "temperature",
    ]);
    expect(view.series.map((row) => row.label)).toEqual([
      "GLP (MQ-6)",
      "Gases / fumaça (MQ-2)",
      "Temperatura",
    ]);
    expect(view.series.map((row) => row.yAxisId)).toEqual([
      "gas",
      "gas",
      "temp",
    ]);
  });

  it("maps timestamp to time-of-day and copies the three plotted values", () => {
    const view = chartView([
      reading({
        timestamp: "2026-11-12T14:32:08",
        mq6: { value: 1120, base: 290, level: 2 },
        mq2: { value: 1350, base: 900, level: 1 },
        temperature: { celsius: 29.1, limit: 28.4, high: true },
      }),
    ]);

    expect(view.points).toEqual([
      { time: "14:32:08", mq6: 1120, mq2: 1350, temperature: 29.1 },
    ]);
    expect(view.showDot).toBe(true);
  });

  it("keeps a null temperature as a gap and a zero temperature as zero", () => {
    const view = chartView([
      reading({
        timestamp: "2026-11-12T14:32:08",
        temperature: { celsius: null, limit: 28.4, high: false },
      }),
      reading({
        timestamp: "2026-11-12T14:32:09",
        temperature: { celsius: 0, limit: 28.4, high: false },
      }),
    ]);

    expect(view.points.map((point) => point.temperature)).toEqual([null, 0]);
    expect(view.points.map((point) => point.time)).toEqual([
      "14:32:08",
      "14:32:09",
    ]);
    expect(view.showDot).toBe(false);
  });

  it("plots every reading in input order and does not clip a 10-minute window", () => {
    const view = chartView([
      reading({ timestamp: "2026-11-12T14:00:00", mq6: { value: 1, base: 0, level: 0 } }),
      reading({ timestamp: "2026-11-12T14:20:00", mq6: { value: 2, base: 0, level: 0 } }),
    ]);

    expect(view.points).toEqual([
      { time: "14:00:00", mq6: 1, mq2: 150, temperature: 24 },
      { time: "14:20:00", mq6: 2, mq2: 150, temperature: 24 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/dashboard/readings-chart.test.ts
```

Expected: FAIL — módulo `./readings-chart` não existe (ou `chartView` não é função). Não passe. Não edite `vitest.config.mts`. Se a falha for o `recharts` quebrando no load em Node, **pare** e devolva — não instale jsdom.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/components/dashboard/readings-chart.tsx` inteiro:

```tsx
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Reading } from "@/types";

export type ChartPoint = {
  time: string;
  mq6: number;
  mq2: number;
  temperature: number | null;
};

export type ChartSeries = {
  id: "mq6" | "mq2" | "temperature";
  label: string;
  yAxisId: "gas" | "temp";
  color: string;
};

const SERIES: ChartSeries[] = [
  { id: "mq6", label: "GLP (MQ-6)", yAxisId: "gas", color: "#0284c7" },
  {
    id: "mq2",
    label: "Gases / fumaça (MQ-2)",
    yAxisId: "gas",
    color: "#d97706",
  },
  {
    id: "temperature",
    label: "Temperatura",
    yAxisId: "temp",
    color: "#e11d48",
  },
];

function chartTime(timestamp: string): string {
  const [, time] = timestamp.split("T");
  return time ?? timestamp;
}

export function chartView(readings: Reading[]) {
  const points: ChartPoint[] = readings.map((reading) => ({
    time: chartTime(reading.timestamp),
    mq6: reading.mq6.value,
    mq2: reading.mq2.value,
    temperature: reading.temperature.celsius,
  }));

  return {
    points,
    series: SERIES,
    showDot: points.length === 1,
  };
}

function SeriesLegend({ series }: { series: ChartSeries[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function ReadingsChart({ readings }: { readings: Reading[] }) {
  const { points, series, showDot } = chartView(readings);

  return (
    <section
      aria-label="Últimos 10 min"
      className="overflow-hidden rounded-2xl border bg-card p-4"
    >
      <h2 className="text-xs font-medium text-muted-foreground">
        Últimos 10 min
      </h2>
      <SeriesLegend series={series} />
      {points.length === 0 ? (
        <p className="flex h-52 items-center justify-center text-sm text-muted-foreground">
          —
        </p>
      ) : (
        <div className="mt-1 h-52">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 320, height: 208 }}
          >
            <LineChart
              data={points}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickFormatter={(value: string) => value.slice(0, 5)}
              />
              <YAxis
                yAxisId="gas"
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <YAxis
                yAxisId="temp"
                orientation="right"
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(value: number) => `${value}°`}
              />
              <Tooltip
                isAnimationActive={false}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              {series.map((item) => (
                <Line
                  key={item.id}
                  yAxisId={item.yAxisId}
                  dataKey={item.id}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={1.75}
                  dot={showDot ? { r: 3, strokeWidth: 0 } : false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
```

Sem `"use client"`. Sem lucide. Sem `cn`. Sem editar `globals.css`. Sem cor de `RiskLevel`. Sem `<Legend>` do Recharts. O `rounded-2xl border` casa com a grade; as cores das linhas não competem com o cartão de risco.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/components/dashboard/readings-chart.test.ts
```

Expected: PASS (1 `describe`, 4 `it`).

- [ ] **Step 5: Full suite, lint and build**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: `npm test` exit 0 (os 14 arquivos anteriores + 1 novo = 15). `npm run lint` exit 0. `npm run build` exit 0. O build type-checka o JSX mesmo sem ninguém montar `ReadingsChart`.

- [ ] **Step 6: Browser — a home ainda abre**

O mapa pede smoke em toda branch. Este gráfico **não** entra na home (Owns de `page.tsx` / `dashboard.tsx` é W4). O Done when visível (3 séries / array vazio) está nos testes puros desta task; no browser desta fatia só confirme que o placeholder não quebrou.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Confirme que esta fatia **não** montou o gráfico: a home continua o placeholder. Não crie rota de preview. Não ligue o mock para “ver as 3 séries”.

Se não houver browser tool: **não** substitua a home por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto — não se o gráfico não tiver aparecido (ele não pode aparecer nesta fatia).

- [ ] **Step 7: Commit**

```bash
git add web/src/components/dashboard/readings-chart.tsx web/src/components/dashboard/readings-chart.test.ts
git commit -m "$(cat <<'EOF'
feat(web): plot MQ-6, MQ-2 and temperature for the last 10 minutes

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `dashboard.tsx`, `globals.css`, `package.json`, `package-lock.json`, `vitest.config.mts`, `types/`, `lib/`, `hooks/`, `services/`, os arquivos W3c/W3d, `hardware/` nem o mock.

---

## Fora desta fatia (não fazer)

- `dashboard.tsx`, `page.tsx` dinâmico, `layout.tsx`, `globals.css`, eventos, filtros (W3f–W4). Quem monta o gráfico é o W4.
- Recalcular risco. Chamar `useReadings`. Importar `services/`. Pintar linha com cor de `RiskLevel`.
- Recortar 10 min no componente. Prop `now` / `connection`. Texto “Sem dados” / “Ambiente normal”.
- `<Legend>` do Recharts. Animação. `dot` em todos os pontos. Eixo Y único. Pacote novo. `npx shadcn add chart`.
- Editar `format.ts`, `vitest.config.mts`, `package.json`, `package-lock.json`, `components/ui/button.tsx`, `components/README.md`, header, cartão e grade.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
