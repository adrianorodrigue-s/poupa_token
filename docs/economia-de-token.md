# Economia de token — ideia consolidada

Detalhamento das decisões D19–D29 de [`DECISOES.md`](./DECISOES.md). Aqui entram D19–D29, derivadas de
**medição das 32 sessões reais** (`~/.claude/projects/*.jsonl`, 17.694 requisições) e da
varredura do que outros projetos já tentaram. Consolidado em 2026-10-08.

## O erro que esta consolidação corrige

O `DECISOES.md` abre dizendo que "poupar token não é escrever .md menor" — e em seguida a
**D11** vai encolher `CLAUDE.md` de 212 para ~60 linhas. Medido:

| | prefixo por sessão |
|---|---|
| `boiler/` (CLAUDE.md + AGENTS.md) | 12.653 bytes ≈ 3.420 tok |
| `kit/` (fundidos + saída do hook) | 5.075 bytes + ~430 tok ≈ 1.800 tok |

Economia: ~1.620 tok/sessão ≈ **US$ 1,34 numa sessão que custa US$ 491 — 0,3%.**

O gasto real mede assim:

```
contexto relido (cache read) : 61,4%     ← contexto médio: 363.658 tok/requisição
gravação de cache            : 28,2%
output                       : 10,4%
input novo                   :    0%
```

75% do conteúdo é resultado de ferramenta: `Bash` 1,97M tok em 6.450 chamadas, `Read` 858k
em 273, **9 screenshots somando 705k tok** (~78k cada). Sessão mais cara: 4.037 requisições,
pico de 995k de contexto, US$ 4.622.

**O kit está certo pelo motivo errado.** D4/D5/D12 (estado derivado, spec-é-estado,
checkpoint) não valem por encolher markdown — valem por **tornar o `/clear` barato**. Hoje
se mantém uma sessão de 4.000 requisições viva porque recomeçar custaria o contexto todo.
Estado entre sessões é o que compra o direito de fechar cedo, e fechar cedo vale ~7x.

## O modelo de custo (D19)

```
custo ≈ Σ(tamanho do contexto em cada requisição) + output
         └── nº de requisições × tamanho médio ──┘
```

Três botões, nesta ordem de impacto medido:

1. **Nº de requisições por sessão** — quadrático: um resultado de N tokens inserido na
   requisição k é recobrado em todas as seguintes.
2. **O que entra e nunca mais sai** — screenshot, `Read` de arquivo inteiro, saída de build.
3. **Estabilidade do prefixo** — 28,2% do custo é *gravação* de cache.

**D19 — todo item do kit declara qual botão aperta.** O que não aperta nenhum não entra.

## O que outros já tentaram

| Mecanismo | Quem | O que aproveitar |
|---|---|---|
| Mapa do repo com orçamento fixo | Aider (tree-sitter + PageRank + busca binária, default 1.024 tok) | A ideia de **orçamento fixo**; o mapa em si não construímos (D21) |
| Leitura por símbolo | Serena (MCP/LSP): `find_symbol` ~5k no lugar de ~50k | Adotar (D21) |
| Disclosure em 3 níveis | Claude Code Skills: ~30 tok de frontmatter, corpo no gatilho | Aplicar ao **histórico** (D24) |
| Filesystem como contexto | Manus: saída grande no disco, caminho no contexto | Regra de higiene (D28) |
| Prefixo append-only | Manus: nada volátil cedo no prompt | D29 |
| Condensação do histórico | OpenHands (resumo rolante), Anthropic (compaction) | **Não reimplementar** — `/compact` nativo já faz |
| Memória em camadas | Letta/MemGPT: core auto-editável, recall, archival | Fora de escopo por ora |
| Supersessão temporal | Zep/Graphiti: fato superado ganha `invalid_at`, não é apagado | **D23 — é a peça que falta em todo memory bank** |
| Isolamento por subagente | Anthropic (janela limpa, devolve resumo) | D27 |
| Subagente que escreve quebra | Cognition ("Don't Build Multi-Agents"): worker não viu as decisões de cima | D27 |
| Spec auto-contida por papel | BMAD (story file), spec-kit (`/specify`→`/plan`→`/tasks`) | Já é a D5 |

### Dois achados que mudam o desenho

- **Memory bank de markdown apodrece** — arquivos crescem até milhares de linhas
  contraditórias; o agente para de confiar e **não emite erro**, só ignora em silêncio.
  Entradas sem data e sem supersessão viram "prompt debt". Daí D23 e D25.
- **Context rot** (Chroma: 18 modelos, 194.480 chamadas) — a acurácia cai conforme o input
  cresce, **muito antes de a janela encher**. Então 363k de contexto médio não é só caro: é
  pior. Sessão curta não é economia, é qualidade. É a justificativa que faltava à D12.

## Decisões

| # | Decisão | Botão | Consequência |
|---|---|---|---|
| D19 | Modelo de custo acima é oficial; toda feature declara o botão que aperta | — | Feature sem botão não entra no kit |
| D20 | **Orçamento de 200k de contexto por sessão.** Alarme em tempo real no hook `Stop`/`PreCompact` (`estado.mjs`), uma vez por sessão, por `systemMessage` | 1 | Avisa **enquanto dá para agir**. Ver a revisão de mecanismo abaixo |
| D21 | **Recuperação semântica adotável, não instalada pelo kit**: Serena (MCP/LSP) em vez de repo map próprio | 2 | Gate **verificado**: tool search é padrão, logo as definições não entram no prefixo. `doctor` checa a condição; `custo.mjs` mede o prefixo. Ver ADR-0017 |
| D22 | **Registro de decisões versionado**, implementado sobre `docs/adr/` em vez de arquivo novo | 2 | Ver ADR-0015. Um `docs/decisoes.md` paralelo duplicaria o que o ADR já faz |
| D23 | **Supersessão com data**: `Status: Substituído por ADR-NNNN · AAAA-MM-DD`; superado sai do índice, não do repo. `contrato.mjs` trata supersessão órfã como erro | 2 | Do `invalid_at` do Graphiti. Sem data não se sabe qual veio depois |
| D24 | **Disclosure em 3 níveis**: índice **derivado** dos arquivos e injetado pelo hook (~16 tok por decisão); corpo sob demanda | 3 | Índice escrito à mão diverge e mente — derivado, não pode |
| D25 | **Teto de 1.200 tokens no índice.** Acima dele o hook manda o ponteiro e o `contrato.mjs` avisa para podar | 3 | O teto dá função à poda: não é higiene opcional, é o que mantém o índice injetado |
| D26 | **Escrita no momento da decisão** (hooks Stop/PreCompact), não no fim da sessão | 1 | Sessão interrompida não perde a intenção; reforça D12 |
| D27 | **Subagente lê e busca; a thread principal escreve** | 2 | Síntese Anthropic × Cognition: isolamento vale para leitura, quebra para escrita |
| D28 | **Higiene de ferramenta por construção**: `higiene.mjs` (PreToolUse) recusa leitura sem recorte acima de 40 KB, em `Read` **e** em `Bash`. O que o hook não julga (corte de saída, screenshot) fica no `CLAUDE.md` | 2 | Ver ADR-0014. Medido, a classe valeria ~1,4M tok |
| D29 | **Dado volátil entra tarde** (append), nunca no prefixo estável | 3 | Lição de KV-cache da Manus |

### Mecanismo revisado (2026-10-08, na implementação da E1)

D20 nasceu como "exit 1 no `/fechar`". Implementando, ficou claro que está errado: quando o
`/fechar` roda, **o token já foi gasto** — bloquear o commit pune sem economizar. O alarme
passou para o hook `Stop`/`PreCompact`, que dispara no meio da sessão, quando ainda dá para
fechar e recomeçar. A decisão sobrevive; o mecanismo mudou.

Dois detalhes que a implementação obrigou a decidir:

- **O aviso sai por `systemMessage`, não por `additionalContext`.** `additionalContext`
  injetaria o texto no contexto do modelo — um alarme de economia que gasta contexto. O
  `systemMessage` vai só para o usuário, que é quem decide fechar.
- **Avisa uma vez por sessão**, guardando `orcamento.sessao` no cache. Alarme repetido a cada
  parada vira ruído e para de ser lido — é exatamente assim que um memory bank morre.

### Decisão rebaixada

| # | Status | Motivo |
|---|---|---|
| D11 | **Rebaixada** por D19 em 2026-10-08 | Encolher `CLAUDE.md` de 212 para 60 linhas vale 0,3% do gasto medido. Continua valendo por clareza e por context rot — mas **não é economia de token** e não justifica prioridade. `superseded-by: D19` |

## O que explicitamente NÃO construímos

- **Condenser próprio** — `/compact` nativo já faz; reimplementar é custo sem ganho.
- **Repo map próprio** — Aider já provou o padrão e Serena resolve o caso (D21).
- **Grafo temporal como serviço** (Zep) — ganho real, mas vira infra para manter, e a medição
  não aponta memória de longo prazo como gargalo.
- **Encolher `.md` como objetivo** — 0,3%. Faça por clareza, nunca por economia.

## Como se verifica

```bash
node .claude/hooks/custo.mjs            # projeto atual
node .claude/hooks/custo.mjs --todos    # todos os projetos
node .claude/hooks/custo.mjs --json     # objeto único, para script
```

Sai com código 1 quando: contexto médio acima do limite, resultado de ferramenta acima de
25k chars, ou imagem em contexto. Linha de base de 2026-10-08: **363.658 tok/req, 16
resultados-monstro, 9 imagens (705k tok)** — tudo fora do orçamento.

## Estado da implementação

| Entrega | O que ficou | ADR |
|---|---|---|
| E1 | Alarme de orçamento em tempo real (`Stop`/`PreCompact`, `systemMessage`, uma vez por sessão) | 0013 |
| E2 | `higiene.mjs` (`PreToolUse`) recusa leitura sem recorte acima de 40 KB, em `Read` e `Bash` | 0014 |
| E3 | Índice de decisões **derivado** dos ADRs, com teto de 1.200 tok; supersessão com data; becos sem saída | 0015 |
| E4 | `explorador` e `revisor` sem ferramenta de escrita; diff capturado em arquivo | 0016 |
| E5 | Gate de prefixo verificado (tool search é padrão); `custo.mjs` mede o prefixo; Serena adotável, não instalada | 0017 |
| E6 | `sync` compara a **fiação**, não só os arquivos; `doctor` vê versão e fiação | 0018 |

## Dívida desta consolidação

- O **benefício** de Serena segue não medido: o custo de adotar foi verificado (baixo, com
  tool search), o ganho não. E depois do ADR-0014 a margem é menor — a higiene já força
  `grep` + leitura por faixa, que é a base de comparação real.
- O prefixo da sessão tem mediana de **41.230 tokens** e responde por **10,3%** de toda a
  releitura. É o maior item isolado depois do trabalho em si, e quase nada dele é `CLAUDE.md`.
- A estimativa de tokens no `custo.mjs` usa `chars/3.7`. Os campos `usage.*` são exatos; a
  atribuição por ferramenta é aproximada.
- Preço Opus é usado como régua comparável. Em plano de assinatura não vira fatura.
- O `custo.mjs` mora em `.claude/hooks/` (vai instalado no projeto; `scripts/` é ferramenta
  do kit). Ele é retrospectivo e **não** é chamado por hook — quem alarma é o `estado.mjs`.
- O índice de decisões entra no prefixo de **toda** sessão (~96 tokens hoje). Custo real,
  pago para não re-decidir — mas é custo.
- O teto de 1.200 tokens é escolha, não medida. Se virar restritivo, o certo é filtrar por
  camada tocada em vez de cortar no total.
- O limite de 40 KB da higiene foi calibrado em **um** projeto (PortalCronos). Falta conferir
  contra um repo pequeno, onde pode ser restritivo demais.
- Saída de `Bash` não é previsível antes de rodar: `yarn test` sem corte continua passando.
  Fica como regra de texto no `CLAUDE.md` e detecção retrospectiva no `custo.mjs`.
- O alarme foi exercitado contra transcrições reais e sintéticas, mas **não** contra uma
  sessão ao vivo cruzando o limite: o caminho stdin→hook do Claude Code em si não foi
  exercitado. Vale para os dois hooks (`estado.mjs` e `higiene.mjs`).
- Nenhum dos seis mecanismos rodou numa sessão real do boilerplate alvo. Tudo foi exercitado
  em repositório sintético e contra transcrições gravadas.
- O `sync` compara a fiação por **nome de evento**: se o kit mudar o conteúdo de um evento que
  o projeto já declara (outro matcher, outro timeout), ele não percebe.
- O `CLAUDE.md` da raiz deste repo ainda é o do monorepo `fhdata-dw` (11.099 bytes ≈ 3.000
  tok de regras de outro projeto, carregadas em toda sessão — inclusive as que produziram
  este documento).
