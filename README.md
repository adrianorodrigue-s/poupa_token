# fh-kit-estado

Memória entre sessões de IA, para projetos Next.js do boilerplate da FH.

Uma sessão de IA começa sem memória. Sem um registro, ela reconstrói o contexto lendo código,
`git log` e documentação — caro em token e impreciso. A saída comum é manter um `PROGRESS.md`
versionado com o estado do trabalho; na prática esse arquivo envelhece (ninguém lembra de
atualizá-lo) e conflita em merge (é o arquivo que toda branch toca).

Este kit inverte isso: **o que o git sabe é calculado na hora, a cada sessão; só o que ele não
sabe fica escrito.** Intenção, próximo passo e dívida moram na spec da feature. SHA, branch,
camadas tocadas, cobertura e CI, nunca.

| | Antes | Depois |
|---|---|---|
| Regras carregadas em toda sessão | `CLAUDE.md` 134 + `AGENTS.md` 78 = **212 linhas** | **81 linhas** + ~11 do relatório do hook |
| Regra de camada (UI, Prisma, Next) | sempre no contexto | skill, só quando a camada é tocada |
| "Onde eu parei?" | não existia | camada + próximo passo, na spec da feature |
| Baseline de teste | escrito à mão num `.md` | o ratchet do `vitest.config.ts` já é a fonte |

## O que ele assume

Feito para o boilerplate Next.js da FH: `src/app` · `src/server/<domínio>/{controller,service,schema}`
· `src/shared/components` · `prisma/schema` · Vitest · ESLint com boundaries · yarn · husky.
A lista de camadas de uma feature vertical está em `.claude/hooks/estado.mjs` (`CAMADAS`) e em
`docs/features/TEMPLATE.md` — outro stack funciona, mas exige editar os dois.

Pré-requisitos: **Node >= 20** e **git**. `gh` e Docker são opcionais — sem `gh` o relatório
diz `CI: indeterminado` e segue.

## Instalar

```bash
git clone git@github.com:adrianorodrigue-s/poupa_token.git fh-kit-estado
node fh-kit-estado/scripts/kit.mjs doctor   --em /caminho/do/projeto   # confere, não escreve
node fh-kit-estado/scripts/kit.mjs instalar --em /caminho/do/projeto   # mostra tudo e pergunta
```

O `instalar` lista cada arquivo que vai tocar e por quê antes de escrever nada. Ele copia os
arquivos do kit, entrega as sementes que faltarem (`CLAUDE.md`, `PROGRESS.md`, `docs/divida.md`,
ADRs 0009–0012, `pr.yml`), liga os hooks, ignora `.claude/.cache/` no git e põe o contrato no
`pre-push`. **Arquivo que já existe no projeto não é tocado** — um `CLAUDE.md` real carrega
decisões que nenhum instalador tem como mesclar sozinho; ele te diz com qual arquivo comparar.

Sobram três passos manuais, de propósito:

```jsonc
// package.json
"kit:doctor": "node scripts/kit.mjs doctor",
"kit:sync":   "node scripts/kit.mjs sync"
```

```js
// eslint.config.mjs — faz as convenções do CLAUDE.md falharem sozinhas
import { regrasDoKit } from './eslint.kit.mjs'
export default defineConfig([ ...configAtual, ...regrasDoKit ])
```

E somar as linhas dos ADRs 0009–0012 ao índice em `docs/adr/README.md`.

## O fluxo

| Comando | Quando |
|---|---|
| `/feature` | Começo de sessão. Abre uma feature nova **ou** retoma a em andamento — decide pelo relatório do hook, sem perguntar |
| `/quality-check` | Gate: `format:check` · `typecheck` · `lint` · `test:cov` (Sonar só sob demanda) |
| `/revisar` | Mudança grande, mais de uma camada, ou regra de negócio — dois eixos em subagentes paralelos |
| `/fechar` | Gate → spec → doc → contrato → commits atômicos → mensagem de PR. **Nunca dá push** |

Três skills disparam sozinhas: `grill-regra-negocio` (antes de escrever em `*.service.ts`),
`criar-testes` (depois de implementar) e `documentar-regra-negocio` (quando uma decisão de
negócio é tomada). `camada-ui`, `camada-db` e `next16` carregam só quando a sessão toca aquela
camada — é o que mantém o contexto pequeno nas outras.

## Como usar

### A sessão típica

```
você:  /feature
```

O kit já sabe onde você parou — o hook injetou o relatório antes da sua primeira mensagem.
Se havia feature em andamento, ele retoma de onde o **Próximo passo** da spec diz, resume em
3–5 linhas e continua. Se não havia, ele abre uma: deduz tipo, escopo e ID, cria a branch e a
spec, e só te pergunta **o que a mudança entrega** (e o peso SemVer, em `feature`/`release`).

Trabalhe normalmente. Durante o caminho, sozinhas: `grill-regra-negocio` para antes de
escrever regra de negócio e te entrevista; `criar-testes` escreve o teste do que você acabou
de implementar; `camada-ui`/`camada-db`/`next16` carregam quando você toca aquela camada.

```
você:  /quality-check      (quando quiser o gate)
você:  /revisar            (mudança grande ou regra de negócio)
você:  /fechar             (no fim)
```

O `/fechar` roda o gate, atualiza a spec (camadas, critérios, status, dívida), ajusta a doc,
valida o contrato, faz os commits atômicos e te entrega a mensagem de PR pronta. **Ele não dá
push** — isso é seu.

### Parar no meio e voltar depois

É o caso que o kit existe para resolver. Você pode fechar o terminal, dar `/clear`, trocar de
máquina ou deixar a sessão morrer:

```
você:  /clear
você:  /feature
```

O hook recalcula tudo do git e lê a spec. Você volta com: qual feature, quais camadas já
estão de pé, quais faltam, qual era o próximo passo e o que a sessão anterior estava fazendo
quando parou. Nenhum "me lembra onde a gente estava?" — e nenhuma leitura de código para
descobrir.

### Primeiro uso num projeto que já está em andamento

O caso normal. Três coisas a saber:

1. **Seu `CLAUDE.md` não é tocado.** O instalador avisa e deixa `modelo/CLAUDE.md` do kit
   para você comparar. Vale trazer de lá, no mínimo, a seção **"Como uma sessão funciona"** —
   é ela que ensina o agente a usar `/feature` e `/fechar`.
2. **Sua branch atual provavelmente não segue `<tipo>/<escopo>-<ID>/<slug>`.** Sem problema:
   o relatório diz "fora do padrão" e segue. Para ganhar o estado sem renomear nada, crie a
   spec à mão e aponte-a para a branch que você já está usando:

   ```bash
   mkdir -p docs/features/api
   cp docs/features/TEMPLATE.md docs/features/api/0001-minha-feature.md
   # edite: **Branch:** <o nome exato da sua branch atual>
   #        **Status:** em-desenvolvimento
   #        **Próximo passo:** <o que falta agora>
   ```

   O vínculo é pelo campo `**Branch:**`, não pelo padrão do nome — funciona com qualquer
   branch. A partir daí `/feature` retoma normalmente.
3. **Comece pelas camadas que já existem.** Marque no bloco `kit:camadas` o que já está
   pronto e deixe o resto desmarcado. O contrato só cobra de verdade quando a spec se declara
   `entregue`.

Os três passos manuais do instalador podem esperar: o `package.json` e o índice de ADR são
conveniência, e o **`eslint.kit.mjs` é o único que pode dar trabalho** num projeto já
existente (ele passa a barrar `let`, `any`, `console` e import relativo — se o código atual
usa muito disso, deixe para depois).

### Quando o contrato reprova

```
ERRO  [entregue-sem-teste] A spec está marcada como "entregue" com a camada teste desmarcada.
      → Escreva o teste das camadas tocadas (yarn test:cov) ou volte o status para em-desenvolvimento.
```

Cada achado vem com o próximo passo. **Erro** reprova o `/fechar` e o `pre-push`; **aviso** é
julgamento seu — resolve ou explica no resumo. Para ver o estado a qualquer momento, sem
abrir o Claude Code:

```bash
node .claude/hooks/estado.mjs estado
node .claude/hooks/contrato.mjs
```

Pressa de verdade? `git push --no-verify` passa por cima do contrato. Ele está ali para te
lembrar, não para te prender.

### O que você escreve, e o que nunca precisa escrever

| Você escreve | O kit calcula |
|---|---|
| Por que a feature existe, escopo, critérios de aceite | branch, tipo, escopo, ID |
| **Próximo passo** (uma linha) | commits desde a base, arquivos tocados |
| Dívida: o que não foi exercitado, o que ficou duplicado | camadas da arquitetura atingidas |
| Decisões em aberto | status do CI, cobertura, baseline de teste |

Se você se pegar escrevendo SHA, nome de branch ou número de teste num `.md`, pare — isso é
o que o hook calcula, e duplicar cria uma segunda versão da verdade que envelhece.

## Como funciona

**`.claude/hooks/estado.mjs`** roda no `SessionStart` e injeta um relatório de fatos: branch
decomposta em tipo/escopo/ID, commits desde a base, camadas da arquitetura tocadas, spec
vinculada e seu status, próximo passo, CI. Nos hooks `Stop` e `PreCompact` ele grava um
checkpoint local (inclusive a última coisa que o agente disse), para que uma sessão
interrompida ou um `/clear` precoce não apaguem a intenção. Nunca falha: qualquer erro vira
"indeterminado" e sai com 0.

**`.claude/hooks/contrato.mjs`** valida a distância entre o código e o estado — o que nenhuma
outra ferramenta olha. São **erro**: feature sem spec; spec "entregue" com a camada teste
desmarcada; spec "entregue" com critério de aceite aberto; camada tocada e não marcada numa
spec que se diz entregue. São **aviso**: `*.service.ts` alterado sem `docs/negocio/` tocado,
spec achada só pelo slug, feature sem próximo passo, dívida que ficou só na spec. Tem `--json`
e exit 1. Roda no `/fechar` e no `pre-push`.

**A spec da feature** (`docs/features/<resp>/NNNN-*.md`) é o arquivo de estado: checklist das
sete camadas, **Próximo passo**, critérios de aceite e dívida. Cada branch toca só a sua — por
isso não há conflito de merge, mesmo com várias pessoas ou agentes em paralelo.

O porquê de cada escolha está nos ADRs em `modelo/docs/adr/` (0009 a 0012).

## Mapa de arquivos

| Caminho | Dono | `sync` sobrescreve? |
|---|---|---|
| `.claude/hooks/*.mjs` · `.claude/commands/*` · `.claude/skills/*` | kit | sim |
| `.claude/VERSION` · `.claude/settings.kit.json` · `eslint.kit.mjs` · `scripts/kit.mjs` | kit | sim |
| `docs/features/TEMPLATE.md` | kit | sim |
| `CLAUDE.md` · `AGENTS.md` · `PROGRESS.md` · `docs/divida.md` · ADRs · `pr.yml` | projeto (semente) | **não** |
| `.claude/settings.json` | projeto (gerado ao instalar) | **não** |
| `docs/features/**/NNNN-*.md` (specs) | projeto | **não** |
| `.claude/.cache/state.json` | derivado | nunca versionado |

## Atualizar um projeto já instalado

```bash
yarn kit:sync --de /caminho/do/fh-kit-estado
```

Compara `.claude/VERSION`, mostra o diff de cada arquivo do kit e só aplica depois de
confirmar. Arquivo do projeto não é tocado.

## Diagnóstico

```bash
node .claude/hooks/estado.mjs estado          # o relatório que o hook injeta
node .claude/hooks/estado.mjs estado --json   # o mesmo, para script
node .claude/hooks/contrato.mjs               # o contrato, com o próximo passo de cada achado
node scripts/kit.mjs doctor                   # pré-requisitos
```

Se o relatório não aparece no começo da sessão, os hooks não estão ligados — confira
`.claude/settings.json`.

## Limites conhecidos

Declarados em `modelo/docs/divida.md` e repetidos aqui porque importam antes de instalar:

- **`eslint.kit.mjs` não foi exercitado** contra um projeto com `node_modules` instalado. As
  quatro regras (`prefer-const`, `no-explicit-any`, `no-console`, `no-restricted-imports`)
  existem porque o ESLint do boilerplate não as tinha — mas podem gerar falso positivo em
  teste co-localizado.
- **`pr.yml` nunca rodou num PR real** — por isso o ADR-0012 está `Proposto`, não `Aceito`.
- **Os hooks não têm suíte automatizada.** Foram exercitados à mão num repositório sintético:
  branch com e sem spec, spec entregue sem teste, diretório novo não rastreado, repo sem `gh`,
  fora de repositório git.
- **A lista das sete camadas vive em dois lugares** (`estado.mjs` e `TEMPLATE.md`).
- O checkpoint lê a última mensagem do assistente da transcrição do Claude Code — formato
  interno, pode mudar sem aviso (degrada em silêncio).

## Desenvolver o kit

Zero dependências: só `node:` e `git`. O hook **nunca** pode falhar ou bloquear uma sessão, e
o texto que ele injeta é só fato, sem imperativo — texto em tom de comando vindo de hook pode
acionar as defesas de prompt injection do modelo. Mudou algo que o `sync` distribui? Suba
`.claude/VERSION`.

Teste à mão criando um repositório temporário com branch no padrão, spec e arquivos em várias
camadas — é como o kit foi validado.
