import type { GitHubStats, ThemeId } from "../../shared/types";
import { INTRO_FRAMES, OUTRO_FRAMES, RUN_FRAMES } from "../constants";
import { clamp, createRng, hashString, type Rng } from "./prng";

export const MONTH_NAMES_PT = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

export const MONTH_TITLES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MONTH_SHORT_PT = [
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

export type RunObject = {
  id: string;
  /** Frames relativos ao início da fase. */
  spawnAt: number;
  hitAt: number;
  points: number;
  bonus: boolean;
  /** 0..1, usado para escolher altura/faixa. */
  lane: number;
  /** 0 = comum, 1 = médio, 2 = especial/bônus. */
  variant: number;
};

export type JumpEvent = {
  start: number;
  duration: number;
};

export type ObstacleEvent = {
  id: string;
  spawnAt: number;
  /** Frame em que o obstáculo cruza o personagem. */
  hitAt: number;
  variant: number;
};

export type GamePhase = {
  month: number;
  /** MARÇO */
  name: string;
  /** Março */
  title: string;
  /** MAR */
  short: string;
  count: number;
  activeDays: number;
  bestDay: { date: string; count: number } | null;
  hasActivity: boolean;
  phaseNumber: number;
  startFrame: number;
  durationInFrames: number;
  endFrame: number;
  objects: RunObject[];
  jumps: JumpEvent[];
  obstacles: ObstacleEvent[];
  bonusCount: number;
};

export type ScoreEvent = {
  frame: number;
  points: number;
  bonus: boolean;
  month: number;
  objectId: string;
};

export type GameTimeline = {
  seed: number;
  login: string;
  year: number;
  theme: ThemeId;
  introFrames: number;
  outroFrames: number;
  runStart: number;
  runEnd: number;
  totalFrames: number;
  phases: GamePhase[];
  scoreEvents: ScoreEvent[];
  baseTotal: number;
  bonusTotal: number;
  totalScore: number;
  peakPhase: GamePhase | null;
  activeMonths: number;
};

type MonthBucket = {
  count: number;
  activeDays: number;
  bestDay: { date: string; count: number } | null;
};

const EMPTY_PHASE_FRAMES = 30; // 1 s
const ACTIVE_MIN_FRAMES = 60; // 2 s
const ACTIVE_MAX_FRAMES = 150; // 5 s

const readMonths = (stats: GitHubStats): MonthBucket[] => {
  const buckets: MonthBucket[] = Array.from({ length: 12 }, () => ({
    count: 0,
    activeDays: 0,
    bestDay: null,
  }));

  for (const day of stats.contributions.calendar) {
    const month = Number(day.date.slice(5, 7));
    if (!Number.isFinite(month) || month < 1 || month > 12) continue;
    const bucket = buckets[month - 1];
    const count = Math.max(0, Math.round(day.count));
    bucket.count += count;
    if (count > 0) bucket.activeDays += 1;
    if (!bucket.bestDay || count > bucket.bestDay.count) {
      bucket.bestDay = { date: day.date, count };
    }
  }

  // Snapshots antigos podem não ter calendário. Nesse caso, mantém o total
  // visível no último mês em vez de perder o placar.
  if (stats.contributions.calendar.length === 0) {
    buckets[11] = {
      count: Math.max(0, stats.contributions.total),
      activeDays: Math.max(0, stats.contributions.activeDays),
      bestDay: stats.contributions.bestDay,
    };
  }

  return buckets;
};

/**
 * Distribui os frames da corrida entre os meses.
 * Meses com atividade têm entre 2 s e 5 s, proporcionais à raiz do volume.
 * Meses vazios ficam com um beat curto. O total é sempre RUN_FRAMES.
 */
export const allocatePhaseFrames = (
  months: MonthBucket[],
  totalFrames = RUN_FRAMES,
): number[] => {
  const frames = months.map((month) =>
    month.count > 0 ? ACTIVE_MIN_FRAMES : EMPTY_PHASE_FRAMES,
  );

  let remaining = totalFrames - frames.reduce((sum, value) => sum + value, 0);
  const active = months
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => month.count > 0);

  if (remaining > 0 && active.length > 0) {
    const weights = active.map(({ month }) => Math.sqrt(month.count + 1));
    const extra = active.map(() => 0);
    let open = active.map((_, index) => index);

    while (remaining > 0.001 && open.length > 0) {
      const weightSum = open.reduce((sum, index) => sum + weights[index], 0);
      let used = 0;

      for (const index of open) {
        const capacity = ACTIVE_MAX_FRAMES - ACTIVE_MIN_FRAMES - extra[index];
        const share = (weights[index] / weightSum) * remaining;
        const addition = Math.min(share, capacity, remaining - used);
        if (addition > 0) {
          extra[index] += addition;
          used += addition;
        }
      }

      if (used <= 0.001) break;
      remaining -= used;
      open = open.filter(
        (index) => extra[index] < ACTIVE_MAX_FRAMES - ACTIVE_MIN_FRAMES - 0.001,
      );
    }

    active.forEach(({ index }, activeIndex) => {
      frames[index] += extra[activeIndex];
    });
  }

  // Caso raro de usuário sem nenhuma contribuição: alonga os beats vazios
  // para preencher a janela, sem inventar atividade.
  if (remaining > 0.001) {
    const open = frames.map((_, index) => index);
    while (remaining > 0.001 && open.length > 0) {
      const share = remaining / open.length;
      let used = 0;
      for (const index of open) {
        const capacity = 240 - frames[index];
        const addition = Math.min(share, capacity, remaining - used);
        if (addition <= 0) continue;
        frames[index] += addition;
        used += addition;
      }
      if (used <= 0.001) break;
      remaining -= used;
    }
  }

  const rounded = frames.map((value) => Math.round(value));
  let difference = totalFrames - rounded.reduce((sum, value) => sum + value, 0);
  const order = months
    .map((month, index) => ({ index, weight: month.count }))
    .sort((a, b) => b.weight - a.weight)
    .map(({ index }) => index);

  let guard = 0;
  while (difference !== 0 && guard < 10000) {
    for (const index of order) {
      if (difference === 0) break;
      if (difference > 0 && rounded[index] < 240) {
        rounded[index] += 1;
        difference -= 1;
      } else if (difference < 0 && rounded[index] > 30) {
        rounded[index] -= 1;
        difference += 1;
      }
    }
    guard += 1;
  }

  return rounded;
};

const buildObjects = (
  phase: Omit<GamePhase, "objects" | "jumps" | "obstacles" | "bonusCount">,
  rng: Rng,
): RunObject[] => {
  const { count, durationInFrames: duration, month } = phase;
  if (count <= 0) return [];

  const objectCount = Math.max(
    1,
    Math.min(count, Math.min(16, Math.round(Math.sqrt(count) * 1.7))),
  );
  const basePoints = Math.floor(count / objectCount);
  const remainder = count % objectCount;
  const travel = clamp(Math.round(duration * 0.24), 16, 38);
  const firstHit = clamp(travel + 4, 8, Math.max(8, duration - 8));
  const lastHit = clamp(duration - 8, firstHit, Math.max(firstHit, duration - 4));

  return Array.from({ length: objectCount }, (_, index) => {
    const progress = objectCount === 1 ? 0.55 : index / (objectCount - 1);
    const hitAt = clamp(
      Math.round(firstHit + (lastHit - firstHit) * progress + rng.int(-2, 2)),
      6,
      duration - 4,
    );

    return {
      id: `m${String(month).padStart(2, "0")}-obj-${index}`,
      spawnAt: hitAt - travel,
      hitAt,
      points: basePoints + (index < remainder ? 1 : 0),
      bonus: false,
      lane: rng.next(),
      variant: rng.next() > 0.78 ? 1 : 0,
    };
  });
};

const buildMetroidJumps = (duration: number): JumpEvent[] => {
  const jumpCount = clamp(Math.round(duration / 62), 1, 3);
  return Array.from({ length: jumpCount }, (_, index) => {
    const start = Math.round(duration * (0.2 + index * 0.29)) - 13;
    return {
      start: clamp(start, 2, Math.max(2, duration - 30)),
      duration: 26,
    };
  });
};

const buildPitfallObstacles = (
  duration: number,
  month: number,
  rng: Rng,
): { obstacles: ObstacleEvent[]; jumps: JumpEvent[] } => {
  const obstacleCount = clamp(Math.round(duration / 58), 1, 3);
  const travel = clamp(Math.round(duration * 0.24), 16, 38);
  const obstacles = Array.from({ length: obstacleCount }, (_, index) => {
    const hitAt = clamp(
      Math.round(duration * (0.34 + index * 0.29)),
      24,
      Math.max(24, duration - 8),
    );
    return {
      id: `m${String(month).padStart(2, "0")}-obstacle-${index}`,
      spawnAt: hitAt - travel,
      hitAt,
      variant: rng.int(0, 2),
    };
  });

  return {
    obstacles,
    jumps: obstacles.map((obstacle) => ({
      start: clamp(obstacle.hitAt - 16, 2, Math.max(2, duration - 32)),
      duration: 30,
    })),
  };
};

export const buildTimeline = (stats: GitHubStats, theme: ThemeId): GameTimeline => {
  const seed = hashString(`${stats.login}:${stats.year}:${theme}:anima-0.1.1`);
  const rng = createRng(seed);
  const months = readMonths(stats);
  const frames = allocatePhaseFrames(months);

  let cursor = INTRO_FRAMES;
  const phases: GamePhase[] = months.map((month, index) => {
    const monthNumber = index + 1;
    const phase = {
      month: monthNumber,
      name: MONTH_NAMES_PT[index],
      title: MONTH_TITLES_PT[index],
      short: MONTH_SHORT_PT[index],
      count: month.count,
      activeDays: month.activeDays,
      bestDay: month.bestDay,
      hasActivity: month.count > 0,
      phaseNumber: monthNumber,
      startFrame: cursor,
      durationInFrames: frames[index],
      endFrame: cursor + frames[index],
    };

    cursor += frames[index];

    const objects = buildObjects(phase, rng);
    const scenery =
      theme === "metroid"
        ? { jumps: buildMetroidJumps(phase.durationInFrames), obstacles: [] }
        : theme === "pitfall"
          ? buildPitfallObstacles(phase.durationInFrames, monthNumber, rng)
          : { jumps: [], obstacles: [] };

    return {
      ...phase,
      objects,
      jumps: scenery.jumps,
      obstacles: scenery.obstacles,
      bonusCount: 0,
    };
  });

  const contributions = stats.contributions;
  const bonusUnits = Math.min(
    8,
    Math.min(contributions.pullRequests, 4) +
      Math.min(contributions.issues, 3) +
      (stats.topRepos.length > 0 ? 1 : 0) +
      (contributions.longestStreak >= 3 ? 1 : 0),
  );

  const activePhases = phases
    .filter((phase) => phase.hasActivity && phase.objects.length > 0)
    .sort((a, b) => b.count - a.count);

  if (activePhases.length > 0) {
    for (let unit = 0; unit < bonusUnits; unit++) {
      const phase = activePhases[unit % activePhases.length];
      const candidates = phase.objects.filter((object) => !object.bonus);
      if (candidates.length === 0) continue;
      const round = Math.floor(unit / activePhases.length);
      const target = candidates[(round + unit) % candidates.length];
      target.bonus = true;
      target.variant = 2;
      phase.bonusCount += 1;
    }
  }

  const scoreEvents: ScoreEvent[] = [];
  for (const phase of phases) {
    for (const object of phase.objects) {
      scoreEvents.push({
        frame: phase.startFrame + object.hitAt,
        points: object.points,
        bonus: false,
        month: phase.month,
        objectId: object.id,
      });
      if (object.bonus) {
        scoreEvents.push({
          frame: phase.startFrame + object.hitAt + 2,
          points: 5,
          bonus: true,
          month: phase.month,
          objectId: object.id,
        });
      }
    }
  }
  scoreEvents.sort((a, b) => a.frame - b.frame);

  const baseTotal = phases.reduce(
    (sum, phase) => sum + phase.objects.reduce((total, object) => total + object.points, 0),
    0,
  );
  const bonusTotal = phases.reduce((sum, phase) => sum + phase.bonusCount * 5, 0);
  const peakPhase =
    [...phases].sort((a, b) => b.count - a.count).find((phase) => phase.count > 0) ?? null;

  return {
    seed,
    login: stats.login,
    year: stats.year,
    theme,
    introFrames: INTRO_FRAMES,
    outroFrames: OUTRO_FRAMES,
    runStart: INTRO_FRAMES,
    runEnd: cursor,
    totalFrames: cursor + OUTRO_FRAMES,
    phases,
    scoreEvents,
    baseTotal,
    bonusTotal,
    totalScore: baseTotal + bonusTotal,
    peakPhase,
    activeMonths: phases.filter((phase) => phase.hasActivity).length,
  };
};

export const findPhaseAtFrame = (
  timeline: GameTimeline,
  frame: number,
): GamePhase | null => {
  if (frame < timeline.runStart || frame >= timeline.runEnd) return null;
  return (
    timeline.phases.find(
      (phase) => frame >= phase.startFrame && frame < phase.endFrame,
    ) ?? null
  );
};

export const phaseLocalFrame = (phase: GamePhase, frame: number): number =>
  frame - phase.startFrame;

export const jumpLift = (phase: GamePhase, localFrame: number, height = 112): number => {
  for (const jump of phase.jumps) {
    if (localFrame >= jump.start && localFrame < jump.start + jump.duration) {
      const progress = (localFrame - jump.start) / jump.duration;
      return Math.sin(Math.PI * progress) * height;
    }
  }
  return 0;
};
