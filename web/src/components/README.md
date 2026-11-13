# components

**Interface.**

- `ui/`: componentes do shadcn, gerados pelo CLI (`npx shadcn add ...`). Não edite à mão sem motivo.
- `dashboard/`: a tela única. `dashboard.tsx` é o container (`"use client"`): chama `useReadings` e empilha header → risco → métricas → gráfico → filtros + lista → rodapé. Os outros arquivos da pasta são as partes, só de props.

Container/presentation é convenção, não regra: um componente simples pode usar o hook e renderizar no mesmo arquivo.

- Pode importar: `hooks/`, `lib/`, `types/`, `components/ui`.
- Não pode: `services/`, `node:*`. Regra de negócio nunca fica em componente: vai para `lib/`, com teste.
