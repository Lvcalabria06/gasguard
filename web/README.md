# GasGuard — app web

Dashboard mobile-first que mostra em tempo real as leituras do `daily-report.csv` (gravado pela placa ou pelo simulador). Next.js 16 + TypeScript + Tailwind + shadcn/ui, com login local (Better Auth + SQLite) e e-mail nos casos críticos.

> Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. **Não é um detector certificado.**

## Como rodar

Pré-requisito: Node ≥ 22.12 (recomendado: 24 LTS).

```bash
npm install
cp .env.example .env   # preencha BETTER_AUTH_SECRET (32+ caracteres); Gmail é opcional
npm run dev            # http://localhost:3000 e http://<IP-do-PC>:3000 no celular
```

Sem a placa, rode o simulador na raiz do repositório (`node mock-daily-report.js --scenario tour`). Sem ninguém gravando o CSV, a tela mostra "sem dados".

O banco de login (`.data/auth.sqlite`) é criado e migrado sozinho no startup.

O app roda **só local**, no mesmo computador do CSV: não há deploy em nuvem ([D8](../docs/decisions.md#d8-o-web-roda-local-no-mesmo-computador-do-csv)).

## Verificações

```bash
npm test        # Vitest
npm run lint
npm run build
```

No Windows, se o Vitest falhar com `Cannot read properties of undefined (reading 'config')`, abra o terminal num caminho com a letra do drive maiúscula (`C:\...`, não `c:\...`).

## Onde está cada coisa

Camadas, fluxo dos dados e mapa de pastas: [`docs/architecture.md`](../docs/architecture.md). Formato do CSV: [`docs/csv-contract.md`](../docs/csv-contract.md).
