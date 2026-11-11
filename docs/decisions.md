# Registro de decisões

Decisões tomadas em 2026-11-10 durante o refinamento da arquitetura. Para mudar uma decisão, adicione uma nova entrada que **substitui** a anterior, em vez de apagar o histórico.

## D1. O repositório tem duas aplicações: `hardware/` e `web/`

Todo o projeto PlatformIO que existia na raiz foi para `hardware/`. O Next.js fica em `web/`. Na raiz ficam só o que é compartilhado: o CSV, o mock, a documentação e o contexto dos agentes.
**Por quê:** separar a responsabilidade de cada parte sem perder o histórico do firmware (a mudança é feita com `git mv`).

## D2. O PlatformIO é aberto pelo `gasguard.code-workspace`

O PlatformIO IDE procura o `platformio.ini` na raiz da pasta aberta. Por isso, um workspace multi-root (raiz + `hardware/` + `web/`) mantém os botões de Upload e Monitor funcionando. Também dá para abrir só `hardware/`.

## D3. A placa grava o CSV por meio de um filtro do Monitor Serial do PlatformIO

O firmware imprime linhas `CSV,...` no Serial, e o filtro `hardware/monitor/filter_gasguard.py` grava essas linhas no CSV.
**Por quê:** a ESP32 não acessa o disco do computador. Com o filtro, o fluxo continua sendo "Upload e Monitor": não tem programa extra e não tem disputa pela porta COM.
**Alternativa descartada:** um coletor separado em Python ou Node, que obrigaria a fechar o Monitor e rodar outro programa.

## D4. O mock na raiz é a ferramenta de teste

`mock-daily-report.js` escreve linhas falsas e coerentes no **mesmo** CSV, no **mesmo** formato. Ele é Node puro, sem dependências, com 1 linha por segundo.
**Por quê:** permite desenvolver e demonstrar o web sem a placa. O Node já é obrigatório por causa do Next.

## D5. Arquivo único `daily-report.csv`, recriado quando o dia muda

A linha 1 tem a data, a linha 2 as colunas e o resto são os dados. Quem grava verifica a data antes de cada append.
**Por quê:** os dados não precisam ser guardados, o web sempre lê o mesmo caminho e nada se acumula no disco.
**Alternativa descartada:** um arquivo por dia (`daily-report-AAAA-MM-DD.csv`), que exigiria limpeza e cálculo do nome.

## D6. O CSV usa os nomes em português do firmware

O firmware é todo em português (`ATENCAO`, `fogaoLigado`...). O CSV segue esse padrão para facilitar o lado do hardware.
**Consequência:** no web, **só** `src/lib/report/` conhece esses nomes e converte tudo para o domínio em inglês.

## D7. O nível de risco é calculado pelo firmware

O CSV traz `nivel` e `cenario`, e o web só exibe. O web guarda um dicionário `cenario → título + orientação` em pt-BR.
**Por quê:** existe uma fonte da verdade só para as regras. O mock precisa gerar `nivel` e `cenario` coerentes com os valores que inventa.

## D8. O web roda local, no mesmo computador do CSV

`npm run dev` ou `npm start` dentro de `web/`, escutando em `0.0.0.0:3000`. O celular acessa por `http://<IP-do-PC>:3000`, na mesma rede Wi-Fi. **Sem deploy em nuvem.**
**Por quê:** um servidor na nuvem não enxerga o arquivo local. Colocar online faz parte da etapa futura de MQTT.

## D9. Tempo real por SSE, com tail do arquivo

`/api/stream` envia só as linhas novas (leitura por offset), e `/api/report` faz a carga inicial. Sem linha nova há mais de 5 s, o app mostra **sem dados**.
**Por quê:** o arquivo chega a cerca de 86 mil linhas por dia, então relê-lo a cada segundo seria desperdício. O `EventSource` reconecta sozinho.
**Alternativa descartada:** polling a cada 1 s.

## D10. Tela única, mobile-first e clean

A ordem é: status e risco → métricas → gráfico de 10 min → eventos. Os eventos ficam com o mais novo no topo, numa lista com rolagem própria, e têm filtro por nível (chips) e período (`Última hora` · `Últimas 6 h` · `Hoje`).

## D11. Stack do web

Next.js 16 (App Router, `src/`), TypeScript, Tailwind CSS, shadcn/ui, Recharts, lucide-react, Vitest e npm. Sem banco, sem login e sem estado global.

## D12. O código do web e do mock é em inglês, com camadas separadas

Identificadores em inglês (`useReadings`, `Reading`, `RiskLevel`). Os textos da tela ficam em pt-BR. As camadas são leitura (`lib/report`) → transporte (`app/api`) → cliente (`hooks`) → UI (`components`). Regras puras ficam em `src/domain/` com teste. O padrão container/presentation é convenção flexível.

## D13. Esta branch de refactor não altera o comportamento do firmware

`refactor/monorepo-structure` só move o firmware, documenta o contrato do CSV, cria o esqueleto do web e implementa o mock. A linha `CSV,...` no firmware, a mudança para 1 s e o filtro ficam no [roadmap](roadmap.md).
**Por quê:** refactor e mudança de comportamento em PRs separados, e o firmware precisa ser testado na placa real.

## D14. E-mail de alerta é uma etapa futura

O envio de e-mail **gratuito** (Gmail SMTP com senha de app, ou o plano grátis do Resend) para alertas críticos depende de uma tela de login/cadastro para saber o e-mail do usuário. O objetivo é demonstrar na apresentação: "aconteceu um caso crítico e o usuário recebeu um e-mail".
