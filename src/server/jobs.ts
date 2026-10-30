import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RenderJob, Resolution, ThemeId } from "../shared/types.js";
import { PATHS } from "./paths.js";

const jobs = new Map<string, RenderJob>();
let loaded = false;
let saveTimer: NodeJS.Timeout | null = null;

const serialize = () => JSON.stringify([...jobs.values()].slice(-80), null, 2);

const saveNow = async () => {
  saveTimer = null;
  await mkdir(dirname(PATHS.jobs), { recursive: true });
  const tmp = `${PATHS.jobs}.${process.pid}.tmp`;
  await writeFile(tmp, serialize(), "utf8");
  await rename(tmp, PATHS.jobs);
};

const scheduleSave = () => {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveNow().catch(() => undefined);
  }, 400);
};

export const loadJobs = async (): Promise<void> => {
  if (loaded) return;
  loaded = true;

  try {
    const raw = await readFile(PATHS.jobs, "utf8");
    const parsed = JSON.parse(raw) as RenderJob[];
    for (const job of parsed) {
      job.message = job.message ?? null;
      job.logs = Array.isArray(job.logs) ? job.logs : [];
      if (job.status === "queued" || job.status === "bundling" || job.status === "rendering") {
        job.status = "error";
        job.error = "Render interrompido quando o servidor foi encerrado. Gere novamente.";
        job.finishedAt = new Date().toISOString();
      }
      jobs.set(job.id, job);
    }
  } catch {
    // Primeira execução: sem jobs salvos.
  }
};

export const createJob = (input: {
  username: string;
  theme: ThemeId;
  year: number;
  height: Resolution;
}): RenderJob => {
  const now = new Date().toISOString();
  const job: RenderJob = {
    id: randomUUID(),
    username: input.username,
    theme: input.theme,
    year: input.year,
    height: input.height,
    status: "queued",
    progress: 0,
    frames: 0,
    totalFrames: 0,
    message: "Aguardando na fila…",
    logs: [],
    outputFile: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
  };

  jobs.set(job.id, job);
  scheduleSave();
  return job;
};

export const getJob = (id: string): RenderJob | null => jobs.get(id) ?? null;

export const listJobs = (): RenderJob[] =>
  [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const findDoneJob = ({
  username,
  theme,
  year,
  height,
}: {
  username: string;
  theme: ThemeId;
  year: number;
  height: Resolution;
}): RenderJob | null => {
  for (const job of jobs.values()) {
    if (
      job.status === "done" &&
      job.outputFile &&
      job.username.toLowerCase() === username.toLowerCase() &&
      job.theme === theme &&
      job.year === year &&
      job.height === height
    ) {
      return job;
    }
  }
  return null;
};

export const updateJob = (id: string, patch: Partial<RenderJob>): RenderJob | null => {
  const current = jobs.get(id);
  if (!current) return null;

  const next: RenderJob = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  jobs.set(id, next);
  scheduleSave();
  return next;
};

export const removeJob = (id: string): boolean => {
  const removed = jobs.delete(id);
  if (removed) scheduleSave();
  return removed;
};
