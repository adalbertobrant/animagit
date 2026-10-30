export const THEME_IDS = ["space", "metroid", "pitfall"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const RESOLUTIONS = [1080, 720] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export type DayContribution = {
  /** YYYY-MM-DD */
  date: string;
  count: number;
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
};

export type LanguageStat = {
  name: string;
  color: string;
  /** 0..1 */
  percent: number;
};

export type TopRepo = {
  name: string;
  contributions: number;
  stars: number;
};

export type GitHubStats = {
  login: string;
  name: string;
  bio: string;
  avatarFile: string | null;
  followers: number;
  publicRepos: number;
  year: number;
  generatedAt: string;
  source: "github" | "local";
  contributions: {
    total: number;
    commits: number;
    pullRequests: number;
    issues: number;
    reviews: number;
    repositories: number;
    restricted: number;
    activeDays: number;
    longestStreak: number;
    currentStreak: number;
    bestDay: { date: string; count: number } | null;
    /** Dias do ano, ordenados. Inclui dias futuros com count 0. */
    calendar: DayContribution[];
  };
  languages: LanguageStat[];
  productivity: {
    /** 24 posições, 0..23 */
    byHour: number[];
    /** 7 posições, 0 = domingo */
    byWeekday: number[];
    topHour: number;
    topWeekday: number;
  };
  highlights: {
    starsGiven: number;
    issuesClosed: number;
    issuesOpened: number;
    repositoriesContributed: number;
    followers: number;
    publicRepos: number;
  };
  topRepos: TopRepo[];
  starredRepos: { name: string; stars: number }[];
};

export type RenderJobStatus =
  | "queued"
  | "bundling"
  | "rendering"
  | "done"
  | "error";

export type RenderJob = {
  id: string;
  username: string;
  theme: ThemeId;
  year: number;
  height: Resolution;
  status: RenderJobStatus;
  progress: number;
  frames: number;
  totalFrames: number;
  message: string | null;
  logs: string[];
  outputFile: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export const WEEKDAY_LABELS_PT = [
  "DOMINGO",
  "SEGUNDA",
  "TERÇA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SÁBADO",
] as const;

export const WEEKDAY_SHORT_PT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

export const MONTH_LABELS_PT = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
] as const;

export const THEME_INFO: Record<
  ThemeId,
  { name: string; subtitle: string; description: string; emoji: string }
> = {
  space: {
    name: "Espaço",
    subtitle: "Foguete, estrelas e planetas",
    description:
      "Uma viagem pelo seu ano em código com nebulosas, foguete e um mapa de contribuições estelar.",
    emoji: "🚀",
  },
  metroid: {
    name: "Super Metroid",
    subtitle: "Caverna, HUD e pixel art 16-bit",
    description:
      "Transforme seus commits em uma missão de exploração com HUD retrô, scanlines e criaturas alienígenas.",
    emoji: "👾",
  },
  pitfall: {
    name: "Pitfall!",
    subtitle: "Selva, tesouros e Atari 2600",
    description:
      "Corra pela selva coletando tesouros: cada contribuição vira um pedaço do seu placar de 8 bits.",
    emoji: "🪙",
  },
};

export const normalizeUsername = (input: string): string => {
  let value = input.trim();
  value = value.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  value = value.replace(/^@/, "");
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.trim();

  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(value)) {
    throw new Error(
      "Usuário do GitHub inválido. Use algo como adalbertobrant ou github.com/adalbertobrant.",
    );
  }

  return value;
};

export const formatNumber = (value: number): string => {
  const safe = Math.round(Number.isFinite(value) ? value : 0);
  return String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatDatePt = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

export const formatHour = (hour: number): string =>
  `${String(hour).padStart(2, "0")}h`;

export const formatUpdatedAt = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "desconhecido";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};
