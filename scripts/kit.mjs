#!/usr/bin/env node
// Instalador e atualizador do kit de estado.
//
//   node scripts/kit.mjs doctor [--em <projeto>]     confere pré-requisitos, não escreve
//   node scripts/kit.mjs instalar --em <projeto>     instala (pede autorização antes)
//   node scripts/kit.mjs sync --de <kit>             atualiza um projeto já instalado
//
// Origem = a cópia do kit de onde este script está rodando. Destino = --em, ou
// CLAUDE_PROJECT_DIR, ou o diretório atual. Os caminhos do kit são os mesmos nos
// dois lados, então instalar e atualizar são a mesma cópia com listas diferentes.
//
// Decisão (D16): o kit NUNCA instala dependência, não pede credencial e não liga
// hook sem autorização explícita. `gh` e Docker são opcionais — sem eles o kit
// funciona inteiro, só não sabe do CI nem sobe o Sonar local.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

// Arquivos do KIT: instalados e sobrescritos pelo `sync`.
const DO_KIT = [
  ".claude/hooks/estado.mjs",
  ".claude/hooks/contrato.mjs",
  ".claude/commands/feature.md",
  ".claude/commands/fechar.md",
  ".claude/commands/quality-check.md",
  ".claude/commands/revisar.md",
  ".claude/settings.kit.json",
  ".claude/VERSION",
  "docs/features/TEMPLATE.md",
  "eslint.kit.mjs",
  "scripts/kit.mjs",
];
const DIRS_DO_KIT = [".claude/skills"];

// Sementes: entregues uma vez, de `modelo/`, e nunca mais tocadas. Se o projeto
// já tem o arquivo, o kit não encosta — um CLAUDE.md de projeto real carrega
// decisões que nenhum instalador tem como mesclar sozinho.
const SEMENTES = [
  ["modelo/CLAUDE.md", "CLAUDE.md"],
  ["modelo/AGENTS.md", "AGENTS.md"],
  ["modelo/PROGRESS.md", "PROGRESS.md"],
  ["modelo/docs/divida.md", "docs/divida.md"],
  ["modelo/docs/adr/0009-estado-derivado-do-git.md", "docs/adr/0009-estado-derivado-do-git.md"],
  ["modelo/docs/adr/0010-spec-da-feature-e-o-estado.md", "docs/adr/0010-spec-da-feature-e-o-estado.md"],
  ["modelo/docs/adr/0011-contrato-de-estado-local.md", "docs/adr/0011-contrato-de-estado-local.md"],
  ["modelo/docs/adr/0012-verificacao-em-pull-request.md", "docs/adr/0012-verificacao-em-pull-request.md"],
  ["modelo/.github/workflows/pr.yml", ".github/workflows/pr.yml"],
];

const ORIGEM = dirname(dirname(fileURLToPath(import.meta.url)));

function argumento(nome) {
  const i = process.argv.indexOf(nome);
  return i !== -1 ? process.argv[i + 1] : null;
}

const DESTINO = resolve(argumento("--em") ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

function log(t = "") {
  process.stdout.write(`${t}\n`);
}

function existeComando(cmd, args = ["--version"]) {
  try {
    execFileSync(cmd, args, { stdio: "ignore", timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

async function confirmar(pergunta) {
  if (process.argv.includes("--sim")) return true;
  if (!process.stdin.isTTY) {
    log("Sem terminal interativo para confirmar. Repita com --sim se é isso mesmo que você quer.");
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const r = (await rl.question(`${pergunta} [s/N] `)).trim().toLowerCase();
  rl.close();
  return r === "s" || r === "sim";
}

function copiar(de, para) {
  mkdirSync(dirname(para), { recursive: true });
  copyFileSync(de, para);
}

function doctor() {
  const node = process.versions.node.split(".").map(Number);
  const checagens = [
    ["node >= 20", node[0] >= 20, `encontrado ${process.versions.node}`, true],
    ["git", existeComando("git"), "necessário para o hook de estado", true],
    ["destino é repositório git", existsSync(join(DESTINO, ".git")), DESTINO, true],
    ["yarn", existeComando("yarn"), "o gate (/quality-check) usa yarn", false],
    ["husky no destino", existsSync(join(DESTINO, ".husky")), "sem ele o contrato não entra no pre-push", false],
    ["docker", existeComando("docker"), "opcional — Sonar local e banco de dev", false],
    ["gh autenticado", existeComando("gh", ["auth", "status"]), "opcional — sem ele o relatório diz 'CI: indeterminado'", false],
  ];
  let bloqueia = false;
  log(`Destino: ${DESTINO}`);
  log("Pré-requisitos:");
  for (const [nome, ok, detalhe, obrigatorio] of checagens) {
    if (!ok && obrigatorio) bloqueia = true;
    log(`  ${ok ? "ok   " : obrigatorio ? "FALTA" : "–    "} ${nome}${detalhe ? ` · ${detalhe}` : ""}`);
  }
  log(bloqueia ? "\nFalta item obrigatório: resolva antes de instalar." : "\nPronto para instalar.");
  return bloqueia ? 1 : 0;
}

function arquivosDoKit(base) {
  const lista = DO_KIT.filter((f) => existsSync(join(base, f)));
  for (const dir of DIRS_DO_KIT) {
    const abs = join(base, dir);
    if (!existsSync(abs)) continue;
    for (const entrada of readdirSync(abs)) {
      const skill = join(dir, entrada, "SKILL.md");
      if (existsSync(join(base, skill))) lista.push(skill);
    }
  }
  return lista;
}

async function instalar() {
  if (DESTINO === ORIGEM) {
    log("Origem e destino são o mesmo diretório. Use --em <caminho do projeto>.");
    return 1;
  }
  if (doctor() !== 0) return 1;

  const doKit = arquivosDoKit(ORIGEM);
  const sementesNovas = SEMENTES.filter(([, para]) => !existsSync(join(DESTINO, para)));
  const sementesExistentes = SEMENTES.filter(([, para]) => existsSync(join(DESTINO, para)));

  const settings = join(DESTINO, ".claude", "settings.json");
  const ligarHooks = !existsSync(settings);
  const gitignore = join(DESTINO, ".gitignore");
  const temIgnore = existsSync(gitignore) && readFileSync(gitignore, "utf8").includes(".claude/.cache/");
  const prePush = join(DESTINO, ".husky", "pre-push");
  const porPrePush = existsSync(join(DESTINO, ".husky")) && !existsSync(prePush);

  log(`\nSerão copiados ${doKit.length} arquivos do kit (hooks, comandos, skills, template, eslint, instalador).`);
  if (sementesNovas.length) {
    log("\nSementes (entregues uma vez, suas a partir daí):");
    for (const [, para] of sementesNovas) log(`  - ${para}`);
  }
  if (sementesExistentes.length) {
    log("\nJá existem no destino e NÃO serão tocados:");
    for (const [de, para] of sementesExistentes) log(`  - ${para}  (compare à mão com ${de} do kit)`);
  }
  log("\nAlém disso:");
  if (ligarHooks) log("  - .claude/settings.json — liga os hooks SessionStart, Stop e PreCompact (hoje inertes em settings.kit.json)");
  if (!temIgnore) log("  - .gitignore — ignora .claude/.cache/, onde mora o estado derivado");
  if (porPrePush) log("  - .husky/pre-push — roda o contrato de estado antes do push");
  log("\nOs hooks executam `node .claude/hooks/estado.mjs` a cada sessão do Claude Code:");
  log("  leem git, specs e (se houver gh) o CI; escrevem só em .claude/.cache/. Nenhuma rede, nenhuma credencial.");

  if (!(await confirmar("\nAutoriza?"))) {
    log("Nada foi escrito.");
    return 1;
  }

  for (const f of doKit) copiar(join(ORIGEM, f), join(DESTINO, f));
  log(`  copiados ${doKit.length} arquivos do kit`);
  for (const [de, para] of sementesNovas) {
    copiar(join(ORIGEM, de), join(DESTINO, para));
    log(`  semente ${para}`);
  }
  if (ligarHooks) {
    copiar(join(ORIGEM, ".claude", "settings.kit.json"), settings);
    log("  escrito .claude/settings.json");
  }
  if (!temIgnore) {
    const atual = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
    writeFileSync(gitignore, `${atual.replace(/\s*$/, "")}\n\n# estado derivado do kit (nunca versionado — ver CLAUDE.md)\n.claude/.cache/\n`, "utf8");
    log("  atualizado .gitignore");
  }
  if (porPrePush) {
    writeFileSync(prePush, "node .claude/hooks/contrato.mjs\n", { mode: 0o755 });
    log("  escrito .husky/pre-push");
  }

  log("\nFaltam três passos manuais (o kit não edita arquivo que é seu):");
  log('  1. package.json → "kit:doctor": "node scripts/kit.mjs doctor", "kit:sync": "node scripts/kit.mjs sync"');
  log("  2. eslint.config.mjs → import { regrasDoKit } from './eslint.kit.mjs' e espalhe no defineConfig");
  log("  3. docs/adr/README.md → some as linhas dos ADRs 0009–0012 ao índice");
  log("\nDepois: abra o Claude Code no projeto e rode /feature.");
  return 0;
}

async function sync() {
  const origem = argumento("--de");
  if (!origem || !existsSync(origem)) {
    log("Uso: node scripts/kit.mjs sync --de <caminho do repositório do kit>");
    return 1;
  }
  const versao = (base) => {
    try {
      return readFileSync(join(base, ".claude", "VERSION"), "utf8").trim();
    } catch {
      return "(não instalado)";
    }
  };
  log(`Kit local ${versao(DESTINO)} → origem ${versao(origem)}`);

  const diferentes = arquivosDoKit(origem).filter((f) => {
    const b = join(DESTINO, f);
    if (!existsSync(b)) return true;
    try {
      return readFileSync(join(origem, f), "utf8") !== readFileSync(b, "utf8");
    } catch {
      return true;
    }
  });

  if (!diferentes.length) {
    log("Nada a atualizar.");
    return 0;
  }

  log("\nArquivos do kit que mudaram:");
  for (const f of diferentes) {
    if (!existsSync(join(DESTINO, f))) {
      log(`  - ${f}  (novo)`);
      continue;
    }
    log(`  - ${f}`);
    try {
      // --no-index sai com 1 quando há diferença: é o caso normal aqui, não erro.
      execFileSync("git", ["--no-pager", "diff", "--no-index", "--stat", join(DESTINO, f), join(origem, f)], { stdio: "inherit" });
    } catch {
      /* diferença encontrada ou git ausente: a lista já basta */
    }
  }
  log(`\nNão serão tocados (são do projeto): ${SEMENTES.map(([, p]) => p).join(", ")}, .claude/settings.json, docs/features/**/NNNN-*.md`);
  if (!(await confirmar("\nAplicar?"))) {
    log("Nada foi escrito.");
    return 1;
  }
  for (const f of diferentes) {
    copiar(join(origem, f), join(DESTINO, f));
    log(`  atualizado ${f}`);
  }
  log("\nRevise o diff antes de commitar: git diff");
  return 0;
}

const acoes = { doctor: async () => doctor(), instalar, sync };
const comando = process.argv[2];
if (!acoes[comando]) {
  log("Comandos: doctor · instalar --em <projeto> · sync --de <kit>");
  process.exit(1);
}
process.exit(await acoes[comando]());
