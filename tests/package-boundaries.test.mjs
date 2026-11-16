import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { isBuiltin } from "node:module";
import ts from "typescript";
const root = path.resolve(import.meta.dirname, "..");
function sources(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.name === "node_modules" || e.name === ".next"
        ? []
        : e.isDirectory()
          ? sources(path.join(dir, e.name))
          : /\.(ts|tsx)$/.test(e.name)
            ? [path.join(dir, e.name)]
            : [],
    );
}
function imports(file) {
  const text = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const output = [];
  function visit(n) {
    if (
      ts.isStringLiteral(n) &&
      (ts.isImportDeclaration(n.parent) ||
        ts.isExportDeclaration(n.parent) ||
        (ts.isCallExpression(n.parent) &&
          n.parent.expression.kind === ts.SyntaxKind.ImportKeyword))
    )
      output.push(n.text);
    ts.forEachChild(n, visit);
  }
  visit(ast);
  return output;
}

test("applications depend only on declared packages and never import each other's code", () => {
  for (const app of ["web", "sync"]) {
    const dir = path.join(root, "apps", app),
      p = JSON.parse(fs.readFileSync(path.join(dir, "package.json")));
    const declared = new Set(
      Object.keys({ ...p.dependencies, ...p.devDependencies }),
    );
    for (const file of sources(path.join(dir, "src")))
      for (const spec of imports(file)) {
        if (spec.startsWith("."))
          assert.ok(
            !path
              .relative(dir, path.resolve(path.dirname(file), spec))
              .startsWith(".."),
            `${file}: ${spec} crosses app boundary`,
          );
        else if (!spec.startsWith("@/") && !isBuiltin(spec)) {
          const name = spec.startsWith("@")
            ? spec.split("/").slice(0, 2).join("/")
            : spec.split("/")[0];
          assert.ok(
            declared.has(name),
            `${app}: undeclared ${name} in ${path.relative(root, file)}`,
          );
        }
        if (app === "web")
          assert.ok(!spec.includes("@notionhq"), `${file} imports Notion`);
        if (app === "sync")
          assert.ok(
            !/^(next|react)(\/|$)/.test(spec),
            `${file} imports web framework`,
          );
      }
  }
});
test("shared packages cannot depend on an application or the Notion SDK", () => {
  for (const name of ["content", "database", "knowledge"]) {
    const dir = path.join(root, "packages", name);
    for (const file of sources(path.join(dir, "src")))
      for (const spec of imports(file)) {
        assert.ok(
          !/^(next|react|@notionhq\/client)(\/|$)/.test(spec),
          `${file}: ${spec}`,
        );
        if (spec.startsWith("."))
          assert.ok(
            !path
              .relative(dir, path.resolve(path.dirname(file), spec))
              .startsWith(".."),
            `${file}: crosses package boundary`,
          );
      }
  }
});
