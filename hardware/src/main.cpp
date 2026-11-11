#include <Arduino.h>
#include <DHT.h>   // Biblioteca "DHT sensor library" (Adafruit)

// =====================================================================
//  GASGUARD - simulação de cenários de risco
//  MQ-6 (GLP) = sensor principal de vazamento
//  MQ-2 (gases/fumaça), chama, temperatura, fogão e PIR = agravantes do risco
//  O PIR NUNCA cancela alertas de gás: ele só indica supervisão do fogão.
// =====================================================================

// ===== Pinos =====
const int vermelho    = 21;   // LED RGB - vermelho
const int verde       = 22;   // LED RGB - verde
const int azul        = 23;   // LED RGB - azul
const int buzzer      = 4;
const int pinoDHT     = 13;   // OUT do sensor de temperatura
const int pinoPIR     = 14;   // OUT do sensor de movimento PIR
const int pinoChamaDO = 27;   // DO do sensor de chama
const int ledChama    = 26;   // LED extra que acende quando há chama
const int pinoMQ2     = 34;   // AO do MQ-2, PASSANDO PELO DIVISOR (10k + 10k + 10k)
const int pinoMQ6     = 35;   // AO do MQ-6, PASSANDO PELO DIVISOR (10k + 10k + 10k)
const int pinoBotao   = 33;   // botão do fogão (outro lado no GND)

#define TIPO_DHT DHT11       // confirmado pelo diagnóstico: o sensor responde como DHT11

// ===== Ajustes =====
const int   FREQ_BUZZER        = 2000;   // Hz
const bool  ANODO_COMUM        = false;  // true se a perna longa do LED RGB vai no 3V3
const float AUMENTO_ALERTA     = 2.0;    // °C acima do ambiente para "temperatura alta"
const bool  CHAMA_ATIVA_EM_LOW = true;   // a maioria dos módulos: DO vai a LOW quando vê chama
const unsigned long TEMPO_SEGURA_CHAMA = 1500;  // ms que a chama continua "SIM" após a última detecção

const unsigned long AQUECIMENTO_GAS = 60000;  // ms de aquecimento dos MQ (o PIR aquece junto)
// Limites experimentais (quanto acima do ar limpo, escala 0 a 4095)
const int MQ6_ATENCAO   = 300;
const int MQ6_VAZAMENTO = 800;
const int MQ2_ATENCAO   = 300;
const int MQ2_VAZAMENTO = 800;

const bool BOTAO_ALTERNA = true;  // true = cada aperto liga/desliga o fogão (botão de apertar)
const unsigned long TEMPO_FOGAO_SEM_CHAMA = 10000;  // ms de fogão ligado sem chama até o aviso

// Supervisão do fogão (tempos curtos para a demonstração; numa casa real seriam minutos)
const unsigned long TEMPO_AUSENCIA_AVISO  = 30000;  // fogão ligado sem movimento: "possível ausência"
const unsigned long TEMPO_AUSENCIA_ALERTA = 60000;  // fogão ligado sem movimento: "ausência persistente"
// ===================

// ===== Níveis de risco e cenários =====
enum Nivel { NORMAL, ATENCAO, ALERTA, ALTO, CRITICO, FALHA };
enum CorCausa { COR_NENHUMA, COR_AZUL, COR_VERDE, COR_AMARELO };

struct Cenario {
  int id;
  Nivel nivel;
  CorCausa cor;          // cor do LED nos níveis ATENÇÃO e ALERTA
  const char* titulo;    // mensagem principal
  const char* acao;      // orientação simulada ao usuário
};

DHT dht(pinoDHT, TIPO_DHT);

// Temperatura
float tempAmbiente = NAN;
float limite = NAN;
float tempAtual = NAN;
bool tempAlta = false;
bool erroTemp = false;
unsigned long ultimaLeitura = 0;

// Chama
bool chama = false;
unsigned long ultimaDeteccaoChama = 0;

// Gás (0 = normal, 1 = atenção, 2 = vazamento)
int baseMQ2 = 0, baseMQ6 = 0;
int valorMQ2 = 0, valorMQ6 = 0;
int nivelMQ2 = 0, nivelMQ6 = 0;

// Fogão (botão)
bool fogaoLigado = false;
bool ultimoBotao = HIGH;
unsigned long ultimaMudancaBotao = 0;
unsigned long inicioFogao = 0;
unsigned long inicioSemChama = 0;
bool fogaoSemChama = false;

// Movimento (PIR)
bool movimento = false;
unsigned long ultimoMovimento = 0;
unsigned long tempoSemMovimento = 0;   // ms sem movimento desde que o fogão foi ligado
bool possivelAusencia = false;
bool ausenciaPersistente = false;

// Cenário atual
int cenarioAtualId = -1;
unsigned long inicioIncidente = 0;
int freqAtual = -1;

// ===================== Buzzer =====================
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  void iniciaBuzzer()      { ledcAttach(buzzer, FREQ_BUZZER, 8); }
  void escreveTom(int f)   { ledcWriteTone(buzzer, f); }
#else
  const int CH_BUZZER = 0;
  void iniciaBuzzer()      { ledcSetup(CH_BUZZER, FREQ_BUZZER, 8); ledcAttachPin(buzzer, CH_BUZZER); }
  void escreveTom(int f)   { ledcWriteTone(CH_BUZZER, f); }
#endif

// Toca uma frequência (0 = silêncio). Só envia quando muda, para evitar estalos.
void tom(int freq) {
  if (freq == freqAtual) return;
  freqAtual = freq;
  escreveTom(freq);
}

// ===================== LED =====================
void cor(bool r, bool g, bool b) {
  digitalWrite(vermelho, ANODO_COMUM ? !r : r);
  digitalWrite(verde,    ANODO_COMUM ? !g : g);
  digitalWrite(azul,     ANODO_COMUM ? !b : b);
}

void corDaCausa(CorCausa c, bool aceso) {
  if (!aceso) { cor(false, false, false); return; }
  switch (c) {
    case COR_AZUL:    cor(false, false, true); break;
    case COR_VERDE:   cor(false, true, false); break;
    case COR_AMARELO: cor(true, true, false);  break;
    default:          cor(true, false, false); break;
  }
}

// ===================== Sensores =====================
bool lerChama() {
  int v = digitalRead(pinoChamaDO);
  return CHAMA_ATIVA_EM_LOW ? (v == LOW) : (v == HIGH);
}

bool tempValida(float t) {
  return !isnan(t) && t > 5.0 && t < 60.0;
}

int lerMQ(int pino) {
  long soma = 0;
  for (int i = 0; i < 20; i++) {
    soma += analogRead(pino);
    delay(2);
  }
  return soma / 20;
}

int calculaNivel(int acima, int nivelAtual, int atencao, int vazamento) {
  if (acima >= vazamento) return 2;
  if (acima >= atencao) return (nivelAtual == 2 && acima >= vazamento - 100) ? 2 : 1;
  if (acima < atencao - 100) return 0;
  return nivelAtual;
}

const char* textoNivelGas(int n) {
  return n == 2 ? "VAZAMENTO" : (n == 1 ? "atencao" : "normal");
}

void atualizaBotao() {
  bool leitura = digitalRead(pinoBotao);
  if (leitura != ultimoBotao && millis() - ultimaMudancaBotao > 50) {
    ultimaMudancaBotao = millis();
    ultimoBotao = leitura;
    if (BOTAO_ALTERNA) {
      if (leitura == LOW) fogaoLigado = !fogaoLigado;
      else return;
    } else {
      fogaoLigado = (leitura == LOW);
    }
    if (fogaoLigado) inicioFogao = millis();
    Serial.println(fogaoLigado ? "[evento] Fogao LIGADO (simulado)" : "[evento] Fogao desligado (simulado)");
  }
}

// ===================== Avaliação de risco =====================
// As regras são verificadas da mais grave para a menos grave.
Cenario avaliaCenario() {
  bool gasGLP   = nivelMQ6 >= 1;   // MQ-6 acima do normal
  bool gasGeral = nivelMQ2 >= 1;   // MQ-2 acima do normal

  // ---- CRÍTICO ----
  if (gasGLP && chama)
    return {1, CRITICO, COR_NENHUMA,
            "ALTO RISCO DE INCENDIO PELA CHAMA E PELO VAZAMENTO DE GAS",
            "Nao acionar interruptores, fechar o registro de gas se for seguro, ventilar e sair do local."};

  // ---- ALTO RISCO ----
  if (gasGeral && chama)
    return {2, ALTO, COR_NENHUMA,
            "ALTO RISCO DE INCENDIO: CHAMA COM GASES OU FUMACA NO AMBIENTE",
            "Verificar a origem da chama e da fumaca, ventilar e afastar materiais inflamaveis."};
  if (gasGLP && tempAlta)
    return {3, ALTO, COR_NENHUMA,
            "ALTO RISCO: VAZAMENTO DE GAS COM AUMENTO DE TEMPERATURA",
            "Fechar o registro de gas, ventilar e afastar fontes de calor."};
  if (gasGLP && gasGeral)
    return {4, ALTO, COR_NENHUMA,
            "ALTO RISCO: VAZAMENTO CONFIRMADO PELOS DOIS SENSORES (MQ-6 E MQ-2)",
            "Fechar o registro de gas, abrir portas e janelas e nao acender chamas."};
  if (gasGLP && fogaoLigado && ausenciaPersistente)
    return {5, ALTO, COR_NENHUMA,
            "ALTO RISCO: VAZAMENTO DE GAS COM FOGAO LIGADO E SEM SUPERVISAO",
            "Fechar o registro de gas e verificar a cozinha imediatamente."};
  if (chama && tempAlta && !fogaoLigado)
    return {6, ALTO, COR_NENHUMA,
            "ALTO RISCO: CHAMA COM O FOGAO DESLIGADO E TEMPERATURA SUBINDO",
            "Verificar imediatamente a origem da chama."};

  // ---- ALERTA ----
  if (nivelMQ6 == 2)
    return {7, ALERTA, COR_AZUL,
            "VAZAMENTO DE GAS DETECTADO (MQ-6)",
            "Fechar o registro de gas, ventilar o ambiente e nao acender chamas."};
  if (nivelMQ2 == 2)
    return {8, ALERTA, COR_AZUL,
            "CONCENTRACAO ALTA DE GASES OU FUMACA (MQ-2)",
            "Ventilar o ambiente e verificar a origem dos gases ou da fumaca."};
  if (ausenciaPersistente)
    return {9, ALERTA, COR_AMARELO,
            "FOGAO LIGADO SEM SUPERVISAO: nenhum movimento detectado ha muito tempo",
            "Verificar se ha alguem na cozinha ou desligar o fogao."};

  // ---- ATENÇÃO ----
  if (nivelMQ6 == 1)
    return {10, ATENCAO, COR_AZUL, "Possivel vazamento de gas: MQ-6 acima do normal", "Verificar o ambiente."};
  if (nivelMQ2 == 1)
    return {11, ATENCAO, COR_AZUL, "Gases ou fumaca acima do normal (MQ-2)", "Verificar o ambiente."};
  if (fogaoSemChama)
    return {12, ATENCAO, COR_AMARELO, "Fogao ligado sem chama: possivel boca apagada", "Verificar o fogao."};
  if (possivelAusencia)
    return {13, ATENCAO, COR_AMARELO, "Fogao ligado e sem movimento recente: possivel ausencia", "Confirmar se ha alguem na cozinha."};
  if (chama && !fogaoLigado)
    return {14, ATENCAO, COR_AMARELO, "Chama detectada com o fogao desligado", "Verificar a origem da chama."};
  if (tempAlta)
    return {15, ATENCAO, COR_VERDE, "Temperatura acima do normal", "Verificar o ambiente."};

  // ---- FALHA ----
  if (erroTemp)
    return {16, FALHA, COR_NENHUMA, "FALHA NO SENSOR DE TEMPERATURA: monitoramento comprometido", "Conferir a ligacao do sensor."};

  // ---- NORMAL ----
  if (fogaoLigado)
    return {17, NORMAL, COR_NENHUMA, "Fogao em uso com supervisao", ""};
  return {0, NORMAL, COR_NENHUMA, "Ambiente normal", ""};
}

const char* nomeNivel(Nivel n) {
  switch (n) {
    case NORMAL:  return "NORMAL";
    case ATENCAO: return "ATENCAO";
    case ALERTA:  return "ALERTA";
    case ALTO:    return "ALTO RISCO";
    case CRITICO: return "CRITICO";
    case FALHA:   return "FALHA";
  }
  return "?";
}

String resumoLeituras() {
  char buf[240];
  char mov[40];
  if (fogaoLigado && !movimento)
    snprintf(mov, sizeof(mov), "nao (%lus)", tempoSemMovimento / 1000);
  else
    snprintf(mov, sizeof(mov), "%s", movimento ? "SIM" : "nao");
  snprintf(buf, sizeof(buf),
           "MQ-6 %s (%+d) | MQ-2 %s (%+d) | Chama: %s | Temp: %.1f C (limite %.1f) | Fogao: %s | Movimento: %s",
           textoNivelGas(nivelMQ6), valorMQ6 - baseMQ6,
           textoNivelGas(nivelMQ2), valorMQ2 - baseMQ2,
           chama ? "SIM" : "nao", tempAtual, limite,
           fogaoLigado ? "LIGADO" : "desligado", mov);
  return String(buf);
}

void anunciaCenario(const Cenario& c) {
  Serial.println();
  if (c.nivel == NORMAL) {
    Serial.println("--------------------------------------------------------------");
    if (inicioIncidente != 0) {
      Serial.printf(" Situacao encerrada apos %lu s\n", (millis() - inicioIncidente) / 1000);
      inicioIncidente = 0;
    }
    Serial.printf(" [NORMAL] %s\n", c.titulo);
    Serial.println("--------------------------------------------------------------");
    return;
  }
  if (inicioIncidente == 0) inicioIncidente = millis();
  const char* borda = (c.nivel >= ALERTA && c.nivel != FALHA)
      ? "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
      : "==============================================================";
  Serial.println(borda);
  Serial.printf(" [%s] %s\n", nomeNivel(c.nivel), c.titulo);
  Serial.printf(" Leituras: %s\n", resumoLeituras().c_str());
  if (c.acao[0] != '\0') Serial.printf(" Orientacao (simulada): %s\n", c.acao);
  Serial.println(borda);
}

// LED e buzzer de acordo com o nível de risco
void aplicaSaidas(const Cenario& c) {
  unsigned long m = millis();
  switch (c.nivel) {
    case NORMAL:      // vermelho fixo, silêncio
      cor(true, false, false);
      tom(0);
      break;
    case FALHA:       // LED apagado, silêncio
      cor(false, false, false);
      tom(0);
      break;
    case ATENCAO:     // cor da causa piscando devagar + bip curto a cada 3 s
      corDaCausa(c.cor, (m % 1000) < 500);
      tom((m % 3000) < 100 ? FREQ_BUZZER : 0);
      break;
    case ALERTA: {    // cor da causa piscando rápido + bip-bip
      bool on = (m % 400) < 200;
      corDaCausa(c.cor, on);
      tom(on ? FREQ_BUZZER : 0);
      break;
    }
    case ALTO: {      // roxo piscando mais rápido + bip agudo rápido
      bool on = (m % 300) < 150;
      cor(on, false, on);
      tom(on ? 2500 : 0);
      break;
    }
    case CRITICO: {   // vermelho/azul alternando (giroflex) + sirene
      bool fase = (m % 300) < 150;
      cor(fase, false, !fase);
      tom((m % 500) < 250 ? 1500 : 2800);
      break;
    }
  }
}

// ===================== Setup =====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== GASGUARD: simulacao de cenarios de risco ===");

  pinMode(vermelho, OUTPUT);
  pinMode(verde, OUTPUT);
  pinMode(azul, OUTPUT);
  pinMode(ledChama, OUTPUT);
  digitalWrite(ledChama, LOW);
  pinMode(pinoChamaDO, INPUT);
  pinMode(pinoPIR, INPUT);
  pinMode(pinoBotao, INPUT_PULLUP);
  analogReadResolution(12);
  iniciaBuzzer();
  tom(0);
  dht.begin();

  // ---- 1. Aquecimento dos MQ e do PIR: azul piscando devagar ----
  Serial.printf("Aquecendo MQ-2, MQ-6 e PIR por %lu s... nao aproxime gas.\n", AQUECIMENTO_GAS / 1000);
  unsigned long inicio = millis();
  unsigned long ultimoAviso = 0;
  while (millis() - inicio < AQUECIMENTO_GAS) {
    cor(false, false, true);  delay(500);
    cor(false, false, false); delay(500);
    if (millis() - ultimoAviso >= 10000) {
      ultimoAviso = millis();
      unsigned long resta = (AQUECIMENTO_GAS - (millis() - inicio)) / 1000;
      Serial.printf("  faltam ~%lu s | MQ-2: %d | MQ-6: %d | PIR: %s\n", resta,
                    lerMQ(pinoMQ2), lerMQ(pinoMQ6), digitalRead(pinoPIR) ? "movimento" : "parado");
    }
  }

  // ---- 2. Medindo temperatura ambiente e ar limpo: vermelho piscando ----
  Serial.println("Medindo temperatura ambiente e ar limpo... nao toque nos sensores.");
  float somaT = 0;
  int leiturasT = 0;
  long soma2 = 0, soma6 = 0;
  int leiturasGas = 0;
  for (int tentativa = 0; tentativa < 15 && leiturasT < 5; tentativa++) {
    cor(true, false, false);  delay(1000);
    cor(false, false, false); delay(1000);
    float t = dht.readTemperature();
    int g2 = lerMQ(pinoMQ2);
    int g6 = lerMQ(pinoMQ6);
    soma2 += g2;
    soma6 += g6;
    leiturasGas++;
    if (tempValida(t)) {
      somaT += t;
      leiturasT++;
      Serial.printf("  leitura %d: %.1f C | MQ-2: %d | MQ-6: %d\n", leiturasT, t, g2, g6);
    } else {
      Serial.printf("  falha na temperatura | MQ-2: %d | MQ-6: %d\n", g2, g6);
    }
  }

  if (leiturasT > 0) {
    tempAmbiente = somaT / leiturasT;
    limite = tempAmbiente + AUMENTO_ALERTA;
  } else {
    Serial.println("AVISO: sensor de temperatura nao respondeu. A base sera definida na primeira leitura valida.");
  }
  baseMQ2 = soma2 / leiturasGas;
  baseMQ6 = soma6 / leiturasGas;

  Serial.printf("Temperatura ambiente: %.1f C | alta a partir de: %.1f C\n", tempAmbiente, limite);
  Serial.printf("MQ-6 ar limpo: %d | atencao: %d | vazamento: %d\n",
                baseMQ6, baseMQ6 + MQ6_ATENCAO, baseMQ6 + MQ6_VAZAMENTO);
  Serial.printf("MQ-2 ar limpo: %d | atencao: %d | vazamento: %d\n",
                baseMQ2, baseMQ2 + MQ2_ATENCAO, baseMQ2 + MQ2_VAZAMENTO);
  Serial.printf("Supervisao do fogao: aviso apos %lu s e alerta apos %lu s sem movimento\n",
                TEMPO_AUSENCIA_AVISO / 1000, TEMPO_AUSENCIA_ALERTA / 1000);
  if (baseMQ2 < 20) Serial.println("AVISO: leitura do MQ-2 muito baixa. Confira AO, divisor e VCC no VIN.");
  if (baseMQ6 < 20) Serial.println("AVISO: leitura do MQ-6 muito baixa. Confira AO, divisor e VCC no VIN.");
  Serial.println("Sistema ativo.");
}

// ===================== Loop =====================
void loop() {
  // ---- Fogão ----
  atualizaBotao();

  // ---- Movimento (PIR) ----
  bool movAgora = digitalRead(pinoPIR) == HIGH;
  if (movAgora) ultimoMovimento = millis();
  if (movAgora != movimento) {
    movimento = movAgora;
    Serial.println(movimento ? "[evento] Movimento detectado" : "[evento] Sem movimento");
  }

  // ---- Supervisão do fogão ----
  if (fogaoLigado) {
    unsigned long referencia = max(ultimoMovimento, inicioFogao);
    tempoSemMovimento = movimento ? 0 : millis() - referencia;
  } else {
    tempoSemMovimento = 0;
  }
  possivelAusencia    = fogaoLigado && tempoSemMovimento >= TEMPO_AUSENCIA_AVISO;
  ausenciaPersistente = fogaoLigado && tempoSemMovimento >= TEMPO_AUSENCIA_ALERTA;

  // ---- Chama (verificada o tempo todo) ----
  if (lerChama()) ultimaDeteccaoChama = millis();
  bool chamaAgora = (ultimaDeteccaoChama != 0) &&
                    (millis() - ultimaDeteccaoChama < TEMPO_SEGURA_CHAMA);
  if (chamaAgora != chama) {
    chama = chamaAgora;
    Serial.println(chama ? "[evento] Chama detectada" : "[evento] Chama apagada");
  }
  digitalWrite(ledChama, chama ? HIGH : LOW);

  // ---- Fogão ligado sem chama ----
  if (fogaoLigado && !chama) {
    if (inicioSemChama == 0) inicioSemChama = millis();
    fogaoSemChama = millis() - inicioSemChama >= TEMPO_FOGAO_SEM_CHAMA;
  } else {
    inicioSemChama = 0;
    fogaoSemChama = false;
  }

  // ---- Gás e temperatura (a cada 2 s) ----
  if (millis() - ultimaLeitura >= 2000) {
    ultimaLeitura = millis();

    valorMQ2 = lerMQ(pinoMQ2);
    int n2 = calculaNivel(valorMQ2 - baseMQ2, nivelMQ2, MQ2_ATENCAO, MQ2_VAZAMENTO);
    if (n2 != nivelMQ2) {
      Serial.printf("[evento] MQ-2: %s -> %s\n", textoNivelGas(nivelMQ2), textoNivelGas(n2));
      nivelMQ2 = n2;
    }

    valorMQ6 = lerMQ(pinoMQ6);
    int n6 = calculaNivel(valorMQ6 - baseMQ6, nivelMQ6, MQ6_ATENCAO, MQ6_VAZAMENTO);
    if (n6 != nivelMQ6) {
      Serial.printf("[evento] MQ-6: %s -> %s\n", textoNivelGas(nivelMQ6), textoNivelGas(n6));
      nivelMQ6 = n6;
    }

    // Base adaptativa (só em ar normal)
    if (nivelMQ2 == 0) {
      if (valorMQ2 < baseMQ2) baseMQ2 = (baseMQ2 * 9 + valorMQ2) / 10;
      else if (valorMQ2 - baseMQ2 < MQ2_ATENCAO / 3) baseMQ2 = (baseMQ2 * 99 + valorMQ2) / 100;
    }
    if (nivelMQ6 == 0) {
      if (valorMQ6 < baseMQ6) baseMQ6 = (baseMQ6 * 9 + valorMQ6) / 10;
      else if (valorMQ6 - baseMQ6 < MQ6_ATENCAO / 3) baseMQ6 = (baseMQ6 * 99 + valorMQ6) / 100;
    }

    float t = dht.readTemperature();
    if (!tempValida(t)) {
      erroTemp = true;
    } else {
      erroTemp = false;
      tempAtual = t;
      if (isnan(tempAmbiente)) {
        tempAmbiente = t;
        limite = t + AUMENTO_ALERTA;
        Serial.printf("[evento] Base de temperatura definida: %.1f C (limite %.1f C)\n", tempAmbiente, limite);
      }
      if (!tempAlta && t >= limite) tempAlta = true;
      else if (tempAlta && t < limite - 0.5) tempAlta = false;
    }

    // Linha de status
    Cenario c = avaliaCenario();
    Serial.printf("[%s] %s\n", nomeNivel(c.nivel), resumoLeituras().c_str());
  }

  // ---- Avalia o cenário e anuncia quando ele muda ----
  Cenario c = avaliaCenario();
  if (c.id != cenarioAtualId) {
    cenarioAtualId = c.id;
    anunciaCenario(c);
  }
  aplicaSaidas(c);

  delay(10);
}