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
                                          proxy.ts        → redirect sem cookie de sessão
                                          services/auth   → Better Auth + SQLite (.data/auth.sqlite)
                                          services/report → lê e acompanha o CSV (servidor)
                                          services/alerts → e-mails críticos (destinatários do SQLite)
                                          app/page.tsx    → exige sessão; carga inicial
                                          app/api/stream  → linhas novas ao vivo (SSE; exige sessão)
                                          app/api/auth    → catch-all Better Auth
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
- **App protegido** ([D21](decisions.md#d21-auth-com-better-auth--sqlite-local-app-protegido)). Login/cadastro usam Better Auth com SQLite em `web/.data/auth.sqlite`. `proxy.ts` redireciona sem cookie; as páginas e o SSE validam a sessão de verdade. Públicos: `/login`, `/cadastro`, `/api/auth/*`.

## Camadas do web

O `web/src` é organizado **por camada** ([D15](decisions.md#d15-o-web-é-organizado-por-camada-em-6-pastas)). Cada pasta tem um papel e só importa as pastas **abaixo** dela nesta tabela:

| Pasta | Papel | Pode importar | Nunca |
|---|---|---|---|
| `app/` | **Rotas.** `page.tsx` (Server Component) monta a tela e faz a carga inicial; `api/stream` é o SSE. Fino: só liga as peças | `components`, `services`, `lib`, `types` | regra de negócio escrita na rota |
| `components/` | **Interface.** `ui/` é o shadcn (gerado); `dashboard/` são as partes da tela | `hooks`, `lib`, `types`, `components/ui` | `services`, `node:*` |
| `hooks/` | **Estado no navegador** (`"use client"`): SSE, buffer de leituras, status da conexão | `lib`, `types` | `services`, `node:*` |
| `services/` | **Lógica do servidor.** Todo arquivo começa com `import "server-only";`. `report/` é a **única** parte que conhece o CSV em português | `lib`, `types`, `node:*` | React, `hooks`, `components` |
| `lib/` | **Funções puras** compartilhadas (servidor e navegador): cenários, `detectEvents()`, filtros, formatação, `cn()` | `types` | React, `node:*`, `services` |
| `types/` | **Só tipos** em inglês (`Reading`, `RiskLevel`, `ReportEvent`). Nada executável | — | funções, constantes, imports de outras pastas |
| `test/` | **Testes Vitest** (`*.test.ts`). Espelha o caminho do arquivo sob teste; não faz parte da cadeia de import das camadas | qualquer camada via `@/` | código de produção |

Regras que decorrem da tabela:

- **Regra de negócio nunca fica em componente nem em hook.** Ela vai para `lib/`, como função pura com teste em `test/lib/`.
- **Constante ou função não entra em `types/`** ([D16](decisions.md#d16-types-só-tem-tipos-o-executável-vai-para-lib)). Exemplo: o tipo `RiskLevel` fica em `types/risk-level.ts`; a lista `RISK_LEVELS` e `isRiskLevel()` ficam em `lib/risk-level.ts`.
- **Container/presentation é convenção, não regra.** Um componente simples pode usar o hook e renderizar no mesmo arquivo.
- **Auth e alertas (Etapa 5):** `services/auth/` (Better Auth + SQLite), `services/alerts/` (Gmail SMTP), telas em `app/login` e `app/cadastro`, menu em `components/auth/`. Nenhuma pasta nova de primeiro nível além de `test/` ([D20](decisions.md#d20-testes-do-web-ficam-em-srctest)).

### Convenções

- Arquivos em `kebab-case` (`risk-card.tsx`, `use-readings.ts`, `report-service.ts`); componentes exportados em `PascalCase`, funções e hooks em `camelCase`.
- Testes em `src/test/`, espelhando o caminho: `lib/x.ts` → `test/lib/x.test.ts` (Vitest).
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

- `GET /api/stream`: uma conexão SSE por cliente. O servidor verifica o tamanho do arquivo a cada **500 ms** e lê **só os bytes novos** a partir do offset guardado (o arquivo inteiro só é lido ao abrir a conexão e depois de uma recriação). Se o arquivo encolher ou a data da linha 1 mudar (recriado), o servidor avisa o cliente, que chama `router.refresh()`. Se o navegador desistir da conexão (ex.: `401` com a sessão expirada), o cliente também chama `router.refresh()`, e a página manda para `/login`.
- **Eventos SSE:** `reading` (o `data` é um `Reading` em JSON, uma linha do CSV), `reset` (arquivo recriado; o cliente limpa o estado e recarrega) e `ping` (a cada **15 s**, sem dados, só para manter a conexão).
- **Não existe `/api/report`.** A carga inicial é o Server Component chamando o service direto. O `page.tsx` precisa ser dinâmico (`await connection()`), senão o Next gera a página no build com o CSV daquele momento.
- **Eventos:** o servidor calcula os eventos do dia com `detectEvents()` (de `lib/`) lendo o arquivo inteiro; o navegador usa a mesma função para as linhas ao vivo. Mandar as ~86 mil leituras do dia seria pesado; os eventos são poucos.
- **`hora` identifica a linha** porque há no máximo 1 linha por segundo ([D18](decisions.md#d18-no-máximo-1-linha-por-segundo-no-csv)).
- **Perda no pior caso:** uma linha no intervalo entre a carga e a abertura do SSE. No gráfico é um ponto em 600; nos eventos, a mudança de nível aparece 1 s depois. Recarregar a página sempre traz o estado completo, porque o CSV no disco está completo.
- **Sem linha nova há mais de 5 s:** o estado vira **sem dados** (cinza). O app nunca mostra "normal" com dado velho. Os 5 s contam desde a **chegada** da última linha no navegador, e a carga inicial traz a idade medida pelo servidor (`lastReadingAgeMs`). Assim o relógio do celular, que pode estar adiantado ou atrasado em relação ao PC, não interfere.

## A tela (única, mobile-first, clean)

1. **Topo:** GasGuard, status da conexão (ao vivo / reconectando / sem dados) e "há N s".
2. **Cartão de risco:** cor do nível, título e orientação do cenário. Pulsa em ALERTA/ALTO/CRITICO. Selo **SIMULAÇÃO** quando `source === "mock"`.
3. **Métricas (grade de 2 colunas):** gás GLP (MQ-6, com o `+delta`), gases/fumaça (MQ-2), chama, temperatura e limite, movimento ("sem movimento há 42 s") e fogão. Destaque rápido quando o valor muda.
4. **Gráfico dos últimos 10 min:** MQ-6, MQ-2 e temperatura.
5. **Eventos do dia:** mudanças de nível, **o mais novo no topo**. A lista rola sozinha, sem rolar a página. Filtros: chips de nível (vários ao mesmo tempo) e período (`Última hora` · `Últimas 6 h` · `Hoje`, com `Hoje` como padrão), aplicados no cliente.
6. **Rodapé:** "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado."

No desktop (≥ 1024 px) a tela vira duas colunas: risco e métricas à esquerda, gráfico e eventos à direita. O gráfico alterna entre **Gases** e **Temperatura** (escalas diferentes). As cores e os rótulos de cada nível ficam em `components/dashboard/level-theme.ts`. As métricas só ganham cor de alerta com o que o firmware sinaliza (`mq*_nivel`, `temp_alta`); chama e movimento ficam neutros, porque julgar esses sinais seria uma regra de risco.

Visual clean e moderno, com modo claro e escuro do sistema. **Evento** = mudança de nível entre duas leituras consecutivas (linhas com o mesmo nível não geram evento).

## Stack

| Peça | Escolha |
|---|---|
| Web | Next.js 16 (App Router, `src/`), TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, lucide-react |
| Auth | Better Auth + `better-sqlite3` (`web/.data/auth.sqlite`) |
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
    ├── .env.example             # DAILY_REPORT_PATH, BETTER_AUTH_*, Gmail
    ├── .data/auth.sqlite        # GERADO (ignorado no git)
    └── src/
        ├── proxy.ts             # redirect otimista sem cookie de sessão
        ├── instrumentation.ts   # no startup: migrations do SQLite de auth + watcher de alertas
        ├── app/                 # ROTAS
        │   ├── layout.tsx
        │   ├── page.tsx         # dashboard (exige sessão) + carga inicial
        │   ├── login/           # entrar / sair
        │   ├── cadastro/        # criar conta (nome + e-mail + senha)
        │   ├── globals.css
        │   └── api/
        │       ├── stream/route.ts      # GET /api/stream (SSE; exige sessão)
        │       └── auth/[...all]/       # Better Auth
        ├── components/          # INTERFACE
        │   ├── ui/              # shadcn (gerado pelo CLI)
        │   ├── auth/            # formulário e menu (nome + e-mail)
        │   └── dashboard/       # risk-card, metrics-grid, readings-chart, event-list, event-filters
        ├── hooks/               # ESTADO NO NAVEGADOR
        │   └── use-readings.ts
        ├── services/            # LÓGICA DO SERVIDOR (import "server-only")
        │   ├── report/          # CSV: única parte em português
        │   │   ├── parse-csv-line.ts
        │   │   ├── tail-report.ts
        │   │   └── report-service.ts
        │   ├── auth/            # Better Auth + sessão + e-mails
        │   └── alerts/          # watcher Gmail SMTP
        ├── lib/                 # FUNÇÕES PURAS
        │   ├── utils.ts         # cn() do shadcn
        │   ├── auth-proxy.ts    # decisão de redirect (testável)
        │   ├── risk-level.ts    # RISK_LEVELS, isRiskLevel()
        │   ├── scenarios.ts
        │   ├── events.ts
        │   ├── filters.ts
        │   └── format.ts
        ├── types/               # SÓ TIPOS
        │   ├── reading.ts
        │   ├── risk-level.ts
        │   ├── report-event.ts
        │   └── index.ts
        └── test/                # TESTES (espelha app/, components/, hooks/, lib/, services/)
            └── …
```
