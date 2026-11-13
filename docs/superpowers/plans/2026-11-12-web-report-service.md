# Service do CSV (`report-service`) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o único módulo que lê o `daily-report.csv` do disco — caminho, snapshot dos últimos 10 min + eventos do dia, e poll de 500 ms para linhas novas — com CSV em arquivo tmp e sem recalcular risco.

**Architecture:** Um arquivo. `getReportPath` resolve `DAILY_REPORT_PATH` a partir de `process.cwd()`. `getRecentReadings` lê o arquivo, valida linha 1 e o cabeçalho, traduz linhas com `parseCsvLine`, recorta 10 min em relação à **última leitura válida** e chama `detectEvents` em **todas** as válidas do dia. `watchReadings` só acompanha o offset (`readNewLines`): na primeira leitura segura o tamanho sem emitir; depois `onReading` por linha nova e `onReset` se o arquivo encolheu. Sem barrel, sem helper extra, sem `Date` no recorte de 10 min (o CSV é de um único dia — segundos desde meia-noite).

**Tech Stack:** TypeScript 5 (`strict`), Vitest 5.1.0 ambiente `node`, `node:fs` / `node:path`, Next.js 16.4.6 só para o smoke da home. Sem jsdom, sem Testing Library, sem pacote novo, sem `chokidar`.

**Spec:** fatia W2 + Contratos congelados Service + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Envelope do arquivo em [`docs/csv-contract.md`](../../csv-contract.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-report-service` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-report-service`.
- Baseline: em `web/`, `npm test` já passou (lib W1a + parse/tail W1b). Não edite `web/src/lib/**`, `web/src/types/**`, `parse-csv-line.ts` nem `tail-report.ts`.
- `web/src/services/report/` já tem parser, tail e `README.md`. **Não existe** `report-service.ts`. O README já aponta este arquivo como W2 — **não o edite** (fora do Owns).
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.**
- `server-only` não está no `package.json`. O teste começa com `vi.mock("server-only", () => ({}));` — não altere `vitest.config.mts`.

## Arquivos (decomposição)

```
web/src/services/report/
├── README.md                 (W1b — não mexer)
├── parse-csv-line.ts         (W1b — não mexer)
├── parse-csv-line.test.ts    (W1b — não mexer)
├── tail-report.ts            (W1b — não mexer)
├── tail-report.test.ts       (W1b — não mexer)
├── report-service.ts         [T1 + T2]
└── report-service.test.ts    [T1 + T2]
```

Nada fora desta lista. Sem `index.ts`. Sem `report-io.ts`. Sem constante exportada (`HEADER`, `POLL_MS`). Fixtures de CSV / `Reading` **dentro** do próprio `*.test.ts`. Testes escrevem o CSV em `os.tmpdir()`, nunca no `daily-report.csv` da raiz.

## Global Constraints

- **Owns:** só `web/src/services/report/report-service.ts` e `report-service.test.ts`. Precisou de outro arquivo → parar.
- **Assinaturas congeladas:** copiar o bloco Service (W2) do mapa. Não renomear, não acrescentar parâmetro, não exportar `HEADER`, `watch` singleton nem barrel.
- **Só `report-service.ts` importa `fs` / `node:fs`.** `parse-csv-line` e `tail-report` continuam sem disco. `node:path` entra aqui para o `resolve`.
- **Só este diretório conhece português.** Este arquivo valida `data,AAAA-MM-DD` e o cabeçalho em português; as 17 colunas das linhas de dados continuam só em `parse-csv-line.ts`. O restante do web continua em inglês.
- **Não recalcula risco.** Traduz e recorta. `level` / `scenarioId` vêm do parser.
- **Camadas:** kebab-case; `import "server-only";` na primeira linha; imports `@/lib/events`, `@/types`, `./parse-csv-line`, `./tail-report`. `services/` não importa `hooks/` nem `components/`.
- **Não instalar pacote.** Sem `chokidar`, sem `server-only` no `package.json`, sem jsdom novo. Não edite `vitest.config.mts`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `README.md` desta pasta, `page.tsx`.
- **Idioma:** identificadores exportados em inglês; este plano em pt-BR; UI intocada (continua pt-BR).
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** `getRecentReadings` / `watchReadings` com CSV em tmp; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá as assinaturas. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **`getReportPath`:** `resolve(process.cwd(), process.env.DAILY_REPORT_PATH ?? "../daily-report.csv")`. `??` só cobre `undefined`/`null`. Relativo ao `cwd` (Next roda em `web/`). Absoluto no env passa direto no `resolve`.
2. **Envelope inválido → `null`, não `{ readings: [] }`.** Arquivo ausente, linha 1 ≠ `^data,(\d{4}-\d{2}-\d{2})$` (sem espaço, sem BOM, sem `\r`), ou linha 2 ≠ o cabeçalho exato das 17 colunas. Cabeçalho copiado de [`csv-contract.md`](../../csv-contract.md): `hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento`.
3. **Arquivo válido sem linhas de dados → objeto vazio, não `null`.** `{ date, readings: [], events: [] }`. `null` é só “não há relatório”.
4. **Linha de dados ruim:** `parseCsvLine` → `null` → log + pular. O resto do arquivo segue. Não throw.
5. **Janela de 10 min:** inclusiva, relativa à **última leitura válida** do arquivo, **não** ao relógio de parede. `T` e `T - 600 s` entram; `T - 601 s` sai. O CSV é de um dia só e `parseCsvLine` carimba a mesma `date` em todas — recorte por segundos desde meia-noite (`HH*3600+MM*60+SS`). Não use `new Date("2026-11-10T14:32:08")` (uns engines tratam como UTC).
6. **`events`:** `detectEvents(todasAsValidasDoDia)` na ordem do arquivo. Uma mudança de nível às 08:00 aparece mesmo se `readings` só tiver 14:20–14:30. A primeira leitura do dia não gera evento (já é a regra de W1a).
7. **`watchReadings` não despeja o arquivo.** Primeiro tick (imediato na chamada): valida envelope, guarda `snapshot.size`, **não** chama `onReading`. Poll seguinte a cada **500 ms**. Sem isso o SSE (W3a) mandaria ~86 mil eventos ao conectar.
8. **`truncated`:** `onReset()` e atualiza o offset; **não** emite as linhas do snapshot (o cliente faz `router.refresh()` → `getRecentReadings`). Appends *depois* do reset voltam a emitir `onReading`.
9. **Arquivo some no meio do watch:** silêncio, offset intacto. Recriado menor → `truncated` → `onReset`. Não logar ENOENT a cada 500 ms.
10. **Envelope inválido no watch:** pular o tick, não semear offset. Sem log de envelope aqui — quem loga arquivo morto é `getRecentReadings` (uma vez por carga).
11. **Log (só `console.error`, três formas):**
    - `"[report-service] missing file:", path`
    - `"[report-service] invalid date line or header:", path`
    - `"[report-service] skipped invalid CSV line:", line`
12. **Leitura de disco:** `readFileSync` + `utf8` nos dois fluxos (`getRecentReadings` continua `async` só porque a assinatura é `Promise`). Sem `fs.watch`. Sem singleton — cada `watchReadings` tem o próprio `setInterval` e o próprio offset (W3a e W5 vão chamar separado).
13. **Os testes mockam `server-only`.** Não instale o pacote. Não edite o Vitest config. Restaure `DAILY_REPORT_PATH` e apague o tmp no `afterEach`.

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, quebram o SSE/W4 sem o implementer perceber:

1. **Janela ancorada na última válida, não em `Date.now()`.** 14:22:09 sai; 14:22:10 e 14:32:10 entram. O evento NORMAL→ALERT das 14:32 **e** qualquer evento de manhã entram em `events`. Task 1.
2. **Envelope vs vazio.** Sem arquivo / linha 1 ruim / cabeçalho errado → `null`. Só data+cabeçalho → `{ readings: [], events: [] }`. Task 1.
3. **Linha ruim no meio não mata o snapshot.** Uma linha de 16 campos é logada e pulada; as vizinhas válidas ficam. Task 1.
4. **Watch não emite o histórico.** Arquivo com 2 linhas já gravadas: `onReading` zero na chamada; depois de um append + 500 ms, **uma** leitura nova. Task 2.
5. **Rotação:** arquivo menor → `onReset` uma vez, sem `onReading` das linhas do arquivo novo; o próximo append emite. `stop()` cancela o interval. Task 2.

---

### Task 1: `getReportPath` + `getRecentReadings`

**Files:**
- Create: `web/src/services/report/report-service.test.ts`
- Create: `web/src/services/report/report-service.ts`

**Interfaces:**
- Consumes: `parseCsvLine(line, date)` (W1b), `readNewLines(content, previousSize)` (W1b), `detectEvents(readings)` (W1a), `Reading` / `RecentReadings` de `@/types`. Cabeçalho e linha `data,` de [`csv-contract.md`](../../csv-contract.md).
- Produces:
  - `export function getReportPath(): string`
  - `export function getRecentReadings(): Promise<RecentReadings | null>`

`watchReadings` **não** entra nesta task.

- [ ] **Step 1: Write the failing test**

Crie `web/src/services/report/report-service.test.ts` inteiro:

```ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getRecentReadings, getReportPath } from "@/services/report/report-service";
import type { Reading } from "@/types";

const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";

const DATE = "2026-11-10";

const CONTRACT_LINE =
  "14:32:08,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42";

const CONTRACT_READING: Reading = {
  timestamp: "2026-11-10T14:32:08",
  source: "board",
  level: "CRITICAL",
  scenarioId: 1,
  mq6: { value: 1120, base: 290, level: 2 },
  mq2: { value: 1350, base: 900, level: 1 },
  flame: true,
  temperature: { celsius: 29.1, limit: 28.4, high: true },
  motion: false,
  stoveOn: true,
  secondsWithoutMotion: 42,
};

function csvLine(
  hora: string,
  nivel = "NORMAL",
  extras: { origem?: string; cenario?: string } = {},
): string {
  return [
    hora,
    extras.origem ?? "mock",
    nivel,
    extras.cenario ?? "0",
    "200",
    "180",
    "0",
    "150",
    "140",
    "0",
    "0",
    "24.0",
    "26.0",
    "0",
    "1",
    "0",
    "0",
  ].join(",");
}

function reportFile(date: string, dataLines: string[]): string {
  return [`data,${date}`, HEADER, ...dataLines].join("\n") + "\n";
}

const originalEnv = process.env.DAILY_REPORT_PATH;

let tmpDir: string;
let reportPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-report-"));
  reportPath = join(tmpDir, "daily-report.csv");
  process.env.DAILY_REPORT_PATH = reportPath;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tmpDir, { recursive: true, force: true });
  if (originalEnv === undefined) {
    delete process.env.DAILY_REPORT_PATH;
  } else {
    process.env.DAILY_REPORT_PATH = originalEnv;
  }
});

describe("getReportPath", () => {
  it("resolves DAILY_REPORT_PATH from cwd, defaulting to ../daily-report.csv", () => {
    delete process.env.DAILY_REPORT_PATH;
    expect(getReportPath()).toBe(resolve(process.cwd(), "../daily-report.csv"));

    process.env.DAILY_REPORT_PATH = "tmp/custom.csv";
    expect(getReportPath()).toBe(resolve(process.cwd(), "tmp/custom.csv"));

    process.env.DAILY_REPORT_PATH = reportPath;
    expect(getReportPath()).toBe(reportPath);
  });
});

describe("getRecentReadings", () => {
  it("returns null and logs when the file is missing", async () => {
    expect(await getRecentReadings()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] missing file:",
      reportPath,
    );
  });

  it("returns null and logs when line 1 is not data,YYYY-MM-DD", async () => {
    writeFileSync(reportPath, ["data,10-11-2026", HEADER, csvLine("14:32:08")].join("\n") + "\n");
    expect(await getRecentReadings()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] invalid date line or header:",
      reportPath,
    );
  });

  it("returns null and logs when the header does not match the contract", async () => {
    writeFileSync(
      reportPath,
      ["data,2026-11-10", "hora,origem,nivel", csvLine("14:32:08")].join("\n") + "\n",
    );
    expect(await getRecentReadings()).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] invalid date line or header:",
      reportPath,
    );
  });

  it("returns empty readings and events for a valid file with only the envelope", async () => {
    writeFileSync(reportPath, reportFile(DATE, []));
    expect(await getRecentReadings()).toEqual({
      date: DATE,
      readings: [],
      events: [],
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("translates the csv-contract example and detects the FAILURE event", async () => {
    const failureLine =
      "14:32:10,placa,FALHA,16,300,290,0,910,900,0,0,,28.4,0,1,0,0";
    writeFileSync(
      reportPath,
      reportFile(DATE, [
        CONTRACT_LINE,
        "14:32:09,placa,CRITICO,1,1118,290,2,1342,900,1,1,29.1,28.4,1,0,1,43",
        failureLine,
      ]),
    );

    const result = await getRecentReadings();
    expect(result?.date).toBe(DATE);
    expect(result?.readings[0]).toEqual(CONTRACT_READING);
    expect(result?.readings).toHaveLength(3);
    expect(result?.events).toEqual([
      {
        id: "2026-11-10T14:32:10",
        timestamp: "2026-11-10T14:32:10",
        from: "CRITICAL",
        to: "FAILURE",
        scenarioId: 16,
        source: "board",
      },
    ]);
  });

  it("keeps the last 10 minutes of readings and events for the whole day", async () => {
    writeFileSync(
      reportPath,
      reportFile(DATE, [
        csvLine("08:00:00", "NORMAL"),
        csvLine("08:00:01", "ATENCAO", { cenario: "10" }),
        csvLine("14:22:09", "ATENCAO", { cenario: "10" }),
        csvLine("14:22:10", "ATENCAO", { cenario: "10" }),
        csvLine("14:32:10", "ALERTA", { cenario: "7" }),
      ]),
    );

    const result = await getRecentReadings();
    expect(result?.readings.map((reading) => reading.timestamp)).toEqual([
      "2026-11-10T14:22:10",
      "2026-11-10T14:32:10",
    ]);
    expect(result?.events.map((event) => [event.from, event.to, event.id])).toEqual([
      ["NORMAL", "ATTENTION", "2026-11-10T08:00:01"],
      ["ATTENTION", "ALERT", "2026-11-10T14:32:10"],
    ]);
  });

  it("skips an invalid data line, logs it, and keeps the neighbors", async () => {
    const badLine = csvLine("14:32:09").split(",").slice(0, 16).join(",");
    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), badLine, csvLine("14:32:10", "ALERTA", { cenario: "7" })]),
    );

    const result = await getRecentReadings();
    expect(result?.readings.map((reading) => reading.timestamp)).toEqual([
      "2026-11-10T14:32:08",
      "2026-11-10T14:32:10",
    ]);
    expect(result?.events).toEqual([
      {
        id: "2026-11-10T14:32:10",
        timestamp: "2026-11-10T14:32:10",
        from: "NORMAL",
        to: "ALERT",
        scenarioId: 7,
        source: "mock",
      },
    ]);
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] skipped invalid CSV line:",
      badLine,
    );
  });
});
```

O `vi.mock("server-only", () => ({}))` precisa existir **antes** do import do módulo. Não leia `daily-report.csv` da raiz. Não importe `watchReadings` ainda.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/services/report/report-service.test.ts
```

Expected: FAIL. Mensagem no espírito de `Cannot find module '@/services/report/report-service'` (ou `getReportPath is not a function` se o arquivo existir vazio). Se passar, o Step 1 não foi feito — não avance.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/services/report/report-service.ts` inteiro. Primeira linha: `import "server-only";`. Sem `watchReadings`. Sem `Date`. Sem `fs.watch`. Não exporte `HEADER` nem `WINDOW_SECONDS`.

```ts
import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { detectEvents } from "@/lib/events";
import type { Reading, RecentReadings } from "@/types";

import { parseCsvLine } from "./parse-csv-line";
import { readNewLines } from "./tail-report";

const DEFAULT_REPORT_PATH = "../daily-report.csv";
const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";
const DATE_LINE = /^data,(\d{4}-\d{2}-\d{2})$/;
const WINDOW_SECONDS = 10 * 60;

export function getReportPath(): string {
  return resolve(process.cwd(), process.env.DAILY_REPORT_PATH ?? DEFAULT_REPORT_PATH);
}

function secondsOfDay(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.slice(11).split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function recentWindow(readings: Reading[]): Reading[] {
  if (readings.length === 0) return [];
  const last = secondsOfDay(readings[readings.length - 1].timestamp);
  const earliest = last - WINDOW_SECONDS;
  return readings.filter((reading) => secondsOfDay(reading.timestamp) >= earliest);
}

function readReportFile(): string | null {
  try {
    return readFileSync(getReportPath(), "utf8");
  } catch {
    return null;
  }
}

function parseEnvelope(content: string): string | null {
  const firstBreak = content.indexOf("\n");
  if (firstBreak === -1) return null;

  const dateMatch = DATE_LINE.exec(content.slice(0, firstBreak));
  if (!dateMatch) return null;

  const secondBreak = content.indexOf("\n", firstBreak + 1);
  if (secondBreak === -1) return null;

  const header = content.slice(firstBreak + 1, secondBreak);
  if (header !== HEADER) return null;

  return dateMatch[1];
}

function parseReadings(content: string, date: string): Reading[] {
  const readings: Reading[] = [];
  for (const line of readNewLines(content, 0).lines) {
    const reading = parseCsvLine(line, date);
    if (reading === null) {
      console.error("[report-service] skipped invalid CSV line:", line);
      continue;
    }
    readings.push(reading);
  }
  return readings;
}

export async function getRecentReadings(): Promise<RecentReadings | null> {
  const path = getReportPath();
  const content = readReportFile();
  if (content === null) {
    console.error("[report-service] missing file:", path);
    return null;
  }

  const date = parseEnvelope(content);
  if (date === null) {
    console.error("[report-service] invalid date line or header:", path);
    return null;
  }

  const readings = parseReadings(content, date);
  return {
    date,
    readings: recentWindow(readings),
    events: detectEvents(readings),
  };
}
```

`readReportFile` **não** loga: o watch (Task 2) reusa essa função a cada 500 ms. Quem loga arquivo ausente é só `getRecentReadings`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/services/report/report-service.test.ts
```

Expected: PASS (2 `describe`, 8 `it`).

- [ ] **Step 5: Commit**

```bash
git add web/src/services/report/report-service.ts web/src/services/report/report-service.test.ts
git commit -m "$(cat <<'EOF'
feat(web): read recent readings from daily-report.csv

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 2: `watchReadings` (poll 500 ms, reset, cancel)

**Files:**
- Modify: `web/src/services/report/report-service.test.ts`
- Modify: `web/src/services/report/report-service.ts`

**Interfaces:**
- Consumes: as funções privadas da Task 1 (`readReportFile`, `parseEnvelope`) e `readNewLines` / `parseCsvLine`. Não crie outro arquivo.
- Produces:

```ts
export function watchReadings(handlers: {
  onReading: (reading: Reading) => void;
  onReset: () => void;
}): () => void;
```

O retorno cancela o `setInterval`. Tick imediato na chamada (só para semear o offset) + poll de 500 ms.

- [ ] **Step 1: Write the failing test**

No **topo** de `web/src/services/report/report-service.test.ts`, acrescente `watchReadings` ao import (o resto do arquivo da Task 1 permanece):

```ts
import { getRecentReadings, getReportPath, watchReadings } from "@/services/report/report-service";
```

No final do mesmo arquivo, **depois** do `describe("getRecentReadings")`, acrescente este bloco inteiro. Não apague os testes da Task 1.

```ts
describe("watchReadings", () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
  });

  it("does not replay existing lines, then emits each appended reading", () => {
    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), csvLine("14:32:09")]),
    );

    const onReading = vi.fn();
    const onReset = vi.fn();
    stop = watchReadings({ onReading, onReset });

    expect(onReading).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();

    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), csvLine("14:32:09"), csvLine("14:32:10", "ALERTA", { cenario: "7" })]),
    );
    vi.advanceTimersByTime(500);

    expect(onReading).toHaveBeenCalledTimes(1);
    expect(onReading.mock.calls[0][0].timestamp).toBe("2026-11-10T14:32:10");
    expect(onReading.mock.calls[0][0].level).toBe("ALERT");
    expect(onReset).not.toHaveBeenCalled();

    stop();
    writeFileSync(
      reportPath,
      reportFile(DATE, [
        csvLine("14:32:08"),
        csvLine("14:32:09"),
        csvLine("14:32:10", "ALERTA", { cenario: "7" }),
        csvLine("14:32:11"),
      ]),
    );
    vi.advanceTimersByTime(500);
    expect(onReading).toHaveBeenCalledTimes(1);
  });

  it("calls onReset when the file shrinks and does not replay the new snapshot", () => {
    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), csvLine("14:32:09"), csvLine("14:32:10")]),
    );

    const onReading = vi.fn();
    const onReset = vi.fn();
    stop = watchReadings({ onReading, onReset });

    writeFileSync(reportPath, reportFile("2026-11-11", [csvLine("00:00:01")]));
    vi.advanceTimersByTime(500);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onReading).not.toHaveBeenCalled();

    writeFileSync(
      reportPath,
      reportFile("2026-11-11", [csvLine("00:00:01"), csvLine("00:00:02", "ALERTA", { cenario: "7" })]),
    );
    vi.advanceTimersByTime(500);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onReading).toHaveBeenCalledTimes(1);
    expect(onReading.mock.calls[0][0].timestamp).toBe("2026-11-11T00:00:02");

    stop();
  });

  it("skips an invalid appended line and keeps watching", () => {
    writeFileSync(reportPath, reportFile(DATE, [csvLine("14:32:08")]));

    const onReading = vi.fn();
    stop = watchReadings({ onReading, onReset: vi.fn() });

    const badLine = csvLine("14:32:09").split(",").slice(0, 16).join(",");
    writeFileSync(reportPath, reportFile(DATE, [csvLine("14:32:08"), badLine]));
    vi.advanceTimersByTime(500);

    expect(onReading).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "[report-service] skipped invalid CSV line:",
      badLine,
    );

    writeFileSync(
      reportPath,
      reportFile(DATE, [csvLine("14:32:08"), badLine, csvLine("14:32:10")]),
    );
    vi.advanceTimersByTime(500);

    expect(onReading).toHaveBeenCalledTimes(1);
    expect(onReading.mock.calls[0][0].timestamp).toBe("2026-11-10T14:32:10");

    stop();
  });
});
```

Não use `fs.watch` nos testes. O relógio é falso; o arquivo é real no tmp. `stop()` no fim de cada `it` (o `afterEach` da Task 1 já restaura mocks e apaga o tmp).

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/services/report/report-service.test.ts
```

Expected: FAIL. Mensagem no espírito de `watchReadings is not a function` / `does not export watchReadings`. Se os 3 `it` novos passarem, o Step 1 não foi feito — não avance. Os 8 `it` da Task 1 continuam PASS.

- [ ] **Step 3: Write minimal implementation**

Substitua `web/src/services/report/report-service.ts` inteiro pelo arquivo abaixo (Task 1 + `watchReadings`). Não extraia outro módulo.

```ts
import "server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { detectEvents } from "@/lib/events";
import type { Reading, RecentReadings } from "@/types";

import { parseCsvLine } from "./parse-csv-line";
import { readNewLines } from "./tail-report";

const DEFAULT_REPORT_PATH = "../daily-report.csv";
const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";
const DATE_LINE = /^data,(\d{4}-\d{2}-\d{2})$/;
const WINDOW_SECONDS = 10 * 60;
const POLL_MS = 500;

export function getReportPath(): string {
  return resolve(process.cwd(), process.env.DAILY_REPORT_PATH ?? DEFAULT_REPORT_PATH);
}

function secondsOfDay(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.slice(11).split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function recentWindow(readings: Reading[]): Reading[] {
  if (readings.length === 0) return [];
  const last = secondsOfDay(readings[readings.length - 1].timestamp);
  const earliest = last - WINDOW_SECONDS;
  return readings.filter((reading) => secondsOfDay(reading.timestamp) >= earliest);
}

function readReportFile(): string | null {
  try {
    return readFileSync(getReportPath(), "utf8");
  } catch {
    return null;
  }
}

function parseEnvelope(content: string): string | null {
  const firstBreak = content.indexOf("\n");
  if (firstBreak === -1) return null;

  const dateMatch = DATE_LINE.exec(content.slice(0, firstBreak));
  if (!dateMatch) return null;

  const secondBreak = content.indexOf("\n", firstBreak + 1);
  if (secondBreak === -1) return null;

  const header = content.slice(firstBreak + 1, secondBreak);
  if (header !== HEADER) return null;

  return dateMatch[1];
}

function parseReadings(content: string, date: string): Reading[] {
  const readings: Reading[] = [];
  for (const line of readNewLines(content, 0).lines) {
    const reading = parseCsvLine(line, date);
    if (reading === null) {
      console.error("[report-service] skipped invalid CSV line:", line);
      continue;
    }
    readings.push(reading);
  }
  return readings;
}

export async function getRecentReadings(): Promise<RecentReadings | null> {
  const path = getReportPath();
  const content = readReportFile();
  if (content === null) {
    console.error("[report-service] missing file:", path);
    return null;
  }

  const date = parseEnvelope(content);
  if (date === null) {
    console.error("[report-service] invalid date line or header:", path);
    return null;
  }

  const readings = parseReadings(content, date);
  return {
    date,
    readings: recentWindow(readings),
    events: detectEvents(readings),
  };
}

export function watchReadings(handlers: {
  onReading: (reading: Reading) => void;
  onReset: () => void;
}): () => void {
  let previousSize = 0;
  let seeded = false;

  const tick = () => {
    const content = readReportFile();
    if (content === null) return;

    const date = parseEnvelope(content);
    if (date === null) return;

    const snapshot = readNewLines(content, previousSize);

    if (!seeded) {
      previousSize = snapshot.size;
      seeded = true;
      return;
    }

    if (snapshot.truncated) {
      handlers.onReset();
      previousSize = snapshot.size;
      return;
    }

    for (const line of snapshot.lines) {
      const reading = parseCsvLine(line, date);
      if (reading === null) {
        console.error("[report-service] skipped invalid CSV line:", line);
        continue;
      }
      handlers.onReading(reading);
    }
    previousSize = snapshot.size;
  };

  tick();
  const intervalId = setInterval(tick, POLL_MS);
  return () => clearInterval(intervalId);
}
```

Cada chamada tem o próprio `previousSize` / `seeded` / interval. Não compartilhe estado entre clientes SSE. Não chame `onReading` no tick de `truncated`. Não logue arquivo ausente aqui.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/services/report/report-service.test.ts
```

Expected: PASS (3 `describe`, 11 `it`).

- [ ] **Step 5: test + lint + build (Done when)**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: os três com exit 0. `npm test` inclui lib (W1a) + parse/tail (W1b) + este arquivo. `lint` sem aviso nos arquivos desta fatia. `build` compila o App Router; a home placeholder segue no bundle. Não rode `npm install`. Este módulo tem `server-only` — o bundler do Next não pode puxá-lo para o client; o `build` quebra se algum `"use client"` o importar. **Ninguém desta fatia importa o service na UI.**

- [ ] **Step 6: Browser — a home ainda abre**

O mapa exige smoke mesmo em W2. CSV/mock **não** são necessários. Esta fatia não tem UI nova.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Não clique em nada que não exista: não há dashboard, lista de eventos nem cartão de risco nesta fatia.

Se não houver browser tool: **não** substitua por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto.

- [ ] **Step 7: Commit**

```bash
git add web/src/services/report/report-service.ts web/src/services/report/report-service.test.ts
git commit -m "$(cat <<'EOF'
feat(web): watch daily-report.csv for new readings

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `package.json`, `types/`, `lib/`, `parse-csv-line.ts`, `tail-report.ts`, `README.md`, `hardware/` nem o mock.

---

## Fora desta fatia (não fazer)

- SSE (`/api/stream`), hook, componentes, `dashboard.tsx`, auth, e-mail.
- Recalcular regras de risco. `fs.watch`. Singleton de watchers.
- Editar `parse-csv-line.ts`, `tail-report.ts`, `README.md`, `vitest.config.mts`, `page.tsx`.
- Instalar `server-only` ou `chokidar`.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
