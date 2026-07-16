import { rmSync } from "fs";

// Remove lock files from other package managers
for (const f of ["package-lock.json", "yarn.lock"]) {
  try { rmSync(f, { force: true }); } catch {}
}

// Enforce pnpm
const agent = process.env.npm_config_user_agent ?? "";
if (!agent.startsWith("pnpm")) {
  console.error("Use pnpm instead of npm/yarn");
  process.exit(1);
}
