import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchGithubStats, GitHubError } from "../shared/github.js";
import type { GitHubStats } from "../shared/types.js";
import { getGithubToken } from "./config.js";
import { PATHS } from "./paths.js";

const statsFile = (username: string, year: number) =>
  resolve(PATHS.cache, `${username.toLowerCase()}-${year}.json`);

const writeJsonAtomic = async (file: string, data: unknown) => {
  await mkdir(resolve(file, ".."), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tmp, file);
};

export const readCachedStats = async (
  username: string,
  year: number,
): Promise<GitHubStats | null> => {
  try {
    const raw = await readFile(statsFile(username, year), "utf8");
    const parsed = JSON.parse(raw) as GitHubStats;
    if (
      typeof parsed.login !== "string" ||
      parsed.year !== year ||
      !parsed.contributions?.calendar
    ) {
      return null;
    }
    return { ...parsed, source: "local" };
  } catch {
    return null;
  }
};

export const saveStats = async (stats: GitHubStats): Promise<void> => {
  await writeJsonAtomic(statsFile(stats.login, stats.year), {
    ...stats,
    source: "github",
  });
};

export const getStats = async ({
  username,
  year,
  refresh = false,
  onLog,
}: {
  username: string;
  year: number;
  refresh?: boolean;
  onLog?: (message: string) => void;
}): Promise<GitHubStats> => {
  const cached = await readCachedStats(username, year);

  if (cached && !refresh) {
    onLog?.(`Usando cache local de @${cached.login} (${year}).`);
    return cached;
  }

  const token = getGithubToken();
  if (!token) {
    if (cached) {
      onLog?.(
        "Sem GITHUB_TOKEN no .env: usando o snapshot local. Para atualizar os dados, configure o token.",
      );
      return cached;
    }
    throw new GitHubError(
      "Não há dados em cache para esse usuário/ano e nenhum GITHUB_TOKEN foi configurado. Copie .env.example para .env e preencha GITHUB_TOKEN, ou rode `npm run fetch -- --username SEU_USUARIO`.",
      400,
    );
  }

  const stats = await fetchGithubStats({
    username,
    year,
    token,
    avatarDir: PATHS.avatars,
    onLog,
  });

  await saveStats(stats);
  return stats;
};

export const avatarPath = (login: string, file: string): string =>
  resolve(PATHS.avatars, file);
