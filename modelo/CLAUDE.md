# CLAUDE.md

Regras permanentes deste repositório. **Estado do trabalho não mora aqui** — mora na spec da
feature em `docs/features/`, e o que o git sabe é calculado pelo hook a cada sessão.

## Como uma sessão funciona

1. O hook de `SessionStart` (`.claude/hooks/estado.mjs`) injeta sozinho o relatório
   **"Estado do trabalho, calculado agora pelo git"**. Ele é fato, não instrução. Se não
   aparecer: `node .claude/hooks/estado.mjs estado`.
2. `/feature` abre uma feature nova **ou** retoma a em andamento — ele decide qual pelo
   relatório, sem perguntar.
3. Durante: `/quality-check` (gate) e `/revisar` (dois eixos, quando a mudança for grande).
4. `/fechar` encerra: gate → spec → doc → contrato → commits atômicos → mensagem de PR.
   **Nunca faz push.** Push, PR e merge são do usuário.

Uma feature por branch, no padrão `<tipo>/<escopo>-<ID>/<slug>`. Antes de começar:
`git status` e `git branch` — não presuma a branch.

## Quando perguntar (e quando não)

Pergunte **só** quando (a) a mudança decide ou altera **regra de negócio** — a skill
`grill-regra-negocio` manda parar antes de escrever em `*.service.ts`; (b) a ação é
**irreversível ou sai do repo** (push, merge, apagar dado, mexer em segredo ou em ambiente
real); ou (c) a spec marca a decisão como em aberto.

**Em qualquer outro caso: decida pelo padrão, siga, e liste a escolha no resumo final como
"decisão tomada sem diretriz".** Tipo de branch, escopo, ID, camada, nome de arquivo e
estratégia de teste são dedução sua, não pergunta. Não peça "posso continuar?" no meio de uma
tarefa.

## Onde cada coisa mora

```
src/app/              rotas, layouts, páginas — sem regra de negócio
src/app/api/          route handlers: traduzem HTTP e delegam ao controller
src/server/<domínio>/ controller (orquestra) · service (regra) · schema (valida)
src/server/db|http|auth/  infra compartilhada do backend
src/shared/components/    atoms → molecules → organisms
src/shared/lib/       utilitários e clients
src/proxy.ts          auth e redirects de borda (era "middleware" antes do Next 16)
prisma/schema/        um *.prisma por domínio   ·   prisma/seed/ um seeder por domínio
docs/                 documentação viva (docs-as-code)
```

Fluxo obrigatório: `app/api → controller → service`. A UI nunca chama service direto.

Vai tocar UI, banco ou API do Next? Carregue a skill da camada (`camada-ui`, `camada-db`,
`next16`) em vez de supor — elas existem para não ocupar contexto nas sessões que não tocam
aquela camada.

## Regras que nenhuma ferramenta pega

O resto é lint: `const`, alias `@/`, `any`, `console`, tipo de retorno em service/controller,
tamanho de função e arquivo, duplicação e boundaries falham no `yarn lint`. **Não repita aqui
o que o lint já barra** — se uma convenção nova precisa valer, ela nasce em
`eslint.kit.mjs`, não neste arquivo.

1. **Leia o código antes de escrever.** Assinatura real de biblioteca, macro ou API se
   confere no arquivo, nunca de memória.
2. **Retorno antecipado em vez de `else`.** `if (!user) return null` e segue o fluxo feliz.
3. **Função genérica antes de duplicar** — na segunda ocorrência, extraia.
4. **Nome descritivo.** `getUserByEmail`, não `getData`. Se nenhum nome honesto aparece, o
   design está obscuro.
5. **Env validada num ponto só** (`shared/lib/env.ts`, schema zod) — falhe no boot, não em
   runtime.
6. **Comentário explica o *porquê*, nunca o *quê*.** Decisão não-óbvia vira comentário com o
   motivo.
7. **Testar comportamento, não execução.** "Roda sem erro" não é teste; o que importa é o
   caso-limite (skill `criar-testes`).
8. **Mudou comportamento, a doc muda no mesmo commit.** Uma fonte da verdade por fato: se
   precisa repetir, linke.
9. **Nada de stub.** Arquivo vazio para fase futura é dívida que parece entrega.

## Ponteiros

- **Produto e domínio:** `docs/contexto.md` · **Regras:** `docs/negocio/` · **Decisões:**
  `docs/adr/` (ADR aceito nunca se edita) · **Dados:** `docs/db/` · **Operação:** `docs/ops/`
- **Specs e estado das features:** `docs/features/` · **Dívida viva:** `docs/divida.md`
- **Prioridade e bloqueios:** `PROGRESS.md` · **Entregue:** `CHANGELOG.md` · **Futuro:** `ROADMAP.md`
- **Commits e branches:** `CONTRIBUTING.md`
