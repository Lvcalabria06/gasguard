# lib

**Funções puras** compartilhadas entre servidor e cliente. Cada arquivo tem um `*.test.ts` ao lado. Sem React, sem `node:*`, sem `Date.now()`.

| Arquivo | Exporta |
|---|---|
| `utils.ts` | `cn()` (shadcn) |
| `risk-level.ts` | `RISK_LEVELS`, `isRiskLevel()` |
| `scenarios.ts` | `ScenarioCopy`, `getScenario(id)` — ids 0–17; desconhecido → "Cenário desconhecido" |
| `events.ts` | `detectEvents(readings)` — uma `ReportEvent` por mudança de `level` |
| `filters.ts` | `filterEvents(events, filter, now)` — chips (`to`) AND período local |
| `format.ts` | `formatAge`, `formatGasDelta`, `formatTemperature` |

- Pode importar: `types/`.
- Não pode: React, Node (`node:*`), `services/`, `hooks/`, `components/`.

Regras de camadas: [docs/architecture.md](../../../docs/architecture.md#camadas-do-web).
