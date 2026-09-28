import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);

/** Execute real TS with isolated dependencies; never use real credentials in tests. */
export function load(file, mocks = {}, globals = {}, cache = new Map()) {
  const filename = resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  cache.set(filename, compiled);
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".") || name.startsWith("@/")) {
      const target = name.startsWith("@/") ? resolve(root, "src", name.slice(2)) : resolve(dirname(filename), name);
      return load(`${target}.ts`, mocks, globals, cache);
    }
    return require(name);
  };
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, require: localRequire, process: { env: {} }, Buffer, URL, AbortSignal, ...globals }, { filename });
  return compiled.exports;
}
