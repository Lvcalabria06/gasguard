# Fundação do monorepo GasGuard — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o repositório PlatformIO em um monorepo `hardware/` + `web/`, com documentação, simulador de CSV funcionando e esqueleto do Next.js compilando e testando.

**Architecture:** O firmware é movido sem alteração para `hardware/`. Na raiz ficam o simulador `mock-daily-report.js` (Node puro), que grava `daily-report.csv` no formato do contrato, e a documentação. `web/` é um Next.js 16 com as pastas das camadas (`domain` → `lib/report` → `app/api` → `hooks` → `components`) e os tipos de domínio, ainda sem lógica de leitura.

**Tech Stack:** Node ≥ 20.9 (`node:test`, `node:fs`), Next.js 16.4.6, TypeScript, Tailwind CSS 4, shadcn 4.23.0, Recharts 3.10.1, Vitest 5.1.0, npm, PlatformIO (só movido).

**Spec:** [`docs/superpowers/specs/2026-11-10-monorepo-foundation-design.md`](../specs/2026-11-10-monorepo-foundation-design.md). Leia junto com [`docs/csv-contract.md`](../../csv-contract.md) e [`docs/architecture.md`](../../architecture.md).

## Estado inicial (o que já existe quando este plano começa)

- Branch atual: `refactor/monorepo-structure`, criada a partir de `main`.
- **Commitado na raiz** (projeto PlatformIO): `.gitignore`, `.vscode/extensions.json`, `README.md`, `include/README`, `lib/README`, `platformio.ini`, `src/main.cpp`, `test/README`.
- **Escrito, mas ainda NÃO commitado:** `AGENTS.md`, `CLAUDE.md` e toda a pasta `docs/`, incluindo este plano e a spec. **Não mova nem apague esses arquivos.**
- `.claude/` é local, ignorado pelo git. Não toque nele.
- O PlatformIO CLI (`pio`) pode não estar instalado. Os passos que dependem dele são opcionais e estão marcados assim.

## Mapa de pastas (estado final deste plano)

`[T#]` = a task que cria ou move o item. `(futuro)` = previsto no roadmap, **não** criar agora.

```
gasguard/
├── AGENTS.md                         [já existe] contexto para agentes
├── CLAUDE.md                         [já existe] "@AGENTS.md"
├── README.md                         [T2] visão do monorepo e como rodar
├── .gitignore                        [T2] reescrito
├── gasguard.code-workspace           [T2] VS Code multi-root (hardware, web, raiz)
├── daily-report.csv                  gerado pelo mock ou pela placa, ignorado no git
├── mock-daily-report.js              [T3, T4] simulador (CommonJS, sem dependências)
├── mock-daily-report.test.js         [T3, T4] testes node:test
├── docs/                             [já existe, commit em T2]
│   ├── README.md · overview.md · architecture.md · csv-contract.md
│   ├── scenarios.md · decisions.md · roadmap.md
│   └── superpowers/
│       ├── specs/2026-11-10-monorepo-foundation-design.md
│       └── plans/2026-11-10-monorepo-foundation.md   (este arquivo)
├── hardware/                         [T1] projeto PlatformIO movido sem alteração
│   ├── platformio.ini
│   ├── README.md                     [T1 move, T2 corrige os links]
│   ├── .vscode/extensions.json
│   ├── src/main.cpp
│   ├── include/README · lib/README · test/README
│   └── monitor/filter_gasguard.py    (futuro, Etapa 2)
└── web/                              [T5] create-next-app
    ├── AGENTS.md                     [T5] gerado pelo create-next-app (manter)
    ├── package.json                  [T5, T6] scripts dev/start/test
    ├── next.config.ts                [T5] allowedDevOrigins
    ├── vitest.config.mts             [T6]
    ├── components.json               [T5] shadcn
    ├── .env.example                  [T5] DAILY_REPORT_PATH
    ├── .gitignore                    [T5] gerado, mais a linha !.env.example
    └── src/
        ├── app/
        │   ├── layout.tsx            [T5] lang pt-BR e metadata
        │   ├── page.tsx              [T5] placeholder
        │   ├── globals.css           [T5] gerado e alterado pelo shadcn
        │   └── api/README.md         [T6] camada de transporte (rotas: futuro, Etapa 3)
        ├── domain/                   [T6]
        │   ├── README.md
        │   ├── risk-level.ts · risk-level.test.ts
        │   ├── reading.ts · report-event.ts · index.ts
        ├── lib/
        │   ├── utils.ts              [T5] cn() do shadcn
        │   └── report/README.md      [T6] camada de leitura do CSV (código: futuro, Etapa 3)
        ├── hooks/README.md           [T6] (useReadings: futuro, Etapa 3)
        └── components/
            ├── README.md             [T6]
            └── ui/                   shadcn (componentes adicionados na Etapa 4)
```

## Global Constraints

- **Não alterar o conteúdo** de `src/main.cpp` nem de `platformio.ini`. Esses arquivos só mudam de lugar.
- **Idioma:** identificadores do mock e do web em **inglês**; textos de UI, mensagens de CLI e documentação em **pt-BR**; colunas e valores do CSV em **português** (contrato).
- Cabeçalho do CSV, exatamente: `hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento`
- Linha 1 do CSV: `data,AAAA-MM-DD` (data local). Quebra de linha `\n`, UTF-8 sem BOM, sem aspas.
- Valores de `nivel`: `NORMAL`, `ATENCAO`, `ALERTA`, `ALTO`, `CRITICO`, `FALHA`. Valores de `origem`: `placa`, `mock` (o mock sempre grava `mock`).
- O mock **não tem dependências**: só módulos `node:*`, em CommonJS.
- Versões fixas: `create-next-app@16.4.6`, `shadcn@4.23.0`, `recharts@3.10.1`, `vitest@5.1.0`. Gerenciador: **npm**.
- Texto do rodapé (copiar exatamente): `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
- Commits no padrão Conventional Commits, um por task, ou mais quando a task pedir. Siga as instruções de atribuição de commit da sua sessão.
- Testes do mock: `node --test mock-daily-report.test.js`. **Não** rode `node --test` sem argumento na raiz: o Node 24 também pegaria os `.ts` do web.

## Review Focus

1. **Virada da meia-noite com o mock rodando:** a 1ª linha depois de 00:00 deve recriar o arquivo com a nova data. Teste em T4 (`writeReading rolls over at midnight`).
2. **CSV apagado (ou esvaziado) com o mock rodando:** o próximo tick recria o arquivo com a data e o cabeçalho, sem travar. Testes em T4 (`recreates a file deleted while running`, `recreates an empty file`).
3. **Arquivo corrompido ou de outro formato no caminho:** uma 1ª linha que não é `data,<hoje>` faz o arquivo ser recriado, nunca somado. Teste em T4 (`recreates a file whose first line is not a date line`).
4. **`.env.example` ignorado sem querer:** o `.gitignore` gerado pelo Next contém `.env*`, então o exemplo sumiria do repo. Verificação em T5 (`git check-ignore` precisa falhar).
5. **Argumentos inválidos no mock** (`--interval 50`, cenário inexistente, opção desconhecida, valor faltando): mensagem clara em pt-BR e exit 1, nunca um loop rodando com valor errado. Testes em T4 (`parseArgs rejects ...`).

---

### Task 1: Mover o firmware para `hardware/`

**Files:**
- Move: `platformio.ini`, `README.md`, `src/`, `include/`, `lib/`, `test/`, `.vscode/` → `hardware/`

**Interfaces:**
- Consumes: nada.
- Produces: `hardware/` como projeto PlatformIO autocontido. As tasks seguintes se referem a `hardware/README.md` e a `hardware/src/main.cpp`.

- [ ] **Step 1: Mover com `git mv`** (só arquivos versionados; `docs/`, `AGENTS.md`, `CLAUDE.md` e `.claude/` ficam na raiz)

```bash
mkdir hardware
git mv platformio.ini README.md src include lib test .vscode hardware/
```

- [ ] **Step 2: Verificar que foi só renomeação**

Run: `git status --short`
Expected: apenas linhas `R  <antigo> -> hardware/<antigo>` para os 8 arquivos versionados, mais `?? AGENTS.md`, `?? CLAUDE.md` e `?? docs/`. Nenhum `M`.

- [ ] **Step 3 (opcional, só se `pio` existir): compilar o firmware**

Run: `pio run -d hardware`
Expected: `SUCCESS`. Se `pio` não existir, pule.

- [ ] **Step 4: Commit (só a movimentação)**

```bash
git commit -m "refactor: move PlatformIO firmware into hardware/"
```

Expected: `git show --stat -M HEAD` lista 8 renomeações com `0` linhas alteradas, por exemplo `{src => hardware/src}/main.cpp | 0`.

---

### Task 2: Arquivos da raiz e documentação

**Files:**
- Modify: `hardware/README.md` (3 trechos)
- Create: `README.md`, `gasguard.code-workspace`
- Rewrite: `.gitignore`
- Add (já existem): `AGENTS.md`, `CLAUDE.md`, `docs/**`

**Interfaces:**
- Consumes: `hardware/` (Task 1).
- Produces: `.gitignore` que ignora `daily-report.csv`. As Tasks 4 e 7 dependem disso.

- [ ] **Step 1: Corrigir o passo a passo em `hardware/README.md`**

Substitua a linha:
```
1. No VS Code, abra **a pasta que contém o `platformio.ini`**.
```
por:
```
1. No VS Code, abra o arquivo **`gasguard.code-workspace`** da raiz do repositório (ou abra só a pasta **`hardware/`**). O PlatformIO precisa enxergar o `platformio.ini`.
```

- [ ] **Step 2: Corrigir o link quebrado em `hardware/README.md`**

Substitua a linha:
```
A especificação detalhada da etapa de dados, back-end e app está em [`docs/gasguard-fase-dados-backend-frontend.md`](docs/gasguard-fase-dados-backend-frontend.md).
```
por:
```
O formato do CSV e o que falta no firmware estão em [`docs/csv-contract.md`](../docs/csv-contract.md). As próximas etapas estão em [`docs/roadmap.md`](../docs/roadmap.md).
```

- [ ] **Step 3: Substituir a seção "Estrutura do repositório" em `hardware/README.md`**

Troque o bloco de código da seção (de ` ``` ` até ` ``` `, com a árvore `gasguard/`) por:

````
```
hardware/
├── platformio.ini      # Configuração da placa e das bibliotecas
├── src/
│   └── main.cpp        # Firmware do GasGuard
├── include/ lib/ test/ # Pastas padrão do PlatformIO
└── README.md           # Este arquivo
```

O repositório completo (app web, simulador e documentação) está descrito no [README da raiz](../README.md).
````

- [ ] **Step 4: Reescrever o `.gitignore` da raiz** (o arquivo atual começa com um BOM: substitua o arquivo inteiro, em UTF-8 sem BOM)

```gitignore
# PlatformIO
.pio/
hardware/.vscode/.browse.c_cpp.db*
hardware/.vscode/c_cpp_properties.json
hardware/.vscode/launch.json
hardware/.vscode/ipch

# Python
__pycache__/
.venv/

# Node
node_modules/

# Dados gerados em execução
daily-report.csv

# Segredos e sistema
.env
.DS_Store
```

- [ ] **Step 5: Criar `gasguard.code-workspace`**

```json
{
  "folders": [
    { "name": "hardware", "path": "hardware" },
    { "name": "web", "path": "web" },
    { "name": "gasguard (raiz)", "path": "." }
  ],
  "settings": {
    "files.exclude": { "hardware": true, "web": true }
  },
  "extensions": {
    "recommendations": [
      "platformio.platformio-ide",
      "dbaeumer.vscode-eslint",
      "bradlc.vscode-tailwindcss"
    ]
  }
}
```

- [ ] **Step 6: Criar o `README.md` da raiz** (conteúdo exato)

````markdown
# GasGuard 2.0

Monitoramento de **vazamento de gás (GLP) e risco de incêndio** na cozinha: uma ESP32 com sensores classifica o risco, e um app web mostra tudo em tempo real no navegador e no celular.

> ⚠️ **Protótipo acadêmico** — Sistemas Embarcados, CESAR School 2026. **Não é um detector certificado** e não substitui equipamentos homologados.

## Como funciona

```
hardware/ (ESP32) ──Serial──► Monitor do PlatformIO + filtro ─┐
                                                              ├─► daily-report.csv ──► web/ (Next.js) ──► navegador / celular
mock-daily-report.js (simulador, para testes) ────────────────┘
```

- A placa (ou o simulador) grava **1 linha por segundo** em `daily-report.csv`.
- O app web lê o arquivo e atualiza a tela ao vivo.
- Detalhes em [`docs/architecture.md`](docs/architecture.md).

## Estrutura

| Pasta/arquivo | O que é |
|---|---|
| [`hardware/`](hardware/) | Firmware da ESP32 (PlatformIO). Ligações e testes físicos no [README do hardware](hardware/README.md) |
| [`web/`](web/) | App Next.js, mobile-first |
| [`mock-daily-report.js`](mock-daily-report.js) | Simulador: gera leituras falsas no CSV, sem a placa |
| [`docs/`](docs/) | Decisões, contrato do CSV, roadmap e planos |

## Como rodar

Pré-requisitos: **Node ≥ 20.9** e VS Code com a extensão **PlatformIO IDE** (só para o firmware).

**Sem a placa (simulador):**

```bash
node mock-daily-report.js --scenario tour
```

Cenários: `normal`, `gas_leak`, `gas_leak_flame`, `gas_leak_heat`, `smoke`, `unattended_stove`, `sensor_failure`, `tour` (passa por todos).

**App web** (em outro terminal):

```bash
cd web
npm install
npm run dev
```

Abra `http://localhost:3000`, ou `http://<IP-do-computador>:3000` no celular, na mesma rede Wi-Fi.

**Com a placa:** abra `gasguard.code-workspace` no VS Code, faça o Upload do firmware e abra o Monitor Serial do PlatformIO. A gravação do CSV pela placa é a próxima etapa: veja [`docs/roadmap.md`](docs/roadmap.md).

## Documentação

Comece por [`docs/README.md`](docs/README.md). Para agentes de IA: [`AGENTS.md`](AGENTS.md).
````

- [ ] **Step 7: Verificar**

Run: `git status --short`
Expected: `M hardware/README.md`, `M .gitignore`, e `??` para `README.md`, `gasguard.code-workspace`, `AGENTS.md`, `CLAUDE.md` e `docs/`. Nada fora dessa lista.

Run: `grep -n "gasguard-fase" -r hardware docs README.md AGENTS.md`
Expected: nenhuma saída.

- [ ] **Step 8: Commit**

```bash
git add .gitignore README.md gasguard.code-workspace AGENTS.md CLAUDE.md docs hardware/README.md
git commit -m "docs: add monorepo docs, agent context and VS Code workspace"
```

---

### Task 3: Simulador: geração das leituras (funções puras)

**Files:**
- Create: `mock-daily-report.js`
- Test: `mock-daily-report.test.js`

**Interfaces:**
- Consumes: nada.
- Produces (via `module.exports`), usados na Task 4:
  - `COLUMNS: string[]` (17 nomes, na ordem do cabeçalho) e `HEADER_LINE: string` (`COLUMNS.join(",")`)
  - `SCENARIO_NAMES: string[]`, `TOUR: { scenario: string, seconds: number }[]`, `TOUR_TOTAL_SECONDS: number`
  - `formatDate(date: Date): string`, que retorna `"AAAA-MM-DD"` em hora local
  - `formatTime(date: Date): string`, que retorna `"HH:MM:SS"` em hora local, 24 h
  - `buildRow(scenario: string, elapsedSeconds: number, random: () => number): Row`, que lança um erro se o cenário não for concreto (inclusive `"tour"`)
  - `toCsvLine(time: string, row: Row): string`, que retorna a linha **sem** `\n`, com `origem` = `mock`
  - `tourStepAt(elapsedSeconds: number): { scenario: string, elapsedInStep: number }`
  - `Row` = objeto com as chaves `nivel, cenario, mq6, mq6_base, mq6_nivel, mq2, mq2_base, mq2_nivel, chama, temp, temp_limite, temp_alta, movimento, fogao, seg_sem_movimento`. Booleanos são `0` ou `1`. `temp` é `number | null`. `temp_limite` é `number`.

- [ ] **Step 1: Escrever os testes que falham** em `mock-daily-report.test.js`

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  COLUMNS, HEADER_LINE, SCENARIO_NAMES, TOUR, TOUR_TOTAL_SECONDS,
  formatDate, formatTime, buildRow, toCsvLine, tourStepAt,
} = require("./mock-daily-report");

const LOW = () => 0;
const MID = () => 0.5;
const HIGH = () => 0.999999;

const gasLevelFor = (delta) => (delta >= 800 ? 2 : delta >= 300 ? 1 : 0);
function assertCoherentGas(row) {
  assert.equal(row.mq6_base, 290);
  assert.equal(row.mq2_base, 900);
  assert.ok(Number.isInteger(row.mq6) && Number.isInteger(row.mq2));
  assert.equal(row.mq6_nivel, gasLevelFor(row.mq6 - row.mq6_base));
  assert.equal(row.mq2_nivel, gasLevelFor(row.mq2 - row.mq2_base));
}

test("HEADER_LINE matches the CSV contract exactly", () => {
  assert.equal(
    HEADER_LINE,
    "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento",
  );
  assert.equal(COLUMNS.length, 17);
});

test("SCENARIO_NAMES lists every scenario plus tour", () => {
  assert.deepEqual(SCENARIO_NAMES, [
    "normal", "gas_leak", "gas_leak_flame", "gas_leak_heat",
    "smoke", "unattended_stove", "sensor_failure", "tour",
  ]);
});

test("formatDate and formatTime use local time with zero padding", () => {
  const date = new Date(2026, 0, 5, 3, 4, 5);
  assert.equal(formatDate(date), "2026-01-05");
  assert.equal(formatTime(date), "03:04:05");
  assert.equal(formatDate(new Date(2026, 10, 10, 14, 32, 8)), "2026-11-10");
});

const EXPECTED = {
  normal: ["NORMAL", 0],
  gas_leak: ["ALERTA", 7],
  gas_leak_flame: ["CRITICO", 1],
  gas_leak_heat: ["ALTO", 3],
  smoke: ["ALERTA", 8],
  sensor_failure: ["FALHA", 16],
};
for (const [scenario, [nivel, cenario]] of Object.entries(EXPECTED)) {
  for (const [label, random] of [["low", LOW], ["mid", MID], ["high", HIGH]]) {
    test(`buildRow(${scenario}) is ${nivel}/${cenario} with ${label} randomness`, () => {
      const row = buildRow(scenario, 0, random);
      assert.equal(row.nivel, nivel);
      assert.equal(row.cenario, cenario);
      assertCoherentGas(row);
    });
  }
}

test("normal readings stay inside the clean-air ranges", () => {
  for (const random of [LOW, MID, HIGH]) {
    const row = buildRow("normal", 0, random);
    assert.ok(row.temp >= 25.8 && row.temp <= 26.4, `temp ${row.temp}`);
    assert.equal(row.temp_limite, 28.0);
    assert.equal(row.temp_alta, 0);
    assert.equal(row.chama, 0);
    assert.equal(row.fogao, 0);
    assert.equal(row.seg_sem_movimento, 0);
  }
  assert.equal(buildRow("normal", 0, LOW).movimento, 1);
  assert.equal(buildRow("normal", 0, HIGH).movimento, 0);
});

test("gas_leak_flame sets flame and gas_leak_heat sets high temperature", () => {
  assert.equal(buildRow("gas_leak", 0, MID).chama, 0);
  assert.equal(buildRow("gas_leak_flame", 0, MID).chama, 1);
  for (const random of [LOW, MID, HIGH]) {
    const row = buildRow("gas_leak_heat", 0, random);
    assert.ok(row.temp >= 28.6 && row.temp <= 30.0, `temp ${row.temp}`);
    assert.equal(row.temp_alta, 1);
  }
});

test("sensor_failure has no temperature", () => {
  const row = buildRow("sensor_failure", 0, MID);
  assert.equal(row.temp, null);
  assert.equal(row.temp_alta, 0);
});

test("unattended_stove escalates with the time without motion", () => {
  const cases = [
    [0, "NORMAL", 17], [29, "NORMAL", 17], [29.9, "NORMAL", 17],
    [30, "ATENCAO", 13], [59, "ATENCAO", 13],
    [60, "ALERTA", 9], [300, "ALERTA", 9],
  ];
  for (const [elapsed, nivel, cenario] of cases) {
    const row = buildRow("unattended_stove", elapsed, MID);
    assert.equal(row.nivel, nivel, `elapsed ${elapsed}`);
    assert.equal(row.cenario, cenario, `elapsed ${elapsed}`);
    assert.equal(row.seg_sem_movimento, Math.floor(elapsed));
    assert.equal(row.fogao, 1);
    assert.equal(row.chama, 1);
    assert.equal(row.movimento, 0);
  }
});

test("buildRow rejects tour and unknown scenarios", () => {
  assert.throws(() => buildRow("tour", 0, MID));
  assert.throws(() => buildRow("banana", 0, MID));
});

test("toCsvLine renders the 17 contract fields", () => {
  assert.equal(
    toCsvLine("14:32:08", buildRow("gas_leak_flame", 0, LOW)),
    "14:32:08,mock,CRITICO,1,1110,290,2,900,900,0,1,25.8,28.0,0,1,0,0",
  );
  assert.equal(
    toCsvLine("10:00:00", buildRow("sensor_failure", 0, HIGH)),
    "10:00:00,mock,FALHA,16,349,290,0,959,900,0,0,,28.0,0,0,0,0",
  );
});

test("TOUR runs every scenario and lasts 265 s", () => {
  assert.deepEqual(TOUR, [
    { scenario: "normal", seconds: 20 },
    { scenario: "gas_leak", seconds: 30 },
    { scenario: "gas_leak_flame", seconds: 30 },
    { scenario: "normal", seconds: 15 },
    { scenario: "gas_leak_heat", seconds: 30 },
    { scenario: "smoke", seconds: 30 },
    { scenario: "normal", seconds: 15 },
    { scenario: "unattended_stove", seconds: 75 },
    { scenario: "sensor_failure", seconds: 20 },
  ]);
  assert.equal(TOUR_TOTAL_SECONDS, 265);
});

test("tourStepAt maps elapsed time to the current step and loops", () => {
  const cases = [
    [0, "normal", 0], [19, "normal", 19], [19.5, "normal", 19.5],
    [20, "gas_leak", 0], [50, "gas_leak_flame", 0], [80, "normal", 0],
    [95, "gas_leak_heat", 0], [125, "smoke", 0], [155, "normal", 0],
    [170, "unattended_stove", 0], [244, "unattended_stove", 74],
    [245, "sensor_failure", 0], [264, "sensor_failure", 19],
    [265, "normal", 0], [265 + 170 + 61, "unattended_stove", 61],
  ];
  for (const [elapsed, scenario, elapsedInStep] of cases) {
    assert.deepEqual(tourStepAt(elapsed), { scenario, elapsedInStep }, `elapsed ${elapsed}`);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test mock-daily-report.test.js`
Expected: FAIL com `Cannot find module './mock-daily-report'`.

- [ ] **Step 3: Implementar as funções em `mock-daily-report.js`**

- Topo do arquivo: um comentário de 2 linhas em inglês dizendo o que o script faz e apontando para `docs/csv-contract.md`.
- Constantes: `MQ6_BASE = 290`, `MQ2_BASE = 900`, `TEMP_LIMIT = 28.0`.
- Sorteio: `randInt(random, min, maxExclusive) = min + Math.floor(random() * (maxExclusive - min))`. A temperatura é `Math.round((min + random() * (max - min)) * 10) / 10`.
- `buildRow` começa da linha "normal" (valores da tabela de cenários da spec) e aplica o que muda em cada cenário. **Ordem dos sorteios** dentro de cada chamada: mq6, mq2, temp, movimento. Os testes com `random` constante não dependem da ordem, mas fixar a ordem deixa o resultado reproduzível.
- `unattended_stove`: `seg_sem_movimento = Math.floor(elapsedSeconds)`. O nível e o cenário seguem a regra da spec: `< 30` → NORMAL/17; `< 60` → ATENCAO/13; senão ALERTA/9.
- `toCsvLine`: `temp` com `toFixed(1)`, ou `""` quando for `null`; `temp_limite` com `toFixed(1)`; os demais com `String(value)`. Prefixo `time` e `"mock"`, na ordem de `COLUMNS`.
- `tourStepAt`: `t = elapsedSeconds % TOUR_TOTAL_SECONDS`, depois percorre `TOUR` acumulando os segundos.
- Exporte tudo o que está listado em **Produces**. Ainda **não** escreva `main()`: isso fica para a Task 4.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test mock-daily-report.test.js`
Expected: PASS, todos os testes com `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add mock-daily-report.js mock-daily-report.test.js
git commit -m "feat(mock): generate coherent readings for each risk scenario"
```

---

### Task 4: Simulador: escrita do CSV, rotação e CLI

**Files:**
- Modify: `mock-daily-report.js`
- Test: `mock-daily-report.test.js` (acrescentar ao final)

**Interfaces:**
- Consumes (Task 3): `HEADER_LINE`, `SCENARIO_NAMES`, `formatDate`, `formatTime`, `buildRow`, `toCsvLine`, `tourStepAt`.
- Produces (via `module.exports`):
  - `ensureDailyFile(filePath: string, date: string): boolean`, que retorna `true` se criou ou recriou o arquivo
  - `writeReading(filePath: string, now: Date, row: Row): string`, que faz a rotação, faz o append e retorna a linha gravada (sem `\n`)
  - `parseArgs(argv: string[]): { scenario: string, intervalMs: number, output: string }`, que lança `Error` com mensagem em pt-BR
  - `main(): void`, que só roda quando `require.main === module`

- [ ] **Step 1: Escrever os testes que falham** (acrescentar ao final de `mock-daily-report.test.js`)

```js
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ensureDailyFile, writeReading, parseArgs } = require("./mock-daily-report");

function tmpCsv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gasguard-mock-"));
  return path.join(dir, "daily-report.csv");
}
const preamble = (date) => `data,${date}\n${HEADER_LINE}\n`;

test("ensureDailyFile creates the file with the date and header lines", () => {
  const file = tmpCsv();
  assert.equal(ensureDailyFile(file, "2026-11-10"), true);
  assert.equal(fs.readFileSync(file, "utf8"), preamble("2026-11-10"));
});

test("ensureDailyFile keeps today's file untouched", () => {
  const file = tmpCsv();
  ensureDailyFile(file, "2026-11-10");
  fs.appendFileSync(file, "row\n");
  assert.equal(ensureDailyFile(file, "2026-11-10"), false);
  assert.equal(fs.readFileSync(file, "utf8"), `${preamble("2026-11-10")}row\n`);
});

test("ensureDailyFile recreates the file when the date changes", () => {
  const file = tmpCsv();
  ensureDailyFile(file, "2026-11-10");
  fs.appendFileSync(file, "row\n");
  assert.equal(ensureDailyFile(file, "2026-11-11"), true);
  assert.equal(fs.readFileSync(file, "utf8"), preamble("2026-11-11"));
});

test("ensureDailyFile recreates a file whose first line is not a date line", () => {
  const file = tmpCsv();
  fs.writeFileSync(file, "garbage,1,2\nmore\n");
  assert.equal(ensureDailyFile(file, "2026-11-10"), true);
  assert.equal(fs.readFileSync(file, "utf8"), preamble("2026-11-10"));
});

test("ensureDailyFile recreates an empty file", () => {
  const file = tmpCsv();
  fs.writeFileSync(file, "");
  assert.equal(ensureDailyFile(file, "2026-11-10"), true);
  assert.equal(fs.readFileSync(file, "utf8"), preamble("2026-11-10"));
});

test("writeReading appends one complete line", () => {
  const file = tmpCsv();
  const line = writeReading(file, new Date(2026, 10, 10, 14, 32, 8), buildRow("gas_leak_flame", 0, LOW));
  assert.equal(line, "14:32:08,mock,CRITICO,1,1110,290,2,900,900,0,1,25.8,28.0,0,1,0,0");
  assert.equal(fs.readFileSync(file, "utf8"), `${preamble("2026-11-10")}${line}\n`);
});

test("writeReading rolls over at midnight", () => {
  const file = tmpCsv();
  writeReading(file, new Date(2026, 10, 10, 23, 59, 59), buildRow("normal", 0, MID));
  const line = writeReading(file, new Date(2026, 10, 11, 0, 0, 0), buildRow("normal", 0, MID));
  assert.equal(fs.readFileSync(file, "utf8"), `${preamble("2026-11-11")}${line}\n`);
});

test("writeReading recreates a file deleted while running", () => {
  const file = tmpCsv();
  const now = new Date(2026, 10, 10, 9, 0, 0);
  writeReading(file, now, buildRow("normal", 0, MID));
  fs.unlinkSync(file);
  const line = writeReading(file, now, buildRow("normal", 0, MID));
  assert.equal(fs.readFileSync(file, "utf8"), `${preamble("2026-11-10")}${line}\n`);
});

test("parseArgs uses the documented defaults", () => {
  assert.deepEqual(parseArgs([]), {
    scenario: "tour",
    intervalMs: 1000,
    output: path.join(__dirname, "daily-report.csv"),
  });
});

test("parseArgs reads every option", () => {
  assert.deepEqual(parseArgs(["--scenario", "smoke", "--interval", "500", "--output", "tmp/x.csv"]), {
    scenario: "smoke",
    intervalMs: 500,
    output: path.resolve("tmp/x.csv"),
  });
});

test("parseArgs rejects unknown scenarios", () => {
  assert.throws(() => parseArgs(["--scenario", "banana"]), /Cenário desconhecido: banana/);
});

test("parseArgs rejects intervals below 100 ms or not integers", () => {
  for (const value of ["50", "abc", "100.5"]) {
    assert.throws(() => parseArgs(["--interval", value]), /--interval/);
  }
});

test("parseArgs rejects unknown options and missing values", () => {
  assert.throws(() => parseArgs(["--foo"]), /Opção desconhecida: --foo/);
  assert.throws(() => parseArgs(["--scenario"]), /--scenario/);
  assert.throws(() => parseArgs(["--interval"]), /--interval/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test mock-daily-report.test.js`
Expected: FAIL nos testes novos (`ensureDailyFile is not a function`). Os da Task 3 continuam passando.

- [ ] **Step 3: Implementar `ensureDailyFile`, `writeReading` e `parseArgs`**

- `ensureDailyFile`: lê **só o começo** do arquivo (`fs.openSync` mais `fs.readSync` de até 64 bytes) e compara a 1ª linha com `data,<date>`. Se for diferente, ou se o arquivo não existir (`ENOENT`), faz `fs.writeFileSync(filePath, preamble)` e cria a pasta pai com `fs.mkdirSync(dir, { recursive: true })`. **Nunca** leia o arquivo inteiro: ele chega a cerca de 8 MB.
- `writeReading`: `ensureDailyFile(filePath, formatDate(now))`, depois `line = toCsvLine(formatTime(now), row)`, depois **um único** `fs.appendFileSync(filePath, line + "\n")`, e por fim `return line`.
- `parseArgs`: percorre o `argv` em pares. Mensagens de erro exatas:
  - `Cenário desconhecido: <nome>. Use um de: <SCENARIO_NAMES separados por ", ">`
  - `--interval precisa ser um inteiro >= 100 (ms).`
  - `Opção desconhecida: <opção>`
  - `Falta o valor de <opção>.`
  - O `output` padrão é `path.join(__dirname, "daily-report.csv")`. Um `--output` informado vira `path.resolve(valor)`.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test mock-daily-report.test.js`
Expected: PASS, `# fail 0`.

- [ ] **Step 5: Implementar `main()` e o guard `if (require.main === module) main();`**

- O texto de uso (`USAGE`) começa com `Uso: node mock-daily-report.js [--scenario <nome>] [--interval <ms>] [--output <caminho>]` e lista os cenários.
- Se `parseArgs` lançar erro: `console.error(err.message)`, depois `console.error(USAGE)` e `process.exit(1)`.
- Ao iniciar, imprime:
  - `Mock GasGuard: cenário "<scenario>", 1 linha a cada <intervalMs> ms → <output>`
  - `Ctrl+C para parar.`
- `startedAt = Date.now()`. Em cada `tick()`:
  - `elapsed = (Date.now() - startedAt) / 1000`;
  - o passo vem de `tourStepAt(elapsed)` quando o cenário for `tour`; senão é `{ scenario, elapsedInStep: elapsed }`;
  - `row = buildRow(step.scenario, step.elapsedInStep, Math.random)`, depois `writeReading(output, new Date(), row)`;
  - log no stdout: `` `${hora}  ${step.scenario}  ${row.nivel} (${row.cenario})` ``.
  - Se a escrita falhar: `console.error(\`Erro ao gravar ${output}: ${err.message}\`)` e o loop **continua**.
- Chama `tick()` uma vez imediatamente, depois `setInterval(tick, intervalMs)`.
- `process.on("SIGINT", ...)`: imprime `Mock encerrado.` e faz `process.exit(0)`.

- [ ] **Step 6: Verificar a execução real**

Run:
```bash
rm -f daily-report.csv
node mock-daily-report.js --scenario gas_leak_flame --interval 200 & MOCK_PID=$!; sleep 1.2; kill -INT $MOCK_PID; wait $MOCK_PID
head -4 daily-report.csv
```
Expected: o log mostra cerca de 6 linhas `HH:MM:SS  gas_leak_flame  CRITICO (1)` e termina com `Mock encerrado.`. O `head` mostra `data,<data de hoje>`, o cabeçalho exato e linhas `HH:MM:SS,mock,CRITICO,1,...`.

Run: `node mock-daily-report.js --scenario banana; echo "exit=$?"`
Expected: `Cenário desconhecido: banana. Use um de: ...`, o texto de uso e `exit=1`.

Run: `git status --short`
Expected: `daily-report.csv` **não** aparece (ignorado pela Task 2). Só aparece `M mock-daily-report.js` e `M mock-daily-report.test.js`.

- [ ] **Step 7: Commit**

```bash
rm -f daily-report.csv
git add mock-daily-report.js mock-daily-report.test.js
git commit -m "feat(mock): write daily-report.csv with daily rotation and CLI"
```

---

### Task 5: Esqueleto do Next.js em `web/`

**Files:**
- Create: `web/` (via create-next-app), `web/.env.example`
- Modify: `web/package.json` (scripts), `web/next.config.ts`, `web/.gitignore`, `web/src/app/layout.tsx`, `web/src/app/page.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: o app Next em `web/`, com alias `@/*` → `web/src/*`, shadcn configurado (`web/src/lib/utils.ts` exporta `cn`) e `recharts` instalado. A Task 6 acrescenta o Vitest e o domínio.

- [ ] **Step 1: Criar o app** (executar **na raiz** do repositório)

```bash
npx create-next-app@16.4.6 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-react-compiler --no-cache-components --agents-md --no-agent-feedback --disable-git --yes
```

Expected: existem `web/package.json`, `web/src/app/page.tsx` e `web/AGENTS.md`, e **não** existe `web/.git` (`test ! -d web/.git && echo ok` imprime `ok`). Se também gerar um `web/CLAUDE.md`, mantenha.

- [ ] **Step 2: Iniciar o shadcn/ui** (dentro de `web/`)

```bash
cd web && npx shadcn@4.23.0 init --defaults --yes --no-monorepo
```

Expected: `web/components.json` e `web/src/lib/utils.ts` (com `cn`) criados, e `web/src/app/globals.css` com as variáveis de tema. Se o CLI fizer alguma pergunta, aceite o padrão.

- [ ] **Step 3: Instalar o Recharts**

Run (em `web/`): `npm install recharts@3.10.1`
Expected: `"recharts": "3.10.1"` (ou `^3.10.1`) em `dependencies`.

- [ ] **Step 4: Ajustar os scripts em `web/package.json`**

Deixe `"dev": "next dev -H 0.0.0.0"` e `"start": "next start -H 0.0.0.0"`. Mantenha `build` e `lint` como foram gerados.

- [ ] **Step 5: `web/next.config.ts`**

Mantenha o que o create-next-app gerou e acrescente ao objeto de configuração:

```ts
  // Lets phones on the same Wi-Fi use `next dev` (docs/decisions.md, D8).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
```

- [ ] **Step 6: `.env.example` e exceção no `.gitignore`**

Crie `web/.env.example`:
```
# Caminho do CSV gravado pela placa ou pelo mock (relativo à pasta web/)
DAILY_REPORT_PATH=../daily-report.csv
```
No `web/.gitignore`, logo abaixo da linha `.env*` gerada, acrescente:
```
!.env.example
```

Run (na raiz): `git check-ignore web/.env.example; echo "exit=$?"`
Expected: `exit=1` (o arquivo **não** é ignorado).

- [ ] **Step 7: Layout e página placeholder**

Em `web/src/app/layout.tsx`, mantenha as fontes geradas e mude:
- `<html lang="pt-BR">`
- `metadata = { title: "GasGuard", description: "Monitoramento de gás e risco de incêndio — protótipo acadêmico." }`

Substitua `web/src/app/page.tsx` inteiro por:

```tsx
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">GasGuard</h1>
        <p className="text-muted-foreground">Painel em construção.</p>
      </div>
      <footer className="text-xs text-muted-foreground">
        Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.
      </footer>
    </main>
  );
}
```

Apague de `web/public/` os SVGs de exemplo que não são mais usados (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, os que existirem), desde que nenhum arquivo em `src/` os referencie (`grep -r "\.svg" web/src` sem resultado).

- [ ] **Step 8: Verificar lint, build e dev**

Run (em `web/`): `npm run lint`
Expected: exit 0, sem erros.

Run (em `web/`): `npm run build`
Expected: `✓ Compiled successfully` e a rota `/` listada.

Run (em `web/`):
```bash
npm run dev > /tmp/gasguard-dev.log 2>&1 & DEV_PID=$!; sleep 8; curl -s http://localhost:3000 | grep -o "Painel em construção"; kill $DEV_PID
```
Expected: imprime `Painel em construção`.

- [ ] **Step 9: Commit** (na raiz)

```bash
git add web
git status --short | grep -E "node_modules|\.next" && echo "ERRO: artefatos no stage" || echo "stage limpo"
git commit -m "feat(web): scaffold Next.js app with Tailwind, shadcn/ui and Recharts"
```
Expected: `stage limpo` antes do commit.

---

### Task 6: Domínio, Vitest e camadas do web

**Files:**
- Create: `web/vitest.config.mts`, `web/src/domain/{risk-level.ts,risk-level.test.ts,reading.ts,report-event.ts,index.ts,README.md}`, `web/src/lib/report/README.md`, `web/src/app/api/README.md`, `web/src/hooks/README.md`, `web/src/components/README.md`
- Modify: `web/package.json` (script `test` e devDependency `vitest`)

**Interfaces:**
- Consumes: o alias `@/*` da Task 5.
- Produces (usados nas Etapas 3 e 4):
  - `RISK_LEVELS`, `type RiskLevel`, `isRiskLevel(value: unknown): value is RiskLevel`, em `@/domain/risk-level`
  - `type ReadingSource`, `type GasLevel`, `interface GasSensorReading`, `interface TemperatureReading`, `interface Reading`, em `@/domain/reading`
  - `interface ReportEvent`, em `@/domain/report-event`
  - `@/domain` (barrel `index.ts`) reexporta tudo.

- [ ] **Step 1: Instalar e configurar o Vitest** (em `web/`)

Run: `npm install -D vitest@5.1.0`

Crie `web/vitest.config.mts`:
```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```
Em `web/package.json`: `"test": "vitest run"`.

- [ ] **Step 2: Escrever o teste que falha** em `web/src/domain/risk-level.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { RISK_LEVELS, isRiskLevel } from "@/domain/risk-level";

describe("isRiskLevel", () => {
  it("lists the six domain levels in the documented order", () => {
    expect(RISK_LEVELS).toEqual(["NORMAL", "ATTENTION", "ALERT", "HIGH", "CRITICAL", "FAILURE"]);
  });

  it("accepts every domain level", () => {
    for (const level of RISK_LEVELS) expect(isRiskLevel(level)).toBe(true);
  });

  it("rejects the Portuguese CSV names and other values", () => {
    for (const value of ["CRITICO", "ATENCAO", "critical", "", null, undefined, 3]) {
      expect(isRiskLevel(value)).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run (em `web/`): `npm test`
Expected: FAIL, porque o módulo `@/domain/risk-level` ainda não existe.

- [ ] **Step 4: Criar os tipos de domínio** (contrato entre as camadas: copie exatamente)

`web/src/domain/risk-level.ts`:
```ts
export const RISK_LEVELS = ["NORMAL", "ATTENTION", "ALERT", "HIGH", "CRITICAL", "FAILURE"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (RISK_LEVELS as readonly string[]).includes(value);
}
```

`web/src/domain/reading.ts`:
```ts
import type { RiskLevel } from "./risk-level";

export type ReadingSource = "board" | "mock";

/** 0 = normal, 1 = attention, 2 = leak (firmware thresholds). */
export type GasLevel = 0 | 1 | 2;

export interface GasSensorReading {
  value: number;
  base: number;
  level: GasLevel;
}

export interface TemperatureReading {
  /** null when the DHT11 reading was invalid. */
  celsius: number | null;
  /** null while the firmware has no ambient baseline yet. */
  limit: number | null;
  high: boolean;
}

/** One CSV row, already translated to the English domain (see docs/csv-contract.md). */
export interface Reading {
  /** Local ISO date-time without timezone, e.g. "2026-11-10T14:32:08". */
  timestamp: string;
  source: ReadingSource;
  level: RiskLevel;
  scenarioId: number;
  mq6: GasSensorReading;
  mq2: GasSensorReading;
  flame: boolean;
  temperature: TemperatureReading;
  motion: boolean;
  stoveOn: boolean;
  secondsWithoutMotion: number;
}
```

`web/src/domain/report-event.ts`:
```ts
import type { ReadingSource } from "./reading";
import type { RiskLevel } from "./risk-level";

/** A change of risk level between two consecutive readings. */
export interface ReportEvent {
  /** Stable id: the timestamp of the reading that changed the level. */
  id: string;
  timestamp: string;
  /** null for the first reading of the day. */
  from: RiskLevel | null;
  to: RiskLevel;
  scenarioId: number;
  source: ReadingSource;
}
```

`web/src/domain/index.ts`:
```ts
export * from "./reading";
export * from "./report-event";
export * from "./risk-level";
```

- [ ] **Step 5: Rodar e ver passar**

Run (em `web/`): `npm test`
Expected: PASS, com 3 testes.

- [ ] **Step 6: README de cada camada** (conteúdo exato, em pt-BR)

| Arquivo | Conteúdo |
|---|---|
| `web/src/domain/README.md` | `# domain` + linha em branco + `Tipos em inglês e funções **puras** de regra (eventos, filtros, dicionário de cenários). Não importa Node, React nem Next. Toda função aqui tem teste em \`*.test.ts\`. Ver docs/architecture.md.` |
| `web/src/lib/report/README.md` | `# lib/report` + linha em branco + `Camada de leitura: a **única** que conhece o CSV em português (docs/csv-contract.md). Faz o parse, a validação e o tail por offset do \`daily-report.csv\` e entrega \`Reading\` do domínio. Implementação: Etapa 3 do roadmap.` |
| `web/src/app/api/README.md` | `# app/api` + linha em branco + `Camada de transporte: \`GET /api/report\` (carga inicial) e \`GET /api/stream\` (SSE). Fina: chama \`lib/report\` e serializa, sem regra de negócio. Implementação: Etapa 3 do roadmap.` |
| `web/src/hooks/README.md` | `# hooks` + linha em branco + `Estado no cliente. \`useReadings()\` abre o EventSource, guarda as leituras, deriva os eventos e o status da conexão (ao vivo / reconectando / sem dados após 5 s). Não importa \`lib/report\`. Implementação: Etapa 3 do roadmap.` |
| `web/src/components/README.md` | `# components` + linha em branco + `Interface. Containers usam hooks; os componentes de apresentação recebem só props. Componentes simples podem fazer as duas coisas. Regra de negócio fica em \`domain\`. \`ui/\` é gerado pelo shadcn. Implementação: Etapa 4 do roadmap.` |

- [ ] **Step 7: Verificar tudo** (em `web/`)

Run: `npm test && npm run lint && npm run build`
Expected: os três com exit 0.

- [ ] **Step 8: Commit** (na raiz)

```bash
git add web
git commit -m "feat(web): add domain types, Vitest and layer folders"
```

---

### Task 7: Verificação final e roadmap

**Files:**
- Modify: `docs/roadmap.md` (seção "Etapa 1")

**Interfaces:**
- Consumes: tudo das Tasks 1 a 6.
- Produces: branch pronta para PR.

- [ ] **Step 1: Histórico do firmware preservado**

Run: `git log --follow --oneline hardware/src/main.cpp`
Expected: inclui o commit `d954498 feat: firmware GasGuard com sensores e níveis de risco`.

Run: `git diff main --stat -M -- hardware/src/main.cpp hardware/platformio.ini`
Expected: as renomeações com `0` linhas alteradas.

- [ ] **Step 2: Todos os testes e builds**

Run (raiz): `node --test mock-daily-report.test.js`
Expected: `# fail 0`.

Run (em `web/`): `npm test && npm run lint && npm run build`
Expected: os três com exit 0.

- [ ] **Step 3: Nada gerado entrou no git**

Run (raiz): `node mock-daily-report.js --interval 200 & P=$!; sleep 1; kill -INT $P; wait $P; git status --short`
Expected: saída vazia do `git status` (o `daily-report.csv` existe, mas é ignorado). Depois rode `rm -f daily-report.csv`.

- [ ] **Step 4: Marcar a Etapa 1 no roadmap**

Em `docs/roadmap.md`, troque os quatro `- [ ]` da seção "Etapa 1: Fundação do monorepo" por `- [x]`.

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: mark monorepo foundation stage as done"
```
