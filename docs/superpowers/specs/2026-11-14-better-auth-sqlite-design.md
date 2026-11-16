# Spec: Better Auth + SQLite (auth limpa)

- **Data:** 2026-11-14
- **Branch sugerida:** a branch atual de web (`feat/web` ou derivada)
- **Contexto:** [`docs/architecture.md`](../../architecture.md), [`docs/decisions.md`](../../decisions.md), [`docs/roadmap.md`](../../roadmap.md) Etapa 5

## Objetivo

Substituir a autenticação caseira (JSON + scrypt + cookie HMAC) por **Better Auth** com **SQLite em arquivo**, manter o código de auth mínimo, **proteger o app** (sem sessão → login) e exibir **nome + e-mail** na navbar. Alertas críticos continuam por Gmail SMTP; só muda a fonte dos destinatários.

## Decisões de produto (aprovadas no brainstorm)

| Tema | Escolha |
|---|---|
| Acesso | App protegido: dashboard e SSE exigem sessão |
| Persistência | SQLite em `web/.data/auth.sqlite` (sem Docker / Postgres) |
| Métodos | Só e-mail + senha + **nome** no cadastro |
| Navbar | Mostra nome e e-mail de quem está logado + Sair |
| DX | Um único `npm run dev` em `web/`; o arquivo SQLite aparece sozinho |

## Arquitetura

```
Browser → proxy.ts (cookie otimista)
       → pages /api/stream (validam sessão de verdade)
       → /api/auth/[...all] → Better Auth → .data/auth.sqlite
Alert watcher → SELECT email FROM user (mesmo SQLite)
```

- Better Auth cuida de hash, sessão, cookies e endpoints.
- `nextCookies()` para Server Actions setarem cookie.
- Next.js 16: proteção em `src/proxy.ts` (não `middleware.ts`).
- Defesa real: `getSessionUser()` nas páginas/rotas protegidas (cookie forjado não passa).

## Superfície mínima de código nosso

| Peça | Papel |
|---|---|
| `services/auth/auth.ts` | Instância Better Auth + SQLite |
| `services/auth/get-session.ts` | `{ name, email } \| null` |
| `services/auth/list-user-emails.ts` | E-mails para alertas |
| `app/api/auth/[...all]/route.ts` | Handler catch-all |
| `proxy.ts` + `authProxyDecision` | Redirect sem sessão |
| `/login`, `/cadastro`, `AuthForm` | UI + Server Actions |
| `AccountMenu` | Nome + e-mail + Sair |

**Remover:** `password.ts`, `session.ts`, `users.ts`, `POST /login/sair`, e testes da auth caseira.

## Fluxos

1. **Cadastro:** nome, e-mail, senha, confirmar → `auth.api.signUpEmail` → redirect `/`.
2. **Login:** e-mail, senha → `auth.api.signInEmail` → redirect `/`.
3. **Home:** sem sessão → `/login`; com sessão → dashboard com menu nome+e-mail.
4. **Sair:** Server Action `signOut` → `/login`.
5. **Alerta CRÍTICO:** `listUserEmails()`; zero usuários → skip (como hoje).

## Env

```
BETTER_AUTH_SECRET=   # ≥ 32 chars
BETTER_AUTH_URL=http://localhost:3000
AUTH_SQLITE_PATH=     # opcional; padrão .data/auth.sqlite
```

Remover dependência de `AUTH_SECRET` da auth caseira. Gmail/alerta inalterados.

## Fora de escopo

- Docker / Postgres
- OAuth, verificação de e-mail, reset de senha
- Migração de `users.json` antigo
- Mudanças no firmware, mock CSV, ou UI do dashboard além do menu de conta

## Sucesso

- `npm run dev` sozinho sobe o app com auth.
- Sem login não abre `/` nem `/api/stream`.
- Cadastro com nome; navbar mostra nome e e-mail.
- `npm test`, `npm run lint`, `npm run build` passam em `web/`.
- Nenhum texto promete proteção real (protótipo acadêmico).
