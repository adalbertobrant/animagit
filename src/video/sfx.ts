/**
 * sfx.ts — mapa de arquivos de efeito sonoro opcionais.
 * Se o arquivo não existir (geração não foi executada), o <Audio> não dispara
 * porque o volume será 0 via guard. Importado pelo GameStage.
 *
 * Os WAVs ficam em public/audio/sfx/ e são gerados por scripts/generate-audio.mjs.
 */

export type SfxKey = "shoot" | "hit" | "coin" | "jump" | "levelup" | "bonus" | "finish";

export const SFX_FILES: Record<SfxKey, string> = {
  shoot: "audio/sfx/shoot.wav",
  hit: "audio/sfx/hit.wav",
  coin: "audio/sfx/coin.wav",
  jump: "audio/sfx/jump.wav",
  levelup: "audio/sfx/levelup.wav",
  bonus: "audio/sfx/bonus.wav",
  finish: "audio/sfx/finish.wav",
};

/** Volume padrão por efeito (0..1). Baixo para não competir com a trilha. */
export const SFX_VOLUME: Record<SfxKey, number> = {
  shoot: 0.22,
  hit: 0.28,
  coin: 0.30,
  jump: 0.25,
  levelup: 0.32,
  bonus: 0.35,
  finish: 0.32,
};
