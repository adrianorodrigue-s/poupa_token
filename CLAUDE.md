# CLAUDE.md — repositório do kit

Este repositório **é** o kit: ele não roda dentro de um projeto, ele é instalado em um.
Para entender o produto, leia o [README](./README.md).

## Dois tipos de arquivo

- **Do kit** (`.claude/`, `docs/features/TEMPLATE.md`, `eslint.kit.mjs`, `scripts/kit.mjs`) —
  instalados e sobrescritos pelo `sync`. Mudou aqui, muda em todo projeto que atualizar.
- **Semente** (`modelo/`) — entregue uma vez a cada projeto e nunca mais tocada. Um
  `CLAUDE.md` de projeto real carrega decisões que nenhum instalador mescla sozinho.

As duas listas moram em `scripts/kit.mjs` (`DO_KIT` e `SEMENTES`). Arquivo novo que precisa
ser distribuído entra numa delas — senão ele simplesmente não chega a ninguém.

## Regras

1. **Zero dependência.** Só `node:` e `git`. Isso é o que faz o kit instalar em qualquer
   máquina sem `yarn install`.
2. **O hook nunca falha.** Qualquer erro vira "indeterminado" e sai com 0. Um hook que quebra
   trava a sessão de quem instalou.
3. **O texto injetado é fato, nunca imperativo.** Texto em tom de comando vindo de hook pode
   acionar as defesas de prompt injection do modelo; o que fazer com cada fato está nos
   comandos, não no hook.
4. **Nada que o git saiba é escrito em `.md`.** É a razão de existir do kit — se uma mudança
   precisa guardar SHA, branch ou cobertura num arquivo, ela está contrariando o ADR-0009.
5. **Mudou algo distribuído pelo `sync`? Suba `.claude/VERSION`.**
6. **Teste à mão antes de entregar** (não há suíte ainda — está na dívida): repositório
   temporário com branch no padrão, spec, arquivos em várias camadas, e os casos-limite que
   já morderam — diretório novo não rastreado, repo sem `gh`, fora de repositório git.

## Dívida e decisões

Dívida conhecida: `modelo/docs/divida.md` (e resumida no README).
Decisões com o porquê: `modelo/docs/adr/0009` a `0012`.
