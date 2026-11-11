# lib

**Funções puras** compartilhadas entre servidor e cliente: dicionário de cenários, detecção de eventos (`detectEvents`), filtros, formatação e o `cn()` do shadcn. Cada arquivo tem um `*.test.ts` ao lado.

- Pode importar: `types/`.
- Não pode: React, Node (`node:*`), `services/`, `hooks/`, `components/`.

Regras de camadas: [docs/architecture.md](../../../docs/architecture.md#camadas-do-web).
