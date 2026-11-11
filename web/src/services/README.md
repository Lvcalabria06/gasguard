# services

**Lógica que só roda no servidor** (Node). Todo arquivo começa com `import "server-only";`, assim o build falha se um Client Component importar um service.

- `report/`: leitura do `daily-report.csv` (Etapa 3).
- Futuro: `alerts/` (e-mail) e `auth/` (login), na Etapa 5.

- Pode importar: `lib/`, `types/` e `node:*`.
- Não pode: React, `hooks/`, `components/`.

Regras de camadas: [docs/architecture.md](../../../docs/architecture.md#camadas-do-web).
