# GasGuard 2.0

Sistema embarcado com **ESP32** que monitora a cozinha e classifica o **risco de vazamento de gás e de incêndio**, cruzando informações de vários sensores e avisando o usuário com **luz e som**.

> ⚠️ **Protótipo acadêmico** desenvolvido para a disciplina de **Sistemas Embarcados — CESAR School (2026)**.
> **Não é um detector certificado** de GLP, fumaça ou incêndio e não substitui equipamentos de segurança homologados.

---

## Sumário

- [O problema](#o-problema)
- [A ideia](#a-ideia)
- [Hardware](#hardware)
- [Ligações](#ligações)
- [Como o firmware funciona](#como-o-firmware-funciona)
- [Níveis de risco](#níveis-de-risco)
- [Como rodar o projeto](#como-rodar-o-projeto)
- [Como testar](#como-testar)
- [Ajustes no código](#ajustes-no-código)
- [Problemas comuns](#problemas-comuns)
- [Limitações conhecidas](#limitações-conhecidas)
- [Próximas etapas](#próximas-etapas)
- [Estrutura do repositório](#estrutura-do-repositório)

---

## O problema

Vazamentos de gás de cozinha (GLP) e fogões ligados sem ninguém por perto podem passar despercebidos dentro de casa. O perigo aumenta muito quando o gás vazando se encontra com uma **chama** ou uma **fonte de calor**.

## A ideia

Um sensor sozinho dá apenas um **indício**. Vários sensores juntos indicam um **risco maior**.

O GasGuard não apenas avisa "tem gás": ele combina as leituras e classifica a situação. Por exemplo:

| O que os sensores detectam | O que o sistema conclui |
|---|---|
| Só gás GLP | Vazamento de gás |
| Gás GLP **+** chama | **ALTO RISCO DE INCÊNDIO PELA CHAMA E PELO VAZAMENTO DE GÁS** |
| Gás GLP **+** temperatura subindo | Alto risco: vazamento com aumento de temperatura |
| Fogão ligado **+** nenhuma chama | Possível boca apagada com gás saindo |
| Fogão ligado **+** ninguém por perto há muito tempo | Fogão sem supervisão |

Papéis dos sensores:
- **MQ-6** é o sensor **principal**, específico para GLP (propano e butano).
- **MQ-2**, **chama**, **temperatura**, **fogão** e **movimento** funcionam como **agravantes**: aumentam o nível de risco quando aparecem junto com outra condição.
- O sensor de movimento **nunca cancela** um alerta de gás. Ele só indica se há alguém supervisionando o fogão.

---

## Hardware

| Componente | Função |
|---|---|
| ESP32 NodeMCU (DevKit) | Microcontrolador com Wi-Fi; roda o firmware |
| MQ-6 (módulo) | Sensor de GLP — sensor principal de vazamento |
| MQ-2 (módulo) | Sensor de gases em geral e fumaça |
| Sensor IR de chama (módulo) | Detecta chama na região do fogão |
| DHT11 (módulo) | Temperatura ambiente |
| Sensor PIR (HC-SR501 ou similar) | Detecta movimento (supervisão do fogão) |
| Botão | Simula o fogão ligado/desligado |
| LED RGB (cátodo comum) | Indica o nível de risco |
| LED comum | Acende quando há chama |
| Buzzer | Alarme sonoro |
| Resistores 220 Ω (×4) | LED RGB e LED de chama |
| Resistores 10 kΩ (×6) | Divisores de tensão dos sensores MQ |
| Protoboard, jumpers e cabo USB | Montagem |

---

## Ligações

| Componente | Pino do componente | ESP32 |
|---|---|---|
| MQ-2 | AO (pelo divisor de tensão) | **D34** |
| MQ-6 | AO (pelo divisor de tensão) | **D35** |
| Sensor de chama | DO | **D27** |
| PIR | OUT | **D14** |
| Botão do fogão | um lado / outro lado | **D33** / GND |
| DHT11 | OUT | **D13** |
| LED de chama | + (com 220 Ω) | **D26** |
| LED RGB | R / G / B (cada um com 220 Ω) | **D21 / D22 / D23** |
| LED RGB | comum (perna mais longa) | GND |
| Buzzer | + | **D4** |

**Alimentação:**

| Trilha | Origem | Alimenta |
|---|---|---|
| 5 V | pino **VIN** da ESP32 (ou fonte 5 V externa) | MQ-2, MQ-6, PIR |
| 3,3 V | pino **3V3** da ESP32 | Sensor de chama, DHT11 |
| GND | qualquer **GND** da ESP32 | **Todos** os componentes |

> Todos os GNDs precisam estar ligados entre si.

### Divisor de tensão dos sensores MQ (obrigatório)

Os sensores MQ são alimentados com 5 V, e a saída AO pode chegar a 5 V. Os pinos da ESP32 aceitam no máximo **3,3 V**. Por isso cada MQ passa por um divisor com três resistores de 10 kΩ:

```
AO do MQ ── 10k ──┬── 10k ── 10k ── GND
                  │
            D34 (MQ-2) ou D35 (MQ-6)
```

Os dois resistores de baixo, em série, somam 20 kΩ. A tensão que chega à ESP32 fica em, no máximo, 5 V × 20/30 ≈ **3,3 V**.

**Nunca ligue o AO direto na ESP32**, e **não ligue o pino DO** dos módulos MQ (ele também sai em 5 V).

### Por que esses pinos

- **D34 e D35** são pinos do **ADC1**, que continuam funcionando com o Wi-Fi ligado (os do ADC2 não).
- Foram evitados **RX0/TX0** (usados pela comunicação USB) e **GPIO 0, 2, 12 e 15** (usados na inicialização da placa).

---

## Como o firmware funciona

O código fica em [`src/main.cpp`](src/main.cpp).

### 1. Inicialização (cerca de 70 segundos)

1. **Aquecimento (60 s)** — LED RGB **piscando azul devagar**. Os sensores MQ têm um aquecedor interno e precisam esquentar para dar leituras estáveis. O PIR estabiliza ao mesmo tempo.
2. **Calibração (~10 s)** — LED **piscando vermelho**. O sistema mede o **ar limpo** (base de cada MQ) e a **temperatura ambiente**.
3. **Sistema ativo.**

Os alarmes funcionam **por comparação com a base**, e não com um número fixo. Isso torna o sistema independente do ambiente e da calibração de fábrica de cada sensor.

### 2. Monitoramento contínuo

| O que | Com que frequência | Como |
|---|---|---|
| Chama | o tempo todo | Considera "chama presente" por 1,5 s após a última detecção, porque a chama tremula |
| Botão do fogão | o tempo todo | Cada aperto liga/desliga, com proteção contra trepidação |
| Movimento (PIR) | o tempo todo | Conta há quanto tempo não há movimento com o fogão ligado |
| MQ-2 e MQ-6 | a cada 2 s | Média de 20 leituras; compara com a base |
| Temperatura | a cada 2 s | Descarta leituras impossíveis (< 5 °C ou > 60 °C) |

### 3. Decisões que deixam o sistema mais confiável

- **Histerese:** um alerta só é desligado quando o valor cai um pouco abaixo do limite, para não ficar ligando e desligando.
- **Base adaptativa dos MQ:** sensores MQ "derivam" lentamente, principalmente quando novos. Com o gás normal, a base acompanha essa deriva; durante um alerta, ela fica parada para não "engolir" um vazamento.
- **Falha de sensor:** se o sensor de temperatura parar de responder, o sistema entra em **FALHA** em vez de fingir que está tudo normal.

### 4. Avaliação de risco

A cada ciclo, a função `avaliaCenario()` testa as regras **da mais grave para a menos grave**. A primeira que bater define o cenário atual, que controla o LED, o buzzer e as mensagens no terminal.

---

## Níveis de risco

| Nível | Situações | LED RGB | Buzzer |
|---|---|---|---|
| **CRÍTICO** | Gás GLP (MQ-6) **+** chama | Vermelho e azul alternando | Sirene |
| **ALTO RISCO** | MQ-2 + chama · GLP + temperatura alta · GLP confirmado pelos dois MQ · GLP com fogão ligado sem supervisão · chama + temperatura alta com fogão desligado | Roxo piscando rápido | Bip agudo rápido |
| **ALERTA** | Vazamento de GLP · gases/fumaça altos (MQ-2) · fogão ligado sem movimento há 60 s | Azul (gás) ou amarelo (fogão) piscando rápido | Bip-bip |
| **ATENÇÃO** | Gás um pouco acima do normal · fogão ligado sem chama por 10 s · fogão sem movimento há 30 s · chama com fogão desligado · temperatura 2 °C acima do ambiente | Azul, amarelo ou verde piscando devagar | Bip curto a cada 3 s |
| **FALHA** | Sensor de temperatura sem resposta | Apagado | Silêncio |
| **NORMAL** | Nada detectado · fogão em uso com supervisão | Vermelho fixo | Silêncio |

O **LED de chama** (D26) é independente: acende sempre que o sensor vê chama.

### Mensagens no terminal

Quando o cenário muda, o Monitor Serial mostra um bloco em destaque:

```
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 [CRITICO] ALTO RISCO DE INCENDIO PELA CHAMA E PELO VAZAMENTO DE GAS
 Leituras: MQ-6 VAZAMENTO (+850) | MQ-2 atencao (+320) | Chama: SIM | Temp: 26.8 C (limite 28.4) | Fogao: desligado | Movimento: SIM
 Orientacao (simulada): Nao acionar interruptores, fechar o registro de gas se for seguro, ventilar e sair do local.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
```

Ao voltar ao normal, ele informa quanto tempo durou a situação. A cada 2 segundos também aparece uma linha de status, e eventos isolados aparecem com o prefixo `[evento]`.

---

## Como rodar o projeto

### Pré-requisitos (instalar uma vez)

1. [VS Code](https://code.visualstudio.com/) com a extensão **PlatformIO IDE**.
2. [Git](https://git-scm.com/).
3. Driver USB da ESP32, se o computador não reconhecer a placa: **CP2102** ou **CH340**, conforme o chip ao lado do conector USB.

### Passo a passo

```bash
git clone https://github.com/Lvcalabria06/gasguard.git
```

1. No VS Code, abra **a pasta que contém o `platformio.ini`**.
2. Espere o PlatformIO terminar de configurar. Na primeira vez ele baixa a plataforma ESP32 e as bibliotecas (pode levar alguns minutos).
3. Conecte a ESP32 pelo USB.
4. Na barra azul inferior, clique em **→ (Upload)** e espere aparecer **SUCCESS**.
5. Clique em **🔌 (Serial Monitor)**.

As bibliotecas são instaladas automaticamente a partir do `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps =
    adafruit/DHT sensor library
    adafruit/Adafruit Unified Sensor
```

> Não fixe `upload_port` ou `monitor_port` no `platformio.ini`: a porta COM muda de computador para computador. Sem essas linhas, o PlatformIO detecta a porta sozinho.

---

## Como testar

Espere a inicialização terminar (LED vermelho fixo) antes de qualquer teste. Na primeira vez que usar sensores MQ novos, deixe-os ligados por pelo menos 30 minutos.

> **Segurança:** teste em lugar ventilado. Nunca junte gás e fogo de verdade. Para testar a combinação "gás + chama", use o **controle remoto da TV**, cujo infravermelho é lido pelo sensor de chama.

| Teste | Como fazer | Resultado esperado |
|---|---|---|
| Ar limpo | Não fazer nada | NORMAL, vermelho fixo, silêncio |
| Vapor no MQ-2 | Algodão com álcool a 3–5 cm do MQ-2 (nunca pingar no sensor) | MQ-2 sobe bastante; o MQ-6 sobe pouco. Atenção ou alerta |
| Gás no MQ-6 | Isqueiro **apagado**, só a válvula, por 1–2 s perto do MQ-6 | Atenção e depois alerta (azul piscando + bip-bip) |
| Chama | Controle remoto apontado para o sensor de chama | LED de chama acende; `[evento] Chama detectada` |
| **Crítico** | Gás no MQ-6 + controle remoto no sensor de chama | Vermelho/azul alternando + sirene |
| Gás + temperatura | Gás no MQ-6 + "haaa" de boca aberta no DHT11 | Alto risco (roxo) |
| Fogão sem chama | Apertar o botão e esperar 10 s | Atenção (amarelo) |
| Fogão sem supervisão | Botão ligado + controle remoto no sensor de chama + ninguém na frente do PIR | 30 s: atenção · 60 s: alerta |
| Recuperação | Afastar tudo | Volta ao NORMAL e mostra a duração do incidente |

---

## Ajustes no código

Todos ficam no bloco `// ===== Ajustes =====` no topo do `main.cpp`:

| Constante | Padrão | Para que serve |
|---|---|---|
| `MQ6_ATENCAO` / `MQ6_VAZAMENTO` | 300 / 800 | Quanto acima da base o MQ-6 precisa subir |
| `MQ2_ATENCAO` / `MQ2_VAZAMENTO` | 300 / 800 | Idem para o MQ-2 |
| `AUMENTO_ALERTA` | 2.0 | °C acima do ambiente para "temperatura alta" |
| `AQUECIMENTO_GAS` | 60000 | Tempo de aquecimento em ms |
| `TEMPO_FOGAO_SEM_CHAMA` | 10000 | ms com fogão ligado e sem chama até o aviso |
| `TEMPO_AUSENCIA_AVISO` / `TEMPO_AUSENCIA_ALERTA` | 30000 / 60000 | ms sem movimento com fogão ligado (curtos para demonstração) |
| `TEMPO_SEGURA_CHAMA` | 1500 | ms que a chama continua "presente" após a última detecção |
| `ANODO_COMUM` | false | `true` se o LED RGB for de ânodo comum |
| `CHAMA_ATIVA_EM_LOW` | true | `false` se o módulo de chama mandar HIGH ao detectar |
| `BOTAO_ALTERNA` | true | `false` se usar uma chave que fica travada |

Os limites dos MQ são **experimentais**, calibrados na maquete. Eles não correspondem a concentrações reais de gás (ppm).

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `could not open port 'COM..'` | Placa desconectada, porta errada ou Monitor aberto em outro programa |
| Upload trava em `Connecting...` | Segure o botão **BOOT** da ESP32 durante a conexão |
| `falha na temperatura` o tempo todo | Fio do DHT11 fora do D13, ou alimentação fraca |
| Leitura de um MQ perto de 0 | AO, divisor ou VCC fora do lugar (VCC deve ir no **VIN**) |
| Leitura de um MQ travada perto de 4095 | AO ligado direto na ESP32, sem divisor. **Desligue e corrija** |
| PIR detecta movimento sozinho | Sensibilidade alta, sensor vendo a sala, ou calor dos MQ. Ajuste os potenciômetros para o mínimo e afaste-o dos MQ |
| Caracteres estranhos (`����`) no Monitor | Ruído no cabo USB ou queda de tensão. Troque o cabo ou use fonte 5 V externa |
| Cores do LED invertidas | LED de ânodo comum: mude `ANODO_COMUM` para `true` |

---

## Limitações conhecidas

- Os sensores MQ **não são seletivos**: álcool, perfume e acetona também elevam a leitura (principalmente no MQ-2), o que pode gerar falsos positivos.
- Sensores MQ novos precisam de horas ligados para estabilizar.
- O PIR detecta **movimento**, não presença: uma pessoa parada pode não ser detectada.
- O sensor de chama pode ser enganado por luz solar direta.
- O DHT11 tem precisão de ±2 °C e resposta lenta.
- Os dois MQ consomem bastante corrente; pela porta USB, a alimentação pode ficar no limite. Para uso prolongado, recomenda-se fonte de 5 V / 1 A ou mais.
- O botão **simula** o fogão: não há leitura real do estado do fogão.

---

## Próximas etapas

- [ ] **Registro em CSV** das leituras em tempo real.
- [ ] **Back-end (API)** que lê os dados, avalia as regras e envia **e-mail/SMS** personalizado ao usuário.
- [ ] **App em formato de celular** mostrando as métricas em tempo real.
- [ ] **Simulador** de cenários para demonstração sem gás nem fogo.
- [ ] Envio de telemetria por **Wi-Fi + MQTT**.
- [ ] Firmware organizado em tarefas **FreeRTOS**.

A especificação detalhada da etapa de dados, back-end e app está em [`docs/gasguard-fase-dados-backend-frontend.md`](docs/gasguard-fase-dados-backend-frontend.md).

---

## Estrutura do repositório

```
gasguard/
├── platformio.ini      # Configuração da placa e das bibliotecas
├── src/
│   └── main.cpp        # Firmware do GasGuard
├── docs/               # Especificações e documentação do projeto
└── README.md
```

---

## Equipe

| Nome | Função |
|---|---|
| _preencher_ | _preencher_ |

---

**Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.**
