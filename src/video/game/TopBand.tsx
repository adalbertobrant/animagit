/**
 * TopBand.tsx — faixa narrativa superior (y = 0..260).
 * Coluna esquerda: label/kicker, manchete, detalhe.
 * Coluna direita: score, fase, barra de progresso do ano.
 */

import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { ThemeSpec } from "../theme";
import type { Beat } from "../narrative";
import type { GameTimeline } from "./timeline";

const BAND_HEIGHT = 260;
const PAD_X = 48;
const PAD_Y = 22;
const FADE_FRAMES = 8; // frames para fade do texto ao trocar de beat

type Props = {
  theme: ThemeSpec;
  beat: Beat;
  beatStartFrame: number;
  timeline: GameTimeline;
  scoreTotal: number;
  scoreBonus: number;
  currentFrame: number;
  phaseNumber: number; // 1..12, 0 = intro, 13 = outro
  totalPhases: number;
  energyPct?: number; // 0..1, Metroid
  treasures?: number; // Pitfall
};

const accentColor = (accent: Beat["accent"], theme: ThemeSpec): string => {
  if (accent === "success") return theme.colors.success;
  if (accent === "warning") return theme.colors.danger;
  return theme.colors.fg;
};

export const TopBand: React.FC<Props> = ({
  theme,
  beat,
  beatStartFrame,
  timeline,
  scoreTotal,
  scoreBonus,
  currentFrame,
  phaseNumber,
  totalPhases,
  energyPct = 1,
  treasures = 0,
}) => {
  const frame = useCurrentFrame();

  // Fade-in ao trocar de beat
  const localFrame = frame - beatStartFrame;
  const fadeOpacity = interpolate(localFrame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Barra de progresso do ano (frame global relativo ao run)
  const yearProgress = interpolate(
    currentFrame,
    [timeline.runStart, timeline.runEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const colors = theme.colors;
  const fontDisplay = theme.fonts.display;
  const fontBody = theme.fonts.narrative; // Atkinson Hyperlegible
  const isPitfall = theme.id === "pitfall";
  const isMetroid = theme.id === "metroid";

  const scoreStr = String(scoreTotal).padStart(6, "0");

  const phaseLabel =
    phaseNumber >= 1 && phaseNumber <= 12
      ? `${String(phaseNumber).padStart(2, "0")}/${String(totalPhases).padStart(2, "0")}`
      : phaseNumber === 0
        ? "ABERTURA"
        : "FIM";

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1920,
        height: BAND_HEIGHT,
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        zIndex: 30,
      }}
    >
      {/* Background semitransparente do tema */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isMetroid
            ? "linear-gradient(180deg, rgba(7,3,18,0.94) 0%, rgba(7,3,18,0.82) 100%)"
            : isPitfall
              ? "linear-gradient(180deg, rgba(8,10,5,0.95) 0%, rgba(8,10,5,0.8) 100%)"
              : "linear-gradient(180deg, rgba(3,2,15,0.95) 0%, rgba(3,2,15,0.78) 100%)",
          borderBottom: `2px solid ${colors.panelBorder}`,
          boxShadow: `0 4px 32px rgba(0,0,0,0.6)`,
        }}
      />

      {/* LEFT column — narrativa */}
      <div
        style={{
          position: "relative",
          flex: 1,
          padding: `${PAD_Y}px ${PAD_X}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 8,
          opacity: fadeOpacity,
        }}
      >
        {/* Kicker */}
        <div
          style={{
            fontFamily: fontDisplay,
            fontSize: 22,
            letterSpacing: "0.08em",
            color: colors.accent,
            textTransform: "uppercase" as const,
            lineHeight: 1.2,
          }}
        >
          {beat.label}
        </div>

        {/* Manchete */}
        <div
          style={{
            fontFamily: fontBody,
            fontSize: 44,
            fontWeight: 700,
            color: accentColor(beat.accent, theme),
            lineHeight: 1.15,
            maxWidth: 900,
            textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          }}
        >
          {beat.headline}
        </div>

        {/* Detalhe */}
        <div
          style={{
            fontFamily: fontBody,
            fontSize: 28,
            color: colors.dim,
            lineHeight: 1.3,
            maxWidth: 860,
          }}
        >
          {beat.detail}
        </div>
      </div>

      {/* RIGHT column — score e indicadores */}
      <div
        style={{
          position: "relative",
          width: 380,
          padding: `${PAD_Y}px ${PAD_X}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {/* Score */}
        <div
          style={{
            fontFamily: fontDisplay,
            fontSize: 42,
            letterSpacing: "0.06em",
            color: colors.accent,
            textShadow: `0 0 18px ${colors.glow}`,
            lineHeight: 1,
          }}
        >
          {scoreStr}
        </div>

        {/* Bônus */}
        {scoreBonus > 0 && (
          <div
            style={{
              fontFamily: fontDisplay,
              fontSize: 20,
              color: colors.accent2,
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            +{scoreBonus} BÔNUS
          </div>
        )}

        {/* Fase */}
        <div
          style={{
            fontFamily: fontDisplay,
            fontSize: 22,
            color: colors.dim,
            letterSpacing: "0.06em",
          }}
        >
          FASE {phaseLabel}
        </div>

        {/* Barra de progresso do ano */}
        <div
          style={{
            width: 220,
            height: 8,
            background: colors.cellEmpty,
            borderRadius: 4,
            overflow: "hidden",
            border: `1px solid ${colors.panelBorder}`,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${yearProgress * 100}%`,
              background: colors.accent,
              boxShadow: `0 0 10px ${colors.glow}`,
              borderRadius: 4,
            }}
          />
        </div>

        {/* Metroid: barra de energia */}
        {isMetroid && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontFamily: fontDisplay,
                fontSize: 14,
                color: colors.accent,
                letterSpacing: "0.06em",
              }}
            >
              E
            </span>
            <div
              style={{
                display: "flex",
                gap: 3,
              }}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 10,
                    background:
                      i < Math.ceil(energyPct * 10) ? colors.accent : colors.cellEmpty,
                    boxShadow:
                      i < Math.ceil(energyPct * 10)
                        ? `0 0 6px ${colors.glow}`
                        : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pitfall: tesouros */}
        {isPitfall && (
          <div
            style={{
              fontFamily: fontDisplay,
              fontSize: 18,
              color: colors.accent,
              letterSpacing: "0.06em",
            }}
          >
            TESOUROS: {String(treasures).padStart(3, "0")}
          </div>
        )}
      </div>
    </div>
  );
};
