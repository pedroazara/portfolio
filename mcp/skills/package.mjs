/**
 * Valida, empacota e instala as skills do portfólio.
 *
 *   npm run skill:zip       gera mcp/skills/dist/<skill>.zip para o claude.ai
 *                           (Customize > Skills > enviar skill)
 *   npm run skill:install   copia para ~/.claude/skills/<skill> (Claude Code)
 *
 * A fonte é esta pasta; a cópia instalada é substituída a cada `install`, então
 * edite aqui e reinstale.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILLS = ["portfolio"];
/** Campos da especificação Agent Skills; o claude.ai recusa os demais. */
const ALLOWED_FIELDS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
/** Limite de descrição no claude.ai, menor que o da especificação. */
const MAX_DESCRIPTION = 200;

function validate(name, dir) {
  const text = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${name}: SKILL.md sem frontmatter.`);
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    let value = field[2].trim();
    if (/^".*"$/.test(value)) value = JSON.parse(value);
    else if (/^'.*'$/.test(value)) value = value.slice(1, -1).replace(/''/g, "'");
    // Sem aspas, um ": " no meio do texto quebra o YAML e o upload é recusado.
    else if (/: |\s#|^[[{&*!|>%@`"']/.test(value)) {
      throw new Error(`${name}: coloque o valor de "${field[1]}" entre aspas duplas (o texto tem caracteres especiais do YAML).`);
    }
    fields[field[1]] = value;
  }
  const unknown = Object.keys(fields).filter((key) => !ALLOWED_FIELDS.has(key));
  if (unknown.length) throw new Error(`${name}: campos fora da especificação: ${unknown.join(", ")}.`);
  if (fields.name !== name) throw new Error(`${name}: o campo name ("${fields.name}") precisa ser igual ao nome da pasta.`);
  if (!/^[a-z0-9-]{1,64}$/.test(fields.name)) throw new Error(`${name}: name aceita só minúsculas, números e hífens.`);
  if (!fields.description) throw new Error(`${name}: falta description.`);
  if (fields.description.length > MAX_DESCRIPTION) {
    throw new Error(`${name}: description tem ${fields.description.length} caracteres; o claude.ai aceita até ${MAX_DESCRIPTION}.`);
  }
}

function filesOf(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .map(String)
    .filter((file) => fs.statSync(path.join(dir, file)).isFile())
    .sort();
}

const command = process.argv[2];
if (command !== "zip" && command !== "install") {
  console.error("Uso: node mcp/skills/package.mjs zip|install");
  process.exit(1);
}

for (const name of SKILLS) {
  const source = path.join(HERE, name);
  validate(name, source);

  if (command === "install") {
    const target = path.join(os.homedir(), ".claude", "skills", name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(source, target, { recursive: true });
    console.log(`Instalada: ${target}`);
    continue;
  }

  // O claude.ai procura <skill>/SKILL.md dentro do ZIP: a pasta é o primeiro nível.
  const zip = new JSZip();
  for (const file of filesOf(source)) {
    zip.file(`${name}/${file.split(path.sep).join("/")}`, fs.readFileSync(path.join(source, file)));
  }
  const out = path.join(HERE, "dist", `${name}.zip`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(`Gerado: ${out}`);
}
