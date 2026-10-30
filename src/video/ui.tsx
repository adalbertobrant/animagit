import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ThemeSpec } from "./theme";
import { useEnter } from "./lib/anim";

export const SceneShell: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <AbsoluteFill
    style={{
      padding: "78px 108px 96px",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const SceneHeader: React.FC<{
  theme: ThemeSpec;
  index: number;
  year: number;
  title: string;
  right?: string;
}> = ({ theme, index, year, title, right }) => {
  const enter = useEnter(0);
  const titleSize = theme.id === "space" ? 66 : 46;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 40,
        marginBottom: 46,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 26}px)`,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: 27,
            letterSpacing: "0.24em",
            color: theme.colors.accent,
            marginBottom: 14,
            textShadow: theme.id === "space" ? `0 0 18px ${theme.colors.glow}` : undefined,
          }}
        >
          {theme.scenePrefix} {String(index).padStart(2, "0")} // {year}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: titleSize,
            lineHeight: 1.12,
            color: theme.colors.fg,
            letterSpacing: theme.displayTracking,
            textShadow:
              theme.id === "metroid"
                ? `4px 4px 0 ${theme.colors.bgDeep}, 0 0 26px rgba(192,77,240,0.35)`
                : theme.id === "pitfall"
                  ? `4px 4px 0 #2b1c0b`
                  : `0 0 34px rgba(94,234,255,0.35)`,
          }}
        >
          {title}
        </div>
      </div>
      {right ? (
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: 26,
            letterSpacing: "0.12em",
            color: theme.colors.dim,
            textAlign: "right",
            paddingBottom: 8,
            maxWidth: 540,
          }}
        >
          {right}
        </div>
      ) : null}
    </div>
  );
};

export const Panel: React.FC<{
  theme: ThemeSpec;
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
}> = ({ theme, children, style, delay = 0 }) => {
  const enter = useEnter(delay);

  return (
    <div
      style={{
        position: "relative",
        background: theme.colors.panel,
        border: `2px solid ${theme.colors.panelBorder}`,
        borderRadius: theme.id === "space" ? 18 : 2,
        boxShadow:
          theme.id === "space"
            ? `0 0 40px rgba(94,234,255,0.08), inset 0 0 60px rgba(30,60,140,0.12)`
            : theme.id === "metroid"
              ? `inset 0 0 40px rgba(192,77,240,0.1), 0 0 26px rgba(0,0,0,0.4)`
              : `4px 4px 0 rgba(0,0,0,0.55)`,
        backdropFilter: theme.id === "space" ? "blur(6px)" : undefined,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 22}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const BigNumber: React.FC<{
  theme: ThemeSpec;
  value: string;
  size?: number;
  color?: string;
}> = ({ theme, value, size, color }) => {
  const digits = value.replace(/[^\d]/g, "").length;
  const automatic =
    theme.id === "space"
      ? digits <= 3
        ? 186
        : digits === 4
          ? 154
          : 118
      : digits <= 3
        ? 116
        : digits === 4
          ? 92
          : 70;

  return (
    <div
      style={{
        fontFamily: theme.fonts.display,
        fontSize: size ?? automatic,
        lineHeight: 0.95,
        color: color ?? theme.colors.fg,
        letterSpacing: theme.id === "space" ? "-0.02em" : "0",
        textShadow:
          theme.id === "space"
            ? `0 0 44px ${theme.colors.glow}`
            : theme.id === "metroid"
              ? `5px 5px 0 ${theme.colors.bgDeep}, 0 0 30px rgba(53,240,192,0.3)`
              : `5px 5px 0 #2b1c0b`,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </div>
  );
};

export const Kicker: React.FC<{
  theme: ThemeSpec;
  children: React.ReactNode;
  color?: string;
}> = ({ theme, children, color }) => (
  <div
    style={{
      fontFamily: theme.fonts.body,
      fontSize: 28,
      lineHeight: 1,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: color ?? theme.colors.dim,
    }}
  >
    {children}
  </div>
);

export const Stat: React.FC<{
  theme: ThemeSpec;
  label: string;
  value: string;
  accent?: boolean;
  style?: React.CSSProperties;
}> = ({ theme, label, value, accent, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
    <div
      style={{
        fontFamily: theme.fonts.body,
        fontSize: 25,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: theme.colors.dim,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: theme.fonts.display,
        fontSize: theme.id === "space" ? 38 : 26,
        color: accent ? theme.colors.accent : theme.colors.fg,
        lineHeight: 1.15,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </div>
  </div>
);

export const Badge: React.FC<{
  theme: ThemeSpec;
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}> = ({ theme, children, color, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 18px",
      border: `2px solid ${color ?? theme.colors.panelBorder}`,
      borderRadius: theme.id === "space" ? 999 : 2,
      background: theme.id === "space" ? "rgba(8,16,44,0.55)" : "rgba(0,0,0,0.25)",
      fontFamily: theme.fonts.body,
      fontSize: 26,
      letterSpacing: "0.08em",
      color: color ?? theme.colors.accent,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

export const SplitText: React.FC<{
  text: string;
  theme: ThemeSpec;
  size: number;
  delay?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text, theme, size, delay = 0, color, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        fontFamily: theme.fonts.display,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: theme.displayTracking,
        color: color ?? theme.colors.fg,
        textShadow:
          theme.id === "metroid"
            ? `4px 4px 0 ${theme.colors.bgDeep}`
            : theme.id === "pitfall"
              ? "4px 4px 0 #2b1c0b"
              : `0 0 30px rgba(94,234,255,0.3)`,
        ...style,
      }}
    >
      {text.split("").map((char, index) => {
        const enter = spring({
          frame: frame - (delay + index * 1.5),
          fps,
          config: { damping: 200, mass: 0.7, stiffness: 110 },
        });
        return (
          <span
            key={`${char}-${index}`}
            style={{
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : undefined,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 70}px) rotate(${(1 - enter) * -6}deg)`,
              animation: "none",
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
