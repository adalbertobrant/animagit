import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { DayContribution, GitHubStats, LanguageStat } from "../shared/types.js";

type GraphQlResponse<T> = {
  data?: T;
  errors?: { message: string; type?: string }[];
};

type UserQuery = {
  user: {
    login: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string;
    followers: { totalCount: number };
    repositories: { totalCount: number };
    contributionsCollection: {
      totalCommitContributions: number;
      totalIssueContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      totalRepositoryContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: {
          contributionDays: {
            date: string;
            contributionCount: number;
            weekday: number;
          }[];
        }[];
      };
      commitContributionsByRepository: {
        contributions: { totalCount: number };
        repository: {
          nameWithOwner: string;
          stargazerCount: number;
          languages: {
            edges: {
              size: number;
              node: { name: string; color: string | null };
            }[];
          };
        };
      }[];
    };
    closedIssues: { totalCount: number };
    openIssues: { totalCount: number };
  } | null;
};

type StarsQuery = {
  user: {
    starredRepositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: {
        starredAt: string;
        node: { nameWithOwner: string; stargazerCount: number };
      }[];
    };
  } | null;
};

const USER_QUERY = /* GraphQL */ `
  query YearInCode($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      login
      name
      bio
      avatarUrl
      followers {
        totalCount
      }
      repositories {
        totalCount
      }
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoryContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 100) {
          contributions {
            totalCount
          }
          repository {
            nameWithOwner
            stargazerCount
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      }
      closedIssues: issues(filterBy: { since: $from }, states: CLOSED) {
        totalCount
      }
      openIssues: issues(filterBy: { since: $from }, states: OPEN) {
        totalCount
      }
    }
  }
`;

const STARS_QUERY = /* GraphQL */ `
  query Stars($login: String!, $cursor: String) {
    user(login: $login) {
      starredRepositories(
        first: 100
        after: $cursor
        orderBy: { field: STARRED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          starredAt
          node {
            nameWithOwner
            stargazerCount
          }
        }
      }
    }
  }
`;

export class GitHubError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

const graphql = async <T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "anima-github-local",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 401) {
    throw new GitHubError(
      "Token do GitHub inválido ou expirado. Confira GITHUB_TOKEN no .env.",
      401,
    );
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    throw new GitHubError(
      `Rate limit do GitHub atingido (restam ${remaining ?? "?"}). Tente novamente em alguns minutos.`,
      429,
    );
  }

  if (!response.ok) {
    throw new GitHubError(`GitHub respondeu HTTP ${response.status}.`, 502);
  }

  const json = (await response.json()) as GraphQlResponse<T>;
  if (json.errors?.length) {
    const first = json.errors[0]!.message;
    if (/could not resolve to a user/i.test(first)) {
      throw new GitHubError("Usuário não encontrado no GitHub.", 404);
    }
    throw new GitHubError(`Erro do GitHub: ${first}`, 502);
  }

  if (!json.data) {
    throw new GitHubError("Resposta vazia do GitHub.", 502);
  }

  return json.data;
};

const NOISE_LANGUAGES = new Set([
  "html",
  "markdown",
  "dockerfile",
  "roff",
  "rich text format",
  "makefile",
  "cmake",
  "tex",
  "batchfile",
  "powershell",
]);

type CommitContributionsByRepository = NonNullable<
  UserQuery["user"]
>["contributionsCollection"]["commitContributionsByRepository"];

const computeLanguages = (
  repos: CommitContributionsByRepository,
): LanguageStat[] => {
  const weights = new Map<string, { weight: number; color: string }>();

  for (const entry of repos) {
    const edges = entry.repository.languages.edges.filter(
      (edge) => !NOISE_LANGUAGES.has(edge.node.name.toLowerCase()),
    );
    const totalSize = edges.reduce((sum, edge) => sum + edge.size, 0);
    if (totalSize <= 0) continue;

    const contributions = Math.max(1, entry.contributions.totalCount);
    for (const edge of edges) {
      const current = weights.get(edge.node.name) ?? {
        weight: 0,
        color: edge.node.color ?? "#8b949e",
      };
      current.weight += contributions * (edge.size / totalSize);
      weights.set(edge.node.name, current);
    }
  }

  const total = [...weights.values()].reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return [];

  return [...weights.entries()]
    .map(([name, item]) => ({
      name,
      color: item.color,
      percent: item.weight / total,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 12);
};

const searchCommits = async (
  username: string,
  year: number,
  token: string,
): Promise<{ byHour: number[]; byWeekday: number[] }> => {
  const byHour = new Array<number>(24).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  const query = `author:${username} author-date:${year}-01-01..${year}-12-31 merge:false`;

  try {
    for (let page = 1; page <= 5; page++) {
      const params = new URLSearchParams({
        q: query,
        sort: "author-date",
        order: "desc",
        per_page: "100",
        page: String(page),
      });

      const response = await fetch(
        `https://api.github.com/search/commits?${params.toString()}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "user-agent": "anima-github-local",
          },
        },
      );

      if (!response.ok) break;

      const json = (await response.json()) as {
        items?: { commit: { author: { date: string } } }[];
      };
      const items = json.items ?? [];
      if (items.length === 0) break;

      for (const item of items) {
        const date = item.commit.author.date;
        // O horário vem com o offset do autor; usamos a hora "de parede".
        const hour = Number(date.slice(11, 13));
        if (Number.isFinite(hour) && hour >= 0 && hour < 24) {
          byHour[hour] = (byHour[hour] ?? 0) + 1;
        }

        const day = new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay();
        if (day >= 0 && day < 7) {
          byWeekday[day] = (byWeekday[day] ?? 0) + 1;
        }
      }

      if (items.length < 100) break;
    }
  } catch {
    // A busca de commits é opcional: a animação continua com os dados do calendário.
  }

  return { byHour, byWeekday };
};

type StarredConnection = NonNullable<
  NonNullable<StarsQuery["user"]>["starredRepositories"]
>;

const fetchStarsGiven = async (
  username: string,
  year: number,
  token: string,
): Promise<{ count: number; repos: { name: string; stars: number }[] }> => {
  const collected: { name: string; stars: number }[] = [];
  let cursor: string | null = null;
  let count = 0;
  const yearStart = `${year}-01-01`;

  try {
    for (let page = 0; page < 10; page++) {
      const data: StarsQuery = await graphql<StarsQuery>(token, STARS_QUERY, {
        login: username,
        cursor,
      });
      const connection: StarredConnection | undefined =
        data.user?.starredRepositories;
      if (!connection) break;

      let reachedPreviousYear = false;
      for (const edge of connection.edges) {
        if (edge.starredAt.slice(0, 10) < yearStart) {
          reachedPreviousYear = true;
          break;
        }
        if (edge.starredAt.startsWith(String(year))) {
          count++;
          collected.push({
            name: edge.node.nameWithOwner,
            stars: edge.node.stargazerCount,
          });
        }
      }

      if (reachedPreviousYear || !connection.pageInfo.hasNextPage) break;
      cursor = connection.pageInfo.endCursor;
      if (!cursor) break;
    }
  } catch {
    // Sem estrelas não é um erro fatal.
  }

  return {
    count,
    repos: collected.sort((a, b) => b.stars - a.stars).slice(0, 6),
  };
};

const saveAvatar = async (
  login: string,
  avatarUrl: string,
  avatarDir: string,
): Promise<string | null> => {
  try {
    const response = await fetch(avatarUrl, {
      headers: { "user-agent": "anima-github-local" },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("jpeg")
      ? ".jpg"
      : contentType.includes("webp")
        ? ".webp"
        : ".png";
    const bytes = Buffer.from(await response.arrayBuffer());
    await mkdir(avatarDir, { recursive: true });

    const fileName = `${login.toLowerCase()}${ext}`;
    await writeFile(resolve(avatarDir, fileName), bytes);

    // Remove avatares antigos da mesma pessoa com outra extensão.
    for (const file of await readdir(avatarDir)) {
      if (
        file.startsWith(`${login.toLowerCase()}.`) &&
        file !== fileName &&
        [".png", ".jpg", ".webp"].includes(extname(file).toLowerCase())
      ) {
        await unlink(resolve(avatarDir, file)).catch(() => undefined);
      }
    }

    return fileName;
  } catch {
    return null;
  }
};

const countStreaks = (days: DayContribution[], todayIso: string) => {
  const past = days.filter((day) => day.date <= todayIso);
  let longest = 0;
  let running = 0;

  for (const day of past) {
    if (day.count > 0) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    const day = past[i]!;
    if (day.count > 0) {
      current++;
    } else {
      break;
    }
  }

  return { longest, current, activeDays: past.filter((d) => d.count > 0).length };
};

export type FetchGithubOptions = {
  username: string;
  year: number;
  token: string;
  avatarDir: string;
  onLog?: (message: string) => void;
};

export const fetchGithubStats = async ({
  username,
  year,
  token,
  avatarDir,
  onLog,
}: FetchGithubOptions): Promise<GitHubStats> => {
  onLog?.(`Consultando o GitHub para @${username} (${year})…`);

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year + 1}-01-01T00:00:00Z`;
  const data = await graphql<UserQuery>(token, USER_QUERY, {
    login: username,
    from,
    to,
  });

  if (!data.user) {
    throw new GitHubError("Usuário não encontrado no GitHub.", 404);
  }

  const user = data.user;
  const collection = user.contributionsCollection;

  const calendar: DayContribution[] = collection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .filter((day) => day.date.startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      date: day.date,
      count: day.contributionCount,
      weekday: day.weekday,
    }));

  const todayIso = new Date().toISOString().slice(0, 10);
  const { longest, current, activeDays } = countStreaks(calendar, todayIso);

  const bestDay = calendar.reduce<{ date: string; count: number } | null>(
    (best, day) => (day.count > (best?.count ?? 0) ? { date: day.date, count: day.count } : best),
    null,
  );

  onLog?.("Analisando commits, linguagens e estrelas…");

  const [commitActivity, stars] = await Promise.all([
    searchCommits(user.login, year, token),
    fetchStarsGiven(user.login, year, token),
  ]);

  let byHour = commitActivity.byHour;
  let byWeekday = commitActivity.byWeekday;

  const weekdayFromCalendar = new Array<number>(7).fill(0);
  for (const day of calendar) {
    if (day.count > 0) {
      weekdayFromCalendar[day.weekday] =
        (weekdayFromCalendar[day.weekday] ?? 0) + day.count;
    }
  }

  if (byWeekday.every((value) => value === 0)) {
    byWeekday = weekdayFromCalendar;
  }

  if (byHour.every((value) => value === 0)) {
    // Sem busca de commits: distribui as contribuições do calendário em um
    // horário plausível para não deixar o gráfico vazio.
    byHour = new Array<number>(24).fill(0);
    const total = calendar.reduce((sum, day) => sum + day.count, 0);
    const peak = 15;
    byHour[peak] = Math.max(1, Math.round(total * 0.18));
  }

  const topHour = byHour.indexOf(Math.max(...byHour));
  const topWeekday = byWeekday.indexOf(Math.max(...byWeekday));

  const topRepos = collection.commitContributionsByRepository
    .map((entry) => ({
      name: entry.repository.nameWithOwner,
      contributions: entry.contributions.totalCount,
      stars: entry.repository.stargazerCount,
    }))
    .sort((a, b) => b.contributions - a.contributions)
    .slice(0, 8);

  const avatarFile = await saveAvatar(user.login, user.avatarUrl, avatarDir);

  onLog?.("Pronto.");

  return {
    login: user.login,
    name: user.name?.trim() || user.login,
    bio: user.bio?.trim() || "",
    avatarFile,
    followers: user.followers.totalCount,
    publicRepos: user.repositories.totalCount,
    year,
    generatedAt: new Date().toISOString(),
    source: "github",
    contributions: {
      total: collection.contributionCalendar.totalContributions,
      commits: collection.totalCommitContributions,
      pullRequests: collection.totalPullRequestContributions,
      issues: collection.totalIssueContributions,
      reviews: collection.totalPullRequestReviewContributions,
      repositories: collection.totalRepositoryContributions,
      restricted: collection.restrictedContributionsCount,
      activeDays,
      longestStreak: longest,
      currentStreak: current,
      bestDay,
      calendar,
    },
    languages: computeLanguages(collection.commitContributionsByRepository),
    productivity: { byHour, byWeekday, topHour, topWeekday },
    highlights: {
      starsGiven: stars.count,
      issuesClosed: user.closedIssues.totalCount,
      issuesOpened: user.openIssues.totalCount,
      repositoriesContributed: collection.totalRepositoryContributions,
      followers: user.followers.totalCount,
      publicRepos: user.repositories.totalCount,
    },
    topRepos,
    starredRepos: stars.repos,
  };
};
