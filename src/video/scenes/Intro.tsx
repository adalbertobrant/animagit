import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { formatNumber } from "../../shared/types";
import { useEnter } from "../lib/anim";
import { Badge, Kicker, SceneShell, SplitText } from "../ui";
import type { SceneProps } from "./types";

export const Intro: React.FC<SceneProps> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const kicker = useEnter(4);
  const handle = useEnter(50);
  const foot = useEnter(70);
  const artEnter = useEnter(24);
  const yearOpacity = useEnter(8, 60);
  const titleSize = theme.id === "space" ? 108 : 76;

  return (
    <SceneShell>
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 40,
          fontFamily: theme.fonts.display,
          fontSize: theme.id === "space" ? 360 : 250,
          lineHeight: 0.8,
          color: "transparent",
          WebkitTextStroke: `2px ${theme.colors.accent}`,
          opacity: 0.08 * yearOpacity,
          letterSpacing: "-0.04em",
          pointerEvents: "none",
        }}
      >
        {stats.year}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: kicker }}>
        <Badge theme={theme} color={theme.colors.accent}>
          {stats.year}
        </Badge>
        <Badge theme={theme} color={theme.colors.panelBorder}>
          {theme.name}
        </Badge>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 600px",
          alignItems: "center",
          gap: 40,
          marginTop: 20,
        }}
      >
        <div>
          <div
            style={{
              opacity: kicker,
              transform: `translateY(${(1 - kicker) * 16}px)`,
              marginBottom: 26,
            }}
          >
            <Kicker theme={theme} color={theme.colors.accent}>
              UM FILME GERADO NA SUA MÁQUINA
            </Kicker>
          </div>

          <SplitText text="SEU ANO" theme={theme} size={titleSize} delay={8} />
          <SplitText
            text="EM CÓDIGO"
            theme={theme}
            size={titleSize}
            delay={17}
            color={theme.colors.accent}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              marginTop: 38,
              opacity: handle,
              transform: `translateY(${(1 - handle) * 20}px)`,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: theme.id === "space" ? "50%" : 2,
                border: `3px solid ${theme.colors.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: theme.fonts.display,
                fontSize: theme.id === "space" ? 22 : 18,
                color: theme.colors.accent,
                background: "rgba(0,0,0,0.28)",
                boxShadow: `0 0 26px ${theme.colors.glow}`,
              }}
            >
              {stats.login.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  fontFamily: theme.fonts.display,
                  fontSize: theme.id === "space" ? 40 : 28,
                  color: theme.colors.fg,
                }}
              >
                @{stats.login}
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: 30,
                  color: theme.colors.dim,
                  marginTop: 4,
                }}
              >
                {stats.name}
              </div>
            </div>
          </div>

          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 31,
              color: theme.colors.dim,
              marginTop: 22,
              opacity: handle,
              maxWidth: 760,
              lineHeight: 1.25,
            }}
          >
            {theme.tagline}. Tudo o que você fez em {stats.year}, transformado em uma
            animação de {theme.id === "space" ? "ficção científica" : theme.id === "metroid" ? "exploração espacial 16-bit" : "aventura 8-bit"}.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: artEnter,
            transform: `scale(${0.86 + artEnter * 0.14})`,
          }}
        >
          <theme.IntroArt login={stats.login} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          opacity: foot,
          transform: `translateY(${(1 - foot) * 14}px)`,
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          <Badge theme={theme}>{formatNumber(stats.contributions.total)} contribuições</Badge>
          <Badge theme={theme}>{formatNumber(stats.contributions.commits)} commits</Badge>
          <Badge theme={theme}>
            {formatNumber(stats.contributions.repositories)} repositórios
          </Badge>
        </div>
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: 24,
            color: theme.colors.dim,
            letterSpacing: "0.1em",
          }}
        >
          {frame % 60 < 30 ? "CARREGANDO MEMÓRIA…" : "MEMÓRIA CARREGADA"}
        </div>
      </div>
    </SceneShell>
  );
};

export const IntroFallback: React.FC = () => <AbsoluteFill />;
