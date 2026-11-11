# Contrato do `daily-report.csv`

O `daily-report.csv` é o **único ponto de integração** entre quem produz os dados (a placa ou o mock) e quem consome (o web). Qualquer mudança neste formato precisa ser feita **nos três lados ao mesmo tempo**: o filtro do hardware, o mock e `web/src/lib/report/`.

## Local

- Caminho: `./daily-report.csv`, na **raiz do repositório**.
- Fica no `.gitignore` e é gerado em tempo de execução.
- O web lê o caminho da variável `DAILY_REPORT_PATH`. O padrão é `../daily-report.csv`, resolvido a partir de `web/`.

## Estrutura do arquivo

```csv
data,2026-11-10
hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento
14:32:08,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42
14:32:09,placa,CRITICO,1,1118,290,2,1342,900,1,1,29.1,28.4,1,0,1,43
14:32:10,placa,FALHA,16,300,290,0,910,900,0,0,,28.4,0,1,0,0
```

| Linha | Conteúdo |
|---|---|
| 1 | `data,AAAA-MM-DD`: a data **local** do computador que está gravando |
| 2 | O cabeçalho com as 17 colunas, **exatamente** nesta ordem |
| 3 em diante | Uma leitura por linha |

### Regras de escrita

- Codificação **UTF-8 sem BOM**, quebra de linha **`\n`** (LF), sem aspas e sem espaços.
- Cada linha de dados termina com `\n` e é gravada com **uma única** operação de append. Assim, quem lê nunca encontra meia linha seguida de outra.
- Cadência: **1 linha por segundo**.
- **Um produtor por vez:** não rode o mock com a placa gravando ao mesmo tempo.

### Troca diária (rotação)

Antes de **cada** append, quem grava:

1. lê a 1ª linha do arquivo;
2. se o arquivo **não existe**, ou se a 1ª linha é **diferente** de `data,<hoje>`, **recria o arquivo** (trunca) com a linha 1 e a linha 2;
3. faz o append da leitura.

Com isso, a virada da meia-noite, um arquivo apagado no meio da execução ou um arquivo corrompido se resolvem sozinhos. O arquivo de ontem é descartado, porque os dados não precisam ser guardados.

### Regras de leitura (web)

- Se a linha 1 não começar com `data,`, ou a linha 2 for diferente do cabeçalho, o arquivo é **inválido**: o web trata como "sem dados" e registra o erro no log do servidor.
- Uma linha de dados com número de campos diferente de 17, ou com valor fora do tipo esperado, é **ignorada** e registrada no log, sem derrubar a leitura.
- Um trecho final sem `\n` é uma linha ainda incompleta: espere o próximo ciclo.
- Se o tamanho do arquivo **diminuir**, ele foi recriado: volte a ler do início e avise os clientes para limparem o estado.

## Colunas

| # | Coluna | Tipo | Valores | Observação |
|---|---|---|---|---|
| 1 | `hora` | texto | `HH:MM:SS` (24 h, local) | Carimbada pelo **computador** que grava, porque a ESP32 não tem relógio |
| 2 | `origem` | texto | `placa` \| `mock` | O web mostra o selo **SIMULAÇÃO** quando for `mock` |
| 3 | `nivel` | texto | `NORMAL` \| `ATENCAO` \| `ALERTA` \| `ALTO` \| `CRITICO` \| `FALHA` | Calculado pelo **firmware**. O web não recalcula |
| 4 | `cenario` | inteiro | `0`–`17` | Ver [scenarios.md](scenarios.md) |
| 5 | `mq6` | inteiro | `0`–`4095` | Leitura do ADC (média de 20 amostras) |
| 6 | `mq6_base` | inteiro | `0`–`4095` | Base de ar limpo |
| 7 | `mq6_nivel` | inteiro | `0` normal · `1` atenção · `2` vazamento | |
| 8 | `mq2` | inteiro | `0`–`4095` | |
| 9 | `mq2_base` | inteiro | `0`–`4095` | |
| 10 | `mq2_nivel` | inteiro | `0` · `1` · `2` | |
| 11 | `chama` | booleano | `0` \| `1` | |
| 12 | `temp` | decimal ou vazio | uma casa decimal, ex. `26.4` | **Vazio** quando a leitura do DHT11 for inválida |
| 13 | `temp_limite` | decimal ou vazio | uma casa decimal | Ambiente + 2 °C. Vazio enquanto a base não existir |
| 14 | `temp_alta` | booleano | `0` \| `1` | |
| 15 | `movimento` | booleano | `0` \| `1` | |
| 16 | `fogao` | booleano | `0` \| `1` | Botão que simula o fogão |
| 17 | `seg_sem_movimento` | inteiro | `≥ 0` | `0` quando o fogão está desligado |

O separador decimal é **ponto** (`26.4`), nunca vírgula.

## Mapeamento para o domínio do web (inglês)

Só `web/src/lib/report/` conhece os nomes da esquerda. O resto do web usa os tipos de `web/src/domain/`.

| CSV | Domínio (`Reading`) |
|---|---|
| `data` (linha 1) + `hora` | `timestamp`: `"2026-11-10T14:32:08"` (ISO local, sem fuso) |
| `origem`: `placa` / `mock` | `source`: `"board"` / `"mock"` |
| `nivel`: `NORMAL` / `ATENCAO` / `ALERTA` / `ALTO` / `CRITICO` / `FALHA` | `level`: `"NORMAL"` / `"ATTENTION"` / `"ALERT"` / `"HIGH"` / `"CRITICAL"` / `"FAILURE"` |
| `cenario` | `scenarioId` |
| `mq6`, `mq6_base`, `mq6_nivel` | `mq6: { value, base, level }` |
| `mq2`, `mq2_base`, `mq2_nivel` | `mq2: { value, base, level }` |
| `chama` | `flame` |
| `temp`, `temp_limite`, `temp_alta` | `temperature: { celsius, limit, high }` (vazio → `null`) |
| `movimento` | `motion` |
| `fogao` | `stoveOn` |
| `seg_sem_movimento` | `secondsWithoutMotion` |

## Lado do hardware (a implementar, ver roadmap)

### Linha que o firmware imprime

A cada ciclo de leitura (1 s), além dos logs legíveis que já existem:

```
CSV,<nivel>,<cenario>,<mq6>,<mq6_base>,<mq6_nivel>,<mq2>,<mq2_base>,<mq2_nivel>,<chama>,<temp>,<temp_limite>,<temp_alta>,<movimento>,<fogao>,<seg_sem_movimento>
```

- O prefixo `CSV` mais **15 campos**, no total 16 campos separados por vírgula. O firmware **não** imprime `hora` nem `origem`, porque quem grava acrescenta os dois.
- `nivel` é impresso como `ALTO`, não como "ALTO RISCO".
- `temp` vazio quando `erroTemp` for verdadeiro. `temp_limite` vazio quando ainda for `NAN`.
- **A lógica de risco e os pinos não mudam.** Só entra essa saída a mais.

### Filtro do Monitor Serial

- Arquivo: `hardware/monitor/filter_gasguard.py` (filtro customizado do PlatformIO: uma classe que herda de `DeviceMonitorFilterBase`, com `NAME = "gasguard"`).
- Ativação no `hardware/platformio.ini`: `monitor_filters = default, gasguard`.
- O `rx(text)` recebe pedaços de texto. O filtro guarda tudo num buffer e processa **linha por linha**.
- Linha que começa com `CSV,` e tem exatamente 16 campos: monta `hora,placa,<15 campos>`, aplica a rotação e faz o append no CSV.
- Linha `CSV,` com outro número de campos, ou com caracteres fora de `[0-9A-Z.,_-]`, é descartada (ruído na USB).
- **Todo o texto continua indo para o terminal**, então o Monitor funciona como antes.
- O caminho do CSV é calculado a partir do próprio arquivo do filtro: `Path(__file__).resolve().parents[2] / "daily-report.csv"`.
- Erro de escrita no arquivo não derruba o monitor: o filtro imprime um aviso e segue.
