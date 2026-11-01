/**
 * cv-github.ts — busca repositórios próprios dos últimos 2 anos
 * com commits, linguagens e excerpt do README.
 * Sem fork, sem arquivados, com commits no período.
 */

import type { CvRepo } from "../shared/cv-types.js";

const GITHUB_API = "https://api.github.com";

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "anima-github-cv",
  "X-GitHub-Api-Version": "2022-11-28",
});

// ── Domínio inferido por tópicos + linguagem ──────────────────────
const DOMAIN_MAP: Record<string, string[]> = {
  Web:        ["react","vue","angular","next","nuxt","svelte","html","css","tailwind","frontend","web","landing","portfolio","blog","astro","remix","typescript","javascript"],
  Backend:    ["api","rest","graphql","grpc","express","fastapi","django","rails","laravel","nestjs","backend","server","node","bun","deno","microservice"],
  DevOps:     ["docker","kubernetes","k8s","terraform","ansible","ci","cd","github-actions","devops","infra","cloud","aws","gcp","azure","helm"],
  Data:       ["data","analytics","etl","pipeline","spark","pandas","numpy","jupyter","ml","machine-learning","ai","llm","nlp","dataset","bigquery","dbt"],
  Mobile:     ["android","ios","flutter","react-native","mobile","kotlin","swift","expo"],
  CLI:        ["cli","terminal","shell","bash","script","tool","utility","automation"],
  Game:       ["game","gamedev","unity","godot","pygame","canvas","pixi","phaser"],
  Security:   ["security","crypto","auth","oauth","jwt","pen-test","vulnerability"],
  Library:    ["library","package","sdk","plugin","extension","component","util","framework"],
  Education:  ["tutorial","course","study","learning","example","demo","boilerplate","template","challenge"],
};

export const inferDomain = (topics: string[], language: string, name: string): string => {
  const haystack = [...topics, language.toLowerCase(), name.toLowerCase()].join(" ");
  for (const [domain, keywords] of Object.entries(DOMAIN_MAP)) {
    if (keywords.some(k => haystack.includes(k))) return domain;
  }
  return "Other";
};

// ── Buscar repos próprios (não fork) ─────────────────────────────
type GHRepo = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  created_at: string;
  default_branch: string;
};

const fetchAllRepos = async (username: string, token: string): Promise<GHRepo[]> => {
  const repos: GHRepo[] = [];
  let page = 1;
  while (true) {
    const url = `${GITHUB_API}/users/${username}/repos?type=owner&sort=pushed&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: headers(token) });
    if (!res.ok) break;
    const batch = (await res.json()) as GHRepo[];
    if (batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return repos;
};

// ── README excerpt ────────────────────────────────────────────────
const fetchReadmeExcerpt = async (fullName: string, token: string): Promise<string> => {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${fullName}/readme`, {
      headers: { ...headers(token), Accept: "application/vnd.github.raw" },
    });
    if (!res.ok) return "";
    const raw = await res.text();
    // Remove cabeçalhos, badges e links; pega as primeiras 3 linhas de texto real
    const lines = raw
      .split("\n")
      .map(l => l.trim())
      .filter(l =>
        l.length > 20 &&
        !l.startsWith("#") &&
        !l.startsWith("!") &&
        !l.startsWith("[") &&
        !l.startsWith("<") &&
        !l.startsWith("---") &&
        !l.startsWith("```") &&
        !/^\s*>\s/.test(l),
      )
      .slice(0, 3);
    return lines.join(" ").slice(0, 400);
  } catch {
    return "";
  }
};

// ── Linguagens ────────────────────────────────────────────────────
const fetchLanguages = async (fullName: string, token: string): Promise<Record<string, number>> => {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${fullName}/languages`, { headers: headers(token) });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, number>;
  } catch {
    return {};
  }
};

// ── Contagem de commits nos últimos 2 anos ────────────────────────
const fetchCommitCount = async (
  fullName: string,
  username: string,
  since: string,
  token: string,
): Promise<number> => {
  try {
    const params = new URLSearchParams({
      author: username,
      since,
      per_page: "1",
    });
    const res = await fetch(`${GITHUB_API}/repos/${fullName}/commits?${params}`, {
      headers: headers(token),
    });
    if (!res.ok) return 0;
    // GitHub retorna Link header com last page number
    const link = res.headers.get("link") ?? "";
    const match = link.match(/page=(\d+)>;\s*rel="last"/);
    if (match) return parseInt(match[1]!, 10);
    const data = (await res.json()) as unknown[];
    return data.length;
  } catch {
    return 0;
  }
};

// ── Função principal ──────────────────────────────────────────────
export const fetchCvRepos = async (
  username: string,
  token: string,
  onLog?: (msg: string) => void,
): Promise<CvRepo[]> => {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 2);
  const sinceISO = since.toISOString();

  onLog?.(`Buscando repositórios de @${username}…`);
  const allRepos = await fetchAllRepos(username, token);

  // Filtra: não fork, não arquivado, com push nos últimos 2 anos
  const filtered = allRepos.filter(
    r => !r.fork && !r.archived && r.pushed_at >= sinceISO,
  );

  onLog?.(`${filtered.length} repos encontrados. Coletando detalhes…`);

  const results: CvRepo[] = [];

  // Paralelo em lotes de 5 para não estourar rate limit
  const BATCH = 5;
  for (let i = 0; i < filtered.length; i += BATCH) {
    const batch = filtered.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async repo => {
        const [readme, languages, commitCount] = await Promise.all([
          fetchReadmeExcerpt(repo.full_name, token),
          fetchLanguages(repo.full_name, token),
          fetchCommitCount(repo.full_name, username, sinceISO, token),
        ]);

        const dominantLang =
          Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] ??
          repo.language ??
          "Other";

        const domain = inferDomain(repo.topics ?? [], dominantLang, repo.name);

        return {
          name:           repo.name,
          fullName:       repo.full_name,
          url:            repo.html_url,
          description:    repo.description ?? "",
          readmeExcerpt:  readme,
          stars:          repo.stargazers_count,
          forks:          repo.forks_count,
          language:       dominantLang,
          topics:         repo.topics ?? [],
          domain,
          lastCommitAt:   repo.pushed_at,
          createdAt:      repo.created_at,
          commitCount,
          languages,
        } satisfies CvRepo;
      }),
    );
    results.push(...batchResults);
    if (i + BATCH < filtered.length) {
      onLog?.(`${Math.min(i + BATCH, filtered.length)}/${filtered.length} repos processados…`);
    }
  }

  // Ordena por commits desc
  return results.sort((a, b) => b.commitCount - a.commitCount);
};

// ── Agrupamento por linguagem + domínio ──────────────────────────
export const groupRepos = (repos: CvRepo[]) => {
  const map = new Map<string, CvRepo[]>();
  for (const repo of repos) {
    const key = `${repo.language}:::${repo.domain}`;
    const arr = map.get(key) ?? [];
    arr.push(repo);
    map.set(key, arr);
  }
  return [...map.entries()]
    .map(([key, r]) => {
      const [language, domain] = key.split(":::");
      return { language: language ?? "Other", domain: domain ?? "Other", repos: r };
    })
    .sort((a, b) => {
      // Ordena grupos pelo total de commits desc
      const sumA = a.repos.reduce((s, r) => s + r.commitCount, 0);
      const sumB = b.repos.reduce((s, r) => s + r.commitCount, 0);
      return sumB - sumA;
    });
};
