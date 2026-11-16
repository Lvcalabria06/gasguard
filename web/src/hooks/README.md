# hooks

**Estado no cliente** (`"use client"`). Só `useReadings`.

| Arquivo | Exporta |
|---|---|
| `use-readings.ts` | `useReadings(initial)` — carga inicial + `EventSource("/api/stream")`. Duplicata por timestamp, buffer de 10 min, `detectEvents` só no par ao vivo, `no_data` com ≥ 5 s sem leitura, `router.refresh()` em `reset` e em reconexão (`onerror` + `onopen`). |

W4 é quem chama o hook. Esta pasta não monta UI.

- Pode importar: `lib/` e `types/`.
- Não pode: `services/`, `node:*`. Regra de risco fica em `lib/`, não aqui.

Regras de camadas: [docs/architecture.md](../../../docs/architecture.md#camadas-do-web).
