import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  normalizeUsername,
  RESOLUTIONS,
  THEME_IDS,
  type Resolution,
  type ThemeId,
} from "../src/shared/types.js";
import { serverConfig } from "../src/server/config.js";
import { PATHS } from "../src/server/paths.js";
import { outputFileName, renderVideo, warmUpRenderer } from "../src/server/render-core.js";
import { getStats } from "../src/server/stats-store.js";

const readArg = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

const usage = `Uso:
  npm run render -- --username adalbertobrant --theme space --height 1080

Opções:
  --username   usuário ou URL do GitHub (padrão: ${serverConfig.defaultUsername})
  --theme      space | metroid | pitfall (padrão: space)
  --height     1080 | 720 (padrão: ${serverConfig.videoHeight})
  --year       ano (padrão: ${serverConfig.year})
  --refresh    força nova consulta ao GitHub (requer GITHUB_TOKEN)
  --help       mostra esta ajuda`;

const parseTheme = (value: string | undefined): ThemeId => {
  if (!value) return "space";
  if ((THEME_IDS as readonly string[]).includes(value)) return value as ThemeId;
  throw new Error(`Tema inválido: ${value}. Use space, metroid ou pitfall.`);
};

const parseHeight = (value: string | undefined): Resolution => {
  const height = Number(value ?? serverConfig.videoHeight);
  if ((RESOLUTIONS as readonly number[]).includes(height)) return height as Resolution;
  throw new Error(`Resolução inválida: ${value}. Use 1080 ou 720.`);
};

const main = async () => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage);
    return;
  }

  const usernameRaw = readArg("username") ?? process.argv[2] ?? serverConfig.defaultUsername;
  const year = Number(readArg("year") ?? serverConfig.year);
  const theme = parseTheme(readArg("theme"));
  const height = parseHeight(readArg("height"));
  const refresh = process.argv.includes("--refresh");
  const username = normalizeUsername(usernameRaw);

  const fileName = outputFileName(username, theme, year, height);
  const outputFile = resolve(PATHS.out, fileName);

  console.log(`\n  ANIMA GITHUB LOCAL — render via linha de comando`);
  console.log(`  usuário: @${username}`);
  console.log(`  tema:    ${theme}`);
  console.log(`  ano:     ${year}`);
  console.log(`  saída:   ${outputFile}\n`);

  await mkdir(PATHS.out, { recursive: true });

  const stats = await getStats({
    username,
    year,
    refresh,
    onLog: (message) => console.log(`  · ${message}`),
  });

  console.log(`  · ${stats.contributions.total} contribuições carregadas`);

  await warmUpRenderer();
  let lastPercent = -1;
  await renderVideo({
    stats,
    theme,
    height,
    outputFile,
    onLog: (message) => console.log(`  · ${message}`),
    onProgress: ({ progress, frames, totalFrames }) => {
      const percent = Math.round(progress * 100);
      if (percent === lastPercent && progress < 1) return;
      lastPercent = percent;
      process.stdout.write(
        `\r  renderizando… ${percent}% (${frames}/${Math.max(1, totalFrames)})   `,
      );
      if (progress >= 1) process.stdout.write("\n");
    },
  });

  console.log(`\n  Pronto: ${outputFile}\n`);
};

main().catch((error: unknown) => {
  console.error(`\n  Erro: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
