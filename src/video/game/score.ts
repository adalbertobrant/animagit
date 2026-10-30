/**
 * score.ts — calcula o score visível no frame atual a partir dos scoreEvents.
 * O placar sobe no frame exato do abate/coleta, nunca aparece no total de cara.
 */

import type { ScoreEvent } from "./timeline";

/**
 * Soma todos os scoreEvents cujo frame <= currentFrame.
 * Retorna { base, bonus, total }.
 */
export const scoreAtFrame = (
  events: ScoreEvent[],
  currentFrame: number,
): { base: number; bonus: number; total: number } => {
  let base = 0;
  let bonus = 0;

  for (const ev of events) {
    if (ev.frame > currentFrame) break; // eventos estão ordenados por frame
    if (ev.bonus) {
      bonus += ev.points;
    } else {
      base += ev.points;
    }
  }

  return { base, bonus, total: base + bonus };
};

/**
 * Retorna os eventos que ocorreram nos últimos `windowFrames` quadros.
 * Usado para mostrar os popups de +N.
 */
export const recentEvents = (
  events: ScoreEvent[],
  currentFrame: number,
  windowFrames = 28,
): ScoreEvent[] =>
  events.filter(
    (ev) => ev.frame <= currentFrame && ev.frame >= currentFrame - windowFrames,
  );
