# GasGuard 2.0

Monitoramento de **vazamento de gás (GLP) e risco de incêndio** na cozinha: uma ESP32 com sensores classifica o risco, e um app web mostra tudo em tempo real no navegador e no celular.

> ⚠️ **Protótipo acadêmico** — Sistemas Embarcados, CESAR School 2026. **Não é um detector certificado** e não substitui equipamentos homologados.

## Como funciona

```
hardware/ (ESP32) ──Serial──► Monitor do PlatformIO + filtro ─┐
                                                              ├─► daily-report.csv ──► web/ (Next.js) ──► navegador / celular
mock-daily-report.js (simulador, para testes) ────────────────┘
```

- A placa (ou o simulador) grava **1 linha por segundo** em `daily-report.csv`.
- O app web lê o arquivo e atualiza a tela ao vivo.
- Detalhes em [`docs/architecture.md`](docs/architecture.md).

## Estrutura

| Pasta/arquivo | O que é |
|---|---|
| [`hardware/`](hardware/) | Firmware da ESP32 (PlatformIO). Ligações e testes físicos no [README do hardware](hardware/README.md) |
| [`web/`](web/) | App Next.js, mobile-first |
| [`mock-daily-report.js`](mock-daily-report.js) | Simulador: gera leituras falsas no CSV, sem a placa |
| [`docs/`](docs/) | Decisões, contrato do CSV, roadmap e planos |

## Como rodar

Pré-requisitos: **Node ≥ 22.12** (recomendado: Node 24 LTS) e VS Code com a extensão **PlatformIO IDE** (só para o firmware).

**Sem a placa (simulador):**

```bash
node mock-daily-report.js --scenario tour
```

Cenários: `normal`, `gas_leak`, `gas_leak_flame`, `gas_leak_heat`, `smoke`, `unattended_stove`, `sensor_failure`, `tour` (passa por todos).

**App web** (em outro terminal):

```bash
cd web
npm install
npm run dev
```

Abra `http://localhost:3000`, ou `http://<IP-do-computador>:3000` no celular, na mesma rede Wi-Fi.

**Com a placa:** abra `gasguard.code-workspace` no VS Code, faça o Upload do firmware e abra o Monitor Serial do PlatformIO. A gravação do CSV pela placa é a próxima etapa: veja [`docs/roadmap.md`](docs/roadmap.md).

## Documentação

Comece por [`docs/README.md`](docs/README.md). Para agentes de IA: [`AGENTS.md`](AGENTS.md).
