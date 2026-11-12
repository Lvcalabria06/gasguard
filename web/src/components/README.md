# components

**Interface.**

- `ui/`: componentes do shadcn, gerados pelo CLI (`npx shadcn add ...`). Não edite à mão sem motivo.
- `dashboard/`: as partes da tela única (cartão de risco, métricas, gráfico, eventos e filtros), na Etapa 4.

Container/presentation é convenção, não regra: um componente simples pode usar o hook e renderizar no mesmo arquivo.

- Pode importar: `hooks/`, `lib/`, `types/`, `components/ui`.
- Não pode: `services/`, `node:*`. Regra de negócio nunca fica em componente: vai para `lib/`, com teste.
