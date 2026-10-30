/**
 * Fireworks.tsx — fogos de artifício para o outro.
 * Determinístico: usa seed + frame para tudo, sem Math.random.
 * Exporta também <OutroMessage> com a mensagem final.
 */

import React from "react";
import { interpolate } from "remotion";

// ─────────────────────────────────────────────
// Mini PRNG local (mesmo algoritmo de prng.ts, sem importar)
// ─────────────────────────────────────────────
const pcg = (seed: number): number => {
  let s = (seed + 0x6d2b79f5) >>> 0;
  s = Math.imul(s ^ (s >>> 15), s | 1) >>> 0;
  s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
  return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
};

// ─────────────────────────────────────────────
// Cores de fogos por tema
// ─────────────────────────────────────────────
const FIREWORK_PALETTES: Record<string, string[]> = {
  space: ["#5eeaff", "#ff5cd6", "#ffd166", "#ffffff", "#a8f4ff"],
  metroid: ["#35f0c0", "#c04df0", "#ff5c6c", "#ffffff", "#6bffb8"],
  pitfall: ["#ffd23f", "#e8590c", "#7bc950", "#fff3b0", "#ffffff"],
};

// ─────────────────────────────────────────────
// Um único foguete + explosão
// ─────────────────────────────────────────────
type FireworkDef = {
  launchX: number;       // x de lançamento (0..1 normalizado)
  launchDelay: number;   // frames após outroStart para lançar
  peakY: number;         // y de pico (0..1 normalizado da área de tela)
  colorIdx: number;      // índice na paleta
  particleCount: number; // 6..14
  spreadRadius: number;  // px máximo de spread
};

// Pré-computa 18 fogos com seed fixa
const buildFireworks = (seed: number): FireworkDef[] =>
  Array.from({ length: 18 }, (_, i) => ({
    launchX: 0.06 + pcg(seed + i * 7 + 1) * 0.88,
    launchDelay: Math.floor(pcg(seed + i * 7 + 2) * 120),
    peakY: 0.05 + pcg(seed + i * 7 + 3) * 0.52,
    colorIdx: Math.floor(pcg(seed + i * 7 + 4) * 5),
    particleCount: 6 + Math.floor(pcg(seed + i * 7 + 5) * 9),
    spreadRadius: 90 + Math.floor(pcg(seed + i * 7 + 6) * 110),
  }));

// ─────────────────────────────────────────────
// Componente de explosão de um fogo
// ─────────────────────────────────────────────
const FireworkBurst: React.FC<{
  def: FireworkDef;
  localFrame: number; // frames desde o launchDelay deste fogo
  color: string;
  stageW: number;
  stageH: number;
  seed: number;
}> = ({ def, localFrame, color, stageW, stageH, seed }) => {
  // Fase de subida: 0..20 frames
  const RISE = 22;
  const BURST_DURATION = 55;
  const TOTAL = RISE + BURST_DURATION;

  if (localFrame < 0 || localFrame > TOTAL) return null;

  const cx = def.launchX * stageW;
  const peakYpx = def.peakY * stageH;

  if (localFrame < RISE) {
    // Foguete subindo — trilha pontilhada
    const progress = localFrame / RISE;
    const startY = stageH + 20;
    const y = startY + (peakYpx - startY) * progress;
    return (
      <div
        style={{
          position: "absolute",
          left: cx - 3,
          top: y,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}`,
          opacity: 0.9,
        }}
      />
    );
  }

  // Explosão
  const burstAge = localFrame - RISE;
  const burstProgress = burstAge / BURST_DURATION;
  const opacity = burstAge < 8
    ? 1
    : interpolate(burstAge, [8, BURST_DURATION], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  return (
    <>
      {/* Centro brilhante */}
      <div
        style={{
          position: "absolute",
          left: cx - 10,
          top: peakYpx - 10,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#ffffff",
          opacity: burstAge < 6 ? (1 - burstAge / 6) * 0.9 : 0,
          boxShadow: `0 0 30px ${color}`,
        }}
      />
      {/* Partículas */}
      {Array.from({ length: def.particleCount }, (_, pi) => {
        const angle = (pi / def.particleCount) * Math.PI * 2 + pcg(seed + pi) * 0.4;
        const speed = 0.6 + pcg(seed + pi + 100) * 0.4;
        const spread = def.spreadRadius * speed * burstProgress;
        // Gravidade: as partículas caem progressivamente
        const gravity = burstProgress * burstProgress * def.spreadRadius * 0.35;
        const px = cx + Math.cos(angle) * spread;
        const py = peakYpx + Math.sin(angle) * spread + gravity;
        const size = 5 + Math.floor(pcg(seed + pi + 200) * 5);
        const isSquare = pcg(seed + pi + 300) > 0.6;

        return (
          <div
            key={pi}
            style={{
              position: "absolute",
              left: px - size / 2,
              top: py - size / 2,
              width: size,
              height: size,
              borderRadius: isSquare ? 1 : "50%",
              background: pi % 3 === 0 ? "#ffffff" : color,
              opacity: opacity * (0.7 + pcg(seed + pi + 400) * 0.3),
              boxShadow: `0 0 ${size * 2}px ${color}`,
            }}
          />
        );
      })}
      {/* Cauda de brilho */}
      {Array.from({ length: 6 }, (_, ti) => {
        const tailAge = burstAge - ti * 4;
        if (tailAge < 0) return null;
        const tailProgress = Math.min(tailAge / BURST_DURATION, 1);
        const angle = Math.PI * 0.5 + ti * 1.1;
        const spread = def.spreadRadius * 0.4 * tailProgress;
        const tx = cx + Math.cos(angle) * spread;
        const ty = peakYpx + Math.sin(angle) * spread + tailProgress * tailProgress * 40;
        return (
          <div
            key={`tail-${ti}`}
            style={{
              position: "absolute",
              left: tx - 3,
              top: ty - 3,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: color,
              opacity: (1 - tailProgress) * 0.5,
            }}
          />
        );
      })}
    </>
  );
};

// ─────────────────────────────────────────────
// Componente principal dos fogos
// ─────────────────────────────────────────────
export const Fireworks: React.FC<{
  outroFrame: number;   // frames desde o início do outro (0..OUTRO_FRAMES-1)
  themeId: string;
  seed: number;
  stageW?: number;
  stageH?: number;
}> = ({ outroFrame, themeId, seed, stageW = 1920, stageH = 776 }) => {
  const palette = FIREWORK_PALETTES[themeId] ?? FIREWORK_PALETTES.space!;
  const fireworks = buildFireworks(seed);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: stageW,
        height: stageH,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 15,
      }}
    >
      {fireworks.map((def, i) => {
        const localFrame = outroFrame - def.launchDelay;
        if (localFrame < 0) return null;
        const color = palette[def.colorIdx % palette.length]!;
        return (
          <FireworkBurst
            key={i}
            def={def}
            localFrame={localFrame}
            color={color}
            stageW={stageW}
            stageH={stageH}
            seed={seed + i * 31}
          />
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────
// Mensagem final — type-on + parabéns
// ─────────────────────────────────────────────
const FINAL_MESSAGE = "keep the open source always alive at your heart, give first.";

export const OutroMessage: React.FC<{
  outroFrame: number;
  themeId: string;
  login: string;
  totalContribs: number;
  year: number;
  accentColor: string;
  glowColor: string;
  fontDisplay: string;
  fontNarrative: string;
}> = ({
  outroFrame,
  themeId,
  login,
  totalContribs,
  year,
  accentColor,
  glowColor,
  fontDisplay,
  fontNarrative,
}) => {
  // Parabéns aparece depois de 20 frames
  const congratsOpacity = interpolate(outroFrame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Score final aparece depois de 50 frames
  const scoreOpacity = interpolate(outroFrame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Mensagem open source: type-on a partir do frame 80
  const TYPE_START = 80;
  const TYPE_SPEED = 2.2; // frames por caractere
  const charsVisible = Math.floor(Math.max(0, outroFrame - TYPE_START) / TYPE_SPEED);
  const visibleText = FINAL_MESSAGE.slice(0, charsVisible);
  const cursorVisible = charsVisible < FINAL_MESSAGE.length && outroFrame % 4 < 3;

  // Fade-in do bloco de mensagem
  const messageOpacity = interpolate(outroFrame, [TYPE_START - 4, TYPE_START + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const emojiLabel =
    themeId === "space" ? "🚀" : themeId === "metroid" ? "👾" : "🪙";

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        zIndex: 20,
        pointerEvents: "none",
        padding: "0 80px",
      }}
    >
      {/* Parabéns */}
      <div
        style={{
          opacity: congratsOpacity,
          fontFamily: fontDisplay,
          fontSize: 48,
          letterSpacing: "0.12em",
          color: accentColor,
          textShadow: `0 0 32px ${glowColor}, 0 0 60px ${glowColor}`,
          textAlign: "center",
          textTransform: "uppercase" as const,
        }}
      >
        {emojiLabel} PARABÉNS, @{login.toUpperCase()}! {emojiLabel}
      </div>

      {/* Score */}
      <div
        style={{
          opacity: scoreOpacity,
          fontFamily: fontDisplay,
          fontSize: 32,
          letterSpacing: "0.08em",
          color: "#ffffff",
          textShadow: `0 2px 8px rgba(0,0,0,0.8)`,
          textAlign: "center",
        }}
      >
        {year} · {String(totalContribs).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} CONTRIBUIÇÕES
      </div>

      {/* Mensagem open source — type-on */}
      <div
        style={{
          opacity: messageOpacity,
          fontFamily: fontNarrative,
          fontSize: 34,
          fontWeight: 600,
          color: "#ffffff",
          textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          textAlign: "center",
          maxWidth: 1200,
          lineHeight: 1.4,
          letterSpacing: "0.01em",
        }}
      >
        {visibleText}
        {cursorVisible && (
          <span
            style={{
              display: "inline-block",
              width: 3,
              height: "1em",
              background: accentColor,
              marginLeft: 3,
              verticalAlign: "text-bottom",
              boxShadow: `0 0 8px ${glowColor}`,
            }}
          />
        )}
      </div>
    </div>
  );
};
