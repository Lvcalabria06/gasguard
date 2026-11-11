# Arquitetura

## Fluxo dos dados

```
┌──────────────────────────── PRODUÇÃO ────────────────────────────┐
│ hardware/ (ESP32, firmware C++)                                  │
│   Serial USB 115200: logs legíveis + linhas "CSV,..."            │
│        │                                                         │
│        ▼                                                         │
│ Monitor Serial do PlatformIO + hardware/monitor/filter_gasguard.py│──┐
└──────────────────────────────────────────────────────────────────┘  │
                                                                      ├──► ./daily-report.csv
┌───────────────────────────── TESTE ──────────────────────────────┐  │      (raiz, no máximo 1 linha/s,
│ ./mock-daily-report.js (Node, sem dependências)                  │──┘       recriado a cada dia)
└──────────────────────────────────────────────────────────────────┘             │
                                                                                 ▼
                                        web/ (Next.js, roda no mesmo computador)
                                          services/report → lê e acompanha o CSV (servidor)
                                          app/page.tsx    → carga inicial (Server Component)
                                          app/api/stream  → linhas novas ao vivo (SSE)
                                          hooks           → useReadings(): junta tudo no navegador
                                          components      → tela única, mobile-first
                                                 │
                                                 ▼
                         navegador: http://localhost:3000 · celular: http://<IP-do-PC>:3000
```

- **Hardware e web são desacoplados** ([D19](decisions.md#d19-hardware-e-web-são-desacoplados-a-única-interseção-é-o-daily-reportcsv-da-raiz)). A única interseção é o `daily-report.csv` da raiz: nenhum dos dois importa, lê ou executa nada do outro. O web roda sem a placa, e a placa roda sem o web.
- **O hardware e o mock são intercambiáveis.** Os dois escrevem o mesmo arquivo, no mesmo formato ([csv-contract.md](csv-contract.md)). O web não sabe quem está escrevendo, só lê a coluna `origem`.
- **O nível de risco é do firmware.** O web exibe `nivel` e `cenario`, mas não recalcula regras.
- **Tudo roda local.** O web lê um arquivo do disco, então não há deploy em nuvem. O celular acessa pela mesma rede Wi-Fi.

## Camadas do web

O `web/src` é organizado **por camada** ([D15](decisions.md#d15-o-web-é-organizado-por-camada-em-6-pastas)). Cada pasta tem um papel e só importa as pastas **abaixo** dela nesta tabela:

| Pasta | Papel | Pode importar | Nunca |
|---|---|---|---|
| `app/` | **Rotas.** `page.tsx` (Server Component) monta a tela e faz a carga inicial; `api/stream` é o SSE. Fino: só liga as peças | `components`, `services`, `lib`, `types` | regra de negócio escrita na rota |
| `components/` | **Interface.** `ui/` é o shadcn (gerado); `dashboard/` são as partes da tela | `hooks`, `lib`, `types`, `components/ui` | `services`, `node:*` |
| `hooks/` | **Estado no navegador** (`"use client"`): SSE, buffer de leituras, status da conexão | `lib`, `types` | `services`, `node:*` |
| `services/` | **Lógica do servidor.** Todo arquivo começa com `import "server-only";`. `report/` é a **única** parte que conhece o CSV em português | `lib`, `types`, `node:*` | React, `hooks`, `components` |
| `lib/` | **Funções puras** compartilhadas (servidor e navegador), cada uma com `*.test.ts` ao lado: cenários, `detectEvents()`, filtros, formatação, `cn()` | `types` | React, `node:*`, `services` |
| `types/` | **Só tipos** em inglês (`Reading`, `RiskLevel`, `ReportEvent`). Nada executável | — | funções, constantes, imports de outras pastas |

Regras que decorrem da tabela:

- **Regra de negócio nunca fica em componente nem em hook.** Ela vai para `lib/`, como função pura com teste.
- **Constante ou função não entra em `types/`** ([D16](decisions.md#d16-types-só-tem-tipos-o-executável-vai-para-lib)). Exemplo: o tipo `RiskLevel` fica em `types/risk-level.ts`; a lista `RISK_LEVELS` e `isRiskLevel()` ficam em `lib/risk-level.ts`.
- **Container/presentation é convenção, não regra.** Um componente simples pode usar o hook e renderizar no mesmo arquivo.
- **Crescimento:** e-mail e login (Etapa 5) entram como `services/alerts/` e `services/auth/`, com telas em `app/` e componentes em `components/`. Nenhuma pasta nova de primeiro nível.

### Convenções

- Arquivos em `kebab-case` (`risk-card.tsx`, `use-readings.ts`, `report-service.ts`); componentes exportados em `PascalCase`, funções e hooks em `camelCase`.
- Testes ao lado do arquivo testado: `x.ts` → `x.test.ts` (Vitest).
- Imports pelo alias `@/` (`@/lib/risk-level`, `@/types`).
- Código em inglês; textos da tela em pt-BR.

## Dados na tela: carga inicial + ao vivo

[D17](decisions.md#d17-carga-inicial-no-server-component-sse-só-ao-vivo) define o fluxo:

```
abrir a tela
  1. servidor: app/page.tsx → getRecentReadings() (services/report)
       → leituras dos últimos 10 min + todos os eventos do dia (de agora para trás)
       → o HTML já sai com gráfico, métricas e eventos preenchidos
  2. navegador: useReadings() abre o EventSource de /api/stream
       → o servidor envia cada linha nova, do agora para frente

a conexão caiu e voltou, ou o arquivo foi recriado (virou o dia)
  3. useReadings() percebe a reconexão → router.refresh()
       → o passo 1 roda de novo, sem recarregar a página
  4. linhas com hora ≤ à da última recebida são descartadas (sem duplicatas)
```

- `GET /api/stream`: uma conexão SSE por cliente. O servidor verifica o arquivo a cada **500 ms**, lê **só os bytes novos** (guarda o offset) e envia um evento por linha nova. Um `ping` a cada **15 s** mantém a conexão viva. Se o arquivo encolher (recriado), o servidor avisa o cliente, que chama `router.refresh()`.
- **Não existe `/api/report`.** A carga inicial é o Server Component chamando o service direto. O `page.tsx` precisa ser dinâmico (`await connection()`), senão o Next gera a página no build com o CSV daquele momento.
- **Eventos:** o servidor calcula os eventos do dia com `detectEvents()` (de `lib/`) lendo o arquivo inteiro; o navegador usa a mesma função para as linhas ao vivo. Mandar as ~86 mil leituras do dia seria pesado; os eventos são poucos.
- **`hora` identifica a linha** porque há no máximo 1 linha por segundo ([D18](decisions.md#d18-no-máximo-1-linha-por-segundo-no-csv)).
- **Perda no pior caso:** uma linha no intervalo entre a carga e a abertura do SSE. No gráfico é um ponto em 600; nos eventos, a mudança de nível aparece 1 s depois. Recarregar a página sempre traz o estado completo, porque o CSV no disco está completo.
- **Sem linha nova há mais de 5 s:** o estado vira **sem dados** (cinza). O app nunca mostra "normal" com dado velho.

> Os nomes exatos dos eventos SSE e o formato das mensagens serão definidos no plano da etapa "web: pipeline em tempo real" ([roadmap](roadmap.md)).

## A tela (única, mobile-first, clean)

1. **Topo:** GasGuard, status da conexão (ao vivo / reconectando / sem dados) e "há N s".
2. **Cartão de risco:** cor do nível, título e orientação do cenário. Pulsa em ALERTA/ALTO/CRITICO. Selo **SIMULAÇÃO** quando `source === "mock"`.
3. **Métricas (grade de 2 colunas):** gás GLP (MQ-6, com o `+delta`), gases/fumaça (MQ-2), chama, temperatura e limite, movimento ("sem movimento há 42 s") e fogão. Destaque rápido quando o valor muda.
4. **Gráfico dos últimos 10 min:** MQ-6, MQ-2 e temperatura.
5. **Eventos do dia:** mudanças de nível, **o mais novo no topo**. A lista rola sozinha, sem rolar a página. Filtros: chips de nível (vários ao mesmo tempo) e período (`Última hora` · `Últimas 6 h` · `Hoje`, com `Hoje` como padrão), aplicados no cliente.
6. **Rodapé:** "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado."

Visual clean e moderno, com modo claro e escuro do sistema. **Evento** = mudança de nível entre duas leituras consecutivas (linhas com o mesmo nível não geram evento).

## Stack

| Peça | Escolha |
|---|---|
| Web | Next.js 16 (App Router, `src/`), TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, lucide-react |
| Testes do web | Vitest |
| Mock | Node puro (CommonJS, sem dependências), testado com `node --test` |
| Firmware | C++/Arduino no PlatformIO (`esp32dev`) |
| Filtro do monitor | Python, executado pelo próprio PlatformIO |
| Node | ≥ 22.12, recomendado 24 LTS (exigência do Vitest 5 e do `cn` do shadcn; o mock sozinho roda em ≥ 20.9) |
| Gerenciador | npm |

## Mapa de pastas

Legenda: **(Etapa N)** = ainda não existe, entra naquela etapa do [roadmap](roadmap.md).

```
gasguard/
├── AGENTS.md                    # contexto para agentes de IA (fonte principal)
├── CLAUDE.md                    # aponta para o AGENTS.md
├── README.md                    # visão geral do repositório e como rodar
├── .gitignore
├── gasguard.code-workspace      # abre hardware/, web/ e a raiz no VS Code (o PlatformIO precisa disso)
├── daily-report.csv             # GERADO em execução (ignorado no git)
├── mock-daily-report.js         # simulador: escreve o CSV a cada 1 s
├── mock-daily-report.test.js    # testes do simulador (node --test)
├── docs/
│   ├── README.md                # índice da documentação
│   ├── overview.md              # o projeto, o hardware e o firmware
│   ├── architecture.md          # este arquivo (fonte única da estrutura)
│   ├── csv-contract.md          # formato do CSV
│   ├── scenarios.md             # os 18 cenários do firmware
│   ├── decisions.md             # decisões e motivos
│   ├── roadmap.md               # próximas etapas
│   └── superpowers/
│       ├── specs/               # specs de design
│       └── plans/               # planos de implementação
├── hardware/                    # projeto PlatformIO (firmware)
│   ├── platformio.ini
│   ├── README.md                # ligações, testes físicos e ajustes do firmware
│   ├── src/main.cpp
│   ├── include/ lib/ test/      # pastas padrão do PlatformIO
│   ├── .vscode/extensions.json
│   └── monitor/filter_gasguard.py   # (Etapa 2) grava o CSV a partir do Serial
└── web/                         # projeto Next.js
    ├── AGENTS.md                # gerado pelo create-next-app (regras do Next)
    ├── package.json
    ├── next.config.ts
    ├── vitest.config.mts
    ├── components.json          # configuração do shadcn/ui
    ├── .env.example             # DAILY_REPORT_PATH
    └── src/
        ├── app/                 # ROTAS
        │   ├── layout.tsx
        │   ├── page.tsx         # a tela única + carga inicial (Server Component)
        │   ├── globals.css
        │   └── api/
        │       └── stream/route.ts      # (Etapa 3) GET /api/stream (SSE)
        ├── components/          # INTERFACE
        │   ├── ui/              # shadcn (gerado pelo CLI)
        │   └── dashboard/       # (Etapa 4) risk-card, metrics-grid, readings-chart, event-list, event-filters
        ├── hooks/               # ESTADO NO NAVEGADOR
        │   └── use-readings.ts  # (Etapa 3)
        ├── services/            # LÓGICA DO SERVIDOR (import "server-only")
        │   └── report/          # (Etapa 3) CSV: única parte em português
        │       ├── parse-csv-line.ts    # linha pt → Reading
        │       ├── tail-report.ts       # acompanha o arquivo por offset
        │       └── report-service.ts    # getRecentReadings(), watchReadings()
        ├── lib/                 # FUNÇÕES PURAS (com teste ao lado)
        │   ├── utils.ts         # cn() do shadcn
        │   ├── risk-level.ts    # RISK_LEVELS, isRiskLevel()
        │   ├── scenarios.ts     # (Etapa 3) dicionário id → título/orientação
        │   ├── events.ts        # (Etapa 3) detectEvents()
        │   ├── filters.ts       # (Etapa 3) filtro por nível e período
        │   └── format.ts        # (Etapa 4) "há 12 s", valores
        └── types/               # SÓ TIPOS
            ├── reading.ts
            ├── risk-level.ts
            ├── report-event.ts
            └── index.ts
```
