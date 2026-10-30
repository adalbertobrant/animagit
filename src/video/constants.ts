export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

export const TRANSITION_FRAMES = 24;

export const SCENE_DURATIONS = {
  intro: 156,
  contributions: 300,
  streak: 216,
  languages: 300,
  productivity: 276,
  highlights: 246,
  outro: 246,
} as const;

export const SCENE_ORDER = [
  "intro",
  "contributions",
  "streak",
  "languages",
  "productivity",
  "highlights",
  "outro",
] as const;

const SUM = Object.values(SCENE_DURATIONS).reduce((total, value) => total + value, 0);

export const TOTAL_FRAMES = SUM - (SCENE_ORDER.length - 1) * TRANSITION_FRAMES;
