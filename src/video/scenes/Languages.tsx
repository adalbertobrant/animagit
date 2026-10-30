import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { LanguageStat } from "../../shared/types";
import { useEnter } from "../lib/anim";
import { Badge, BigNumber, Kicker, Panel, SceneHeader, SceneShell } from "../ui";
import type { SceneProps } from "./types";

const percentText = (value: number): string =>
  `${(value * 100).toFixed(1).replace(".", ",")}%`;

const LanguageRow: React.FC<{
  language: LanguageStat | undefined;
  rank: number;
  maxPercent: number;
  theme: SceneProps["theme"];
  frame: number;
  fps: number;
  delay: number;
}> = ({ language, rank, maxPercent, theme, frame, fps, delay }) => {
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 80 },
  });
  const percent = language?.percent ?? 0;
  const width = maxPercent > 0 ? (percent / maxPercent) * 100 : 0;
  const color = language?.color ?? theme.colors.accent;

  return (
    <div
      style={{
        position: "relative",
        padding: "22px 26px",
        border: `2px solid ${
          rank === 1 ? theme.colors.panelBorder : "rgba(255,255,255,0.06)"
        }`,
        borderRadius: theme.id === "space" ? 14 : 2,
        background: rank === 1 ? "rgba(255,255,255,0.035)" : "transparent",
        opacity: enter,
        transform: `translateX(${(1 - enter) * 34}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
        <div
          style={{
            width: 46,
            height: 46,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${rank === 1 ? theme.colors.accent : theme.colors.panelBorder}`,
            borderRadius: theme.id === "space" ? 10 : 2,
            fontFamily: theme.fonts.display,
            fontSize: theme.id === "space" ? 18 : 14,
            color: rank === 1 ? theme.colors.accent : theme.colors.dim,
            background: "rgba(0,0,0,0.25)",
          }}
        >
          {String(rank).padStart(2, "0")}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: theme.fonts.display,
              fontSize: theme.id === "space" ? 28 : 19,
              color: theme.colors.fg,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
            }}
          >
            {language?.name ?? "—"}
          </div>
        </div>

        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: theme.id === "space" ? 30 : 20,
            color: rank === 1 ? theme.colors.accent : theme.colors.fg,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {percentText(percent)}
        </div>
      </div>

      <div
        style={{
          height: theme.id === "space" ? 18 : 22,
          background: "rgba(0,0,0,0.34)",
          border: `1px solid ${theme.colors.grid}`,
          borderRadius: theme.id === "space" ? 999 : 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${width * enter}%`,
            background: color,
            borderRadius: theme.id === "space" ? 999 : 0,
            boxShadow: rank === 1 ? `0 0 22px ${color}` : undefined,
            opacity: rank === 1 ? 1 : 0.82,
          }}
        />
        {theme.id === "metroid" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 18px, rgba(0,0,0,0.25) 18px 20px)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export const Languages: React.FC<SceneProps> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const left = useEnter(8);
  const languages = stats.languages.slice(0, 3);
  const top = languages[0];
  const maxPercent = top?.percent ?? 1;
  const topNameSize =
    theme.id === "space"
      ? Math.min(74, 900 / Math.max(8, (top?.name.length ?? 8) * 0.62))
      : Math.min(52, 720 / Math.max(8, (top?.name.length ?? 8) * 0.98));

  return (
    <SceneShell>
      <SceneHeader
        theme={theme}
        index={3}
        year={stats.year}
        title="AS SUAS LINGUAGENS"
        right="participação nas linguagens dos repositórios em que você commitou"
      />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 920px",
          gap: 60,
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: left,
            transform: `translateY(${(1 - left) * 26}px)`,
          }}
        >
          <Kicker theme={theme} color={theme.colors.accent}>
            SUA LINGUAGEM PRINCIPAL
          </Kicker>

          <div
            style={{
              fontFamily: theme.fonts.display,
              fontSize: topNameSize,
              lineHeight: 1.12,
              color: top?.color ?? theme.colors.fg,
              marginTop: 16,
              textShadow:
                theme.id === "metroid"
                  ? `4px 4px 0 ${theme.colors.bgDeep}`
                  : theme.id === "pitfall"
                    ? "4px 4px 0 #2b1c0b"
                    : `0 0 34px rgba(94,234,255,0.25)`,
              wordBreak: "break-word",
            }}
          >
            {top?.name ?? "Ainda sem dados"}
          </div>

          <div style={{ marginTop: 22 }}>
            <BigNumber
              theme={theme}
              value={top ? percentText(top.percent) : "0%"}
              color={theme.colors.accent}
            />
          </div>

          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 34,
              lineHeight: 1.3,
              color: theme.colors.dim,
              maxWidth: 620,
              marginTop: 14,
            }}
          >
            do seu código em {stats.year} passou por{" "}
            <span style={{ color: theme.colors.fg }}>{top?.name ?? "nenhuma linguagem"}</span>.
            O resto se divide entre as ferramentas que você escolheu para construir.
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Badge theme={theme}>{stats.languages.length} linguagens detectadas</Badge>
            <Badge theme={theme} color={theme.colors.accent2}>
              {stats.contributions.repositories} repositórios
            </Badge>
          </div>
        </div>

        <Panel theme={theme} delay={16} style={{ padding: "32px 36px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 28,
                letterSpacing: "0.18em",
                color: theme.colors.fg,
              }}
            >
              TOP 3 DO ANO
            </div>
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 24,
                letterSpacing: "0.1em",
                color: theme.colors.dim,
              }}
            >
              POR PARTICIPAÇÃO
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[0, 1, 2].map((index) => (
              <LanguageRow
                key={index}
                language={languages[index]}
                rank={index + 1}
                maxPercent={maxPercent}
                theme={theme}
                frame={frame}
                fps={fps}
                delay={20 + index * 7}
              />
            ))}
          </div>

          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 23,
              color: theme.colors.dim,
              marginTop: 18,
              borderTop: `1px solid ${theme.colors.grid}`,
              paddingTop: 16,
              lineHeight: 1.3,
            }}
          >
            Cálculo ponderado por commits e tamanho de cada linguagem no repositório.
          </div>
        </Panel>
      </div>
    </SceneShell>
  );
};
