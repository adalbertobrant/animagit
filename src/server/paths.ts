import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const PATHS = {
  root: ROOT,
  data: resolve(ROOT, "data"),
  cache: resolve(ROOT, "data/cache"),
  avatars: resolve(ROOT, "data/avatars"),
  jobs: resolve(ROOT, "data/jobs.json"),
  out: resolve(ROOT, "out"),
  public: resolve(ROOT, "public"),
  webDist: resolve(ROOT, "dist/web"),
  videoEntry: resolve(ROOT, "src/video/index.ts"),
  env: resolve(ROOT, ".env"),
};
