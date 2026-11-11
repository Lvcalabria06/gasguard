# app/api

Transporte. Só existe `GET /api/stream` (SSE), implementado na Etapa 3: chama `watchReadings()` de `services/report` e envia um evento por linha nova, com `ping` a cada 15 s. Sem regra de negócio aqui.

A carga inicial **não** é uma rota: o `app/page.tsx` (Server Component) chama `getRecentReadings()` direto.
