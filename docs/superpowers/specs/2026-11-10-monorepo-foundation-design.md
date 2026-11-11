# Spec: Fundação do monorepo GasGuard (Etapa 1)

- **Data:** 2026-11-10
- **Branch:** `refactor/monorepo-structure`
- **Contexto global:** [`docs/architecture.md`](../../architecture.md), [`docs/csv-contract.md`](../../csv-contract.md), [`docs/decisions.md`](../../decisions.md)

## Objetivo

Transformar o repositório (hoje só um projeto PlatformIO na raiz) num monorepo com `hardware/` e `web/`. Ao final, a documentação está completa, o **simulador** escreve o `daily-report.csv` e o **esqueleto do Next.js** compila e testa. Nenhum comportamento do firmware muda.

## Escopo

### Entra

1. **Mover o firmware** para `hardware/` com `git mv`, preservando o histórico e sem alterar o conteúdo de `src/main.cpp` nem de `platformio.ini`. Mover também `include/`, `lib/`, `test/`, `.vscode/extensions.json` e o `README.md` atual, que vira `hardware/README.md` com os links corrigidos.
2. **Arquivos da raiz:** `README.md` novo (visão do monorepo), `.gitignore` reescrito, `gasguard.code-workspace`, e `AGENTS.md`, `CLAUDE.md` e `docs/`, que já foram escritos e só precisam ser commitados.
3. **Simulador `mock-daily-report.js`** completo (seção abaixo), com testes em `mock-daily-report.test.js` (`node:test`, sem dependências).
4. **Esqueleto do `web/`:**
   - Next.js 16.4.x (App Router, `src/`, TypeScript, Tailwind, ESLint, npm), shadcn/ui iniciado, Recharts instalado e Vitest configurado;
   - escutando em `0.0.0.0` e com `allowedDevOrigins` para IPs de rede local;
   - `.env.example` com `DAILY_REPORT_PATH=../daily-report.csv`;
   - tipos de domínio em `src/domain/` e um `README.md` por camada;
   - página placeholder em pt-BR.

### Não entra (ver roadmap)

- Linha `CSV,...` no firmware, ciclo de 1 s e `filter_gasguard.py` (Etapa 2).
- Leitura do CSV, rotas `/api/*`, `useReadings` e a interface real (Etapas 3 e 4).
- E-mail, login e MQTT.

## Simulador: `mock-daily-report.js`

Node puro, CommonJS (`require`/`module.exports`), **sem dependências**, Node ≥ 20.9. O `main()` só roda quando o arquivo é executado direto (`require.main === module`). Assim, os testes importam as funções sem disparar o loop.

### Linha de comando

```
node mock-daily-report.js [--scenario <nome>] [--interval <ms>] [--output <caminho>]
```

| Opção | Padrão | Validação |
|---|---|---|
| `--scenario` | `tour` | um dos nomes da tabela abaixo |
| `--interval` | `1000` | inteiro de 100 a 60000 (acima de 2^31-1 o `setInterval` vira 1 ms) |
| `--output` | `<pasta do script>/daily-report.csv` | qualquer caminho; relativo é resolvido a partir do diretório atual |

- Opção desconhecida, valor faltando ou valor inválido: mensagem em pt-BR no stderr, seguida do uso, e **exit code 1**.
- A cada tick: o horário atual, a rotação diária, o append de 1 linha e um log no stdout, por exemplo `14:32:08  gas_leak_flame  CRITICO (1)`.
- Ctrl+C (SIGINT): imprime `Mock encerrado.` e sai com o código 0.
- Erro ao escrever o arquivo: imprime no stderr e **continua** no próximo tick.

### Cenários

Bases fixas: `mq6_base = 290`, `mq2_base = 900`, `temp_limite = 28.0`. Os sorteios usam a função `random()` injetada, que retorna um número em [0, 1).

| Nome | `nivel` | `cenario` | Valores |
|---|---|---|---|
| `normal` | NORMAL | 0 | mq6 = base + [0, 60); mq2 = base + [0, 60); níveis 0; chama 0; temp ∈ [25.8, 26.4]; temp_alta 0; movimento = 1 se random() < 0.3; fogao 0; seg 0 |
| `gas_leak` | ALERTA | 7 | como `normal`, mas mq6 = base + [820, 1000) e mq6_nivel 2 |
| `gas_leak_flame` | CRITICO | 1 | como `gas_leak`, mais chama 1 |
| `gas_leak_heat` | ALTO | 3 | como `gas_leak`, mais temp ∈ [28.6, 30.0] e temp_alta 1 |
| `smoke` | ALERTA | 8 | como `normal`, mas mq2 = base + [820, 1000) e mq2_nivel 2 |
| `unattended_stove` | ver regra | ver regra | como `normal`, mas fogao 1, chama 1, movimento 0 e seg = ⌊elapsed⌋. seg < 30 → NORMAL/17; 30 ≤ seg < 60 → ATENCAO/13; seg ≥ 60 → ALERTA/9 |
| `sensor_failure` | FALHA | 16 | como `normal`, mas temp vazio e temp_alta 0 |
| `tour` | — | — | percorre a sequência abaixo e repete para sempre |

Sequência do `tour` (segundos): `normal` 20 → `gas_leak` 30 → `gas_leak_flame` 30 → `normal` 15 → `gas_leak_heat` 30 → `smoke` 30 → `normal` 15 → `unattended_stove` 75 → `sensor_failure` 20. O total é **265 s**. Dentro do tour, `elapsed` é o tempo desde o início da **etapa atual**.

A temperatura é formatada com 1 casa decimal (`toFixed(1)`). Os inteiros dos MQ são truncados.

## Esqueleto do web: decisões fixas

- Comando de criação, executado na raiz:
  ```
  npx create-next-app@16.4.6 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-react-compiler --no-cache-components --agents-md --no-agent-feedback --disable-git --yes
  ```
  - `--no-cache-components`: as rotas SSE das próximas etapas serão dinâmicas, e o Cache Components não traz ganho aqui.
- shadcn: `npx shadcn@4.23.0 init --defaults --yes --no-monorepo`, rodado dentro de `web/`.
- Dependências: `recharts@3.10.1` e `vitest@5.1.0` (dev).
- Scripts do `package.json`:
  - `"dev": "next dev -H 0.0.0.0"`
  - `"start": "next start -H 0.0.0.0"`
  - `"test": "vitest run"`
- `next.config.ts`: `allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"]`, para o celular conseguir usar o `next dev` pela rede.
- Domínio: os tipos seguem o mapeamento de [`csv-contract.md`](../../csv-contract.md#mapeamento-para-o-domínio-do-web-inglês).

## Critérios de aceite

- `git log --follow hardware/src/main.cpp` mostra os commits antigos, e `git diff main --stat -M` lista `src/main.cpp → hardware/src/main.cpp` sem mudança de conteúdo.
- `node --test mock-daily-report.test.js` passa.
- `node mock-daily-report.js --scenario gas_leak_flame --interval 200` cria `daily-report.csv` com a linha `data,<hoje>`, o cabeçalho de 17 colunas e linhas `CRITICO,1`.
- Em `web/`: `npm test`, `npm run lint` e `npm run build` passam.
- `npm run dev` serve a página placeholder em `http://localhost:3000`.
- `daily-report.csv`, `node_modules/` e `.next/` não aparecem no `git status`.
