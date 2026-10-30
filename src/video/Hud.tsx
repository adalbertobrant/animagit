import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ThemeSpec } from "./theme";

const Corner: React.FC<{
  color: string;
  size?: number;
  thickness?: number;
  style: React.CSSProperties;
}> = ({ color, size = 42, thickness = 2, style }) => (
  <div style={{ position: "absolute", width: size, height: size, ...style }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: size,
        height: thickness,
        background: color,
        boxShadow: `0 0 10px ${color}`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: thickness,
        height: size,
        background: color,
        boxShadow: `0 0 10px ${color}`,
      }}
    />
  </div>
);

export const Hud: React.FC<{
  theme: ThemeSpec;
  login: string;
  year: number;
  score: number;
}> = ({ theme, login, year, score }) => {
  const frame = useCurrentFrame();
  const blink = frame % 40 < 20;
  const isMetroid = theme.id === "metroid";
  const isPitfall = theme.id === "pitfall";
  const accent = theme.colors.accent;
  const ink = theme.colors.dim;
  const hudColor = isMetroid ? "rgba(53,240,192,0.55)" : isPitfall ? "rgba(255,210,63,0.5)" : "rgba(94,234,255,0.42)";

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 40 }}>
      <Corner color={hudColor} thickness={isMetroid || isPitfall ? 3 : 2} style={{ left: 28, top: 24 }} />
      <Corner color={hudColor} thickness={isMetroid || isPitfall ? 3 : 2} style={{ right: 28, top: 24, transform: "rotate(90deg)" }} />
      <Corner color={hudColor} thickness={isMetroid || isPitfall ? 3 : 2} style={{ right: 28, bottom: 24, transform: "rotate(180deg)" }} />
      <Corner color={hudColor} thickness={isMetroid || isPitfall ? 3 : 2} style={{ left: 28, bottom: 24, transform: "rotate(270deg)" }} />

      <div
        style={{
          position: "absolute",
          left: 54,
          top: 40,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: theme.fonts.body,
          fontSize: 22,
          letterSpacing: "0.18em",
          color: ink,
        }}
      >
        <span style={{ color: theme.colors.danger, opacity: blink ? 1 : 0.15 }}>●</span>
        REC
        <span style={{ color: theme.colors.panelBorder }}>/</span>
        <span style={{ color: accent }}>{theme.universe}</span>
      </div>

      <div
        style={{
          position: "absolute",
          right: 54,
          top: 40,
          fontFamily: theme.fonts.body,
          fontSize: 22,
          letterSpacing: "0.18em",
          color: ink,
          textAlign: "right",
        }}
      >
        {year} <span style={{ color: theme.colors.panelBorder }}>//</span>{" "}
        <span style={{ color: accent }}>LOCAL RENDER</span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 54,
          bottom: 36,
          fontFamily: theme.fonts.body,
          fontSize: 22,
          letterSpacing: "0.16em",
          color: ink,
        }}
      >
        <span style={{ color: accent }}>@</span>
        {login.toUpperCase()}
      </div>

      <div
        style={{
          position: "absolute",
          right: 54,
          bottom: 36,
          fontFamily: theme.fonts.body,
          fontSize: 22,
          letterSpacing: "0.16em",
          color: ink,
          textAlign: "right",
        }}
      >
        ANIMA GITHUB <span style={{ color: accent }}>{year}</span>
      </div>

      {isMetroid ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 30,
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: theme.fonts.display,
            fontSize: 10,
            color: accent,
          }}
        >
          <span style={{ letterSpacing: "0.1em" }}>ENERGIA</span>
          {Array.from({ length: 14 }, (_, index) => {
            const lit = index < 11 || frame % 60 < 30;
            return (
              <span
                key={index}
                style={{
                  width: 14,
                  height: 10,
                  background: lit ? accent : "rgba(53,240,192,0.12)",
                  boxShadow: lit ? `0 0 8px ${theme.colors.glow}` : undefined,
                }}
              />
            );
          })}
        </div>
      ) : null}

      {isPitfall ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 28,
            transform: "translateX(-50%)",
            fontFamily: theme.fonts.display,
            fontSize: 13,
            letterSpacing: "0.08em",
            color: accent,
            textShadow: "2px 2px 0 #2b1c0b",
          }}
        >
          SCORE {String(Math.max(0, Math.round(score))).padStart(5, "0")}
        </div>
      ) : null}

      {theme.id === "space" ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 38,
            transform: "translateX(-50%)",
            fontFamily: theme.fonts.body,
            fontSize: 20,
            letterSpacing: "0.22em",
            color: "rgba(143,166,200,0.65)",
          }}
        >
          LAT 23.55 // LON 46.63 // SETOR {String(year).slice(-2)}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const ScreenEffects: React.FC<{ theme: ThemeSpec }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const isMetroid = theme.id === "metroid";
  const isPitfall = theme.id === "pitfall";

  return (
    <>
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          zIndex: 45,
          opacity: theme.scanlineOpacity * (0.92 + Math.sin(frame * 0.3) * 0.04),
          backgroundImage: isPitfall
            ? `repeating-linear-gradient(0deg, ${theme.colors.scanline} 0 4px, transparent 4px 8px)`
            : `repeating-linear-gradient(0deg, ${theme.colors.scanline} 0 1px, transparent 1px ${isMetroid ? 4 : 5}px)`,
          mixBlendMode: "multiply",
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          zIndex: 46,
          background:
            "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.36) 100%)",
        }}
      />
      {isMetroid ? (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            zIndex: 47,
            background:
              "linear-gradient(180deg, rgba(53,240,192,0.03), transparent 18%, transparent 82%, rgba(192,77,240,0.05))",
          }}
        />
      ) : null}
      {isPitfall ? (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            zIndex: 47,
            boxShadow: "inset 0 0 120px rgba(0,0,0,0.55)",
          }}
        />
      ) : null}
    </>
  );
};
