# Roadmap

Cada etapa vira **um plano do Superpowers** em `docs/superpowers/plans/` e **uma branch/PR**.

## Feito

- [x] Firmware com sensores, cenários e níveis de risco (`hardware/src/main.cpp`).

## Etapa 1: Fundação do monorepo (branch `refactor/monorepo-structure`)

Plano: [`2026-11-10-monorepo-foundation.md`](superpowers/plans/2026-11-10-monorepo-foundation.md)

- [x] Mover o projeto PlatformIO para `hardware/`, sem mudar o código.
- [x] Documentação (`docs/`), `AGENTS.md`, `CLAUDE.md`, README da raiz e workspace do VS Code.
- [x] `mock-daily-report.js` completo, com testes.
- [x] Esqueleto do `web/`: Next.js, Tailwind, shadcn/ui, Recharts, Vitest, tipos de domínio e pastas das camadas.

## Etapa 2: Hardware grava o CSV (time de hardware)

Contrato: [csv-contract.md → Lado do hardware](csv-contract.md#lado-do-hardware)

- [x] Ciclo de leitura de gases e temperatura de 2 s para **1 s** (a base adaptativa e a linha de status legível continuam a cada 2 s).
- [x] Imprimir a linha `CSV,...` (16 campos) a cada ciclo.
- [x] `hardware/monitor/filter_gasguard.py` com buffer de linhas, validação, rotação diária e append (testes em `hardware/monitor/tests/`).
- [x] `monitor_filters = default, gasguard` no `platformio.ini`.
- [ ] Compilar e testar na placa: o CSV ganha 1 linha por segundo, e o ruído na USB não quebra o arquivo. (Sem a placa, o filtro foi testado com uma "placa falsa" que imita a Serial; o firmware ainda não foi compilado.)

## Etapa 3: Web, pipeline em tempo real

- [x] `src/services/report/`: parser do CSV (pt → `Reading`), validação e tail por offset, com detecção de recriação; `getRecentReadings()` e `watchReadings()`.
- [x] `app/page.tsx` dinâmico fazendo a carga inicial, e `GET /api/stream` (SSE com `ping` a cada 15 s).
- [x] `useReadings()`: EventSource, buffer sem duplicatas por `hora`, `router.refresh()` na reconexão, status da conexão e "sem dados" após 5 s.
- [x] `src/lib/`: dicionário de cenários, `detectEvents()` (mudança de nível) e filtros, com testes.

## Etapa 4: Web, interface

- [x] Tela única mobile-first: topo, cartão de risco, métricas, gráfico e eventos com filtros.
- [x] Modo claro e escuro e animação de pulso.
- [x] Destaque rápido quando o estado de uma métrica muda (nível do gás, chama, fogão, movimento).
- [ ] Teste no celular pela rede Wi-Fi.

## Etapa 5: Alertas por e-mail

- [x] Login/cadastro com Better Auth + SQLite local (`web/.data/auth.sqlite`); app protegido; navbar com nome e e-mail.
- [x] Envio gratuito (Gmail SMTP com senha de app) ao entrar em CRITICO, com intervalo anti-repetição.
- [x] Selo `[SIMULAÇÃO]` no assunto quando a origem for o mock.

## Futuro (requisitos da disciplina)

- [ ] Wi-Fi + MQTT: a placa publica a telemetria, e um coletor grava o mesmo CSV. Só a **entrada** muda; o web não muda.
- [ ] Firmware reorganizado em tarefas FreeRTOS.
