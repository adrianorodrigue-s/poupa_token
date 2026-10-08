# PROGRESS — fh-kit-estado

O que a próxima sessão precisa saber e o git não tem como dizer. Estado de arquivo, branch e
commit: `node .claude/hooks/estado.mjs estado`.

## Em andamento

Nenhuma. O kit v1.0.0 está funcional e foi exercitado à mão (instalação limpa, instalação
sobre projeto com `CLAUDE.md` próprio, uso e `sync`).

## Fila (ordem de prioridade)

1. **Exercitar `eslint.kit.mjs`** num projeto com `node_modules` instalado — as quatro regras
   nunca rodaram contra código real; risco de falso positivo em teste co-localizado
   (`no-restricted-imports` barra `./` e `../`).
2. **Suíte automatizada dos hooks** — hoje a validação é manual. Montar repo git temporário
   por caso, como o teste à mão fez.
3. **Instalar no `Next-Project-Boilerplate`** (branch `feature/infra-INFRA03/kit-estado`, ID
   deduzido do `INFRA02` existente) e abrir o primeiro PR real.
4. **Aceitar o ADR-0012** depois que o `pr.yml` rodar num PR de verdade.
5. **Unificar a lista das sete camadas**, hoje duplicada entre `.claude/hooks/estado.mjs`
   (`CAMADAS`) e `docs/features/TEMPLATE.md`.

## Bloqueado por decisão do usuário

| # | Decisão que falta | O que destrava |
|---|---|---|
| — | Onde este repositório vai morar no GitHub (org, nome, visibilidade) | O `README` instrui `git clone <este-repo>`; sem remote, a instalação em outra máquina é por cópia de pasta |

## Decisões tomadas sem diretriz

- **Sonar saiu do gate obrigatório** e virou sob demanda no `/quality-check` — já roda no CI
  no push para `dev`, e subir o container em toda sessão custa minutos sem achado novo.
- **`eslint.kit.mjs` foi criado** fora do plano: a premissa "o lint já barra `let`/`any`/
  import relativo/`console`" se provou falsa ao ler `eslint.config.mjs`. Sem ele, enxugar o
  `CLAUDE.md` perderia a regra em vez de economizar token.
- **O checkpoint grava no cache local, não na spec** — prosa a cada parada encheria o diff.
  O que atravessa máquina é a spec, escrita no `/fechar`.
- **`AGENTS.md` sobreviveu** como arquivo fino (bloco gerenciado pelo codemod do Next e
  ferramentas que leem `AGENTS.md`), mas o `CLAUDE.md` não o importa mais — não custa contexto.
- **Hooks distribuídos inertes** (`settings.kit.json`), ligados só pelo instalador: senão o
  gate de autorização seria decorativo.
