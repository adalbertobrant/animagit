/**
 * narrative.ts — gera os beats textuais a partir de GitHubStats + GameTimeline.
 * Um Beat por fase + abertura + fechamento.
 * Português do Brasil, uma ideia por manchete, sem repetir dado em manchete e detalhe.
 */

import type { GitHubStats } from "../shared/types";
import type { GamePhase, GameTimeline } from "./game/timeline";
import { formatNumber } from "../shared/types";

export type Beat = {
  id: string;
  /** 0 = abertura, 1..12 = mês, 13 = fechamento */
  month: number;
  label: string;
  headline: string;
  detail: string;
  accent: "neutral" | "success" | "warning";
};

const MONTH_NAMES: Record<number, string> = {
  1: "JANEIRO",
  2: "FEVEREIRO",
  3: "MARÇO",
  4: "ABRIL",
  5: "MAIO",
  6: "JUNHO",
  7: "JULHO",
  8: "AGOSTO",
  9: "SETEMBRO",
  10: "OUTUBRO",
  11: "NOVEMBRO",
  12: "DEZEMBRO",
};

const MONTH_TITLES: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

/** Mês com mais contribuições */
const peakMonthNumber = (phases: GamePhase[]): number => {
  let best = phases[0];
  for (const p of phases) {
    if (!best || p.count > best.count) best = p;
  }
  return best?.month ?? 1;
};

const ordinal = (n: number): string => `${n}°`;

const languageLeader = (stats: GitHubStats): string =>
  stats.languages[0]?.name ?? "código";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const buildBeats = (stats: GitHubStats, timeline: GameTimeline): Beat[] => {
  const beats: Beat[] = [];
  const login = stats.login;
  const year = stats.year;
  const c = stats.contributions;
  const peak = peakMonthNumber(timeline.phases);
  const lang = languageLeader(stats);

  // ---------- Abertura ----------
  beats.push({
    id: "intro",
    month: 0,
    label: `${year} · INÍCIO`,
    headline: `Bem-vindo ao seu ano em código, @${login}.`,
    detail: `${formatNumber(c.total)} contribuições ao longo de ${formatNumber(c.activeDays)} dias ativos.`,
    accent: "neutral",
  });

  // ---------- Fases mensais ----------
  for (const phase of timeline.phases) {
    const m = phase.month;
    const monthName = MONTH_NAMES[m] ?? `MÊS ${m}`;
    const monthTitle = MONTH_TITLES[m] ?? `Mês ${m}`;
    const label = `${monthName} · FASE ${String(m).padStart(2, "0")}`;

    if (!phase.hasActivity) {
      beats.push({
        id: `month-${m}`,
        month: m,
        label,
        headline: `${monthTitle} foi um mês tranquilo.`,
        detail: "Nenhuma contribuição registrada — às vezes o código descansa.",
        accent: "neutral",
      });
      continue;
    }

    let headline: string;
    let detail: string;
    let accent: Beat["accent"] = "neutral";

    if (m === peak) {
      headline = `${monthTitle} foi o mês mais intenso do ano.`;
      detail = `${formatNumber(phase.count)} contribuições · ${formatNumber(phase.activeDays)} dias ativos.`;
      accent = "success";
    } else if (phase.count >= 30) {
      headline = `${monthTitle} trouxe um ritmo forte: ${formatNumber(phase.count)} contribuições.`;
      detail = `${formatNumber(phase.activeDays)} dias ativos · melhor dia com ${phase.bestDay?.count ?? 0} commits.`;
      accent = "success";
    } else if (phase.count >= 10) {
      headline = `Em ${monthTitle}, você contribuiu ${formatNumber(phase.count)} vezes.`;
      detail = `${formatNumber(phase.activeDays)} dias ativos no mês.`;
      accent = "neutral";
    } else {
      headline = `${monthTitle} foi discreto, mas presente.`;
      detail = `${formatNumber(phase.count)} contribuições · ${formatNumber(phase.activeDays)} dia${phase.activeDays !== 1 ? "s" : ""} ativo${phase.activeDays !== 1 ? "s" : ""}.`;
      accent = "warning";
    }

    beats.push({ id: `month-${m}`, month: m, label, headline, detail, accent });
  }

  // ---------- Fechamento ----------
  const topRepo = stats.topRepos[0];
  const streakText =
    c.longestStreak >= 5
      ? `Maior sequência: ${c.longestStreak} dias seguidos.`
      : c.longestStreak > 0
        ? `Sequência máxima de ${c.longestStreak} dia${c.longestStreak !== 1 ? "s" : ""}.`
        : "Continue firme no próximo ano!";

  beats.push({
    id: "outro",
    month: 13,
    label: `${year} · FIM`,
    headline: topRepo
      ? `Destaque do ano: ${topRepo.name}.`
      : `Placar final: ${formatNumber(c.total)} contribuições.`,
    detail: `${lang} liderou ${pct(stats.languages[0]?.percent ?? 0)} do código · ${streakText}`,
    accent: "success",
  });

  return beats;
};

/**
 * Retorna o beat ativo para um determinado frame.
 * A abertura cobre INTRO_FRAMES. As fases cobrem seus intervalos.
 * O fechamento cobre OUTRO_FRAMES ao final.
 */
export const beatAtFrame = (beats: Beat[], timeline: GameTimeline, frame: number): Beat => {
  if (frame < timeline.runStart) {
    return beats[0] ?? beats[beats.length - 1]!;
  }
  if (frame >= timeline.runEnd) {
    return beats[beats.length - 1] ?? beats[0]!;
  }

  // Encontrar fase
  for (const phase of timeline.phases) {
    if (frame >= phase.startFrame && frame < phase.endFrame) {
      const beat = beats.find((b) => b.month === phase.month);
      if (beat) return beat;
    }
  }

  return beats[0]!;
};
