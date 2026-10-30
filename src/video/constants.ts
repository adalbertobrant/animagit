export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

/** Faixa narrativa fixa no topo do vídeo. */
export const TOP_BAND_HEIGHT = 260;
/** Início do palco do jogo, logo abaixo da faixa narrativa. */
export const GAME_TOP = TOP_BAND_HEIGHT;
/** Fim do palco, antes do HUD inferior. */
export const GAME_BOTTOM = 1036;
export const GAME_HEIGHT = GAME_BOTTOM - GAME_TOP;
export const HUD_HEIGHT = VIDEO_HEIGHT - GAME_BOTTOM;

/** Abertura curta e placar final. O restante é a corrida mensal. */
export const INTRO_FRAMES = 120;
export const OUTRO_FRAMES = 246; // +60 frames (2 s extra para a mensagem final)
export const RUN_FRAMES = 1596 - INTRO_FRAMES - 186; // RUN_FRAMES mantido; TOTAL cresce

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

// TOTAL_FRAMES = INTRO + RUN + OUTRO (novo cálculo direto, não mais via SCENE_DURATIONS)
export const TOTAL_FRAMES = INTRO_FRAMES + RUN_FRAMES + OUTRO_FRAMES;
