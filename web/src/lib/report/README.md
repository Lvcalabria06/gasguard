# lib/report

Camada de leitura: a **única** que conhece o CSV em português (docs/csv-contract.md). Faz o parse, a validação e o tail por offset do `daily-report.csv` e entrega `Reading` do domínio. Implementação: Etapa 3 do roadmap.
