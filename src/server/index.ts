import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { GitHubError } from "../shared/github.js";
import {
  normalizeUsername,
  RESOLUTIONS,
  THEME_INFO,
  THEME_IDS,
  type RenderJob,
  type Resolution,
  type ThemeId,
} from "../shared/types.js";
import { getGithubToken, hasGithubToken, serverConfig } from "./config.js";
import { getJob, listJobs, loadJobs } from "./jobs.js";
import { PATHS } from "./paths.js";
import { enqueueRender, isBusy, queueSize } from "./render-queue.js";
import { getStats, readCachedStats } from "./stats-store.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "128kb" }));

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

const parseYear = (value: unknown): number => {
  const year = Number(value ?? serverConfig.year);
  const max = new Date().getFullYear() + 1;
  if (!Number.isInteger(year) || year < 2008 || year > max) {
    throw new GitHubError(`Ano inválido. Use um ano entre 2008 e ${max}.`, 400);
  }
  return year;
};

const parseTheme = (value: unknown): ThemeId => {
  if (typeof value === "string" && (THEME_IDS as readonly string[]).includes(value)) {
    return value as ThemeId;
  }
  throw new GitHubError("Tema inválido. Escolha space, metroid ou pitfall.", 400);
};

const parseHeight = (value: unknown): Resolution => {
  const height = Number(value ?? serverConfig.videoHeight);
  if ((RESOLUTIONS as readonly number[]).includes(height)) return height as Resolution;
  throw new GitHubError("Resolução inválida. Escolha 1080 ou 720.", 400);
};

const jobView = (job: RenderJob) => ({
  ...job,
  outputUrl: job.outputFile ? `/videos/${basename(job.outputFile)}` : null,
  outputFile: undefined,
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    year: serverConfig.year,
    hasToken: hasGithubToken(),
    queue: queueSize(),
    busy: isBusy(),
    uptime: Math.round(process.uptime()),
  });
});

app.get("/api/config", (_req, res) => {
  res.json({
    defaultUsername: serverConfig.defaultUsername,
    year: serverConfig.year,
    hasToken: hasGithubToken(),
    videoHeight: serverConfig.videoHeight,
    resolutions: RESOLUTIONS,
    themes: THEME_INFO,
    source: "local",
  });
});

app.get(
  "/api/stats",
  asyncRoute(async (req, res) => {
    const username = normalizeUsername(String(req.query.username ?? serverConfig.defaultUsername));
    const year = parseYear(req.query.year);
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";

    const stats = await getStats({ username, year, refresh });

    res.json({
      ...stats,
      avatarUrl: stats.avatarFile ? `/api/avatar/${stats.login}` : null,
    });
  }),
);

app.get(
  "/api/avatar/:login",
  asyncRoute(async (req, res) => {
    const login = normalizeUsername(req.params.login);
    const cached = await readCachedStats(login, serverConfig.year);
    const folder = PATHS.avatars;

    let file: string | null = null;
    if (cached?.avatarFile) {
      const candidate = resolve(folder, cached.avatarFile);
      if (existsSync(candidate)) file = candidate;
    }

    if (!file) {
      const match = (await readdir(folder).catch(() => [] as string[])).find((entry) =>
        entry.toLowerCase().startsWith(`${login.toLowerCase()}.`),
      );
      if (match) file = resolve(folder, match);
    }

    if (!file) {
      res.status(404).json({ error: "Avatar não encontrado no cache local." });
      return;
    }

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type(extname(file));
    res.sendFile(file);
  }),
);

app.get("/api/jobs", (_req, res) => {
  res.json({ jobs: listJobs().slice(0, 30).map(jobView) });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Render não encontrado." });
    return;
  }
  res.json({ job: jobView(job), queue: queueSize() });
});

app.post(
  "/api/render",
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const username = normalizeUsername(String(body.username ?? serverConfig.defaultUsername));
    const theme = parseTheme(body.theme);
    const height = parseHeight(body.height);
    const refresh = body.refresh === true;

    const result = await enqueueRender({ username, theme, height, refresh });

    res.status(result.reused ? 200 : 202).json({
      job: jobView(result.job),
      reused: result.reused,
      position: result.position,
      queue: queueSize(),
    });
  }),
);

app.use("/videos", express.static(PATHS.out, { fallthrough: false, maxAge: "1h" }));

const start = async () => {
  await loadJobs();

  if (serverConfig.isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      configFile: resolve(PATHS.root, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(PATHS.webDist, { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/videos/")) return next();
      res.sendFile(resolve(PATHS.webDist, "index.html"));
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof GitHubError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao processar a solicitação.";
    if (status >= 500) console.error("[server]", error);
    res.status(status).json({ error: message });
  });

  const token = getGithubToken();
  app.listen(serverConfig.port, serverConfig.host, () => {
    console.log("");
    console.log("  ANIMA GITHUB LOCAL");
    console.log(`  → http://${serverConfig.host}:${serverConfig.port}`);
    console.log(`  ano: ${serverConfig.year} · tema padrão: espaço`);
    console.log(`  token do GitHub: ${token ? "configurado" : "ausente (usando cache local)"}`);
    console.log("");
  });
};

start().catch((error: unknown) => {
  console.error("Não foi possível iniciar o servidor:", error);
  process.exitCode = 1;
});
