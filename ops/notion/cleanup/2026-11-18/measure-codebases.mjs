import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  readFile,
  writeFile,
  lstat,
  realpath,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
const run = promisify(execFile);
const ignoredDirectories = new Set(
  ".git node_modules vendor .next .nuxt .output dist build coverage out .cache .build .turbo .venv venv target Pods Carthage DerivedData .pio managed_components third_party third-party external bower_components .yarn .pnpm-store".split(
    " ",
  ),
);
const sourceExtensions =
  /\.(?:[cm]?[jt]sx?|vue|svelte|php|py|pyi|c|cc|cpp|cxx|h|hh|hpp|ino|rs|go|swift|kt|kts|java|scala|rb|ex|exs|cs|fs|html?|css|scss|sass|less|styl|twig|pug|ejs|hbs|mustache|sh|bash|zsh|ps1|sql|prisma|graphql|gql|glsl|vert|frag|shader|scad|lua|r|R|m|mm|dart)$/;
export function sourceCategory(path) {
  const parts = path.replaceAll("\\", "/").split("/");
  if (
    parts.some((p) => ignoredDirectories.has(p)) ||
    /(?:\.min\.[jc]ss?$|\.min\.js$|\.bundle\.js$|(?:^|[/._-])generated(?:[/._-]|$)|(?:^|\/)next-env\.d\.ts$|(?:^|\/)\.env)/i.test(
      path,
    )
  )
    return null;
  if (
    !sourceExtensions.test(path) &&
    !/(?:^|\/)(?:Dockerfile|Makefile)(?:\.[\w-]+)?$/.test(path)
  )
    return null;
  return /(?:^|\/)test[-_][^/]+\.[cm]?[jt]sx?$|(?:^|\/)(?:__tests__|tests?|specs?|e2e|cypress|playwright|fixtures)(?:\/|$)|\.(?:test|spec)\.[^.]+$/i.test(
    path,
  )
    ? "tests"
    : "application";
}
function under(path, prefix) {
  return prefix === "." || path === prefix || path.startsWith(`${prefix}/`);
}
export function scopeContains(path, includes = ["."], excludes = []) {
  // Research paths are literal prefixes; a trailing /** means recursive exclusion.
  return (
    includes.some((p) => under(path, p.replace(/\/$/, ""))) &&
    !excludes.some((p) =>
      under(path, p.replace(/\/\*\*$/, "").replace(/\/$/, "")),
    )
  );
}
async function command(file, args, cwd) {
  return (
    await run(file, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      timeout: 60000,
      env: { ...process.env, LC_ALL: "C" },
    })
  ).stdout;
}
export async function measurePaths(scopes) {
  const temporary = await mkdtemp(join(tmpdir(), "project-cloc-"));
  const files = new Map(),
    roots = [],
    errors = [],
    excluded = {
      policy: 0,
      scope: 0,
      generatedHeader: 0,
      symlinkOrLarge: 0,
      deletedTracked: 0,
      empty: 0,
    };
  try {
    for (const scope of scopes) {
      const root = resolve(scope.path);
      try {
        if (!(await lstat(root)).isDirectory())
          throw new Error("Not a directory");
      } catch {
        errors.push({ path: root, reason: "Path unavailable" });
        continue;
      }
      let candidates,
        git = null;
      try {
        const gitRoot = (
          await command("git", ["rev-parse", "--show-toplevel"], root)
        ).trim();
        const rootPrefix = relative(gitRoot, root);
        candidates = (
          await command(
            "git",
            [
              "ls-files",
              "--cached",
              "--others",
              "--exclude-standard",
              "-z",
              "--",
              rootPrefix || ".",
            ],
            gitRoot,
          )
        )
          .split("\0")
          .filter(Boolean)
          .map((p) => relative(root, resolve(gitRoot, p)));
        const deleted = new Set(
          (
            await command(
              "git",
              ["ls-files", "--deleted", "-z", "--", rootPrefix || "."],
              gitRoot,
            )
          )
            .split("\0")
            .filter(Boolean)
            .map((p) => relative(root, resolve(gitRoot, p))),
        );
        candidates = candidates.filter((p) => {
          if (deleted.has(p)) {
            excluded.deletedTracked++;
            return false;
          }
          return true;
        });
        git = {
          root: gitRoot,
          head: (await command("git", ["rev-parse", "HEAD"], root)).trim(),
          status: (
            await command(
              "git",
              [
                "status",
                "--porcelain",
                "--untracked-files=normal",
                "--",
                rootPrefix || ".",
              ],
              gitRoot,
            )
          ).trim()
            ? "Modified"
            : "Clean",
        };
      } catch {
        try {
          candidates = (
            await command(
              "rg",
              [
                "--files",
                "--hidden",
                "-0",
                ...[...ignoredDirectories].flatMap((d) => [
                  "-g",
                  `!**/${d}/**`,
                ]),
              ],
              root,
            )
          )
            .split("\0")
            .filter(Boolean);
        } catch {
          errors.push({ path: root, reason: "Source enumeration unavailable" });
          continue;
        }
      }
      roots.push({
        path: root,
        includes: scope.includes ?? ["."],
        excludes: scope.excludes ?? [],
        git,
      });
      for (const raw of candidates) {
        const path = raw.split(sep).join("/");
        if (
          path.startsWith("../") ||
          !scopeContains(path, scope.includes, scope.excludes)
        ) {
          excluded.scope++;
          continue;
        }
        const category = sourceCategory(path);
        if (!category) {
          excluded.policy++;
          continue;
        }
        const full = resolve(root, path);
        try {
          const stat = await lstat(full);
          if (stat.isFile() && stat.size === 0) {
            excluded.empty++;
            continue;
          }
          if (
            !stat.isFile() ||
            stat.isSymbolicLink() ||
            stat.size > 2 * 1024 * 1024 ||
            /[\r\n]/.test(full)
          ) {
            excluded.symlinkOrLarge++;
            continue;
          }
          const real = await realpath(full);
          if (files.has(real)) continue;
          const header = (await readFile(full, "utf8"))
            .split("\n")
            .slice(0, 12)
            .join("\n");
          if (
            /(?:auto[- ]?generated|generated (?:file|code)|do not edit (?:this|directly)|@generated)/i.test(
              header,
            )
          ) {
            excluded.generatedHeader++;
            continue;
          }
          files.set(real, { category, path: full });
        } catch {
          errors.push({
            path: full,
            reason: "Candidate source unreadable or removed during scan",
          });
        }
      }
    }
    const available = roots.length > 0;
    const totals = {
      application: {
        files: 0,
        code: available ? 0 : null,
        comments: 0,
        blank: 0,
      },
      tests: { files: 0, code: available ? 0 : null, comments: 0, blank: 0 },
    };
    const languages = new Map();
    let counted = 0;
    const countedPaths = new Set();
    if (files.size) {
      await writeFile(
        join(temporary, "files.txt"),
        [...files.keys()].join("\n"),
      );
      await command(
        "cloc",
        [
          "--json",
          "--by-file",
          "--quiet",
          "--skip-uniqueness",
          `--list-file=${join(temporary, "files.txt")}`,
          `--out=${join(temporary, "cloc.json")}`,
          "--timeout=5",
        ],
        temporary,
      );
      const result = JSON.parse(
        await readFile(join(temporary, "cloc.json"), "utf8"),
      );
      for (const [path, row] of Object.entries(result)) {
        const file = files.get(path);
        if (!file || !Number.isFinite(row.code)) continue;
        const total = totals[file.category];
        total.files++;
        total.code += row.code;
        total.comments += row.comment;
        total.blank += row.blank;
        counted++;
        countedPaths.add(path);
        const lang = languages.get(row.language) ?? {
          name: row.language,
          application: 0,
          tests: 0,
        };
        lang[file.category] += row.code;
        languages.set(row.language, lang);
      }
    }
    return {
      measuredAt: new Date().toISOString(),
      available,
      status: !available
        ? "unavailable"
        : errors.length || counted < files.size
          ? "partial"
          : "complete",
      tool: available
        ? `cloc ${(await command("cloc", ["--version"], temporary)).trim()}`
        : "not run",
      enumeration:
        "git tracked + nonignored untracked; filesystem fallback without git",
      ...totals,
      languages: [...languages.values()].sort(
        (a, b) => b.application - a.application,
      ),
      roots,
      excluded,
      unclassifiedCandidates: files.size - counted,
      unclassifiedPaths: [...files.keys()].filter(
        (path) => !countedPaths.has(path),
      ),
      errors,
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function main() {
  const input = JSON.parse(
    await readFile(
      resolve(process.argv[2] ?? "data/project-lab/enrichment.json"),
      "utf8",
    ),
  );
  for (const p of input.projects) {
    const scopes = p.paths
      .filter((s) => s.countForSize)
      .map((s) => ({
        path: s.path,
        includes: s.includes,
        excludes: s.excludes,
      }));
    p.code = await measurePaths(scopes);
    console.log(
      `${p.name}: ${p.code.application.code ?? "unknown"} application SLOC; ${p.code.tests.code ?? "unknown"} test SLOC`,
    );
  }
  input.measuredAt = new Date().toISOString();
  await writeFile(
    resolve(process.argv[2] ?? "data/project-lab/enrichment.json"),
    `${JSON.stringify(input, null, 2)}\n`,
    { mode: 0o600 },
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch(() => {
    console.error(
      "Code measurement failed; source details withheld. Check cloc/rg/git and input scopes.",
    );
    process.exitCode = 1;
  });
