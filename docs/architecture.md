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
┌───────────────────────────── TESTE ──────────────────────────────┐  │      (raiz, 1 linha/s,
│ ./mock-daily-report.js (Node, sem dependências)                  │──┘       recriado a cada dia)
└──────────────────────────────────────────────────────────────────┘             │
                                                                                 ▼
                                        web/ (Next.js, roda no mesmo computador)
                                          lib/report   → acompanha e interpreta o CSV
                                          app/api      → /api/report (carga inicial) + /api/stream (SSE)
                                          hooks        → useReadings() com EventSource
                                          components   → tela única, mobile-first
                                                 │
                                                 ▼
                         navegador: http://localhost:3000 · celular: http://<IP-do-PC>:3000
```

- **O hardware e o mock são intercambiáveis.** Os dois escrevem o mesmo arquivo, no mesmo formato ([csv-contract.md](csv-contract.md)). O web não sabe quem está escrevendo, só lê a coluna `origem`.
- **O nível de risco é do firmware.** O web exibe `nivel` e `cenario`, mas não recalcula regras.
- **Tudo roda local.** O web lê um arquivo do disco, então não há deploy em nuvem. O celular acessa pela mesma rede Wi-Fi.

## Camadas do web

Cada camada tem uma responsabilidade e conversa só com a vizinha:

```
CSV no disco
  └─ 1. leitura      src/lib/report/          acompanha o arquivo (tail) e converte cada linha em Reading
       └─ 2. transporte  src/app/api/stream/  envia Readings por SSE
                         src/app/api/report/  devolve as leituras recentes (carga inicial)
            └─ 3. cliente     src/hooks/      useReadings(): EventSource → estado (leituras, eventos, conexão)
                 └─ 4. UI         src/components/  container (liga o hook) → componentes de apresentação (só props)
```

| Pasta | Responsabilidade | Pode importar | Não pode |
|---|---|---|---|
| `src/domain/` | Tipos em inglês (`Reading`, `RiskLevel`, `ReportEvent`...) e **funções puras** de regra (detecção de eventos, filtros, dicionário de cenários) | nada além de outras partes de `domain` | Node, React, Next |
| `src/lib/report/` | **Única** camada que conhece o CSV em português: parser, validação, tail do arquivo, rotação | `domain`, `node:fs` | React |
| `src/app/api/` | Transporte HTTP/SSE. Fino: chama `lib/report` e serializa | `domain`, `lib/report` | regra de negócio |
| `src/hooks/` | Estado no cliente: conexão SSE, buffer de leituras, eventos derivados | `domain` | `node:fs`, `lib/report` |
| `src/components/` | Interface. Containers usam hooks; os componentes de apresentação recebem só props | `domain`, `hooks`, `components/ui` | `lib/report` |
| `src/components/ui/` | Componentes do shadcn/ui (gerados pelo CLI) | — | — |

**Container/presentation é convenção, não regra rígida.** Se o componente for simples, ele pode usar o hook e renderizar no mesmo arquivo. **Regra de negócio nunca fica em componente**: ela vai para `src/domain/`, como função pura com teste.

## Tempo real (SSE)

- `GET /api/stream`: uma conexão SSE por cliente. O servidor verifica o arquivo a cada **500 ms**, lê **só os bytes novos** (guarda o offset) e envia um evento por linha nova.
- Arquivo recriado (o tamanho diminuiu): volta para o offset 0 e envia um evento de reset.
- Um `ping` a cada **15 s** mantém a conexão viva.
- `GET /api/report?minutes=10`: leituras recentes, para o gráfico abrir já preenchido.
- No cliente, o `EventSource` reconecta sozinho. A interface mostra "Reconectando...".
- **Sem linha nova há mais de 5 s:** o estado vira **sem dados** (cinza). O app nunca mostra "normal" com dado velho.

> Os nomes exatos dos eventos SSE e o formato das respostas serão definidos no plano da etapa "web: pipeline em tempo real" ([roadmap](roadmap.md)).

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
│   ├── architecture.md          # este arquivo
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
│   └── monitor/filter_gasguard.py   # (etapa futura) grava o CSV a partir do Serial
└── web/                         # projeto Next.js
    ├── AGENTS.md                # gerado pelo create-next-app (regras do Next)
    ├── package.json
    ├── next.config.ts
    ├── vitest.config.mts
    ├── components.json          # configuração do shadcn/ui
    ├── .env.example             # DAILY_REPORT_PATH
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx         # a tela única
        │   ├── globals.css
        │   └── api/
        │       ├── report/      # GET /api/report (carga inicial)
        │       └── stream/      # GET /api/stream (SSE)
        ├── domain/              # tipos e regras puras, em inglês
        ├── lib/
        │   ├── utils.ts         # cn() do shadcn
        │   └── report/          # leitura do CSV (única camada em português)
        ├── hooks/               # useReadings()
        └── components/
            └── ui/              # componentes do shadcn
```
