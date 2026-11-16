import { spawn } from "node:child_process";

// Load the root .env.local before starting pnpm; node --run does not forward it.
const child = spawn(
  "pnpm",
  ["--filter", "@homepage/web", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env,
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.once("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
});
