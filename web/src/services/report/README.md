# services/report

A **única** parte do web que conhece o CSV em português ([docs/csv-contract.md](../../../../docs/csv-contract.md)). Converte cada linha para `Reading` (inglês) e mais nada sai daqui com nomes em português.

Planejado para a Etapa 3:

- `parse-csv-line.ts`: linha do CSV → `Reading`, com validação.
- `tail-report.ts`: acompanha o arquivo por offset e detecta a recriação diária.
- `report-service.ts`: `getRecentReadings()` (leituras dos últimos 10 min + eventos do dia, para a carga inicial) e `watchReadings()` (linhas novas, para o SSE).
