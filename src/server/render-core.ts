import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import type { GitHubStats, Resolution, ThemeId } from "../shared/types.js";
import { serverConfig } from "./config.js";
import { PATHS } from "./paths.js";

type Progress = {
  progress: number;
  frames: number;
  totalFrames: number;
};

let serveUrlPromise: Promise<string> | null = null;

const getServeUrl = async (onLog?: (message: string) => void): Promise<string> => {
  if (!serveUrlPromise) {
    serveUrlPromise = (async () => {
      onLog?.("Preparando o navegador headless do Remotion…");
      await ensureBrowser({
        onBrowserDownload: () => {
          onLog?.("Verificando o Chrome Headless Shell (download só na primeira vez)…");
          return { version: null, onProgress: () => undefined };
        },
      });

      onLog?.("Empacotando o projeto Remotion…");
      return bundle({
        entryPoint: PATHS.videoEntry,
        publicDir: PATHS.public,
        onProgress: (progress) => {
          if (progress > 0 && progress < 1) {
            onLog?.(`Empacotando… ${Math.round(progress * 100)}%`);
          }
        },
      });
    })().catch((error) => {
      serveUrlPromise = null;
      throw error;
    });
  }

  return serveUrlPromise;
};

export const warmUpRenderer = async (): Promise<void> => {
  await getServeUrl();
};

export const outputFileName = (
  login: string,
  theme: ThemeId,
  year: number,
  height: Resolution,
): string => `${login.toLowerCase()}-${theme}-${year}-${height}p.mp4`;

export const renderVideo = async ({
  stats,
  theme,
  height,
  outputFile,
  onProgress,
  onLog,
}: {
  stats: GitHubStats;
  theme: ThemeId;
  height: Resolution;
  outputFile: string;
  onProgress?: (progress: Progress) => void;
  onLog?: (message: string) => void;
}): Promise<void> => {
  const serveUrl = await getServeUrl(onLog);
  const inputProps = { stats, theme };

  onLog?.("Calculando a composição…");
  const composition = await selectComposition({
    serveUrl,
    id: "AnimaGithub",
    inputProps,
  });

  await mkdir(dirname(outputFile), { recursive: true });
  await unlink(outputFile).catch(() => undefined);

  onLog?.(`Renderizando ${composition.durationInFrames} frames em ${height}p…`);

  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: outputFile,
    inputProps,
    overwrite: true,
    imageFormat: "jpeg",
    jpegQuality: 90,
    scale: height / composition.height,
    concurrency: serverConfig.concurrency,
    chromiumOptions: { gl: "swangle" },
    onProgress: ({ progress, renderedFrames }) => {
      onProgress?.({
        progress,
        frames: renderedFrames,
        totalFrames: composition.durationInFrames,
      });
    },
    onBrowserLog: (log) => {
      if (log.type === "error") onLog?.(`[browser] ${log.text}`);
    },
  });

  onLog?.("Vídeo codificado com sucesso.");
};
