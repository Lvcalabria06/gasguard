# Cenários de risco do firmware

Fonte da verdade: `avaliaCenario()` em [`hardware/src/main.cpp`](../hardware/src/main.cpp). As regras são testadas **de cima para baixo**, e a primeira que bater vence.

O CSV traz só o `cenario` (id) e o `nivel`. O web mantém um dicionário `id → título + orientação` com os textos abaixo, em pt-BR e com acentos (o firmware não usa acentos por causa do Serial).

## Variáveis usadas nas regras

- **gasGLP** = `mq6_nivel >= 1`
- **gasGeral** = `mq2_nivel >= 1`
- **ausência persistente** = fogão ligado e sem movimento há ≥ 60 s
- **possível ausência** = fogão ligado e sem movimento há ≥ 30 s
- **fogão sem chama** = fogão ligado e sem chama há ≥ 10 s

## Tabela

| Id | Nível (CSV) | Condição | Título (pt-BR para a tela) | Orientação |
|---|---|---|---|---|
| 1 | CRITICO | gasGLP **e** chama | Alto risco de incêndio pela chama e pelo vazamento de gás | Não acione interruptores, feche o registro de gás se for seguro, ventile e saia do local. |
| 2 | ALTO | gasGeral **e** chama | Alto risco de incêndio: chama com gases ou fumaça no ambiente | Verifique a origem da chama e da fumaça, ventile e afaste materiais inflamáveis. |
| 3 | ALTO | gasGLP **e** temperatura alta | Alto risco: vazamento de gás com aumento de temperatura | Feche o registro de gás, ventile e afaste fontes de calor. |
| 4 | ALTO | gasGLP **e** gasGeral | Alto risco: vazamento confirmado pelos dois sensores (MQ-6 e MQ-2) | Feche o registro de gás, abra portas e janelas e não acenda chamas. |
| 5 | ALTO | gasGLP **e** fogão ligado **e** ausência persistente | Alto risco: vazamento de gás com fogão ligado e sem supervisão | Feche o registro de gás e verifique a cozinha imediatamente. |
| 6 | ALTO | chama **e** temperatura alta **e** fogão desligado | Alto risco: chama com o fogão desligado e temperatura subindo | Verifique imediatamente a origem da chama. |
| 7 | ALERTA | `mq6_nivel == 2` | Vazamento de gás detectado (MQ-6) | Feche o registro de gás, ventile o ambiente e não acenda chamas. |
| 8 | ALERTA | `mq2_nivel == 2` | Concentração alta de gases ou fumaça (MQ-2) | Ventile o ambiente e verifique a origem dos gases ou da fumaça. |
| 9 | ALERTA | ausência persistente | Fogão ligado sem supervisão: nenhum movimento há muito tempo | Verifique se há alguém na cozinha ou desligue o fogão. |
| 10 | ATENCAO | `mq6_nivel == 1` | Possível vazamento de gás: MQ-6 acima do normal | Verifique o ambiente. |
| 11 | ATENCAO | `mq2_nivel == 1` | Gases ou fumaça acima do normal (MQ-2) | Verifique o ambiente. |
| 12 | ATENCAO | fogão sem chama | Fogão ligado sem chama: possível boca apagada | Verifique o fogão. |
| 13 | ATENCAO | possível ausência | Fogão ligado e sem movimento recente: possível ausência | Confirme se há alguém na cozinha. |
| 14 | ATENCAO | chama **e** fogão desligado | Chama detectada com o fogão desligado | Verifique a origem da chama. |
| 15 | ATENCAO | temperatura alta | Temperatura acima do normal | Verifique o ambiente. |
| 16 | FALHA | leitura de temperatura inválida | Falha no sensor de temperatura: monitoramento comprometido | Confira a ligação do sensor. |
| 17 | NORMAL | fogão ligado (nada acima) | Fogão em uso com supervisão | — |
| 0 | NORMAL | nada acima | Ambiente normal | — |

## Estado extra do web (não vem do firmware)

| Estado | Quando | Cor |
|---|---|---|
| `SEM_DADOS` / `no_data` | Nenhuma linha nova no CSV há mais de **5 s**, ou o arquivo não existe | cinza |

O app **nunca** mostra "Ambiente normal" sem dados recentes.

## Cores por nível (web)

| Nível | Cor | Animação |
|---|---|---|
| NORMAL | verde | — |
| ATENCAO | amarelo | — |
| ALERTA | laranja | pulsa |
| ALTO | vermelho | pulsa |
| CRITICO | vermelho escuro | pulsa, alternando vermelho/laranja |
| FALHA e sem dados | cinza | — |
