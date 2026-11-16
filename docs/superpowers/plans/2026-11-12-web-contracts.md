# Contratos do web (W0) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar os tipos TypeScript que as fatias seguintes importam (`ConnectionStatus`, `EventFilterState`, `RecentReadings`) e deixar prontas as chaves de ambiente e a pasta ignorada que o login/alertas (W5) vai usar.

**Architecture:** W0 não tem runtime. `types/` continua só com `type`/`interface` (D16): três arquivos novos, reexportados no barrel já existente. `.env.example` ganha as chaves que W5 vai ler; `web/.gitignore` ignora `web/.data/`. Nenhuma função, constante, teste Vitest novo, pasta extra em `web/src`, nem pacote npm.

**Tech Stack:** TypeScript 5 (Next.js 16.4.6, `strict`), Vitest 5.1.0 só para confirmar os 3 testes já verdes, npm. Sem jsdom, sem Testing Library.

**Spec:** fatia W0 + Contratos congelados + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Assinaturas copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/chore-web-contracts` neste checkout). **Permaneça nela.** Não crie nem renomeie para `chore/web-contracts`.
- Baseline: em `web/`, `npm test` já passou (3 testes em `src/lib/risk-level.test.ts`).
- Já existem e estão congelados: `web/src/types/reading.ts`, `risk-level.ts`, `report-event.ts`, `index.ts` (só esses três reexports).
- `web/.env.example` tem só `DAILY_REPORT_PATH=../daily-report.csv`.
- `web/.gitignore` ainda não ignora `.data/`.
- Home: placeholder em `web/src/app/page.tsx` (“GasGuard” / “Painel em construção” + rodapé acadêmico). **Não edite esse arquivo.**

## Arquivos (decomposição)

```
web/
├── .env.example                         [T2] + AUTH_SECRET, RESEND_API_KEY, ALERT_FROM_EMAIL
├── .gitignore                           [T2] + /.data/
└── src/types/
    ├── reading.ts                       (congelado — não mexer)
    ├── risk-level.ts                    (congelado — não mexer)
    ├── report-event.ts                  (congelado — não mexer)
    ├── README.md                        (fora do Owns — não mexer)
    ├── connection.ts                    [T1] ConnectionStatus
    ├── event-filter.ts                  [T1] EventPeriod, EventFilterState
    ├── recent-readings.ts               [T1] RecentReadings
    └── index.ts                         [T1] reexporta os três novos
```

Nada fora desta lista. Sem `*.test.ts` em `types/` (seria executável; viola D16). O ciclo vermelho/verde desta fatia é o `tsc`, não um teste Vitest novo.

## Global Constraints

- **Owns:** só `web/src/types/connection.ts`, `event-filter.ts`, `recent-readings.ts`, `index.ts`, `web/.env.example`, e a linha de `web/.data/` em `web/.gitignore`. Precisou de outro arquivo → parar.
- **Assinaturas congeladas:** copiar os tipos e as chaves do mapa. Não renomear, não acrescentar campo, não criar type guard / constante / union extra.
- **`types/` só tipos (D16):** `type` e `interface`. Sem `function`, `const`, classe, valor runtime.
- **Barrel:** `export type *` (já é o padrão). `ConnectionStatus` etc. existem só em `import type` — não há valor em runtime para `expect()`.
- **Camadas:** não criar pasta nova de primeiro nível em `web/src`. kebab-case. Imports relativos `./risk-level` dentro de `types/` (nunca `@/` de `types/` para outra pasta; `types/` não importa pasta nenhuma).
- **Não instalar pacote.** Sem `shadcn add`. Sem `next-auth`. Sem `nodemailer`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano.
- **Idioma:** identificadores em inglês; este plano em pt-BR; UI intocada (continua pt-BR).
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** tipos compilam; `npm test`; home ainda abre.

## Review Focus

1. As três assinaturas são byte-a-byte as do mapa (nomes, unions, campos, imports relativos).
2. `index.ts` reexporta com `export type *` os três módulos novos e **mantém** os três antigos.
3. Nenhum `*.test.ts` (nem função) em `types/`.
4. `.env.example` tem exatamente as quatro chaves do mapa; `DAILY_REPORT_PATH` permanece `../daily-report.csv`.
5. `web/.gitignore` ignora `web/.data/` (confirme com `git check-ignore`). Nada de `web/.data/` no commit.
6. Diff da fatia = Owns + este plano. `page.tsx` / `package.json` / README de `types/` intactos.

---

### Task 1: Tipos `ConnectionStatus`, `EventFilterState`, `RecentReadings` + barrel

**Files:**
- Create: `web/src/types/connection.ts`
- Create: `web/src/types/event-filter.ts`
- Create: `web/src/types/recent-readings.ts`
- Modify: `web/src/types/index.ts`

**Interfaces:**
- Consumes: `RiskLevel` (`./risk-level`), `Reading` (`./reading`), `ReportEvent` (`./report-event`) — já existentes, não editar.
- Produces: tipos importáveis em fatias seguintes via `@/types`:
  - `export type ConnectionStatus = "live" | "reconnecting" | "no_data"`
  - `export type EventPeriod = "last-hour" | "last-6h" | "today"`
  - `export interface EventFilterState { levels: RiskLevel[]; period: EventPeriod }`
  - `export interface RecentReadings { date: string; readings: Reading[]; events: ReportEvent[] }`

O vermelho/verde é o compilador: o barrel passa a apontar para módulos que ainda não existem.

- [ ] **Step 1: Apontar o barrel para os três módulos novos** (ainda inexistentes)

Substitua o arquivo `web/src/types/index.ts` inteiro por:

```ts
export type * from "./reading";
export type * from "./report-event";
export type * from "./risk-level";
export type * from "./connection";
export type * from "./event-filter";
export type * from "./recent-readings";
```

Não inverta a ordem dos três primeiros. Não troque `export type *` por `export *`.

- [ ] **Step 2: Compilar e confirmar o vermelho**

Run:

```bash
cd web && npx tsc --pretty false --noEmit
```

Expected: FAIL. Pelo menos estes erros (número TS2307), um por módulo:

```
src/types/index.ts: error TS2307: Cannot find module './connection' or its corresponding type declarations.
src/types/index.ts: error TS2307: Cannot find module './event-filter' or its corresponding type declarations.
src/types/index.ts: error TS2307: Cannot find module './recent-readings' or its corresponding type declarations.
```

Se `tsc` passar aqui, o Step 1 não foi feito — não avance.

- [ ] **Step 3: Criar os três arquivos de tipo** (assinaturas do mapa; JSDoc curto no estilo de `report-event.ts`)

`web/src/types/connection.ts` — arquivo completo:

```ts
/** SSE/hook connection shown in the dashboard header. */
export type ConnectionStatus = "live" | "reconnecting" | "no_data";
```

`web/src/types/event-filter.ts` — arquivo completo:

```ts
import type { RiskLevel } from "./risk-level";

export type EventPeriod = "last-hour" | "last-6h" | "today";

/** Client-side event list filters (chips + period). */
export interface EventFilterState {
  levels: RiskLevel[];
  period: EventPeriod;
}
```

`web/src/types/recent-readings.ts` — arquivo completo:

```ts
import type { Reading } from "./reading";
import type { ReportEvent } from "./report-event";

/** Initial payload for the home Server Component and `useReadings`. */
export interface RecentReadings {
  date: string;
  readings: Reading[];
  events: ReportEvent[];
}
```

Não use `@/types` nestes arquivos. Não exporte valor. Não crie `isConnectionStatus` nem `EVENT_PERIODS`.

- [ ] **Step 4: Compilar e rodar os testes existentes**

Run:

```bash
cd web && npx tsc --pretty false --noEmit
```

Expected: exit 0, nenhuma linha de erro.

Run:

```bash
cd web && npm test
```

Expected: exit 0, **3** testes passando (os de `src/lib/risk-level.test.ts`). Zero arquivos de teste novos.

- [ ] **Step 5: Commit**

```bash
git add web/src/types/connection.ts web/src/types/event-filter.ts web/src/types/recent-readings.ts web/src/types/index.ts
git commit -m "$(cat <<'EOF'
feat(web): add connection, event-filter and recent-readings types

EOF
)"
```

Expected: o commit contém **somente** esses 4 arquivos. `git status` limpo em `web/src/`.

---

### Task 2: Chaves de ambiente W5 e `web/.data/` ignorado

**Files:**
- Modify: `web/.env.example`
- Modify: `web/.gitignore`

**Interfaces:**
- Consumes: nada da Task 1 (são arquivos de config). O `npm run build` do Step 6 assume a Task 1 já commitada, porque o barrel novo precisa dos tipos.
- Produces:
  - `process.env` documentado com `DAILY_REPORT_PATH`, `AUTH_SECRET`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL` (W5 é quem lê; W0 só reserva)
  - Git ignora `web/.data/**` (W5 grava `users.json` aí)

Não crie a pasta `web/.data/`. Git não versiona diretório vazio, e o Owns é só a linha no `.gitignore`.

- [ ] **Step 1: Confirmar o vermelho (chave ausente e pasta ainda rastreável)**

Run:

```bash
grep -c AUTH_SECRET web/.env.example || true
git check-ignore -v web/.data/users.json; echo "check-ignore_exit=$?"
```

Expected:

- `grep -c` imprime `0` (ou o `|| true` cobre o exit 1 do grep).
- `git check-ignore` **não** imprime caminho; `check-ignore_exit=1` (o path ainda **não** é ignorado).

- [ ] **Step 2: Reservar as chaves no exemplo**

Substitua `web/.env.example` inteiro por:

```
# Caminho do CSV gravado pela placa ou pelo mock (relativo à pasta web/)
DAILY_REPORT_PATH=../daily-report.csv
AUTH_SECRET=
RESEND_API_KEY=
ALERT_FROM_EMAIL=GasGuard <alertas@localhost>
```

Valores copiados do mapa. Não cite as chaves. Não apague `DAILY_REPORT_PATH`. Não adicione `NEXT_PUBLIC_*`.

- [ ] **Step 3: Ignorar `web/.data/`**

No final de `web/.gitignore` (depois de `next-env.d.ts`), acrescente uma linha em branco e:

```
# local prototype data (W5 users.json)
/.data/
```

O `/` inicial é relativo a `web/`, então a regra vale para `web/.data/`, não para um `.data` em outro lugar do repo. Não edite o `.gitignore` da raiz.

- [ ] **Step 4: Confirmar o verde**

Run:

```bash
grep -E '^(DAILY_REPORT_PATH|AUTH_SECRET|RESEND_API_KEY|ALERT_FROM_EMAIL)=' web/.env.example
git check-ignore -v web/.data/users.json; echo "check-ignore_exit=$?"
```

Expected: as quatro linhas, nesta ordem:

```
DAILY_REPORT_PATH=../daily-report.csv
AUTH_SECRET=
RESEND_API_KEY=
ALERT_FROM_EMAIL=GasGuard <alertas@localhost>
```

e `git check-ignore` com exit 0, apontando para `web/.gitignore` e a regra `/.data/`. Exemplo:

```
web/.gitignore:<N>:/.data/	web/.data/users.json
check-ignore_exit=0
```

- [ ] **Step 5: test + lint + build (Done when)**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: os três com exit 0. `npm test` continua **3** testes. `lint` sem aviso novo nos arquivos desta fatia. `build` compila o App Router; a home placeholder segue no bundle. Não rode `npm install`.

- [ ] **Step 6: Browser — a home ainda abre**

O mapa exige smoke mesmo em W0. CSV/mock **não** são necessários.

1. Em `web/`: `npm run dev`.
2. Abra `http://localhost:3000` nas browser tools (não declare feito com screenshot estático).
3. Confirme, como usuário:
   - a página carrega sem overlay vermelho do Next;
   - título **GasGuard**;
   - texto **Painel em construção.**;
   - rodapé exatamente `Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.`
4. Não clique em nada que não exista: não há dashboard, login nem SSE nesta fatia.

Se não houver browser tool: **não** substitua por `curl -sI`. Declare o que não conseguiu ver. O revisor trata como gap só se a home não tiver evidência de ter aberto.

- [ ] **Step 7: Commit**

```bash
git add web/.env.example web/.gitignore
git commit -m "$(cat <<'EOF'
chore(web): reserve auth env keys and ignore local .data

EOF
)"
```

Expected: o commit contém **somente** esses 2 arquivos. `git status` limpo. Nenhum `web/.data/` no índice.

---

## Fora desta fatia (não fazer)

- Parser CSV, `lib/` de cenário/evento/filtro/format, service, SSE, hook, componentes, `dashboard.tsx`, auth, e-mail.
- Atualizar `web/src/types/README.md` (não está no Owns).
- Merge em `feat/web`, push (o implementer dá push; o planner **não**), PR, rename da branch.
