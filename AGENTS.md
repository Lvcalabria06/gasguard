# AGENTS.md — GasGuard 2.0

Contexto para agentes de IA (Claude Code, Codex etc.) e para quem chega agora no projeto.

## O que é

Protótipo acadêmico (Sistemas Embarcados, CESAR School 2026). Uma ESP32 com sensores (MQ-6, MQ-2, chama, DHT11, PIR e botão do fogão) classifica o risco de vazamento de gás e de incêndio. Um app web mostra as leituras em tempo real, no navegador e no celular.

> **Não é um detector certificado.** Nenhum texto, código ou commit pode prometer proteção real.

## Leia antes de mexer

1. [`docs/architecture.md`](docs/architecture.md): fluxo dos dados, camadas do web e mapa de pastas.
2. [`docs/csv-contract.md`](docs/csv-contract.md): o formato do `daily-report.csv` (contrato entre hardware, mock e web).
3. [`docs/decisions.md`](docs/decisions.md): o que foi decidido e por quê. Não reabra uma decisão sem motivo novo.
4. [`docs/roadmap.md`](docs/roadmap.md): em que etapa estamos.
5. [`docs/scenarios.md`](docs/scenarios.md): os 18 cenários de risco do firmware.

## Mapa rápido

```
hardware/              projeto PlatformIO (firmware C++ da ESP32), em português
web/                   Next.js 16 + TypeScript + Tailwind + shadcn/ui, código em inglês
mock-daily-report.js   simulador: grava o CSV a cada 1 s (Node puro)
daily-report.csv       gerado em execução, nunca versionado
docs/                  decisões, contrato, roadmap, specs e planos do Superpowers
```

## Regras

- **Idioma:**
  - documentação e textos da interface em **pt-BR**;
  - código do `web/` e do mock em **inglês**;
  - o firmware continua em **português**.
- **Hardware e web são desacoplados:** a única interseção é o `daily-report.csv` da raiz. O `web/` nunca importa, lê ou executa nada de `hardware/`, e vice-versa. O web tem que funcionar sem a placa (mock ou "sem dados"), e a placa sem o web.
- **CSV em português:** no web, **somente** `web/src/services/report/` conhece as colunas em português (`nivel`, `fogao`...). O resto usa os tipos de `web/src/types/`.
- **O nível de risco vem do firmware.** O web não recalcula regras de risco.
- **Sem dados há mais de 5 s:** mostre "sem dados", nunca "normal".
- **Camadas do web** (tabela completa em [`docs/architecture.md`](docs/architecture.md#camadas-do-web)). Não crie pastas de primeiro nível novas em `web/src`:
  - `app/`: rotas finas. `page.tsx` (Server Component) faz a carga inicial; `api/stream` é o SSE. Não existe `/api/report`.
  - `components/`: interface (`ui/` é do shadcn, `dashboard/` é a tela).
  - `hooks/`: estado no navegador. Na reconexão do SSE, `router.refresh()`.
  - `services/`: lógica do servidor; todo arquivo começa com `import "server-only";`.
  - `lib/`: funções puras com `*.test.ts` ao lado. **Regra de negócio fica aqui**, nunca em componente ou hook.
  - `types/`: **só tipos**, nada executável.
  - Importe só "para baixo": `app` → `components` → `hooks` → `services` → `lib` → `types` (`components` e `hooks` nunca importam `services`).
  - Arquivos em `kebab-case`, imports por `@/`.
- **Firmware:**
  - não altere a lógica de risco nem os pinos sem pedido explícito;
  - não use a pasta `hardware/data/`, que o PlatformIO reserva para o sistema de arquivos da placa;
  - não fixe `upload_port` nem `monitor_port`.
- **Workflow:** os planos ficam em `docs/superpowers/plans/` e as specs em `docs/superpowers/specs/` (plugin Superpowers). Uma etapa do roadmap corresponde a um plano e a uma branch.
- **Testes antes de declarar pronto:**
  - mock: `node --test mock-daily-report.test.js` na raiz;
  - web: `npm test`, `npm run lint` e `npm run build` em `web/`.

## Comandos

```bash
# Simulador (na raiz). Cenários: normal, gas_leak, gas_leak_flame, gas_leak_heat, smoke, unattended_stove, sensor_failure, tour
node mock-daily-report.js --scenario tour

# Testes do simulador (na raiz)
node --test mock-daily-report.test.js

# Web (em web/)
npm install
npm run dev        # http://localhost:3000 e http://<IP-do-PC>:3000
npm test
npm run lint
npm run build

# Firmware: abra gasguard.code-workspace no VS Code e use Upload / Monitor do PlatformIO
```
