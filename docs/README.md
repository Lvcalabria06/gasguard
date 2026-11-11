# Documentação do GasGuard

Contexto, decisões e planos do projeto. Comece por aqui.

| Arquivo | O que tem |
|---|---|
| [overview.md](overview.md) | O que é o GasGuard, o hardware e como o firmware funciona hoje |
| [architecture.md](architecture.md) | Arquitetura do repositório, fluxo dos dados, camadas do web e mapa de pastas |
| [csv-contract.md](csv-contract.md) | Formato exato do `daily-report.csv`: o contrato entre o hardware, o mock e o web |
| [scenarios.md](scenarios.md) | Os 18 cenários de risco do firmware (id, nível, título e orientação) |
| [decisions.md](decisions.md) | Registro das decisões de arquitetura e o motivo de cada uma |
| [roadmap.md](roadmap.md) | O que já foi feito e as próximas etapas, na ordem |
| [superpowers/specs/](superpowers/specs/) | Specs de design escritas com o plugin Superpowers |
| [superpowers/plans/](superpowers/plans/) | Planos de implementação do Superpowers (um por etapa) |

## Regras rápidas

- Os documentos são escritos em **português**. O **código do web e do mock é em inglês**.
- O **firmware** (`hardware/`) é escrito em português e continua assim.
- O **CSV** usa os nomes em português do firmware. No web, **só** a camada `web/src/lib/report/` conhece esses nomes.
- Nenhum texto do sistema pode prometer proteção real: **protótipo acadêmico, não é um detector certificado**.
