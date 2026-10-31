import { config as loadEnv } from "dotenv";
import { PATHS } from "./paths.js";

loadEnv({ path: PATHS.env, quiet: true });

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const currentYear = new Date().getFullYear();

/**
 * Concorrência do Remotion no render programático.
 *
 * O `remotion.config.ts` só vale para o CLI; `renderMedia()` chamado pelo
 * servidor ignora esse arquivo. Sem um default aqui, o Remotion usa o próprio
 * default (até 8 workers), o que abre mais páginas do Chrome do que o
 * necessário. Mantemos 4 para alinhar com o CLI e reduzir CPU/RAM.
 */
const concurrencyFromEnv = (): number => {
  const raw = process.env.REMOTION_CONCURRENCY?.trim();
  if (!raw) return 4;
  return Math.max(1, numberFromEnv(raw, 4));
};

export const serverConfig = {
  host: process.env.HOST || "127.0.0.1",
  port: numberFromEnv(process.env.PORT, 4317),
  defaultUsername: (process.env.DEFAULT_USERNAME || "adalbertobrant").trim(),
  year: numberFromEnv(process.env.YEAR, currentYear),
  videoHeight: numberFromEnv(process.env.VIDEO_HEIGHT, 1080),
  concurrency: concurrencyFromEnv(),
  isDev: process.env.NODE_ENV !== "production",
};

export const getGithubToken = (): string | null => {
  const candidates = [
    process.env.GITHUB_TOKEN,
    process.env.GITHUB_TOKEN_1,
    process.env.GH_TOKEN,
  ];
  const token = candidates.find((value) => value && value.trim().length > 0);
  return token ? token.trim() : null;
};

export const hasGithubToken = (): boolean => getGithubToken() !== null;
