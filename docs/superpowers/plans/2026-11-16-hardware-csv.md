# Etapa 2: a placa grava o `daily-report.csv`

Branch: `feat/hardware-csv`. Contrato: [`docs/csv-contract.md` → Lado do hardware](../../csv-contract.md#lado-do-hardware).

## Objetivo

Com o Monitor Serial do PlatformIO aberto, a placa alimenta o mesmo CSV que o simulador, e o web mostra os dados como `placa`. A lógica de risco e os pinos não mudam.

## Tarefas

1. **Firmware** (`hardware/src/main.cpp`)
   - Ciclo de leitura de gás e temperatura: 2 s → 1 s (`INTERVALO_LEITURA`).
   - A base adaptativa dos MQ continua a cada 2 s (um ciclo sim, outro não). Ela se ajusta um pouco por ciclo; com o ciclo em 1 s, sem isso, acompanharia a deriva duas vezes mais rápido e "engoliria" um vazamento lento mais depressa.
   - A linha de status legível continua a cada 2 s, para o Monitor não ficar mais poluído que antes.
   - `imprimeLinhaCsv()`: `CSV,` + 15 campos a cada ciclo. `nivel` como `ALTO` (não "ALTO RISCO"); `temp` vazio com `erroTemp`; `temp_limite` vazio enquanto for `NAN`.
2. **Filtro** (`hardware/monitor/filter_gasguard.py`)
   - Buffer por linha; aceita só `CSV,` + 15 campos com `[0-9A-Z.,_-]` e nível conhecido.
   - Acrescenta `hora` (relógio do PC) e `placa`; rotação diária igual à do mock; append com `newline=""`.
   - No máximo 1 linha por segundo: uma segunda linha no mesmo segundo do PC é descartada.
   - Erros de escrita só avisam; o texto sempre volta intacto para o terminal.
3. **`platformio.ini`**: `monitor_filters = default, gasguard`.
4. **Testes**: `python -m unittest discover -s hardware/monitor/tests` (sem placa nem PlatformIO).
5. **Validação sem placa**: uma "placa falsa" imita a Serial (logs + linhas `CSV,` com `\r\n`, texto picado, ruído) e passa pelo filtro real; o CSV resultante é conferido contra o contrato e as regras do firmware, e o dashboard mostra os dados sem o selo SIMULAÇÃO.

## Falta (precisa da placa)

- Compilar o firmware no PlatformIO (o PC usado nesta etapa não tem PlatformIO nem compilador C++; o diff foi revisado à mão).
- Gravar, abrir o Monitor e confirmar: 1 linha por segundo no CSV, logs legíveis iguais aos de antes, ruído na USB descartado.
