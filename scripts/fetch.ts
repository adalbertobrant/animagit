import { normalizeUsername } from "../src/shared/types.js";
import { serverConfig } from "../src/server/config.js";
import { getStats } from "../src/server/stats-store.js";

const readArg = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
};

const usernameRaw = readArg("username") ?? process.argv[2] ?? serverConfig.defaultUsername;
const year = Number(readArg("year") ?? serverConfig.year);
const refresh = !process.argv.includes("--no-refresh");

const main = async () => {
  const username = normalizeUsername(usernameRaw);

  console.log(`\n  Anima GitHub Local — coleta de dados`);
  console.log(`  usuário: @${username}`);
  console.log(`  ano:     ${year}`);
  console.log(`  fonte:   ${refresh ? "GitHub API" : "cache local"}\n`);

  const stats = await getStats({
    username,
    year,
    refresh,
    onLog: (message) => console.log(`  · ${message}`),
  });

  console.log("\n  Resumo");
  console.log(`  contribuições ....... ${stats.contributions.total}`);
  console.log(`  commits ............. ${stats.contributions.commits}`);
  console.log(`  pull requests ....... ${stats.contributions.pullRequests}`);
  console.log(`  dias ativos ......... ${stats.contributions.activeDays}`);
  console.log(`  maior sequência ..... ${stats.contributions.longestStreak} dias`);
  console.log(
    `  linguagens .......... ${stats.languages
      .slice(0, 3)
      .map((language) => `${language.name} ${(language.percent * 100).toFixed(1)}%`)
      .join(", ")}`,
  );
  console.log(`  estrelas dadas ...... ${stats.highlights.starsGiven}`);
  console.log(`  top repo ............ ${stats.topRepos[0]?.name ?? "—"}`);
  console.log(`\n  Cache salvo em data/cache/${stats.login.toLowerCase()}-${stats.year}.json\n`);
};

main().catch((error: unknown) => {
  console.error(`\n  Erro: ${(error as Error).message}\n`);
  process.exitCode = 1;
});
