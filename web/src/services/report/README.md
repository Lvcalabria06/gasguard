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
