# hooks

**Estado no cliente** (`"use client"`). `useReadings()` recebe a carga inicial do servidor, abre o `EventSource` de `/api/stream`, junta as leituras novas (descartando horário ≤ ao da última), deriva os eventos com `lib/` e controla o status (ao vivo / reconectando / sem dados após 5 s). Na reconexão, chama `router.refresh()`. Implementação: Etapa 3.

- Pode importar: `lib/` e `types/`.
- Não pode: `services/`, `node:*`. Regra de negócio fica em `lib/`, não aqui.
