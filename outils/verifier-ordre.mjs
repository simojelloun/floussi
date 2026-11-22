// Vérifie que l'ordre de chargement des fichiers js/ est correct :
// le code exécuté au chargement d'un fichier (hors corps de fonctions) ne doit utiliser
// que des noms déclarés dans ce fichier ou dans les fichiers chargés AVANT lui.
// Usage : node outils/verifier-ordre.mjs   (renvoie un code d'erreur si un problème est trouvé)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
const declaredIn = new Map(); // nom -> index du fichier
const parsed = files.map((f, i) => {
  const ast = acorn.parse(readFileSync(join(root, f), "utf8"), { ecmaVersion: "latest", sourceType: "script" });
  for (const st of ast.body) {
    const names = st.type === "FunctionDeclaration" || st.type === "ClassDeclaration" ? [st.id.name]
      : st.type === "VariableDeclaration" ? st.declarations.flatMap(d => d.id.type === "Identifier" ? [d.id.name] : []) : [];
    for (const n of names) {
      if (declaredIn.has(n)) { console.error(`✗ « ${n} » est déclaré deux fois (${files[declaredIn.get(n)]} et ${f})`); process.exitCode = 1; }
      else declaredIn.set(n, i);
    }
  }
  return ast;
});
let problems = 0;
parsed.forEach((ast, i) => {
  for (const st of ast.body) {
    if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") continue;
    // on ne regarde que le code exécuté tout de suite : pas l'intérieur des fonctions
    walk.recursive(st, null, {
      Function() {},
      CallExpression(node, s, c) { const f = node.callee; if (f.type === "ArrowFunctionExpression" || f.type === "FunctionExpression") c(f.body, s); else c(f, s); node.arguments.forEach(a => c(a, s)); },
      Identifier(node) {
        const j = declaredIn.get(node.name);
        if (j !== undefined && j > i) { problems++; console.error(`✗ ${files[i]} utilise « ${node.name} » au chargement, mais il est déclaré plus loin dans ${files[j]}`); }
      },
      MemberExpression(node, s, c) { c(node.object, s); if (node.computed) c(node.property, s); },
      Property(node, s, c) { if (node.computed) c(node.key, s); c(node.value, s); }
    });
  }
});
if (problems || process.exitCode) { console.error(`\n${problems} problème(s) d'ordre de chargement.`); process.exitCode = 1; }
else console.log(`✓ Ordre de chargement correct (${files.length} fichiers).`);
