# Decisões de construção do kit

Fusão de dois conjuntos: `.claude/` do boilerplate (rituais **dentro** da sessão) e o
mecanismo PROGRESS/HISTORICO/hook do `data-engineer-lib` (estado **entre** sessões).
Contrato da construção — decisões de 2026-10-08, com o porquê. As quatro que viraram
arquitetura estão como ADR em `modelo/docs/adr/` (0009–0012); esta tabela guarda o conjunto
completo, inclusive o que não rendeu ADR.

## Princípio

Poupar token não é escrever .md menor. É **não guardar em .md o que o git, o lint ou o CI
já sabem** — e carregar regra só quando a camada é tocada. Tudo que é derivável é
calculado na hora por hook; o .md guarda só intenção, decisão e dívida.

## Decisões

| # | Decisão | Consequência |
|---|---|---|
| D1 | Kit vive **dentro do boilerplate** (`.claude/` + `docs/`) | ~~Nada de plugin externo~~ — **revisada em 2026-10-08**: virou repositório separado e instalável, para não ter que atualizar o boilerplate agora. O `kit:sync` segue resolvendo a divergência |
| D2 | Unidade de trabalho = **feature vertical** (prisma → service → controller → route → ui → teste → doc) | O estado precisa de "parei na camada X", que nenhum dos dois sistemas tinha |
| D3 | Leitores: **time humano + agentes + CI** | `docs/` na raiz (confirmado no repo real); nada de estado escondido em `.claude/` |
| D4 | **`state.json` derivado, fora do git** (`.claude/.cache/`, no .gitignore) | Zero conflito de merge; impossível ficar defasado — some a classe de bug que o hook do data-engineer-lib existe para detectar |
| D5 | O que **não** é derivável (intenção, próximo passo, dívida) mora na **spec da feature** | `docs/features/<resp>/NNNN-*.md` vira o arquivo de estado; só a branch dona o toca |
| D6 | `PROGRESS.md` na raiz, **mínimo** (fila de prioridade e bloqueios de produto) | Raramente tocado → raramente conflita. O índice por sessão é **injetado pelo hook**, não lido de arquivo |
| D7 | **Sem HISTORICO narrativo.** O que foi feito = `git log` + CHANGELOG | Sobra `docs/divida.md`: "não exercitado contra X", "ficou duplicado", "decidido na hora" — o que nenhum commit registra |
| D8 | Baseline de teste **não** vai para .md | O ratchet do `vitest.config.ts` (`autoUpdate: true`, ADR-0006) já é a fonte |
| D9 | O agente **commita e para**. Push, PR e merge são humanos | O hook lê estado de commits locais + árvore de trabalho, não de PR |
| D10 | **Grill só em regra de negócio / decisão de produto** | Tipo, escopo, ID e camada saem por dedução do diff e do `git branch -a`; a escolha vai no resumo, não vira pergunta |
| D11 | Regra que **ESLint/tsc/boundaries já barram sai do .md**; regra de camada vira skill sob demanda; `CLAUDE.md` + `AGENTS.md` fundidos | Hoje 212 linhas carregadas em toda sessão; alvo ~60 + ~25 do hook + a spec ativa |
| D12 | **Checkpoint automático** (hooks Stop e PreCompact) grava feature/camada/próximo passo; `/fechar` é o fechamento formal | Sessão interrompida ou `/clear` precoce deixa de perder a intenção |
| D13 | Avanço = **checklist fixo de camadas** (marcado por máquina, a partir do diff) + critérios de aceite da spec (humano) | "Feature entregue sem teste" vira erro verificável |
| D14 | **Validação do contrato roda local**: script Node chamado pelo `/fechar` e repetido no `pre-push` do husky | Não custa Actions, não depende de `gh`, falha antes do commit sair da máquina |
| D15 | Quatro comandos: `/feature` · `/quality-check` · `/revisar` · `/fechar` | `criar-testes` e `grill-me` viram skills automáticas; `/continue` é absorvido por `/feature` |
| D16 | `gh` é **opcional** | Ausente → hook diz "CI: indeterminado" e segue. Gate de instalação pede autorização antes de qualquer coisa |
| D17 | `.github/workflows/pr.yml` entra como **entrega separada**, com ADR próprio | Furo do boilerplate: hoje PR não tem check nenhum (sonar só em `dev`, deploy só em `main`) |
| D18 | Resultado de CI é **lido**, nunca escrito por bot | Decorrência de D4: bot não escreve em arquivo fora do git. Se precisar de status de deploy persistido, revisitar |

## Estrutura alvo

```
CLAUDE.md                      ← fundido com AGENTS.md, ~60 linhas
PROGRESS.md                    ← mínimo: fila e bloqueios de produto
ROADMAP.md CHANGELOG.md CONTRIBUTING.md SECURITY.md
docs/
  contexto.md · negocio/ · adr/ · db/ · ops/
  divida.md                    ← substitui o HISTORICO
  features/<resp>/NNNN-*.md    ← spec É o estado da feature
.claude/
  VERSION                      ← kit:sync compara contra o boilerplate
  settings.json                ← SessionStart · Stop · PreCompact
  hooks/estado.mjs             ← deriva .claude/.cache/state.json
  hooks/contrato.mjs           ← validação chamada por /fechar e pre-push
  commands/{feature,quality-check,revisar,fechar}.md
  skills/{grilling,grill-regra-negocio,documentar-regra-negocio,revisao-codigo,
          criar-testes,camada-ui,camada-db,next16}/
  .cache/state.json            ← gitignored
.github/workflows/pr.yml       ← entrega separada (D17)
```

## Ordem de construção

1. `hooks/estado.mjs` + `TEMPLATE.md` da feature com os campos novos — é o núcleo; o resto é texto em volta
2. `settings.json` (3 hooks) + gate de instalação
3. `/feature` e `/fechar`
4. `hooks/contrato.mjs` + husky pre-push
5. Enxugar `CLAUDE.md`/`AGENTS.md` e quebrar as skills de camada
6. `kit:sync` + `VERSION`
7. `pr.yml` + ADR (entrega separada)

## Fatos conferidos no repo real (2026-10-08)

- `docs/` na raiz; `.claude/` só com commands + skills; sem settings.json nem hooks
- `vitest.config.ts`: ratchet com `autoUpdate: true`, pisos 19.29 / 0 / 37.5 / 19.64
- Workflows: `sonar.yml` (push em `dev`), `deploy.yml` (push em `main`) — **nenhum em `pull_request`**
- `gh` ausente do PATH nesta máquina
- Branch ativa mais recente: `feature/infra-INFRA02/...` → próximo ID de infra é `INFRA03`
