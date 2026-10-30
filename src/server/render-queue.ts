import { resolve } from "node:path";
import type { RenderJob, Resolution, ThemeId } from "../shared/types.js";
import { serverConfig } from "./config.js";
import { createJob, findDoneJob, getJob, loadJobs, updateJob } from "./jobs.js";
import { PATHS } from "./paths.js";
import { outputFileName, renderVideo } from "./render-core.js";
import { getStats } from "./stats-store.js";

type EnqueueInput = {
  username: string;
  theme: ThemeId;
  height: Resolution;
  refresh?: boolean;
};

type EnqueueResult = {
  job: RenderJob;
  reused: boolean;
  position: number;
};

const queue: string[] = [];
let running = false;

const LOG_LIMIT = 12;

const pushLog = (id: string, message: string): void => {
  const job = getJob(id);
  if (!job) return;
  const logs = [...job.logs, message].slice(-LOG_LIMIT);
  updateJob(id, { message, logs });
};

const runJob = async (job: RenderJob): Promise<void> => {
  const fileName = outputFileName(job.username, job.theme, job.year, job.height);
  const outputFile = resolve(PATHS.out, fileName);

  try {
    updateJob(job.id, {
      status: "bundling",
      progress: 0.02,
      message: "Coletando dados do GitHub…",
      error: null,
    });

    const stats = await getStats({
      username: job.username,
      year: job.year,
      refresh: false,
      onLog: (message) => pushLog(job.id, message),
    });

    updateJob(job.id, {
      status: "rendering",
      progress: 0.05,
      message: "Preparando o vídeo…",
    });

    let lastWrite = 0;
    await renderVideo({
      stats,
      theme: job.theme,
      height: job.height,
      outputFile,
      onLog: (message) => pushLog(job.id, message),
      onProgress: ({ progress, frames, totalFrames }) => {
        const now = Date.now();
        if (now - lastWrite < 250 && progress < 0.999) return;
        lastWrite = now;
        updateJob(job.id, {
          progress: 0.05 + progress * 0.95,
          frames,
          totalFrames,
          message: `${frames} de ${totalFrames} quadros`,
        });
      },
    });

    updateJob(job.id, {
      status: "done",
      progress: 1,
      message: "Vídeo pronto!",
      outputFile,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushLog(job.id, `Erro: ${message}`);
    updateJob(job.id, {
      status: "error",
      progress: 0,
      message: "Não foi possível gerar o vídeo.",
      error: message,
      finishedAt: new Date().toISOString(),
    });
  }
};

const drain = async (): Promise<void> => {
  if (running) return;
  running = true;

  try {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) continue;
      const job = getJob(id);
      if (!job || job.status === "done" || job.status === "error") continue;
      await runJob(job);
    }
  } finally {
    running = false;
  }
};

export const enqueueRender = async (input: EnqueueInput): Promise<EnqueueResult> => {
  await loadJobs();

  const year = serverConfig.year;

  if (!input.refresh) {
    const done = findDoneJob({
      username: input.username,
      theme: input.theme,
      year,
      height: input.height,
    });
    if (done) return { job: done, reused: true, position: 0 };
  }

  const job = createJob({
    username: input.username,
    theme: input.theme,
    year,
    height: input.height,
  });

  queue.push(job.id);
  void drain();

  return { job, reused: false, position: queue.length };
};

export const queueSize = (): number => queue.length + (running ? 1 : 0);

export const isBusy = (): boolean => running || queue.length > 0;
