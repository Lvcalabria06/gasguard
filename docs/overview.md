# Visão geral

## O projeto

**GasGuard 2.0** é um protótipo acadêmico (Sistemas Embarcados, CESAR School 2026) que monitora a cozinha e classifica o **risco de vazamento de gás (GLP) e de incêndio**, cruzando vários sensores.

> Protótipo acadêmico. **Não é um detector certificado** e não substitui equipamentos homologados.

A ideia central: um sensor sozinho dá um **indício**; vários sensores juntos indicam um **risco maior**. O MQ-6 (GLP) é o sensor principal. MQ-2, chama, temperatura, fogão e movimento são **agravantes**. O sensor de movimento **nunca cancela** um alerta de gás.

## Hardware

| Componente | Função | Pino ESP32 |
|---|---|---|
| ESP32 NodeMCU (DevKit) | Microcontrolador | — |
| MQ-6 | GLP (sensor principal), via divisor de tensão | D35 |
| MQ-2 | Gases em geral e fumaça, via divisor de tensão | D34 |
| Sensor IR de chama | Chama perto do fogão | D27 |
| DHT11 | Temperatura | D13 |
| PIR | Movimento (supervisão do fogão) | D14 |
| Botão | Simula o fogão ligado/desligado | D33 |
| LED RGB | Nível de risco | D21 / D22 / D23 |
| LED de chama | Acende quando há chama | D26 |
| Buzzer | Alarme sonoro | D4 |

Detalhes de ligação, alimentação e testes físicos: [`hardware/README.md`](../hardware/README.md).

## Como o firmware funciona hoje

Código: [`hardware/src/main.cpp`](../hardware/src/main.cpp) (C++/Arduino, PlatformIO, `esp32dev`, Serial a 115200).

1. **Aquecimento (60 s):** os sensores MQ esquentam.
2. **Calibração (~10 s):** mede o **ar limpo** (a base de cada MQ) e a **temperatura ambiente**. O limite de temperatura é a ambiente **+ 2 °C**.
3. **Monitoramento:**
   - Chama, botão e PIR são lidos o tempo todo.
   - MQ-2, MQ-6 e DHT11 são lidos **a cada 2 s**. A meta combinada para o CSV é **1 s** (ver [roadmap](roadmap.md)).
   - Níveis dos MQ: `0` normal, `1` atenção (≥ 300 acima da base), `2` vazamento (≥ 800 acima da base), com histerese.
   - Base adaptativa: com ar normal, a base acompanha a deriva do sensor.
4. **Avaliação:** `avaliaCenario()` testa as regras da mais grave para a menos grave. A primeira que bater define o **cenário** (id 0 a 17) e o **nível**. Ver [scenarios.md](scenarios.md).
5. **Saídas:** o LED RGB e o buzzer seguem o nível. Os logs legíveis saem pelo Serial.

### Níveis de risco do firmware

`NORMAL` · `ATENCAO` · `ALERTA` · `ALTO` (impresso como "ALTO RISCO" no log) · `CRITICO` · `FALHA`

### Limites de tempo usados no firmware (valores de demonstração)

| Constante | Valor | Efeito |
|---|---|---|
| `TEMPO_FOGAO_SEM_CHAMA` | 10 s | Fogão ligado sem chama → cenário 12 |
| `TEMPO_AUSENCIA_AVISO` | 30 s | Fogão ligado sem movimento → cenário 13 |
| `TEMPO_AUSENCIA_ALERTA` | 60 s | Fogão ligado sem movimento → cenário 9 |
| `TEMPO_SEGURA_CHAMA` | 1,5 s | A chama continua "presente" após a última detecção |
| `AUMENTO_ALERTA` | 2,0 °C | Acima da temperatura ambiente = "temperatura alta" |

## Equipe e disciplina

- Disciplina: Sistemas Embarcados, CESAR School, 2026.
- O requisito oficial da disciplina inclui **Wi-Fi + MQTT**. Esta fase usa a Serial USB, e o MQTT é uma etapa futura que só troca a **entrada** dos dados (ver [roadmap](roadmap.md)).
