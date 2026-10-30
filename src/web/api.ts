import type {
  GitHubStats,
  RenderJob,
  Resolution,
  ThemeId,
} from "../shared/types";

export type JobView = RenderJob & { outputUrl: string | null };

export type ConfigResponse = {
  defaultUsername: string;
  year: number;
  hasToken: boolean;
  videoHeight: Resolution;
  resolutions: readonly Resolution[];
  themes: Record<
    ThemeId,
    { name: string; subtitle: string; description: string; emoji: string }
  >;
  source: "local";
};

export type StatsResponse = GitHubStats & { avatarUrl: string | null };

export type RenderResponse = {
  job: JobView;
  reused: boolean;
  position: number;
  queue: number;
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
};

export const api = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Falha na requisição (${response.status}).`;
    throw new Error(message);
  }

  return data as T;
};

export const getConfig = () => api<ConfigResponse>("/api/config");

export const getStats = (username: string, year: number, refresh = false) =>
  api<StatsResponse>(
    `/api/stats?username=${encodeURIComponent(username)}&year=${year}${
      refresh ? "&refresh=1" : ""
    }`,
  );

export const startRender = (input: {
  username: string;
  theme: ThemeId;
  height: Resolution;
}) => api<RenderResponse>("/api/render", { method: "POST", body: input });

export const getJob = (id: string) =>
  api<{ job: JobView; queue: number }>(`/api/jobs/${encodeURIComponent(id)}`);

export const getJobs = () => api<{ jobs: JobView[] }>("/api/jobs");
