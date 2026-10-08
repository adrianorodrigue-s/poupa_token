# Dívida

O que nenhum commit registra: o que ficou duplicado, o que **não foi exercitado** contra o
sistema real, o que foi decidido na hora sem estar na spec. Não é backlog de produto (isso é
o `ROADMAP.md`) nem bug reportado — é o que a própria sessão sabe que deixou mal resolvido.

> Por que existe um arquivo só para isso: o histórico narrativo de sessão duplica o
> `git log` e envelhece. Dívida, não. Dívida que fica só na cabeça de quem escreveu — ou na
> spec de uma feature já fechada — some de vista.

Formato: uma linha por item, mais novo embaixo. Ao resolver, **apague a linha** e deixe o
commit contar a história.

| Data | Feature / spec | Dívida | Como se resolve |
|---|---|---|---|
| 2026-10-08 | kit de estado | `.github/workflows/pr.yml` **não exercitado** — nunca rodou num PR real; ADR-0012 está `Proposto` por isso | Abrir o primeiro PR e conferir; aceitar o ADR |
| 2026-10-08 | kit de estado | `eslint.kit.mjs` **não exercitado** — `node_modules` não estava instalado, então as quatro regras novas (`prefer-const`, `no-explicit-any`, `no-console`, `no-restricted-imports`) nunca rodaram contra código real | `yarn install && yarn lint` depois de somar o fragmento ao `eslint.config.mjs`; ver se há falso positivo em teste co-localizado |
| 2026-10-08 | kit de estado | A lista das sete camadas vive em **dois lugares**: `docs/features/TEMPLATE.md` e `estado.mjs` (const `CAMADAS`). Projeto que mude a arquitetura precisa lembrar dos dois | Derivar o template da constante, ou um teste que compare os dois |
| 2026-10-08 | kit de estado | O checkpoint (`Stop`/`PreCompact`) lê a última mensagem do assistente da transcrição. Formato interno do Claude Code — pode mudar sem aviso | O código já degrada em silêncio; se parar de funcionar, o relatório dirá "sem resumo da transcrição" |
| 2026-10-08 | kit de estado | `estado.mjs` e `contrato.mjs` não têm **suíte automatizada** — foram exercitados à mão em repositório sintético (branch com e sem spec, spec entregue sem teste, arquivo novo não rastreado, fora de repo git), e nada impede uma regressão silenciosa | Teste Vitest montando um repo git temporário por caso, como o teste manual fez |
| 2026-10-08 | kit de estado | `pr.yml` não foi validado por parser de YAML (pyyaml ausente na máquina) | O GitHub valida no primeiro push; ou `yamllint` local |
