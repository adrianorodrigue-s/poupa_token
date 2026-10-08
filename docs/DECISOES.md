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

## Decisões de economia de contexto (2026-10-08)

Vieram de **medição**, não de hipótese: 32 sessões reais (`~/.claude/projects/*.jsonl`,
17,8 mil requisições) do autor. O diagnóstico completo está em
[`economia-de-token.md`](./economia-de-token.md); o porquê de cada uma, em
`modelo/docs/adr/0013`–`0018`.

O achado que reposiciona o kit: encolher `CLAUDE.md` + `AGENTS.md` de 12.653 para 5.075 bytes
(a **D11**) vale **0,3%** do gasto. O custo real é releitura de contexto — 61,4% do total, com
363 mil tokens relidos por requisição. **D4, D5 e D12 não valem por encolher markdown: valem
por tornar o `/clear` barato.** Fechar cedo é o único lever de ordem de grandeza, porque o
custo de uma sessão é a soma do contexto em cada requisição, e cresce com o quadrado do
tamanho dela.

| # | Decisão | Consequência |
|---|---|---|
| D19 | **Modelo de custo oficial**: nº de requisições · o que entra e nunca sai · estabilidade do prefixo. Todo item do kit declara qual deles ataca | Item que não ataca nenhum não entra |
| D20 | **Orçamento de 200 mil tokens de contexto**, avisado em tempo real pelo hook `Stop`/`PreCompact`, uma vez por sessão, via `systemMessage` | Avisa enquanto ainda dá para agir. Bloquear no `/fechar` puniria sem economizar — ADR-0013 |
| D21 | **Recuperação semântica adotável, não instalada** pelo kit (Serena/MCP) | Gate verificado: tool search é padrão, logo as definições de MCP não entram no prefixo. `doctor` checa — ADR-0017 |
| D22 | **Registro de decisões sobre `docs/adr/`**, não em arquivo novo | Um `docs/decisoes.md` paralelo duplicaria imutabilidade, supersessão e status que o ADR já tem |
| D23 | **Supersessão com data** (`Substituído por ADR-NNNN · AAAA-MM-DD`); superado sai do índice, não do repo | Do `invalid_at` do Graphiti. Sem data não se sabe qual decisão veio depois |
| D24 | **Índice de decisões derivado dos arquivos** e injetado pelo hook (~16 tok por decisão); corpo sob demanda | Índice escrito à mão diverge e mente; derivado, não pode — ADR-0015 |
| D25 | **Teto de 1.200 tokens no índice.** Acima dele o hook manda o ponteiro e o contrato avisa para podar | O teto dá função à poda: é o que mantém o índice injetado |
| D26 | **Escrita no momento da decisão** (checkpoint), não no fim da sessão | Reforça D12: sessão interrompida não perde a intenção |
| D27 | **Subagente lê e busca; a thread principal escreve** — por `tools`, não por instrução | Síntese Anthropic × Cognition: isolamento vale para leitura e quebra para escrita — ADR-0016 |
| D28 | **Higiene de contexto por construção**: `higiene.mjs` recusa leitura sem recorte acima de 40 KB, em `Read` **e** em `Bash` | Regra em `.md` é o mecanismo mais fraco que existe — ADR-0014 |
| D29 | **Dado volátil entra tarde** (append), nunca no prefixo estável | Lição de KV-cache da Manus |

**D11 fica rebaixada por D19:** encolher o `CLAUDE.md` segue valendo por clareza e por
*context rot*, mas **não é economia de token** e não justifica prioridade.

### O que explicitamente não construímos

Condenser próprio (o `/compact` nativo já faz), repo map próprio (o Aider provou o padrão e o
Serena resolve), grafo temporal como serviço (vira infra para manter), e encolher `.md` como
objetivo.

### Como se verifica

`node .claude/hooks/custo.mjs` lê os transcripts e mede. Linha de base de 2026-10-08: **362
mil tokens de contexto médio por requisição**, prefixo mediano de **41 mil** respondendo por
**10,3%** de toda a releitura.

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
  settings.json                ← PreToolUse · SessionStart · Stop · PreCompact
  hooks/estado.mjs             ← deriva .claude/.cache/state.json e o índice de decisões
  hooks/contrato.mjs           ← validação chamada por /fechar e pre-push
  hooks/higiene.mjs            ← PreToolUse: recusa leitura sem recorte (D28)
  hooks/custo.mjs              ← medidor de gasto, chamada manual (D19)
  agents/{explorador,revisor}  ← leem e não escrevem, por `tools` (D27)
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
