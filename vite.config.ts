import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const commit =
  process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
export default defineConfig({
  define: { __APP_RELEASE__: JSON.stringify(commit) },
  plugins: [
    react(),
    {
      name: "ambit-release",
      apply: "build",
      generateBundle() {
        const commit =
          process.env.GITHUB_SHA ??
          execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim();
        this.emitFile({
          type: "asset",
          fileName: "NOTICE.txt",
          source: readFileSync(new URL("./NOTICE.md", import.meta.url), "utf8"),
        });
        this.emitFile({
          type: "asset",
          fileName: "release.json",
          source: JSON.stringify({
            commit,
            builtAt: new Date().toISOString(),
          }),
        });
      },
    },
  ],
  server: { host: "127.0.0.1", strictPort: true },
  preview: { host: "127.0.0.1", strictPort: true },
});
