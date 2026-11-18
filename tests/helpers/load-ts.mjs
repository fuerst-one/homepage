import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const cache = new Map();
/** Load local pure TS modules and their real dependencies without a test bundler. */
export function loadTs(sourceUrl) {
  const path = sourceUrl instanceof URL ? fileURLToPath(sourceUrl) : sourceUrl;
  if (cache.has(path)) return cache.get(path);
  const require = createRequire(path);
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  new Function("exports", "require", outputText)(exports, (specifier) => {
    if (specifier.startsWith("@homepage/") && !specifier.endsWith(".json"))
      return loadTs(require.resolve(specifier));
    if (specifier.startsWith(".") && !specifier.endsWith(".json")) {
      const local = resolve(dirname(path), specifier);
      return loadTs([`${local}.ts`, `${local}.tsx`, local].find(existsSync));
    }
    return require(specifier);
  });
  cache.set(path, exports);
  return exports;
}
