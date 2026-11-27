import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "src", "app", "api");
const backupDir = path.join(root, ".api-route-backup");
const outDir = path.join(root, "out");

let moved = false;

try {
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, backupDir);
    moved = true;
  }

  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, GITHUB_PAGES: "true" },
  });

  fs.writeFileSync(path.join(outDir, ".nojekyll"), "");
  console.log("Static GitHub Pages export ready in ./out");
} finally {
  if (moved && fs.existsSync(backupDir)) {
    fs.renameSync(backupDir, apiDir);
  }
}
