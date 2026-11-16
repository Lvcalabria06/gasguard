# Parser CSV do web (`services/report`) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as duas funções puras que o report-service (W2) vai usar — linha CSV em português → `Reading` em inglês, e leitura por offset com truncamento e meia-linha — com teste ao lado e sem abrir arquivo, sem logar e sem recalcular risco.

**Architecture:** Dois arquivos em `web/src/services/report/`. `parseCsvLine` só conhece as 17 colunas em português e devolve `Reading` ou `null`. `readNewLines` não sabe português: recebe o arquivo já como `string`, devolve linhas cruas e o novo offset. Sem barrel, sem `fs`, sem `report-service.ts`. Os dois começam com `import "server-only";`. Os testes mockam esse módulo porque o Vitest (ambiente `node`) não recebe o alias que o bundler do Next aplica.

**Tech Stack:** TypeScript 5 (`strict`), Vitest 5.1.0 ambiente `node`, Next.js 16.4.6 só para o smoke da home. Sem jsdom, sem Testing Library, sem pacote novo, sem parser CSV de biblioteca — `split(",")`.

**Spec:** fatia W1b + Contratos congelados CSV + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Regras de campo em [`docs/csv-contract.md`](../../csv-contract.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-csv-parse` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-csv-parse`.
- Baseline: em `web/`, `npm test` já passou (lib W1a + `risk-level`). Não edite `web/src/lib/**` nem `web/src/types/**`.
- `web/src/services/report/` só tem `README.md` (placeholder da Etapa 3). Não existe `parse-csv-line.ts`, `tail-report.ts` nem `report-service.ts`.
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.**
- `server-only` não está no `package.json`. O Next o resolve no build; o Vitest não. Cada `*.test.ts` desta fatia começa com `vi.mock("server-only", () => ({}));` — não altere `vitest.config.mts`.

## Arquivos (decomposição)

```
web/src/services/report/
├── README.md                 [T2] lista parse + tail; report-service continua W2
├── parse-csv-line.ts         [T1] parseCsvLine
├── parse-csv-line.test.ts    [T1]
├── tail-report.ts            [T2] TailSnapshot, readNewLines
└── tail-report.test.ts       [T2]
```

Nada fora desta lista. Sem `index.ts`. Sem `report-service.ts`. Sem helper extra (`parse-hora.ts`, `csv-fields.ts`). Fixtures de CSV / `Reading` **dentro** do próprio `*.test.ts`.

## Global Constraints

- **Owns:** só `web/src/services/report/parse-csv-line.ts`, `tail-report.ts`, os dois `*.test.ts` ao lado, e `web/src/services/report/README.md`. Precisou de outro arquivo → parar.
- **Assinaturas congeladas:** copiar o bloco CSV (W1b) do mapa. Não renomear, não acrescentar parâmetro, não exportar type guard, constantes de coluna nem barrel.
- **Só este diretório conhece português.** `nivel`, `fogao`, `placa`, `ATENCAO` vivem em `parse-csv-line.ts`. `tail-report.ts` fala `content` / `lines` / `size`. O restante do web continua em inglês.
- **Não recalcula risco.** O parser traduz `nivel` e `cenario`; não infere nível a partir de MQ-6/chama.
- **Não loga.** Linha ruim → `null`. Arquivo inválido / `console.error` é W2.
- **Não lê disco.** `readNewLines(content: string, previousSize: number)`. Quem faz `fs.readFile` é W2.
- **Camadas:** kebab-case; `import "server-only";` na primeira linha dos dois módulos; imports `@/types` e `@/services/report/...` nos testes. `services/` não importa `hooks/` nem `components/`. Não importa `lib/` nesta fatia (não precisa).
- **Não instalar pacote.** Sem `shadcn add`. Sem jsdom novo. Sem `papaparse`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `vitest.config.mts`, `package.json`.
- **Idioma:** identificadores exportados em inglês; este plano em pt-BR; UI intocada (continua pt-BR).
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** parse PT→EN; linha ruim = `null`; truncamento; meia linha; `npm test` / `lint` / `build`; home ainda abre.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá as assinaturas e os exemplos. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **`parseCsvLine` não recebe o arquivo.** Só uma linha de dados (sem `\n` no fim) e a `date` (`AAAA-MM-DD`) que W2 já tirou da linha 1. `timestamp` = `` `${date}T${hora}` ``, sem `Z` e sem offset.
2. **17 campos, `split(",")`, sem trim.** Espaço, aspas, BOM ou `\r` no campo invalidam a linha. Cabeçalho e linha `data,...` têm ≠ 17 campos úteis — devolvem `null` se alguém os passar aqui.
3. **`nivel` desconhecido (inclui os nomes em inglês `ATTENTION` / `ALERT` / `HIGH` / `CRITICAL` / `FAILURE`, e qualquer minúscula) → `null`.** `NORMAL` é igual em PT e EN e passa. Tabela fechada: `NORMAL`→`NORMAL`, `ATENCAO`→`ATTENTION`, `ALERTA`→`ALERT`, `ALTO`→`HIGH`, `CRITICO`→`CRITICAL`, `FALHA`→`FAILURE`.
4. **`origem` só `placa`→`board` e `mock`→`mock`.** `board` no CSV → `null`.
5. **Tipo inválido → `null`, sem throw.** Inteiro = `/^-?\d+$/` (`cenario`) ou `/^\d+$/` (ADC, `seg_sem_movimento`). Flag = `0`\|`1`. `mq6_nivel` / `mq2_nivel` = `0`\|`1`\|`2`. Decimal = `/^-?\d+(?:\.\d+)?$/` (ponto, nunca vírgula). `hora` = `HH:MM:SS` com `HH` 00–23 e MM/SS 00–59. `date` = `/^\d{4}-\d{2}-\d{2}$/`.
6. **Sem faixa 0–4095 e sem faixa 0–17.** `cenario` `18` ou `-1` ainda vira `Reading` (`scenarioId` preservado; W1a mostra “Cenário desconhecido”). ADC negativo é tipo inválido (`/^\d+$/`).
7. **`temp` / `temp_limite` vazios → `null` no objeto.** `"0"` e `"0.0"` são `0`, não `null`. Os dois campos são independentes (temp vazia + limite preenchido é o exemplo FALHA do contrato).
8. **`readNewLines` mede `content.length` (string), não bytes.** O CSV é ASCII; W2 passa texto UTF-8, não `Buffer`. `size` = índice logo após o último `\n` **consumido**.
9. **Meia-linha:** o trecho depois do último `\n` do slice não entra em `lines` e não entra em `size`. A próxima chamada, com o `\n` já gravado, devolve essa linha.
10. **Começo de arquivo (`previousSize === 0` ou `content.length < previousSize`):** relê do byte 0, **pula as 2 primeiras linhas completas** (data + cabeçalho), devolve só linhas de dados completas. `truncated` é `true` **somente** quando `content.length < previousSize`. Com menos de 2 linhas completas, `lines: []` e `size: 0` (não avança: a linha 2 ainda pode estar incompleta).
11. **Append (`previousSize > 0` e arquivo não encolheu):** `content.slice(previousSize)`, sem pular cabeçalho. W2 sempre devolve `snapshot.size` da chamada anterior.
12. **Os testes mockam `server-only`.** Não instale o pacote. Não edite o Vitest config.

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, quebram o SSE/W2 sem o implementer perceber:

1. **Os seis `nivel` PT→EN, e um nome em inglês no CSV.** `ATENCAO`→`ATTENTION`; `CRITICO`→`CRITICAL`; `FALHA`→`FAILURE`; `ATTENTION` no CSV → `null`. Task 1.
2. **`temp` vazio vs `"0.0"`.** Vazio → `celsius: null`; `"0.0"` → `0`. `temp_limite` idem, independente. Task 1.
3. **≠ 17 campos, inclusive vírgula a mais no fim.** `"...,42,"` tem 18 campos → `null`. 16 campos → `null`. Task 1.
4. **Meia-linha:** fragmento sem `\n` fora de `lines`; `size` parado no último `\n`; a chamada seguinte, já com `\n`, devolve a linha. Task 2.
5. **Truncamento e cold start.** Arquivo menor → `truncated: true`, linhas 1–2 não saem como dados. `previousSize === 0` também pula o cabeçalho, mas com `truncated: false`. Task 2.

---

### Task 1: `parseCsvLine` (PT → `Reading` | `null`)

**Files:**
- Create: `web/src/services/report/parse-csv-line.test.ts`
- Create: `web/src/services/report/parse-csv-line.ts`

**Interfaces:**
- Consumes: `Reading`, `ReadingSource`, `RiskLevel`, `GasLevel` de `@/types` (W0, congelados). Contrato de colunas em [`docs/csv-contract.md`](../../csv-contract.md). Não leia `hardware/` nem o mock.
- Produces: `export function parseCsvLine(line: string, date: string): Reading | null`

Linha válida vira `Reading` em inglês. Qualquer falha de forma/tipo/enum vira `null`. Não loga. Não throw.

- [ ] **Step 1: Write the failing test**

Crie `web/src/services/report/parse-csv-line.test.ts` inteiro:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseCsvLine } from "@/services/report/parse-csv-line";
import type { Reading, RiskLevel } from "@/types";

const DATE = "2026-11-10";

function csvLine(
  overrides: Partial<{
    hora: string;
    origem: string;
    nivel: string;
    cenario: string;
    mq6: string;
    mq6_base: string;
    mq6_nivel: string;
    mq2: string;
    mq2_base: string;
    mq2_nivel: string;
    chama: string;
    temp: string;
    temp_limite: string;
    temp_alta: string;
    movimento: string;
    fogao: string;
    seg_sem_movimento: string;
  }> = {},
): string {
  const row = {
    hora: "14:32:08",
    origem: "placa",
    nivel: "CRITICO",
    cenario: "1",
    mq6: "1120",
    mq6_base: "290",
    mq6_nivel: "2",
    mq2: "1350",
    mq2_base: "900",
    mq2_nivel: "1",
    chama: "1",
    temp: "29.1",
    temp_limite: "28.4",
    temp_alta: "1",
    movimento: "0",
    fogao: "1",
    seg_sem_movimento: "42",
    ...overrides,
  };
  return [
    row.hora,
    row.origem,
    row.nivel,
    row.cenario,
    row.mq6,
    row.mq6_base,
    row.mq6_nivel,
    row.mq2,
    row.mq2_base,
    row.mq2_nivel,
    row.chama,
    row.temp,
    row.temp_limite,
    row.temp_alta,
    row.movimento,
    row.fogao,
    row.seg_sem_movimento,
  ].join(",");
}

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

describe("parseCsvLine", () => {
  it("translates the csv-contract example into Reading", () => {
    expect(parseCsvLine(csvLine(), DATE)).toEqual(CONTRACT_READING);
  });

  it("maps every Portuguese nivel to English", () => {
    const levels: [string, RiskLevel][] = [
      ["NORMAL", "NORMAL"],
      ["ATENCAO", "ATTENTION"],
      ["ALERTA", "ALERT"],
      ["ALTO", "HIGH"],
      ["CRITICO", "CRITICAL"],
      ["FALHA", "FAILURE"],
    ];
    for (const [csv, level] of levels) {
      expect(parseCsvLine(csvLine({ nivel: csv }), DATE)?.level).toBe(level);
    }
  });

  it("maps origem placa to board and mock to mock", () => {
    expect(parseCsvLine(csvLine({ origem: "placa" }), DATE)?.source).toBe("board");
    expect(parseCsvLine(csvLine({ origem: "mock" }), DATE)?.source).toBe("mock");
  });

  it("builds a timezone-free timestamp from date + hora", () => {
    expect(parseCsvLine(csvLine({ hora: "00:00:00" }), "2026-01-02")?.timestamp).toBe(
      "2026-01-02T00:00:00",
    );
  });

  it("treats empty temp and temp_limite as null, and 0.0 as zero", () => {
    expect(
      parseCsvLine(csvLine({ temp: "", temp_limite: "28.4", temp_alta: "0" }), DATE)
        ?.temperature,
    ).toEqual({ celsius: null, limit: 28.4, high: false });
    expect(
      parseCsvLine(csvLine({ temp: "26.4", temp_limite: "" }), DATE)?.temperature,
    ).toEqual({ celsius: 26.4, limit: null, high: true });
    expect(
      parseCsvLine(csvLine({ temp: "0.0", temp_limite: "0" }), DATE)?.temperature,
    ).toEqual({ celsius: 0, limit: 0, high: true });
  });

  it("keeps scenarioId even when it is outside 0–17", () => {
    expect(parseCsvLine(csvLine({ cenario: "18" }), DATE)?.scenarioId).toBe(18);
    expect(parseCsvLine(csvLine({ cenario: "-1" }), DATE)?.scenarioId).toBe(-1);
  });

  it("returns null when the line does not have 17 fields", () => {
    expect(parseCsvLine("14:32:08,placa,CRITICO", DATE)).toBeNull();
    expect(parseCsvLine(`${csvLine()},`, DATE)).toBeNull();
    expect(parseCsvLine("", DATE)).toBeNull();
  });

  it("returns null for unknown nivel, origem, or English level names", () => {
    for (const nivel of ["ATTENTION", "ALERT", "HIGH", "CRITICAL", "FAILURE", "critico", ""]) {
      expect(parseCsvLine(csvLine({ nivel }), DATE)).toBeNull();
    }
    expect(parseCsvLine(csvLine({ origem: "board" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ origem: " placa" }), DATE)).toBeNull();
  });

  it("returns null for invalid field types", () => {
    expect(parseCsvLine(csvLine({ mq6: "1120.5" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ mq6: "-1" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ mq6_nivel: "3" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ chama: "2" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ temp: "26." }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ temp: "1e2" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ fogao: "" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ seg_sem_movimento: "-1" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ cenario: "1.0" }), DATE)).toBeNull();
  });

  it("returns null when date or hora is malformed", () => {
    expect(parseCsvLine(csvLine(), "2026/11/10")).toBeNull();
    expect(parseCsvLine(csvLine(), "")).toBeNull();
    expect(parseCsvLine(csvLine({ hora: "14:32" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ hora: "24:00:00" }), DATE)).toBeNull();
    expect(parseCsvLine(csvLine({ hora: "14:60:00" }), DATE)).toBeNull();
  });
});
```

O `vi.mock("server-only", () => ({}))` precisa existir **antes** do import do módulo (o Vitest içará o `vi.mock`; deixe-o no topo mesmo assim). Não importe `lib/`. Não leia `daily-report.csv` do disco.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/services/report/parse-csv-line.test.ts
```

Expected: FAIL. Mensagem no espírito de `Cannot find module '@/services/report/parse-csv-line'` (ou `parseCsvLine is not a function` se o arquivo existir vazio). Se passar, o Step 1 não foi feito — não avance.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/services/report/parse-csv-line.ts` inteiro. Primeira linha: `import "server-only";`. Tabelas com `Object.hasOwn` (não use `in` — pega `toString` do protótipo). Sem `console`. Sem `fs`. Sem faixa 0–4095 / 0–17.

```ts
import "server-only";

import type { GasLevel, Reading, ReadingSource, RiskLevel } from "@/types";

const SOURCE_BY_CSV = {
  placa: "board",
  mock: "mock",
} as const satisfies Record<string, ReadingSource>;

const LEVEL_BY_CSV = {
  NORMAL: "NORMAL",
  ATENCAO: "ATTENTION",
  ALERTA: "ALERT",
  ALTO: "HIGH",
  CRITICO: "CRITICAL",
  FALHA: "FAILURE",
} as const satisfies Record<string, RiskLevel>;

function parseSource(raw: string): ReadingSource | null {
  if (!Object.hasOwn(SOURCE_BY_CSV, raw)) return null;
  return SOURCE_BY_CSV[raw as keyof typeof SOURCE_BY_CSV];
}

function parseLevel(raw: string): RiskLevel | null {
  if (!Object.hasOwn(LEVEL_BY_CSV, raw)) return null;
  return LEVEL_BY_CSV[raw as keyof typeof LEVEL_BY_CSV];
}

function parseInteger(raw: string): number | null {
  if (!/^-?\d+$/.test(raw)) return null;
  return Number(raw);
}

function parseNonNegativeInteger(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function parseFlag(raw: string): boolean | null {
  if (raw === "0") return false;
  if (raw === "1") return true;
  return null;
}

function parseGasLevel(raw: string): GasLevel | null {
  if (raw === "0" || raw === "1" || raw === "2") return Number(raw) as GasLevel;
  return null;
}

function parseDecimal(raw: string): number | null {
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return null;
  return Number(raw);
}

function parseOptionalDecimal(raw: string): number | null | undefined {
  if (raw === "") return null;
  const value = parseDecimal(raw);
  return value === null ? undefined : value;
}

function parseHora(raw: string): string | null {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return raw;
}

export function parseCsvLine(line: string, date: string): Reading | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const fields = line.split(",");
  if (fields.length !== 17) return null;

  const hora = parseHora(fields[0]);
  const source = parseSource(fields[1]);
  const level = parseLevel(fields[2]);
  const scenarioId = parseInteger(fields[3]);
  const mq6Value = parseNonNegativeInteger(fields[4]);
  const mq6Base = parseNonNegativeInteger(fields[5]);
  const mq6Level = parseGasLevel(fields[6]);
  const mq2Value = parseNonNegativeInteger(fields[7]);
  const mq2Base = parseNonNegativeInteger(fields[8]);
  const mq2Level = parseGasLevel(fields[9]);
  const flame = parseFlag(fields[10]);
  const celsius = parseOptionalDecimal(fields[11]);
  const limit = parseOptionalDecimal(fields[12]);
  const high = parseFlag(fields[13]);
  const motion = parseFlag(fields[14]);
  const stoveOn = parseFlag(fields[15]);
  const secondsWithoutMotion = parseNonNegativeInteger(fields[16]);

  if (
    hora === null ||
    source === null ||
    level === null ||
    scenarioId === null ||
    mq6Value === null ||
    mq6Base === null ||
    mq6Level === null ||
    mq2Value === null ||
    mq2Base === null ||
    mq2Level === null ||
    flame === null ||
    celsius === undefined ||
    limit === undefined ||
    high === null ||
    motion === null ||
    stoveOn === null ||
    secondsWithoutMotion === null
  ) {
    return null;
  }

  return {
    timestamp: `${date}T${hora}`,
    source,
    level,
    scenarioId,
    mq6: { value: mq6Value, base: mq6Base, level: mq6Level },
    mq2: { value: mq2Value, base: mq2Base, level: mq2Level },
    flame,
    temperature: { celsius, limit, high },
    motion,
    stoveOn,
    secondsWithoutMotion,
  };
}
```

`parseOptionalDecimal` usa `undefined` só como sentinela de “string inválida”, para não colidir com `null` (vazio) nem com `0`. Não exporte essa função. Não exporte as tabelas.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/services/report/parse-csv-line.test.ts
```

Expected: PASS (1 `describe`, 10 `it`).

- [ ] **Step 5: Commit**

```bash
git add web/src/services/report/parse-csv-line.ts web/src/services/report/parse-csv-line.test.ts
git commit -m "$(cat <<'EOF'
feat(web): parse CSV lines into English Reading

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos.

---

### Task 2: `readNewLines` (offset, meia-linha, truncamento)

**Files:**
- Create: `web/src/services/report/tail-report.test.ts`
- Create: `web/src/services/report/tail-report.ts`
- Modify: `web/src/services/report/README.md`

**Interfaces:**
- Consumes: nada de `parseCsvLine`. O tail devolve strings cruas; W2 é quem chama o parser.
- Produces:
  - `export interface TailSnapshot { size: number; truncated: boolean; lines: string[] }`
  - `export function readNewLines(content: string, previousSize: number): TailSnapshot`

- [ ] **Step 1: Write the failing test**

Crie `web/src/services/report/tail-report.test.ts` inteiro:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readNewLines } from "@/services/report/tail-report";

const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";

const LINE_A =
  "14:32:08,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42";
const LINE_B =
  "14:32:09,placa,CRITICO,1,1118,290,2,1342,900,1,1,29.1,28.4,1,0,1,43";
const LINE_C =
  "14:32:10,placa,FALHA,16,300,290,0,910,900,0,0,,28.4,0,1,0,0";

function report(dataLines: string[], incomplete = ""): string {
  return ["data,2026-11-10", HEADER, ...dataLines].join("\n") + "\n" + incomplete;
}

describe("readNewLines", () => {
  it("skips the date and header lines on a cold start", () => {
    const content = report([LINE_A, LINE_B]);
    const snapshot = readNewLines(content, 0);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_A, LINE_B]);
    expect(snapshot.size).toBe(content.length);
    expect(snapshot.lines.some((line) => line.startsWith("data,"))).toBe(false);
    expect(snapshot.lines).not.toContain(HEADER);
  });

  it("leaves a trailing fragment without newline out of lines and size", () => {
    const content = report([LINE_A], LINE_B);
    const snapshot = readNewLines(content, 0);
    expect(snapshot.lines).toEqual([LINE_A]);
    expect(snapshot.size).toBe(content.length - LINE_B.length);
    expect(content.slice(snapshot.size)).toBe(LINE_B);
  });

  it("returns only the bytes appended since previousSize", () => {
    const first = report([LINE_A]);
    const start = readNewLines(first, 0);
    const second = report([LINE_A, LINE_B]);
    const snapshot = readNewLines(second, start.size);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_B]);
    expect(snapshot.size).toBe(second.length);
  });

  it("completes a previous half-line on the next call", () => {
    const partial = report([LINE_A], LINE_B);
    const waiting = readNewLines(partial, 0);
    const complete = report([LINE_A, LINE_B]);
    const snapshot = readNewLines(complete, waiting.size);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_B]);
    expect(snapshot.size).toBe(complete.length);
  });

  it("rereads from the start and sets truncated when the content shrinks", () => {
    const previous = report([LINE_A, LINE_B, LINE_C]);
    const seeded = readNewLines(previous, 0);
    const rotated = ["data,2026-11-11", HEADER, LINE_A].join("\n") + "\n";
    expect(rotated.length).toBeLessThan(previous.length);
    const snapshot = readNewLines(rotated, seeded.size);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.lines).toEqual([LINE_A]);
    expect(snapshot.size).toBe(rotated.length);
    expect(snapshot.lines).not.toContain(HEADER);
  });

  it("does not advance size until both header lines are complete", () => {
    const onlyDate = "data,2026-11-10\n";
    const waiting = readNewLines(onlyDate, 0);
    expect(waiting).toEqual({ size: 0, truncated: false, lines: [] });

    const headersOnly = ["data,2026-11-10", HEADER].join("\n") + "\n";
    const headers = readNewLines(headersOnly, 0);
    expect(headers.truncated).toBe(false);
    expect(headers.lines).toEqual([]);
    expect(headers.size).toBe(headersOnly.length);

    const withData = report([LINE_A]);
    const snapshot = readNewLines(withData, headers.size);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_A]);
  });

  it("returns no lines when previousSize equals content.length", () => {
    const content = report([LINE_A]);
    const snapshot = readNewLines(content, content.length);
    expect(snapshot).toEqual({
      size: content.length,
      truncated: false,
      lines: [],
    });
  });
});
```

Não importe `parseCsvLine` neste arquivo. O tail não traduz colunas.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/services/report/tail-report.test.ts
```

Expected: FAIL. Mensagem no espírito de `Cannot find module '@/services/report/tail-report'`. Se passar, o Step 1 não foi feito — não avance.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/services/report/tail-report.ts` inteiro. Sem português. Sem `fs`. `size` é `string.length`.

```ts
import "server-only";

export interface TailSnapshot {
  size: number;
  truncated: boolean;
  lines: string[];
}

function takeCompleteLines(chunk: string): { lines: string[]; consumed: number } {
  const lastNewline = chunk.lastIndexOf("\n");
  if (lastNewline === -1) return { lines: [], consumed: 0 };
  return {
    lines: chunk.slice(0, lastNewline).split("\n"),
    consumed: lastNewline + 1,
  };
}

export function readNewLines(content: string, previousSize: number): TailSnapshot {
  const truncated = content.length < previousSize;
  const fromStart = truncated || previousSize === 0;

  if (fromStart) {
    const { lines, consumed } = takeCompleteLines(content);
    if (lines.length < 2) {
      return { size: 0, truncated, lines: [] };
    }
    return {
      size: consumed,
      truncated,
      lines: lines.slice(2),
    };
  }

  const { lines, consumed } = takeCompleteLines(content.slice(previousSize));
  return {
    size: previousSize + consumed,
    truncated: false,
    lines,
  };
}
```

O `2` é a linha `data,AAAA-MM-DD` + o cabeçalho das 17 colunas. Não valide o texto dessas duas linhas — isso é W2.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/services/report/tail-report.test.ts
```

Expected: PASS (1 `describe`, 7 `it`).

- [ ] **Step 5: Atualizar o README da pasta**

Substitua `web/src/services/report/README.md` inteiro por:

```md
# services/report

A **única** parte do web que conhece o CSV em português ([docs/csv-contract.md](../../../../docs/csv-contract.md)). Converte cada linha para `Reading` (inglês). Nada sai daqui com nomes em português.

| Arquivo | Exporta |
|---|---|
| `parse-csv-line.ts` | `parseCsvLine(line, date)` — 17 campos PT → `Reading`; inválida → `null` |
| `tail-report.ts` | `readNewLines(content, previousSize)` — linhas novas por offset; arquivo menor → `truncated` |
| `report-service.ts` | W2 — `getRecentReadings()`, `watchReadings()` |

Todo arquivo começa com `import "server-only";`. Só este diretório importa colunas em português. Linha ruim → `null` (quem loga é o service, W2). `tail-report` não lê disco: recebe o conteúdo já em `string`.

- Pode importar: `lib/`, `types/`, `node:*`.
- Não pode: React, `hooks/`, `components/`.

Regras de camadas: [docs/architecture.md](../../../../docs/architecture.md#camadas-do-web).
```

Não crie `services/report/index.ts`. Não edite `web/src/services/README.md`.

- [ ] **Step 6: test + lint + build (Done when)**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: os três com exit 0. `npm test` inclui `lib/` (W1a) + os dois arquivos novos. `lint` sem aviso nos arquivos desta fatia. `build` compila o App Router; a home placeholder segue no bundle. Não rode `npm install`.

- [ ] **Step 7: Browser — a home ainda abre**

O mapa exige smoke mesmo em W1b. CSV/mock **não** são necessários. Esta fatia não tem UI nova.

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
git add web/src/services/report/tail-report.ts web/src/services/report/tail-report.test.ts web/src/services/report/README.md
git commit -m "$(cat <<'EOF'
feat(web): tail daily-report by offset

EOF
)"
```

Expected: o commit contém **somente** esses 3 arquivos. `git status` limpo em `web/src/`. Diff da fatia (plano + Owns) não inclui `page.tsx`, `package.json`, `types/`, `lib/`, `report-service.ts` nem `hardware/`.

---

## Fora desta fatia (não fazer)

- `report-service.ts`, `getRecentReadings`, `watchReadings`, `fs` / `node:fs`.
- SSE, hook, componentes, `dashboard.tsx`, auth, e-mail.
- Recalcular regras de risco. Logar linha ruim.
- Validar linha 1 (`data,AAAA-MM-DD`) e linha 2 (cabeçalho) — W2 trata arquivo inválido como `null`.
- Instalar `server-only` ou alterar `vitest.config.mts`.
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
