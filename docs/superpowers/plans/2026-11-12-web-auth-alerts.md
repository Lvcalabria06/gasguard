# Auth + e-mail de alerta crítico (W5) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar/entrar com e-mail e senha locais, mostrar a sessão no dashboard, e ao **entrar** em `CRITICAL` tentar um e-mail Resend com throttle de 5 min e prefixo `[SIMULAÇÃO] ` quando a origem for o mock.

**Architecture:** Auth é JSON + `scrypt` + cookie httpOnly HMAC-SHA256 (`AUTH_SECRET`). As Server Actions ficam nas páginas `/login` e `/cadastro`. O menu não importa `services/` — logout é `POST /login/sair`. Alertas são um segundo `watchReadings` no `register()` do `instrumentation.ts` (processo Node); a tela continua pública. Sem `next-auth`, sem `nodemailer`, sem pasta nova em `web/src`.

**Tech Stack:** Next.js 16.4.6 App Router (Server Actions, `cookies()` de `next/headers`, `instrumentation.ts`), React 19 (`useActionState`), TypeScript 5 (`strict`), `node:crypto` (`scryptSync`, `createHmac`, `timingSafeEqual`), `fetch` para `https://api.resend.com/emails`, Vitest 5.1.0 ambiente `node`. Sem jsdom, sem Testing Library, sem pacote novo.

**Spec:** fatia W5 + Auth + e-mail + Owns em [`docs/superpowers/specs/2026-11-12-web-worktree-map.md`](../specs/2026-11-12-web-worktree-map.md). Camadas em [`docs/architecture.md`](../../architecture.md). Assinaturas e chaves de ambiente copiam o mapa; não reabrir.

**Execution:** `executing-plans` nesta branch. Não perguntar subagent vs inline. Não mergear. Não abrir PR.

## Estado inicial

- Branch de trabalho: a atual (`jpp000/feat-web-auth-alerts` neste checkout). **Permaneça nela.** Não crie nem renomeie para `feat/web-auth-alerts`.
- Baseline: em `web/`, `npm test` já passou (20 files / 108 tests). Não edite `web/src/lib/**`, `web/src/types/**`, `web/src/hooks/**`, `web/src/services/report/**`, `web/src/app/api/**`, `web/src/app/layout.tsx`, `web/src/app/globals.css`, nem os arquivos W3c–W3f em `components/dashboard/` (exceto o patch mínimo de `dashboard.tsx`).
- Home já é o dashboard W4 (`await connection()` + `getRecentReadings` + `<Dashboard initial={...} />`). Esta fatia **só** acrescenta `email` ao `Dashboard` e o `AccountMenu`.
- `web/.env.example` já tem `AUTH_SECRET=`, `RESEND_API_KEY=`, `ALERT_FROM_EMAIL=GasGuard <alertas@localhost>`. **Não edite** `.env.example`. W5 só lê.
- `web/.gitignore` já ignora `/.data/`. Não recrie a pasta no git.
- `watchReadings` já existe e **já** é usado pelo SSE. O watcher de alerta é um **segundo** `watchReadings` no processo — não transforme o do SSE em singleton.

## Arquivos (decomposição)

```
web/src/services/auth/
├── password.ts              [T1] scrypt hash/verify + passwordError
├── password.test.ts         [T1]
├── users.ts                 [T1] JSON em .data/users.json
└── users.test.ts            [T1]

web/src/services/auth/
├── session.ts               [T2] HMAC + cookie httpOnly
└── session.test.ts          [T2]

web/src/components/auth/
├── auth-form.tsx            [T3] formulário login/cadastro
└── auth-form.test.ts        [T3]

web/src/app/login/
├── page.tsx                 [T3] Server Action `login` + página
└── page.test.ts             [T3]

web/src/app/cadastro/
├── page.tsx                 [T3] Server Action `signup` + página
└── page.test.ts             [T3]

web/src/components/auth/
├── account-menu.tsx         [T4]
└── account-menu.test.ts     [T4]

web/src/app/login/sair/
├── route.ts                 [T4] POST logout
└── route.test.ts            [T4]

web/src/app/page.tsx         [T4] + getSession → email
web/src/app/page.test.ts     [T4]
web/src/components/dashboard/dashboard.tsx   [T4] + AccountMenu
web/src/components/dashboard/dashboard.test.ts  (não precisa mudar — dashboardView intacto)

web/src/services/alerts/
├── alert-policy.ts          [T5] enteredCritical, throttle, assunto, corpo
├── alert-policy.test.ts     [T5]
├── send-alert.ts            [T5] fetch Resend
└── send-alert.test.ts       [T5]

web/src/services/alerts/
├── alert-watcher.ts         [T6] segundo watchReadings
└── alert-watcher.test.ts    [T6]

web/src/instrumentation.ts   [T6] register() no processo Node
```

Nada fora desta lista. Sem `index.ts`. Sem `next-auth`. Sem `nodemailer`. Sem `middleware.ts`. Sem proteger `/`. Sem pasta nova de primeiro nível em `web/src`. Sem editar `package.json`, `vitest.config.mts`, `.env.example`, `layout.tsx`, `globals.css`. Fixtures de `Reading` **dentro** do próprio `*.test.ts`.

Os testes são `*.test.ts` (o Vitest só inclui `src/**/*.test.ts`). Extraem funções puras / actions / handlers. Não criam `.test.tsx`. Não renderizam JSX com Testing Library.

`app/login/page.tsx` e `app/cadastro/page.tsx` **podem** importar `services/auth/`. `components/auth/**` **não pode**. `dashboard.tsx` **não pode**.

## Global Constraints

- **Owns:** só `web/src/services/auth/**`, `web/src/services/alerts/**`, `web/src/app/login/**`, `web/src/app/cadastro/**`, `web/src/components/auth/**`, `web/src/instrumentation.ts`, e **patch mínimo** em `web/src/components/dashboard/dashboard.tsx` / `web/src/app/page.tsx` (e os `*.test.ts` colados). Precisou de outro arquivo → parar.
- **Assinaturas desta fatia** (fechadas abaixo; o mapa não nomeia funções — não as renomeie no meio do plano):
  ```ts
  export function hashPassword(password: string): string;
  export function verifyPassword(password: string, stored: string): boolean;
  export function passwordError(password: string): string | null;

  export function parseEmail(raw: string): string | null;
  export function getUsersPath(): string;
  export function findUser(email: string): StoredUser | null;
  export function createUser(email: string, password: string): "created" | "duplicate";

  export function signSession(email: string, secret: string): string;
  export function verifySession(token: string, secret: string): { email: string } | null;
  export async function getSession(): Promise<{ email: string } | null>;
  export async function setSession(email: string): Promise<void>;
  export async function clearSession(): Promise<void>;

  export function Dashboard(props: {
    initial: RecentReadings | null;
    email: string | null;
  }): JSX.Element;

  export function enteredCritical(
    previous: RiskLevel | null,
    current: RiskLevel,
  ): boolean;
  export function canSendAlert(lastSentAt: number | undefined, now: number): boolean;
  export function alertSubject(source: Reading["source"]): string;
  export function alertText(reading: Reading): string;
  ```
- **Camadas:** kebab-case; imports `@/`. `app/` → `components` / `services` / `lib` / `types`. `components/` e `hooks/` **nunca** importam `services/` nem `node:*`. Sem colunas em português. Todo arquivo em `services/auth/` e `services/alerts/` começa com `import "server-only";`.
- **O web não recalcula risco.** O alerta dispara no `level === "CRITICAL"` que já veio no `Reading`. Não releia o CSV em português fora de `services/report/`.
- **Dashboard público.** Sem login a home continua funcionando. Login existe para saber o e-mail (D14). Sem dado há > 5 s continua `no_data` — esta fatia não mexe nisso.
- **Sem Testing Library e sem jsdom novo.** Não edite `vitest.config.mts` nem `package.json`. Não instale pacote. Sem `shadcn add`. Sem `next-auth`. Sem `nodemailer`.
- **Não tocar** `hardware/`, `mock-daily-report.js`, `web/src` fora do Owns, `docs/` fora deste plano, `.env.example`, `web/.gitignore`.
- **Idioma:** identificadores em inglês; textos da UI e do e-mail em pt-BR com acentos; este plano em pt-BR.
- **Protótipo acadêmico.** Nenhum texto novo promete proteção real. Rodapé / corpo do e-mail repetem que não é detector certificado.
- **Node** ≥ 22.12. Comandos do web em `web/`.
- **Done when (mapa):** cadastro/login; CRITICAL tenta Resend com throttle e `[SIMULAÇÃO] `; `npm test` / `lint` / `build`; fluxo no browser.

## Contrato fechado (buracos mecânicos do mapa)

O mapa dá pasta, scrypt, cookie HMAC, Server Actions nas páginas, AccountMenu, `watchReadings` no processo, Resend via `fetch`, throttle 5 min, `[SIMULAÇÃO] `, e “sem chave / sem usuários → logar e não quebrar”. Isto não reabre decisão — só impede o implementer de inventar formato:

1. **`/` continua público.** `page.tsx` não redireciona para `/login`. Sem sessão, `email={null}` e o menu mostra Entrar / Cadastrar.
2. **Usuários em `web/.data/users.json`.** Caminho: `resolve(process.cwd(), process.env.AUTH_USERS_PATH ?? ".data/users.json")`. `AUTH_USERS_PATH` é só seam de teste (absoluto, tmp); **não** entra no `.env.example`. Produção nunca seta. Arquivo ausente = lista vazia. JSON inválido = `console.error("[auth] invalid users.json")` e `[]`. Nunca joga no request da home.
3. **Formato do JSON:** `Array<{ email: string; passwordHash: string }>`. `email` sempre lowercase já normalizado. `passwordHash` = `saltHex:keyHex` (16 bytes de salt, 64 bytes de chave, hex). Write atômico: `users.json.tmp` + `renameSync`.
4. **`scrypt` de `node:crypto`.** `scryptSync(password, salt, 64)`. Salt = `randomBytes(16)`. `verifyPassword` usa `timingSafeEqual`. Formato sem `:`, salt ímpar ou tamanho diferente → `false`, sem throw.
5. **E-mail:** `trim()` + `toLowerCase()`. Válido só se `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)`. Senha no cadastro: mínimo **8** caracteres. Login **não** explica a regra da senha — credencial errada é sempre `"E-mail ou senha inválidos."`
6. **Cookie:** nome `gg_session`. Valor `base64url(email).base64url(hmac-sha256(payload, AUTH_SECRET))`. `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `secure` só quando `NODE_ENV === "production"` (localhost é HTTP). Sem `Max-Age` (cookie de sessão). Sem expiry no payload.
7. **`AUTH_SECRET` vazio/ausente:** `getSession()` → `null`. `setSession` **não** é chamado. Login/cadastro devolvem `"Configuração incompleta. Defina AUTH_SECRET."` A home não 500.
8. **Server Actions no próprio `page.tsx`**, com `"use server"` **dentro** da função (o arquivo também exporta o componente da página — não use `"use server"` no topo do arquivo). `login` em `app/login/page.tsx`. `signup` em `app/cadastro/page.tsx`.
9. **Logout:** `POST /login/sair` (Route Handler em `app/login/sair/route.ts`) chama `clearSession()` e `redirect("/")`. O `AccountMenu` é um `<form method="post" action="/login/sair">` — **não** importa `app/` nem `services/`.
10. **`AccountMenu` acima do `DashboardHeader`**, alinhado à direita, na mesma coluna `max-w-md`. **Não** edite `dashboard-header.tsx` (fora do Owns). Textos: `Entrar` · `Cadastrar` · `Sair`. Sem lucide. Sem dropdown.
11. **Patch do `Dashboard`:** uma prop nova `email: string | null`. Não mude `dashboardView` / `latestReading` / `ACADEMIC_FOOTER`. Não passe `className`. Não busque sessão no client.
12. **`page.tsx` depois de `connection()`:** `getRecentReadings()` **depois** `getSession()` **depois** `<Dashboard initial={...} email={session?.email ?? null} />`. Sem `Promise.all` com `connection()`. Sem `export const dynamic`.
13. **Entrar em CRITICAL:** `enteredCritical(previous, current)` é `current === "CRITICAL" && previous !== "CRITICAL"`. `previous === null` (primeira leitura ou depois de `onReset`) **conta** como entrada — a demo pode ligar o mock já em `gas_leak_flame`. Permanecer em CRITICAL **não** reenvia (o throttle é a segunda trava, por usuário).
14. **Atualize `previous` no mesmo tick, antes do `await` do fetch.** Duas linhas CRITICAL no mesmo poll: a primeira notifica, a segunda vê `previous === "CRITICAL"` e cala. `onReset` zera `previous` para `null`.
15. **Destinatários:** todos os e-mails de `users.json`. Throttle **por e-mail**, ≥ **300_000 ms** (`now - lastSent >= 5 * 60 * 1000` envia; `===` envia; ` - 1` não). Relógio = `Date.now()`. Mapa **in-memory** (não persiste no JSON). Só grava `lastSent` se o `fetch` retornou `ok`.
16. **Sem usuários:** `console.info("[alerts] no users; skip")` e return. **Sem `RESEND_API_KEY`:** `console.info("[alerts] RESEND_API_KEY missing; skip")` e **não** chama `fetch`. Nenhum dos dois quebra o dashboard nem o SSE.
17. **Transport:** `POST https://api.resend.com/emails` com `Authorization: Bearer ${RESEND_API_KEY}`, JSON `{ from, to: [email], subject, text }`. `from` = `process.env.ALERT_FROM_EMAIL ?? "GasGuard <alertas@localhost>"`. Sem HTML. Resend 4xx/5xx → `console.error("[alerts] resend", status, body)` e `false`. Sem `nodemailer`.
18. **Assunto:** `source === "mock"` → `` `[SIMULAÇÃO] GasGuard: risco crítico` `` (espaço depois de `]`). `source === "board"` → `"GasGuard: risco crítico"` (sem prefixo). Corpo em texto, pt-BR, com título/orientação de `getScenario(scenarioId)` e a frase acadêmica no final. O web **não** inventa risco — só copia `level` / `scenarioId`.
19. **`instrumentation.ts` em `web/src/instrumentation.ts`.** `register()` só no Node, fora do build:
    ```ts
    process.env.NEXT_RUNTIME === "nodejs"
      && process.env.NEXT_PHASE !== "phase-production-build"
    ```
    Import dinâmico de `./services/alerts/alert-watcher` **dentro** de `register()`. Sem isso o `next build` fica com `setInterval` aberto e não termina. `startAlertWatcher` envolve `watchReadings` em try/catch e loga `[alerts]`.
20. **Dois watchers, dois polls.** Não “aproveite” o `watchReadings` do SSE. Não mova o watcher para `route.ts`. Não crie `/api/alerts`.
21. **UI login/cadastro:** mesma coluna `mx-auto flex min-h-dvh w-full max-w-md flex-col` do dashboard. Inputs nativos (não rode `shadcn add`). Rodapé acadêmico **copiado** (não importe `ACADEMIC_FOOTER` de `dashboard.tsx` — é `"use client"`). Já logado em `/login` ou `/cadastro` → `redirect("/")`.
22. **Testes de `services/`** começam com `vi.mock("server-only", () => ({}));` **antes** do import do módulo (igual W2). Testes que tocam cookie mockam `next/headers`. Testes de action mockam `next/navigation.redirect` para `throw`. **Nunca** faça `fetch` de verdade nem grave `web/.data/users.json` do repo — só tmp via `AUTH_USERS_PATH`.
23. **Textos (exatos):**
    - `"Informe um e-mail válido."`
    - `"A senha precisa ter pelo menos 8 caracteres."`
    - `"As senhas não coincidem."`
    - `"E-mail já cadastrado."`
    - `"E-mail ou senha inválidos."`
    - `"Configuração incompleta. Defina AUTH_SECRET."`
    - `"Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado."` (rodapé das páginas de auth e última linha do e-mail)

## Review Focus

Cada linha abaixo tem teste na task dona. São os casos que o mapa implica e que, se errados, ou a home 500 sem `AUTH_SECRET`, ou o mock crítico spamam e-mail, ou o `next build` não termina:

1. **Cookie adulterado / `AUTH_SECRET` ausente → sessão `null`, home renderiza.** Não throw. Task 2 e Task 4.
2. **Login com senha errada não revela se o e-mail existe.** Sempre `"E-mail ou senha inválidos."` Task 3.
3. **`enteredCritical` só na transição** (incluindo `null → CRITICAL`; excluindo `CRITICAL → CRITICAL`). Task 5.
4. **Throttle: 5 min − 1 ms bloqueia; 5 min exatos libera; por e-mail, não global.** Task 5.
5. **Sem `RESEND_API_KEY` ou sem usuários: log + zero `fetch`; watcher catch não derruba o processo.** Task 5 e Task 6.
6. **Assunto `[SIMULAÇÃO] ` só com `source === "mock"`.** `board` não leva o prefixo. Task 5.
7. **`register()` não parte no `phase-production-build`.** Task 6.
8. **`AccountMenu` / `AuthForm` não importam `services/`.** Task 3 e Task 4 (grep no passo de verificação).

O browser da Task 6 exercita o Done when visível (cadastro, menu, CRITICAL sem chave).

---

### Task 1: Senha `scrypt` + `users.json`

**Files:**
- Create: `web/src/services/auth/password.ts`
- Create: `web/src/services/auth/password.test.ts`
- Create: `web/src/services/auth/users.ts`
- Create: `web/src/services/auth/users.test.ts`

**Interfaces:**
- Consumes: `node:crypto`, `node:fs`, `node:path`. Nenhum tipo de `@/types`.
- Produces:
  - `export const MIN_PASSWORD_LENGTH = 8`
  - `export function hashPassword(password: string): string`
  - `export function verifyPassword(password: string, stored: string): boolean`
  - `export function passwordError(password: string): string | null`
  - `export interface StoredUser { email: string; passwordHash: string }`
  - `export function parseEmail(raw: string): string | null`
  - `export function getUsersPath(): string`
  - `export function listUsers(): StoredUser[]`
  - `export function findUser(email: string): StoredUser | null`
  - `export function createUser(email: string, password: string): "created" | "duplicate"`

- [ ] **Step 1: Write the failing test (password)**

Crie `web/src/services/auth/password.test.ts` inteiro:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hashPassword,
  passwordError,
  verifyPassword,
} from "./password";

describe("passwordError", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordError("")).toBe(
      "A senha precisa ter pelo menos 8 caracteres.",
    );
    expect(passwordError("1234567")).toBe(
      "A senha precisa ter pelo menos 8 caracteres.",
    );
  });

  it("accepts passwords with 8 or more characters", () => {
    expect(passwordError("12345678")).toBeNull();
    expect(passwordError("password1")).toBeNull();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("round-trips a password and rejects a wrong one", () => {
    const stored = hashPassword("password1");

    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword("password1", stored)).toBe(true);
    expect(verifyPassword("password2", stored)).toBe(false);
  });

  it("uses a new salt every time", () => {
    expect(hashPassword("password1")).not.toBe(hashPassword("password1"));
  });

  it("returns false for a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("password1", "not-a-hash")).toBe(false);
    expect(verifyPassword("password1", "aa:bb")).toBe(false);
    expect(verifyPassword("password1", "")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/services/auth/password.test.ts
```

Expected: FAIL — módulo `./password` não existe. Não passe. Não edite `vitest.config.mts`.

- [ ] **Step 3: Write minimal implementation (password)**

Crie `web/src/services/auth/password.ts` inteiro:

```ts
import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 8;

const KEY_LEN = 64;
const SALT_LEN = 16;

export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

function equalHex(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string, stored: string): boolean {
  const sep = stored.indexOf(":");
  if (sep === -1) return false;
  const saltHex = stored.slice(0, sep);
  const keyHex = stored.slice(sep + 1);
  let salt: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
  } catch {
    return false;
  }
  if (salt.length !== SALT_LEN) return false;
  const key = scryptSync(password, salt, KEY_LEN);
  return equalHex(key.toString("hex"), keyHex);
}
```

- [ ] **Step 4: Run password tests to verify they pass**

Run:

```bash
cd web && npx vitest run src/services/auth/password.test.ts
```

Expected: PASS (2 `describe`, 5 `it`).

- [ ] **Step 5: Write the failing test (users)**

Crie `web/src/services/auth/users.test.ts` inteiro:

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createUser,
  findUser,
  getUsersPath,
  listUsers,
  parseEmail,
} from "./users";

const originalPath = process.env.AUTH_USERS_PATH;

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-users-"));
  process.env.AUTH_USERS_PATH = join(tmpDir, "users.json");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tmpDir, { recursive: true, force: true });
  if (originalPath === undefined) delete process.env.AUTH_USERS_PATH;
  else process.env.AUTH_USERS_PATH = originalPath;
});

describe("parseEmail", () => {
  it("trims, lowercases, and rejects malformed addresses", () => {
    expect(parseEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(parseEmail("")).toBeNull();
    expect(parseEmail("sem-arroba")).toBeNull();
    expect(parseEmail("a@b")).toBeNull();
    expect(parseEmail("a b@c.com")).toBeNull();
  });
});

describe("users.json", () => {
  it("resolves AUTH_USERS_PATH when set, otherwise .data/users.json", () => {
    expect(getUsersPath()).toBe(join(tmpDir, "users.json"));
    delete process.env.AUTH_USERS_PATH;
    expect(getUsersPath()).toMatch(/\.data\/users\.json$/);
  });

  it("treats a missing file as an empty list", () => {
    expect(listUsers()).toEqual([]);
    expect(findUser("ada@example.com")).toBeNull();
  });

  it("creates a user and finds them case-insensitively", () => {
    expect(createUser("Ada@Example.COM", "password1")).toBe("created");
    expect(createUser("ada@example.com", "password1")).toBe("duplicate");

    const user = findUser("ADA@example.com");
    expect(user?.email).toBe("ada@example.com");
    expect(user?.passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);

    const raw = JSON.parse(
      readFileSync(join(tmpDir, "users.json"), "utf8"),
    ) as Array<{ email: string }>;
    expect(raw).toEqual([{ email: "ada@example.com", passwordHash: user?.passwordHash }]);
  });

  it("returns [] and logs when the JSON is invalid", () => {
    writeFileSync(join(tmpDir, "users.json"), "{not json", "utf8");

    expect(listUsers()).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "[auth] invalid users.json",
      expect.anything(),
    );
  });
});
```

- [ ] **Step 6: Run users tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/services/auth/users.test.ts
```

Expected: FAIL — módulo `./users` não existe.

- [ ] **Step 7: Write minimal implementation (users)**

Crie `web/src/services/auth/users.ts` inteiro:

```ts
import "server-only";

import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { hashPassword } from "./password";

export interface StoredUser {
  email: string;
  passwordHash: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

export function getUsersPath(): string {
  return resolve(process.cwd(), process.env.AUTH_USERS_PATH ?? ".data/users.json");
}

function readUsers(path: string): StoredUser[] {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.filter(isStoredUser);
  } catch (error) {
    console.error("[auth] invalid users.json", error);
    return [];
  }
}

function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== "object" || value === null) return false;
  const row = value as { email?: unknown; passwordHash?: unknown };
  return typeof row.email === "string" && typeof row.passwordHash === "string";
}

function writeUsers(path: string, users: StoredUser[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(users, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
}

export function listUsers(): StoredUser[] {
  return readUsers(getUsersPath());
}

export function findUser(email: string): StoredUser | null {
  const normalized = parseEmail(email);
  if (normalized === null) return null;
  return listUsers().find((user) => user.email === normalized) ?? null;
}

export function createUser(
  email: string,
  password: string,
): "created" | "duplicate" {
  const normalized = parseEmail(email);
  if (normalized === null) {
    throw new Error("createUser requires a valid email");
  }
  const path = getUsersPath();
  const users = readUsers(path);
  if (users.some((user) => user.email === normalized)) return "duplicate";
  users.push({ email: normalized, passwordHash: hashPassword(password) });
  writeUsers(path, users);
  return "created";
}
```

- [ ] **Step 8: Run users tests to verify they pass**

Run:

```bash
cd web && npx vitest run src/services/auth/users.test.ts src/services/auth/password.test.ts
```

Expected: PASS. Nenhum arquivo em `web/.data/` versionado. `createUser` **não** é chamado com e-mail inválido pelas actions (Task 3 chama `parseEmail` antes).

- [ ] **Step 9: Commit**

```bash
git add web/src/services/auth/password.ts web/src/services/auth/password.test.ts web/src/services/auth/users.ts web/src/services/auth/users.test.ts
git commit -m "$(cat <<'EOF'
feat(web): store local users with scrypt password hashes

EOF
)"
```

---

### Task 2: Cookie de sessão HMAC-SHA256

**Files:**
- Create: `web/src/services/auth/session.ts`
- Create: `web/src/services/auth/session.test.ts`

**Interfaces:**
- Consumes: `parseEmail` de `./users`; `createHmac` / `timingSafeEqual` de `node:crypto`; `cookies()` de `next/headers`.
- Produces:
  - `export const SESSION_COOKIE = "gg_session"`
  - `export function signSession(email: string, secret: string): string`
  - `export function verifySession(token: string, secret: string): { email: string } | null`
  - `export async function getSession(): Promise<{ email: string } | null>`
  - `export async function setSession(email: string): Promise<void>`
  - `export async function clearSession(): Promise<void>`

- [ ] **Step 1: Write the failing test**

Crie `web/src/services/auth/session.test.ts` inteiro:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

import {
  SESSION_COOKIE,
  clearSession,
  getSession,
  setSession,
  signSession,
  verifySession,
} from "./session";

const SECRET = "test-auth-secret";

beforeEach(() => {
  store.clear();
  process.env.AUTH_SECRET = SECRET;
  process.env.NODE_ENV = "test";
});

describe("signSession / verifySession", () => {
  it("round-trips the email and rejects a tampered token", () => {
    const token = signSession("ada@example.com", SECRET);

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(verifySession(token, SECRET)).toEqual({ email: "ada@example.com" });
    expect(verifySession(token.slice(0, -1) + "x", SECRET)).toBeNull();
    expect(verifySession("not-a-token", SECRET)).toBeNull();
    expect(verifySession(token, "other-secret")).toBeNull();
  });
});

describe("getSession / setSession / clearSession", () => {
  it("returns null when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    store.set(SESSION_COOKIE, signSession("ada@example.com", SECRET));

    expect(await getSession()).toBeNull();
  });

  it("returns null when the cookie is missing or tampered", async () => {
    expect(await getSession()).toBeNull();
    store.set(SESSION_COOKIE, "aaa.bbb");
    expect(await getSession()).toBeNull();
  });

  it("sets an httpOnly session cookie and clears it", async () => {
    await setSession("ada@example.com");

    expect(store.get(SESSION_COOKIE)).toBe(
      signSession("ada@example.com", SECRET),
    );
    expect(await getSession()).toEqual({ email: "ada@example.com" });

    await clearSession();
    expect(store.has(SESSION_COOKIE)).toBe(false);
    expect(await getSession()).toBeNull();
  });

  it("does not set a cookie when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    await expect(setSession("ada@example.com")).rejects.toThrow(
      "AUTH_SECRET missing",
    );
    expect(store.size).toBe(0);
  });
});
```

O teste de `setSession` acima checa só o **valor** no Map (o mock de `set` ignora options). As options `httpOnly` / `sameSite` / `path` / `secure` entram no código da Step 3; o teste da action (Task 3) não precisa relê-las. Não invente um mock que capture options — o contrato visível é valor + `getSession`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/services/auth/session.test.ts
```

Expected: FAIL — módulo `./session` não existe.

- [ ] **Step 3: Write minimal implementation**

Crie `web/src/services/auth/session.ts` inteiro:

```ts
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { parseEmail } from "./users";

export const SESSION_COOKIE = "gg_session";

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signSession(email: string, secret: string): string {
  const payload = Buffer.from(email, "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifySession(
  token: string,
  secret: string,
): { email: string } | null {
  const sep = token.lastIndexOf(".");
  if (sep === -1) return null;
  const payload = token.slice(0, sep);
  const mac = token.slice(sep + 1);
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (!equal(mac, expected)) return null;
  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const normalized = parseEmail(email);
  if (normalized === null) return null;
  return { email: normalized };
}

function authSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  return secret ? secret : null;
}

export async function getSession(): Promise<{ email: string } | null> {
  const secret = authSecret();
  if (secret === null) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token, secret);
}

export async function setSession(email: string): Promise<void> {
  const secret = authSecret();
  if (secret === null) throw new Error("AUTH_SECRET missing");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(email, secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd web && npx vitest run src/services/auth/session.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/services/auth/session.ts web/src/services/auth/session.test.ts
git commit -m "$(cat <<'EOF'
feat(web): sign the session cookie with HMAC-SHA256

EOF
)"
```

---

### Task 3: Páginas `/login` e `/cadastro`

**Files:**
- Create: `web/src/components/auth/auth-form.tsx`
- Create: `web/src/components/auth/auth-form.test.ts`
- Create: `web/src/app/login/page.tsx`
- Create: `web/src/app/login/page.test.ts`
- Create: `web/src/app/cadastro/page.tsx`
- Create: `web/src/app/cadastro/page.test.ts`

**Interfaces:**
- Consumes: `parseEmail`, `findUser`, `createUser` de `@/services/auth/users`; `passwordError`, `verifyPassword` de `@/services/auth/password`; `getSession`, `setSession` de `@/services/auth/session`; `buttonVariants` de `@/components/ui/button`; `cn` de `@/lib/utils`; `redirect` de `next/navigation`.
- Produces:
  - `export type AuthFormState = { error: string | null }`
  - `export type AuthFormMode = "login" | "signup"`
  - `export function authFormView(mode: AuthFormMode): { title: string; submitLabel: string; showConfirm: boolean; switchHref: string; switchLabel: string }`
  - `export function AuthForm(props: { mode: AuthFormMode; action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState> }): JSX.Element`
  - `export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState>` em `app/login/page.tsx`
  - `export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState>` em `app/cadastro/page.tsx`
  - `export default async function LoginPage(): Promise<JSX.Element>`
  - `export default async function SignupPage(): Promise<JSX.Element>`

- [ ] **Step 1: Write the failing test (form view)**

Crie `web/src/components/auth/auth-form.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import { authFormView } from "./auth-form";

describe("authFormView", () => {
  it("labels the login form in pt-BR", () => {
    expect(authFormView("login")).toEqual({
      title: "Entrar",
      submitLabel: "Entrar",
      showConfirm: false,
      switchHref: "/cadastro",
      switchLabel: "Não tem conta? Cadastre-se",
    });
  });

  it("labels the signup form in pt-BR", () => {
    expect(authFormView("signup")).toEqual({
      title: "Criar conta",
      submitLabel: "Cadastrar",
      showConfirm: true,
      switchHref: "/login",
      switchLabel: "Já tem conta? Entrar",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/auth/auth-form.test.ts
```

Expected: FAIL — módulo `./auth-form` não existe.

- [ ] **Step 3: Write AuthForm**

Crie `web/src/components/auth/auth-form.tsx` inteiro:

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AuthFormState = { error: string | null };
export type AuthFormMode = "login" | "signup";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function authFormView(mode: AuthFormMode) {
  if (mode === "login") {
    return {
      title: "Entrar" as const,
      submitLabel: "Entrar" as const,
      showConfirm: false,
      switchHref: "/cadastro" as const,
      switchLabel: "Não tem conta? Cadastre-se" as const,
    };
  }
  return {
    title: "Criar conta" as const,
    submitLabel: "Cadastrar" as const,
    showConfirm: true,
    switchHref: "/login" as const,
    switchLabel: "Já tem conta? Entrar" as const,
  };
}

export function AuthForm({
  mode,
  action,
}: {
  mode: AuthFormMode;
  action: (
    state: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
}) {
  const view = authFormView(mode);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">E-mail</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Senha</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          className={INPUT_CLASS}
        />
      </label>
      {view.showConfirm ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Confirmar senha</span>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={INPUT_CLASS}
          />
        </label>
      ) : null}
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        {view.submitLabel}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href={view.switchHref} className="underline-offset-4 hover:underline">
          {view.switchLabel}
        </Link>
      </p>
    </form>
  );
}
```

`authFormView` **não** inclui `title` no JSX do form — o `<h1>` fica na página (Task 3, pages). O form só usa submit / confirm / switch.

- [ ] **Step 4: Run form view tests**

Run:

```bash
cd web && npx vitest run src/components/auth/auth-form.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing tests (login action + page)**

Crie `web/src/app/login/page.test.ts` inteiro:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createUser } from "@/services/auth/users";
import { getSession } from "@/services/auth/session";
import { redirect } from "next/navigation";

import { login } from "./page";
import LoginPage from "./page";

const originalUsers = process.env.AUTH_USERS_PATH;
const originalSecret = process.env.AUTH_SECRET;

let tmpDir: string;

function form(email: string, password: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-login-"));
  process.env.AUTH_USERS_PATH = join(tmpDir, "users.json");
  process.env.AUTH_SECRET = "test-auth-secret";
  store.clear();
  vi.mocked(redirect).mockClear();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  if (originalUsers === undefined) delete process.env.AUTH_USERS_PATH;
  else process.env.AUTH_USERS_PATH = originalUsers;
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
});

describe("login", () => {
  it("rejects a malformed email", async () => {
    await expect(login({ error: null }, form("sem-arroba", "password1"))).resolves.toEqual({
      error: "Informe um e-mail válido.",
    });
  });

  it("hides whether the email exists", async () => {
    createUser("ada@example.com", "password1");

    await expect(
      login({ error: null }, form("ada@example.com", "wrong-password")),
    ).resolves.toEqual({ error: "E-mail ou senha inválidos." });
    await expect(
      login({ error: null }, form("nobody@example.com", "password1")),
    ).resolves.toEqual({ error: "E-mail ou senha inválidos." });
  });

  it("returns a config error when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    createUser("ada@example.com", "password1");

    await expect(
      login({ error: null }, form("ada@example.com", "password1")),
    ).resolves.toEqual({
      error: "Configuração incompleta. Defina AUTH_SECRET.",
    });
    expect(store.size).toBe(0);
  });

  it("sets the session and redirects home", async () => {
    createUser("ada@example.com", "password1");

    await expect(
      login({ error: null }, form("Ada@Example.COM", "password1")),
    ).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(await getSession()).toEqual({ email: "ada@example.com" });
  });
});

describe("LoginPage", () => {
  it("redirects home when a session already exists", async () => {
    createUser("ada@example.com", "password1");
    await login({ error: null }, form("ada@example.com", "password1")).catch(
      () => {},
    );

    await expect(LoginPage()).rejects.toThrow("REDIRECT:/");
  });
});
```

- [ ] **Step 6: Run login tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/app/login/page.test.ts
```

Expected: FAIL — `./page` não existe.

- [ ] **Step 7: Write login page + action**

Crie `web/src/app/login/page.tsx` inteiro:

```tsx
import { redirect } from "next/navigation";

import {
  AuthForm,
  type AuthFormState,
} from "@/components/auth/auth-form";
import { verifyPassword } from "@/services/auth/password";
import { getSession, setSession } from "@/services/auth/session";
import { findUser, parseEmail } from "@/services/auth/users";

const FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = parseEmail(String(formData.get("email") ?? ""));
  if (email === null) {
    return { error: "Informe um e-mail válido." };
  }
  const password = String(formData.get("password") ?? "");
  if (!process.env.AUTH_SECRET) {
    return { error: "Configuração incompleta. Defina AUTH_SECRET." };
  }
  const user = findUser(email);
  if (user === null || !verifyPassword(password, user.passwordHash)) {
    return { error: "E-mail ou senha inválidos." };
  }
  await setSession(email);
  redirect("/");
}

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">GasGuard</p>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        </div>
        <AuthForm mode="login" action={login} />
      </main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground">{FOOTER}</footer>
    </div>
  );
}
```

- [ ] **Step 8: Run login tests to verify they pass**

Run:

```bash
cd web && npx vitest run src/app/login/page.test.ts
```

Expected: PASS. O `login` no teste de `LoginPage` chama `createUser` + `login` para popular o cookie mockado; o `catch` engole o `REDIRECT:/` do próprio `login`.

- [ ] **Step 9: Write the failing tests (signup)**

Crie `web/src/app/cadastro/page.test.ts` inteiro:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { findUser } from "@/services/auth/users";
import { getSession } from "@/services/auth/session";
import { redirect } from "next/navigation";

import { signup } from "./page";
import SignupPage from "./page";

const originalUsers = process.env.AUTH_USERS_PATH;
const originalSecret = process.env.AUTH_SECRET;

let tmpDir: string;

function form(email: string, password: string, confirm: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  data.set("confirm", confirm);
  return data;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-signup-"));
  process.env.AUTH_USERS_PATH = join(tmpDir, "users.json");
  process.env.AUTH_SECRET = "test-auth-secret";
  store.clear();
  vi.mocked(redirect).mockClear();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  if (originalUsers === undefined) delete process.env.AUTH_USERS_PATH;
  else process.env.AUTH_USERS_PATH = originalUsers;
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
});

describe("signup", () => {
  it("rejects a malformed email", async () => {
    await expect(
      signup({ error: null }, form("sem-arroba", "password1", "password1")),
    ).resolves.toEqual({ error: "Informe um e-mail válido." });
  });

  it("rejects a short password", async () => {
    await expect(
      signup({ error: null }, form("ada@example.com", "1234567", "1234567")),
    ).resolves.toEqual({
      error: "A senha precisa ter pelo menos 8 caracteres.",
    });
  });

  it("rejects when the passwords do not match", async () => {
    await expect(
      signup({ error: null }, form("ada@example.com", "password1", "password2")),
    ).resolves.toEqual({ error: "As senhas não coincidem." });
  });

  it("rejects a duplicate email", async () => {
    await signup({ error: null }, form("ada@example.com", "password1", "password1")).catch(
      () => {},
    );
    store.clear();

    await expect(
      signup({ error: null }, form("ada@example.com", "password1", "password1")),
    ).resolves.toEqual({ error: "E-mail já cadastrado." });
  });

  it("returns a config error when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;

    await expect(
      signup({ error: null }, form("ada@example.com", "password1", "password1")),
    ).resolves.toEqual({
      error: "Configuração incompleta. Defina AUTH_SECRET.",
    });
    expect(findUser("ada@example.com")).toBeNull();
  });

  it("creates the user, sets the session and redirects home", async () => {
    await expect(
      signup({ error: null }, form("Ada@Example.COM", "password1", "password1")),
    ).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(findUser("ada@example.com")?.email).toBe("ada@example.com");
    expect(await getSession()).toEqual({ email: "ada@example.com" });
  });
});

describe("SignupPage", () => {
  it("redirects home when a session already exists", async () => {
    await signup(
      { error: null },
      form("ada@example.com", "password1", "password1"),
    ).catch(() => {});

    await expect(SignupPage()).rejects.toThrow("REDIRECT:/");
  });
});
```

- [ ] **Step 10: Run signup tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/app/cadastro/page.test.ts
```

Expected: FAIL — `./page` não existe.

- [ ] **Step 11: Write cadastro page + action**

Crie `web/src/app/cadastro/page.tsx` inteiro:

```tsx
import { redirect } from "next/navigation";

import {
  AuthForm,
  type AuthFormState,
} from "@/components/auth/auth-form";
import { passwordError } from "@/services/auth/password";
import { getSession, setSession } from "@/services/auth/session";
import { createUser, parseEmail } from "@/services/auth/users";

const FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = parseEmail(String(formData.get("email") ?? ""));
  if (email === null) {
    return { error: "Informe um e-mail válido." };
  }
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const passwordProblem = passwordError(password);
  if (passwordProblem) return { error: passwordProblem };
  if (password !== confirm) {
    return { error: "As senhas não coincidem." };
  }
  if (!process.env.AUTH_SECRET) {
    return { error: "Configuração incompleta. Defina AUTH_SECRET." };
  }
  if (createUser(email, password) === "duplicate") {
    return { error: "E-mail já cadastrado." };
  }
  await setSession(email);
  redirect("/");
}

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">GasGuard</p>
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        </div>
        <AuthForm mode="signup" action={signup} />
      </main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground">{FOOTER}</footer>
    </div>
  );
}
```

Ordem no cadastro: e-mail → tamanho da senha → confirmação → `AUTH_SECRET` → persistir. Sem secret **não** chama `createUser` (o teste “config error” exige `findUser === null`).

- [ ] **Step 12: Run signup tests to verify they pass**

Run:

```bash
cd web && npx vitest run src/app/cadastro/page.test.ts src/app/login/page.test.ts src/components/auth/auth-form.test.ts
```

Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add web/src/components/auth/auth-form.tsx web/src/components/auth/auth-form.test.ts web/src/app/login/page.tsx web/src/app/login/page.test.ts web/src/app/cadastro/page.tsx web/src/app/cadastro/page.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add local login and signup pages

EOF
)"
```

---

### Task 4: `AccountMenu` + logout + patch do dashboard

**Files:**
- Create: `web/src/components/auth/account-menu.tsx`
- Create: `web/src/components/auth/account-menu.test.ts`
- Create: `web/src/app/login/sair/route.ts`
- Create: `web/src/app/login/sair/route.test.ts`
- Modify: `web/src/app/page.tsx`
- Modify: `web/src/app/page.test.ts`
- Modify: `web/src/components/dashboard/dashboard.tsx`

**Interfaces:**
- Consumes: `getSession` de `@/services/auth/session`; `clearSession` de `@/services/auth/session`; `Dashboard` atual (`initial`); `redirect` de `next/navigation`.
- Produces:
  - `export function accountMenuView(email: string | null): GuestView | SignedInView`
  - `export function AccountMenu(props: { email: string | null }): JSX.Element`
  - `export async function POST(): Promise<never>` em `app/login/sair/route.ts` (`redirect("/")`)
  - `Dashboard({ initial, email }: { initial: RecentReadings | null; email: string | null })`
  - `Home` passa `email={session?.email ?? null}` **depois** de `connection()` e `getRecentReadings()`

- [ ] **Step 1: Write the failing test (menu view)**

Crie `web/src/components/auth/account-menu.test.ts` inteiro:

```ts
import { describe, expect, it } from "vitest";

import { accountMenuView } from "./account-menu";

describe("accountMenuView", () => {
  it("points guests to login and signup", () => {
    expect(accountMenuView(null)).toEqual({
      state: "guest",
      loginHref: "/login",
      loginLabel: "Entrar",
      signupHref: "/cadastro",
      signupLabel: "Cadastrar",
    });
  });

  it("shows the email and posts logout to /login/sair", () => {
    expect(accountMenuView("ada@example.com")).toEqual({
      state: "signed-in",
      email: "ada@example.com",
      logoutLabel: "Sair",
      logoutAction: "/login/sair",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && npx vitest run src/components/auth/account-menu.test.ts
```

Expected: FAIL — módulo `./account-menu` não existe.

- [ ] **Step 3: Write AccountMenu**

Crie `web/src/components/auth/account-menu.tsx` inteiro:

```tsx
import Link from "next/link";

export function accountMenuView(email: string | null) {
  if (email === null) {
    return {
      state: "guest" as const,
      loginHref: "/login" as const,
      loginLabel: "Entrar" as const,
      signupHref: "/cadastro" as const,
      signupLabel: "Cadastrar" as const,
    };
  }
  return {
    state: "signed-in" as const,
    email,
    logoutLabel: "Sair" as const,
    logoutAction: "/login/sair" as const,
  };
}

export function AccountMenu({ email }: { email: string | null }) {
  const view = accountMenuView(email);

  if (view.state === "guest") {
    return (
      <nav className="flex items-center justify-end gap-3 text-sm">
        <Link
          href={view.loginHref}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          {view.loginLabel}
        </Link>
        <Link
          href={view.signupHref}
          className="font-medium underline-offset-4 hover:underline"
        >
          {view.signupLabel}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-end gap-3 text-sm">
      <span className="truncate text-muted-foreground">{view.email}</span>
      <form action={view.logoutAction} method="post">
        <button
          type="submit"
          className="font-medium underline-offset-4 hover:underline"
        >
          {view.logoutLabel}
        </button>
      </form>
    </nav>
  );
}
```

Sem `"use client"` — o menu não tem estado. O pai `Dashboard` já é client; o Next coloca o menu no bundle do cliente. Não importe `services/`. Não importe `./page`.

- [ ] **Step 4: Run menu tests**

Run:

```bash
cd web && npx vitest run src/components/auth/account-menu.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing test (logout route)**

Crie `web/src/app/login/sair/route.test.ts` inteiro:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { SESSION_COOKIE, setSession } from "@/services/auth/session";
import { redirect } from "next/navigation";

import { POST } from "./route";

beforeEach(async () => {
  store.clear();
  process.env.AUTH_SECRET = "test-auth-secret";
  vi.mocked(redirect).mockClear();
  await setSession("ada@example.com");
});

describe("POST /login/sair", () => {
  it("clears the session cookie and redirects home", async () => {
    expect(store.has(SESSION_COOKIE)).toBe(true);

    await expect(POST()).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(store.has(SESSION_COOKIE)).toBe(false);
  });
});
```

- [ ] **Step 6: Run logout tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/app/login/sair/route.test.ts
```

Expected: FAIL — `./route` não existe.

- [ ] **Step 7: Write logout route**

Crie `web/src/app/login/sair/route.ts` inteiro:

```ts
import { redirect } from "next/navigation";

import { clearSession } from "@/services/auth/session";

export async function POST() {
  await clearSession();
  redirect("/");
}
```

Só `POST`. Sem `GET` (um prefetch de link não pode deslogar).

- [ ] **Step 8: Run logout tests**

Run:

```bash
cd web && npx vitest run src/app/login/sair/route.test.ts
```

Expected: PASS.

- [ ] **Step 9: Write the failing test (page passa `email`)**

Substitua `web/src/app/page.test.ts` inteiro:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock("@/services/report/report-service", () => ({
  getRecentReadings: vi.fn(),
}));

vi.mock("@/services/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/components/dashboard/dashboard", () => ({
  Dashboard: function Dashboard() {
    return null;
  },
}));

import { Dashboard } from "@/components/dashboard/dashboard";
import { getSession } from "@/services/auth/session";
import { getRecentReadings } from "@/services/report/report-service";
import type { RecentReadings } from "@/types";
import { connection } from "next/server";

import Home from "./page";

type HomeElement = {
  type: unknown;
  props: { initial: RecentReadings | null; email: string | null };
};

const getRecent = vi.mocked(getRecentReadings);
const readSession = vi.mocked(getSession);
const waitForRequest = vi.mocked(connection);

const SNAPSHOT: RecentReadings = {
  date: "2026-11-12",
  readings: [],
  events: [],
};

describe("Home", () => {
  beforeEach(() => {
    waitForRequest.mockReset();
    waitForRequest.mockResolvedValue(undefined);
    getRecent.mockReset();
    getRecent.mockResolvedValue(null);
    readSession.mockReset();
    readSession.mockResolvedValue(null);
  });

  it("does not read the CSV or the session until connection() resolves", async () => {
    let release = () => {};
    waitForRequest.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const pending = Home();
    await Promise.resolve();

    expect(waitForRequest).toHaveBeenCalledOnce();
    expect(getRecent).not.toHaveBeenCalled();
    expect(readSession).not.toHaveBeenCalled();

    release();
    const ui = (await pending) as HomeElement;

    expect(getRecent).toHaveBeenCalledOnce();
    expect(readSession).toHaveBeenCalledOnce();
    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBeNull();
    expect(ui.props.email).toBeNull();
  });

  it("passes the snapshot and session email to Dashboard", async () => {
    getRecent.mockResolvedValue(SNAPSHOT);
    readSession.mockResolvedValue({ email: "ada@example.com" });

    const ui = (await Home()) as HomeElement;

    expect(ui.type).toBe(Dashboard);
    expect(ui.props.initial).toBe(SNAPSHOT);
    expect(ui.props.email).toBe("ada@example.com");
  });

  it("passes email=null when getSession returns null", async () => {
    const ui = (await Home()) as unknown as HomeElement;
    expect(ui.props.email).toBeNull();
  });
});
```

- [ ] **Step 10: Run page tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/app/page.test.ts
```

Expected: FAIL — `ui.props.email` é `undefined` (a page ainda não lê sessão). Não “passe” acrescentando `email` só no mock.

- [ ] **Step 11: Patch page.tsx e dashboard.tsx**

Substitua `web/src/app/page.tsx` inteiro:

```tsx
import { connection } from "next/server";

import { Dashboard } from "@/components/dashboard/dashboard";
import { getSession } from "@/services/auth/session";
import { getRecentReadings } from "@/services/report/report-service";

export default async function Home() {
  await connection();
  const initial = await getRecentReadings();
  const session = await getSession();
  return <Dashboard initial={initial} email={session?.email ?? null} />;
}
```

Em `web/src/components/dashboard/dashboard.tsx`, altere **somente** o que segue (o resto do arquivo permanece byte-a-byte o de W4):

1. Importar o menu:

```tsx
import { AccountMenu } from "@/components/auth/account-menu";
```

2. Trocar a assinatura de `Dashboard` para receber `email`:

```tsx
export function Dashboard({
  initial,
  email,
}: {
  initial: RecentReadings | null;
  email: string | null;
}) {
```

3. Como **primeiro** filho de `<main>`, antes de `DashboardHeader`:

```tsx
        <AccountMenu email={email} />
```

O arquivo completo fica:

```tsx
"use client";

import { useState } from "react";

import { AccountMenu } from "@/components/auth/account-menu";
import { useReadings } from "@/hooks/use-readings";
import type { EventFilterState, Reading, RecentReadings } from "@/types";

import { DashboardHeader } from "./dashboard-header";
import { DEFAULT_EVENT_FILTER, EventFilters } from "./event-filters";
import { EventList } from "./event-list";
import { MetricsGrid } from "./metrics-grid";
import { ReadingsChart } from "./readings-chart";
import { RiskCard } from "./risk-card";

export const ACADEMIC_FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

export function latestReading(readings: Reading[]): Reading | null {
  return readings.length === 0 ? null : readings[readings.length - 1];
}

export function dashboardView(
  readings: Reading[],
  filter: EventFilterState,
) {
  return {
    latest: latestReading(readings),
    readings,
    filter,
    footer: ACADEMIC_FOOTER,
  };
}

export function Dashboard({
  initial,
  email,
}: {
  initial: RecentReadings | null;
  email: string | null;
}) {
  const { readings, events, connection, secondsSinceLast } =
    useReadings(initial);
  const [filter, setFilter] = useState<EventFilterState>(DEFAULT_EVENT_FILTER);
  const view = dashboardView(readings, filter);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <AccountMenu email={email} />
        <DashboardHeader
          connection={connection}
          secondsSinceLast={secondsSinceLast}
        />
        <RiskCard reading={view.latest} connection={connection} />
        <MetricsGrid reading={view.latest} />
        <ReadingsChart readings={view.readings} />
        <div className="space-y-3">
          <EventFilters value={view.filter} onChange={setFilter} />
          <EventList events={events} filter={view.filter} />
        </div>
      </main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground">
        {view.footer}
      </footer>
    </div>
  );
}
```

Não mude `dashboard.test.ts` — ele só importa `dashboardView` / `latestReading` / `ACADEMIC_FOOTER`, cuja assinatura não mudou. Não edite `dashboard-header.tsx`.

- [ ] **Step 12: Run page + dashboard tests**

Run:

```bash
cd web && npx vitest run src/app/page.test.ts src/components/dashboard/dashboard.test.ts src/components/auth/account-menu.test.ts src/app/login/sair/route.test.ts
```

Expected: PASS (page 3 `it`; dashboard 4 `it` de W4 intactos).

- [ ] **Step 13: Commit**

```bash
git add web/src/components/auth/account-menu.tsx web/src/components/auth/account-menu.test.ts web/src/app/login/sair/route.ts web/src/app/login/sair/route.test.ts web/src/app/page.tsx web/src/app/page.test.ts web/src/components/dashboard/dashboard.tsx
git commit -m "$(cat <<'EOF'
feat(web): show the account menu on the public dashboard

EOF
)"
```

---

### Task 5: Política de alerta + transport Resend

**Files:**
- Create: `web/src/services/alerts/alert-policy.ts`
- Create: `web/src/services/alerts/alert-policy.test.ts`
- Create: `web/src/services/alerts/send-alert.ts`
- Create: `web/src/services/alerts/send-alert.test.ts`

**Interfaces:**
- Consumes: `getScenario` de `@/lib/scenarios`; `Reading`, `RiskLevel` de `@/types`.
- Produces:
  - `export const ALERT_THROTTLE_MS = 5 * 60 * 1000`
  - `export function enteredCritical(previous: RiskLevel | null, current: RiskLevel): boolean`
  - `export function canSendAlert(lastSentAt: number | undefined, now: number): boolean`
  - `export function alertSubject(source: Reading["source"]): string`
  - `export function alertText(reading: Reading): string`
  - `export async function sendAlertEmail(input: { to: string; subject: string; text: string; apiKey: string; from: string; fetchImpl?: typeof fetch }): Promise<boolean>`

- [ ] **Step 1: Write the failing test (policy)**

Crie `web/src/services/alerts/alert-policy.test.ts` inteiro:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getScenario } from "@/lib/scenarios";
import type { Reading, RiskLevel } from "@/types";

import {
  ALERT_THROTTLE_MS,
  alertSubject,
  alertText,
  canSendAlert,
  enteredCritical,
} from "./alert-policy";

function reading(
  level: RiskLevel,
  source: Reading["source"] = "mock",
): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source,
    level,
    scenarioId: 1,
    mq6: { value: 1120, base: 290, level: 2 },
    mq2: { value: 1350, base: 900, level: 1 },
    flame: true,
    temperature: { celsius: 29.1, limit: 28.4, high: true },
    motion: false,
    stoveOn: true,
    secondsWithoutMotion: 42,
  };
}

describe("enteredCritical", () => {
  it("is true only when the level becomes CRITICAL", () => {
    expect(enteredCritical(null, "CRITICAL")).toBe(true);
    expect(enteredCritical("HIGH", "CRITICAL")).toBe(true);
    expect(enteredCritical("NORMAL", "CRITICAL")).toBe(true);
    expect(enteredCritical("CRITICAL", "CRITICAL")).toBe(false);
    expect(enteredCritical(null, "HIGH")).toBe(false);
    expect(enteredCritical("CRITICAL", "NORMAL")).toBe(false);
    expect(enteredCritical("ALERT", "HIGH")).toBe(false);
  });
});

describe("canSendAlert", () => {
  it("allows the first send and the 5 minute boundary, not a millisecond before", () => {
    const now = 1_000_000;
    expect(canSendAlert(undefined, now)).toBe(true);
    expect(canSendAlert(now, now)).toBe(false);
    expect(canSendAlert(now - (ALERT_THROTTLE_MS - 1), now)).toBe(false);
    expect(canSendAlert(now - ALERT_THROTTLE_MS, now)).toBe(true);
    expect(ALERT_THROTTLE_MS).toBe(5 * 60 * 1000);
  });
});

describe("alertSubject / alertText", () => {
  it("prefixes [SIMULAÇÃO] only for mock readings", () => {
    expect(alertSubject("mock")).toBe("[SIMULAÇÃO] GasGuard: risco crítico");
    expect(alertSubject("board")).toBe("GasGuard: risco crítico");
  });

  it("copies scenario copy and the academic disclaimer", () => {
    const scenario = getScenario(1);
    const body = alertText(reading("CRITICAL", "mock"));
    expect(body).toContain("Nível: Crítico");
    expect(body).toContain(`Cenário: ${scenario.title}`);
    expect(body).toContain(`Orientação: ${scenario.guidance}`);
    expect(body).toContain("Horário: 2026-11-12T14:32:08");
    expect(body).toContain(
      "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.",
    );
    expect(body).not.toMatch(/certificado de proteção|detector certificado de gás/i);
  });
});
```

- [ ] **Step 2: Run policy tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/services/alerts/alert-policy.test.ts
```

Expected: FAIL — módulo `./alert-policy` não existe.

- [ ] **Step 3: Write alert-policy**

Crie `web/src/services/alerts/alert-policy.ts` inteiro:

```ts
import "server-only";

import { getScenario } from "@/lib/scenarios";
import type { Reading, RiskLevel } from "@/types";

export const ALERT_THROTTLE_MS = 5 * 60 * 1000;

export function enteredCritical(
  previous: RiskLevel | null,
  current: RiskLevel,
): boolean {
  return current === "CRITICAL" && previous !== "CRITICAL";
}

export function canSendAlert(
  lastSentAt: number | undefined,
  now: number,
): boolean {
  if (lastSentAt === undefined) return true;
  return now - lastSentAt >= ALERT_THROTTLE_MS;
}

export function alertSubject(source: Reading["source"]): string {
  const title = "GasGuard: risco crítico";
  return source === "mock" ? `[SIMULAÇÃO] ${title}` : title;
}

export function alertText(reading: Reading): string {
  const scenario = getScenario(reading.scenarioId);
  return [
    "Nível: Crítico",
    `Cenário: ${scenario.title}`,
    `Orientação: ${scenario.guidance}`,
    `Horário: ${reading.timestamp}`,
    "",
    "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.",
  ].join("\n");
}
```

- [ ] **Step 4: Run policy tests**

Run:

```bash
cd web && npx vitest run src/services/alerts/alert-policy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing test (Resend transport)**

Crie `web/src/services/alerts/send-alert.test.ts` inteiro:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendAlertEmail } from "./send-alert";

describe("sendAlertEmail", () => {
  it("POSTs JSON to api.resend.com/emails and returns true on 2xx", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      expect(input).toBe("https://api.resend.com/emails");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Authorization: "Bearer re_test",
        "Content-Type": "application/json",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        from: "GasGuard <alertas@localhost>",
        to: ["ada@example.com"],
        subject: "[SIMULAÇÃO] GasGuard: risco crítico",
        text: "corpo",
      });
      return new Response("{}", { status: 200 });
    });

    await expect(
      sendAlertEmail({
        to: "ada@example.com",
        subject: "[SIMULAÇÃO] GasGuard: risco crítico",
        text: "corpo",
        apiKey: "re_test",
        from: "GasGuard <alertas@localhost>",
        fetchImpl,
      }),
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns false and logs when Resend rejects the request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("nope", { status: 403 }),
    );

    await expect(
      sendAlertEmail({
        to: "ada@example.com",
        subject: "x",
        text: "y",
        apiKey: "re_test",
        from: "GasGuard <alertas@localhost>",
        fetchImpl,
      }),
    ).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[alerts] resend",
      403,
      "nope",
    );
  });
});
```

- [ ] **Step 6: Run send tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/services/alerts/send-alert.test.ts
```

Expected: FAIL — módulo `./send-alert` não existe.

- [ ] **Step 7: Write send-alert**

Crie `web/src/services/alerts/send-alert.ts` inteiro:

```ts
import "server-only";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export async function sendAlertEmail(input: {
  to: string;
  subject: string;
  text: string;
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (response.ok) return true;
  console.error("[alerts] resend", response.status, await response.text());
  return false;
}
```

Não chame `fetch` global nos testes — sempre passe `fetchImpl`. O watcher (Task 6) omite `fetchImpl` e usa o `fetch` real só em runtime.

- [ ] **Step 8: Run send tests**

Run:

```bash
cd web && npx vitest run src/services/alerts/send-alert.test.ts src/services/alerts/alert-policy.test.ts
```

Expected: PASS. Zero chamadas de rede.

- [ ] **Step 9: Commit**

```bash
git add web/src/services/alerts/alert-policy.ts web/src/services/alerts/alert-policy.test.ts web/src/services/alerts/send-alert.ts web/src/services/alerts/send-alert.test.ts
git commit -m "$(cat <<'EOF'
feat(web): build the critical-alert email payload for Resend

EOF
)"
```

---

### Task 6: Watcher no processo + `instrumentation.ts` + verificação

**Files:**
- Create: `web/src/services/alerts/alert-watcher.ts`
- Create: `web/src/services/alerts/alert-watcher.test.ts`
- Create: `web/src/instrumentation.ts`

**Interfaces:**
- Consumes: `watchReadings` de `@/services/report/report-service`; `listUsers` de `@/services/auth/users`; `enteredCritical`, `canSendAlert`, `alertSubject`, `alertText` de `./alert-policy`; `sendAlertEmail` de `./send-alert`; `Reading`, `RiskLevel` de `@/types`.
- Produces:
  - `export function shouldStartAlertWatcher(runtime?: string, phase?: string): boolean`
  - `export async function handleCriticalReading(input: HandleCriticalInput): Promise<void>`
  - `export function startAlertWatcher(): () => void`
  - `export async function register(): Promise<void>` em `web/src/instrumentation.ts`

- [ ] **Step 1: Write the failing test (watcher)**

Crie `web/src/services/alerts/alert-watcher.test.ts` inteiro:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/services/report/report-service", () => ({
  watchReadings: vi.fn(),
}));

vi.mock("@/services/auth/users", () => ({
  listUsers: vi.fn(() => []),
}));

import { listUsers } from "@/services/auth/users";
import { watchReadings } from "@/services/report/report-service";
import type { Reading, RiskLevel } from "@/types";

import {
  handleCriticalReading,
  shouldStartAlertWatcher,
  startAlertWatcher,
} from "./alert-watcher";

function reading(
  level: RiskLevel,
  source: Reading["source"] = "mock",
): Reading {
  return {
    timestamp: "2026-11-12T14:32:08",
    source,
    level,
    scenarioId: 1,
    mq6: { value: 1120, base: 290, level: 2 },
    mq2: { value: 1350, base: 900, level: 1 },
    flame: true,
    temperature: { celsius: 29.1, limit: 28.4, high: true },
    motion: false,
    stoveOn: true,
    secondsWithoutMotion: 42,
  };
}

const send = vi.fn<(...args: unknown[]) => Promise<boolean>>();
const lastSent = new Map<string, number>();

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue(true);
  lastSent.clear();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("shouldStartAlertWatcher", () => {
  it("runs only on the Node server, never during next build", () => {
    expect(shouldStartAlertWatcher("nodejs", "phase-development-server")).toBe(
      true,
    );
    expect(shouldStartAlertWatcher("nodejs", "phase-production-server")).toBe(
      true,
    );
    expect(shouldStartAlertWatcher("nodejs", "phase-production-build")).toBe(
      false,
    );
    expect(shouldStartAlertWatcher("edge", "phase-development-server")).toBe(
      false,
    );
    expect(shouldStartAlertWatcher(undefined, undefined)).toBe(false);
  });
});

describe("handleCriticalReading", () => {
  it("logs and skips fetch when there are no users", async () => {
    await handleCriticalReading({
      previousLevel: "HIGH",
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [],
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(console.info).toHaveBeenCalledWith("[alerts] no users; skip");
    expect(send).not.toHaveBeenCalled();
  });

  it("logs and skips fetch when RESEND_API_KEY is missing", async () => {
    await handleCriticalReading({
      previousLevel: "HIGH",
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [{ email: "ada@example.com" }],
      lastSent,
      apiKey: undefined,
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(console.info).toHaveBeenCalledWith(
      "[alerts] RESEND_API_KEY missing; skip",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send while the level stays CRITICAL", async () => {
    await handleCriticalReading({
      previousLevel: "CRITICAL",
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [{ email: "ada@example.com" }],
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends to each user and throttles the same address for 5 minutes", async () => {
    const users = [
      { email: "ada@example.com" },
      { email: "bob@example.com" },
    ];
    const first = reading("CRITICAL", "mock");

    await handleCriticalReading({
      previousLevel: "HIGH",
      reading: first,
      now: 10_000,
      users,
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, {
      to: "ada@example.com",
      subject: "[SIMULAÇÃO] GasGuard: risco crítico",
      text: expect.stringContaining("Nível: Crítico"),
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
    });
    expect(lastSent.get("ada@example.com")).toBe(10_000);

    send.mockClear();
    await handleCriticalReading({
      previousLevel: "NORMAL",
      reading: reading("CRITICAL", "board"),
      now: 10_000 + 5 * 60 * 1000 - 1,
      users,
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(send).not.toHaveBeenCalled();

    send.mockClear();
    await handleCriticalReading({
      previousLevel: "NORMAL",
      reading: reading("CRITICAL", "board"),
      now: 10_000 + 5 * 60 * 1000,
      users,
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      subject: "GasGuard: risco crítico",
    });
  });

  it("does not record lastSent when send returns false", async () => {
    send.mockResolvedValue(false);
    await handleCriticalReading({
      previousLevel: null,
      reading: reading("CRITICAL"),
      now: 1_000,
      users: [{ email: "ada@example.com" }],
      lastSent,
      apiKey: "re_test",
      from: "GasGuard <alertas@localhost>",
      send,
    });
    expect(lastSent.has("ada@example.com")).toBe(false);
  });
});

describe("startAlertWatcher", () => {
  type WatchHandlers = {
    onReading: (reading: Reading) => void;
    onReset: () => void;
  };

  const watch = vi.mocked(watchReadings);
  const users = vi.mocked(listUsers);
  let handlers: WatchHandlers | undefined;
  const stop = vi.fn();

  beforeEach(() => {
    handlers = undefined;
    stop.mockReset();
    watch.mockImplementation((next) => {
      handlers = next;
      return stop;
    });
    users.mockReturnValue([{ email: "ada@example.com", passwordHash: "x:y" }]);
  });

  it("updates previous before awaiting send so a second CRITICAL in the same tick is silent", async () => {
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    send.mockImplementation(async () => {
      await pending;
      return true;
    });

    vi.stubEnv("RESEND_API_KEY", "re_test");
    startAlertWatcher(send);

    handlers?.onReading(reading("CRITICAL"));
    handlers?.onReading(reading("CRITICAL"));
    release();
    await Promise.resolve();
    await Promise.resolve();

    expect(send).toHaveBeenCalledOnce();
  });

  it("treats onReset as previous=null so the next CRITICAL notifies again", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    startAlertWatcher(send);

    handlers?.onReading(reading("CRITICAL"));
    await Promise.resolve();
    expect(send).toHaveBeenCalledOnce();

    handlers?.onReset();
    send.mockClear();
    handlers?.onReading(reading("CRITICAL"));
    await Promise.resolve();
    expect(send).toHaveBeenCalledOnce();
  });
});
```

`startAlertWatcher(send)` recebe o `send` injetado só para o teste. Em produção a função usa `sendAlertEmail` como default. Se o mock de `watchReadings` não for o mesmo módulo que o watcher importa, o teste de tick falha — importe `watchReadings` **depois** do `vi.mock`, igual W3a.

- [ ] **Step 2: Run watcher tests to verify they fail**

Run:

```bash
cd web && npx vitest run src/services/alerts/alert-watcher.test.ts
```

Expected: FAIL — módulo `./alert-watcher` não existe.

- [ ] **Step 3: Write alert-watcher**

Crie `web/src/services/alerts/alert-watcher.ts` inteiro:

```ts
import "server-only";

import { listUsers } from "@/services/auth/users";
import { watchReadings } from "@/services/report/report-service";
import type { Reading, RiskLevel } from "@/types";

import {
  alertSubject,
  alertText,
  canSendAlert,
  enteredCritical,
} from "./alert-policy";
import { sendAlertEmail } from "./send-alert";

export type AlertSend = typeof sendAlertEmail;

export function shouldStartAlertWatcher(
  runtime = process.env.NEXT_RUNTIME,
  phase = process.env.NEXT_PHASE,
): boolean {
  return runtime === "nodejs" && phase !== "phase-production-build";
}

export async function handleCriticalReading(input: {
  previousLevel: RiskLevel | null;
  reading: Reading;
  now: number;
  users: { email: string }[];
  lastSent: Map<string, number>;
  apiKey: string | undefined;
  from: string;
  send: AlertSend;
}): Promise<void> {
  if (!enteredCritical(input.previousLevel, input.reading.level)) return;
  if (input.users.length === 0) {
    console.info("[alerts] no users; skip");
    return;
  }
  if (!input.apiKey) {
    console.info("[alerts] RESEND_API_KEY missing; skip");
    return;
  }
  for (const user of input.users) {
    if (!canSendAlert(input.lastSent.get(user.email), input.now)) continue;
    const ok = await input.send({
      to: user.email,
      subject: alertSubject(input.reading.source),
      text: alertText(input.reading),
      apiKey: input.apiKey,
      from: input.from,
    });
    if (ok) input.lastSent.set(user.email, input.now);
  }
}

export function startAlertWatcher(send: AlertSend = sendAlertEmail): () => void {
  let previous: RiskLevel | null = null;
  const lastSent = new Map<string, number>();

  try {
    return watchReadings({
      onReading: (reading) => {
        const from = previous;
        previous = reading.level;
        void handleCriticalReading({
          previousLevel: from,
          reading,
          now: Date.now(),
          users: listUsers(),
          lastSent,
          apiKey: process.env.RESEND_API_KEY || undefined,
          from:
            process.env.ALERT_FROM_EMAIL ??
            "GasGuard <alertas@localhost>",
          send,
        }).catch((error) => {
          console.error("[alerts]", error);
        });
      },
      onReset: () => {
        previous = null;
      },
    });
  } catch (error) {
    console.error("[alerts]", error);
    return () => {};
  }
}
```

Pontos que o teste da “mesma tick” depende: `previous = reading.level` **antes** do `void handleCriticalReading`. Não inverta.

`RESEND_API_KEY || undefined` trata `""` como ausente (o `.env.example` deixa a chave vazia).

- [ ] **Step 4: Run watcher tests**

Run:

```bash
cd web && npx vitest run src/services/alerts/alert-watcher.test.ts
```

Expected: PASS. Se o teste “second CRITICAL in the same tick” falhar por race de microtask, **não** mude a regra — mantenha `previous` síncrono; ajuste só o `await Promise.resolve()` extra no teste, nunca o código de produção para “ficar mais fácil”.

- [ ] **Step 5: Write instrumentation.ts**

Crie `web/src/instrumentation.ts` inteiro:

```ts
export async function register() {
  const { shouldStartAlertWatcher, startAlertWatcher } = await import(
    "./services/alerts/alert-watcher"
  );
  if (!shouldStartAlertWatcher()) return;
  startAlertWatcher();
}
```

Sem `import "server-only"` neste arquivo — o Next carrega `instrumentation.ts` como convenção de root, inclusive no Edge para decidir o runtime; o import dinâmico só roda depois do guard. Sem `onRequestError`. Sem editar `next.config.ts` (instrumentation é estável no Next 16.4.6).

Não crie `instrumentation.test.ts`. A função `shouldStartAlertWatcher` já está coberta no watcher.

- [ ] **Step 6: Full suite, lint and build**

Run:

```bash
cd web && npm test && npm run lint && npm run build
```

Expected: `npm test` exit 0 (20 arquivos anteriores + os novos desta fatia). `npm run lint` exit 0. `npm run build` exit 0 **e termina** (se o processo ficar preso, `register()` está ligando o interval no `phase-production-build` — volte ao guard). O diff da fatia **não** inclui `package.json`, `package-lock.json`, `vitest.config.mts`, `.env.example`, `layout.tsx`, `globals.css`, `lib/`, `types/`, `hooks/`, `services/report/`, `app/api/`.

Grep de camada (tem que dar zero):

```bash
cd web && rg "from [\"']@/services/" src/components src/hooks || true
rg "next-auth|nodemailer" src package.json || true
```

Expected: nenhum import de `services/` em `components/` nem `hooks/`. Nenhuma menção a `next-auth` / `nodemailer`.

- [ ] **Step 7: Browser — Done when da fatia**

O mapa pede o fluxo da tabela Done when como um usuário. Não declare feito com um screenshot estático.

1. Em `web/.env.local` (já ignorado pelo git), defina um `AUTH_SECRET` de teste (qualquer string ≥ 16 chars). **Não** defina `RESEND_API_KEY` neste passo — o Done when aceita “tenta envio **ou** loga se não houver chave”.
2. Na raiz: `node mock-daily-report.js --scenario tour`.
3. Em `web/`: `npm run dev`.
4. Abra `http://localhost:3000`:
   - o dashboard W4 continua lá (gráfico, métricas, rodapé acadêmico);
   - canto superior direito: **Entrar** e **Cadastrar**;
   - home **sem** overlay vermelho; **sem** login wall.
5. Clique **Cadastrar**. Crie `demo@example.com` / `password1` / `password1`. Deve voltar para `/` e o menu mostrar o e-mail + **Sair**.
6. Clique **Sair**. Volta a Entrar / Cadastrar. Entre de novo em `/login` com as mesmas credenciais.
7. Pare o `tour`. Rode `node mock-daily-report.js --scenario gas_leak_flame`. Espere o cartão ir para **Crítico**. No terminal do `next dev`, confirme a linha `[alerts] RESEND_API_KEY missing; skip` (ou, se você tiver chave, o POST). A tela **não** quebra.
8. Permanecer em CRITICAL por alguns segundos: **não** spam de log a cada 500 ms — um skip/envio por transição. Recarregar a página com o mock ainda crítico pode logar de novo (o watcher recomeça com `previous = null`); isso é o contrato do item 13, não um bug.
9. Viewport estreita (~390×844): menu, formulário de cadastro e dashboard continuam na coluna `max-w-md`, sem horizontal scroll.
10. Confirme que `/` sem cookie continua abrindo o dashboard.

Se não houver browser tool: **não** substitua a UI por `curl -sI`. Declare o que não conseguiu clicar. O revisor trata como gap — esta fatia é visível.

- [ ] **Step 8: Commit**

```bash
git add web/src/services/alerts/alert-watcher.ts web/src/services/alerts/alert-watcher.test.ts web/src/instrumentation.ts
git commit -m "$(cat <<'EOF'
feat(web): email a critical-risk alert through Resend

EOF
)"
```

Expected: o commit contém **somente** esses 3 arquivos. Diff da fatia (plano + Owns + testes colados) não inclui `package.json`, hardware, mock, `.env.example`.

---

## Fora desta fatia (não fazer)

- Recalcular risco. Proteger `/` com middleware. `next-auth`. `nodemailer`. SMTP Gmail. Fila, cron, worker separado.
- Instalar pacote. `shadcn add`. Editar `.env.example`, `web/.gitignore`, `package.json`, `vitest.config.mts`, `next.config.ts`, `layout.tsx`, `globals.css`.
- Editar `dashboard-header.tsx` ou qualquer W3c–W3f. Unificar o `watchReadings` do SSE com o de alertas.
- Persistir o throttle em disco. Expirar o cookie. Confirmar e-mail. Recuperar senha. Roles.
- Importar `services/` a partir de `components/` ou `hooks/`. Criar pasta nova em `web/src`.
- Testing Library, jsdom, `instrumentation-client.ts`.
- Merge em `feat/web`, PR, rename da branch. Push é do implementer; o planner **não** faz.
- Atualizar `web/src/services/README.md` (fora do Owns) — o texto “Futuro: alerts/ e auth/” fica desatualizado até alguém dono da pasta pai limpar.

---

## Self-review (planner)

1. **Spec coverage:** cadastro/login (T3), cookie HMAC (T2), scrypt + JSON (T1), AccountMenu + patch dashboard/page (T4), CRITICAL → Resend (T5–T6), throttle 5 min (T5), `[SIMULAÇÃO] ` (T5), sem chave/usuários loga (T5–T6), `instrumentation.ts` (T6), sem next-auth/nodemailer (constraints). Dashboard público (contrato 1). Sem buraco que peça spec extra — os furos do mapa são mecânicos e estão no contrato fechado.
2. **Placeholders:** nenhum TBD / “similar to Task N” / “add validation”.
3. **Tipos:** `AuthFormState`, `StoredUser`, `SESSION_COOKIE`, `enteredCritical`, `handleCriticalReading`, `Dashboard({ initial, email })` batem entre tasks.
4. **Review Focus:** as 8 linhas têm teste na task dona (home sem secret, login opaco, transição CRITICAL, throttle por e-mail, skip sem chave, assunto mock/board, skip no build, grep de camada).
