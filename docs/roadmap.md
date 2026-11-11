# Roadmap

Cada etapa vira **um plano do Superpowers** em `docs/superpowers/plans/` e **uma branch/PR**.

## Feito

- [x] Firmware com sensores, cenários e níveis de risco (`hardware/src/main.cpp`).

## Etapa 1: Fundação do monorepo (branch `refactor/monorepo-structure`)

Plano: [`2026-11-10-monorepo-foundation.md`](superpowers/plans/2026-11-10-monorepo-foundation.md)

- [ ] Mover o projeto PlatformIO para `hardware/`, sem mudar o código.
- [ ] Documentação (`docs/`), `AGENTS.md`, `CLAUDE.md`, README da raiz e workspace do VS Code.
- [ ] `mock-daily-report.js` completo, com testes.
- [ ] Esqueleto do `web/`: Next.js, Tailwind, shadcn/ui, Recharts, Vitest, tipos de domínio e pastas das camadas.

## Etapa 2: Hardware grava o CSV (time de hardware)

Contrato: [csv-contract.md → Lado do hardware](csv-contract.md#lado-do-hardware-a-implementar-ver-roadmap)

- [ ] Ciclo de leitura de gases e temperatura de 2 s para **1 s**.
- [ ] Imprimir a linha `CSV,...` (16 campos) a cada ciclo.
- [ ] `hardware/monitor/filter_gasguard.py` com buffer de linhas, validação, rotação diária e append.
- [ ] `monitor_filters = default, gasguard` no `platformio.ini`.
- [ ] Testar na placa: o CSV ganha 1 linha por segundo, e o ruído na USB não quebra o arquivo.

## Etapa 3: Web, pipeline em tempo real

- [ ] `src/lib/report/`: parser do CSV (pt → domínio), validação e tail por offset, com detecção de recriação.
- [ ] `GET /api/report?minutes=N` e `GET /api/stream` (SSE com `ping` a cada 15 s).
- [ ] `useReadings()`: EventSource, buffer, status da conexão e "sem dados" após 5 s.
- [ ] `src/domain/`: dicionário de cenários, detecção de eventos (mudança de nível) e filtros.

## Etapa 4: Web, interface

- [ ] Tela única mobile-first: topo, cartão de risco, métricas, gráfico e eventos com filtros.
- [ ] Modo claro e escuro, animações de pulso e destaque de mudança.
- [ ] Teste no celular pela rede Wi-Fi.

## Etapa 5: Alertas por e-mail

- [ ] Login/cadastro simples para saber o e-mail do usuário.
- [ ] Envio gratuito (Gmail SMTP com senha de app ou Resend) ao entrar em CRITICO, com intervalo anti-repetição.
- [ ] Selo `[SIMULAÇÃO]` no assunto quando a origem for o mock.

## Futuro (requisitos da disciplina)

- [ ] Wi-Fi + MQTT: a placa publica a telemetria, e um coletor grava o mesmo CSV. Só a **entrada** muda; o web não muda.
- [ ] Firmware reorganizado em tarefas FreeRTOS.
