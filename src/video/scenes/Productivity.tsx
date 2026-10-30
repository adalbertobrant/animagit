import React from "react";
import { useCurrentFrame } from "remotion";
import type { GitHubStats } from "../../shared/types";
import { WEEKDAY_LABELS_PT, formatHour, formatNumber } from "../../shared/types";
import { useEnter } from "../lib/anim";
import { Badge, BigNumber, Kicker, Panel, SceneHeader, SceneShell } from "../ui";
import type { SceneProps } from "./types";

const HourBars: React.FC<{
  stats: GitHubStats;
  theme: SceneProps["theme"];
  frame: number;
}> = ({ stats, theme, frame }) => {
  const max = Math.max(1, ...stats.productivity.byHour);
  const topHour = stats.productivity.topHour;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 360 }}>
      {stats.productivity.byHour.map((count, hour) => {
        const height = 16 + (count / max) * 290;
        const enter = Math.min(
          1,
          Math.max(0, (frame - 18 - hour * 1.3) / 12),
        );
        const isTop = hour === topHour;
        const color = isTop ? theme.colors.accent : theme.colors.accent2;

        return (
          <div
            key={hour}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
              gap: 10,
              position: "relative",
            }}
          >
            {isTop ? (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  fontFamily: theme.fonts.display,
                  fontSize: theme.id === "space" ? 18 : 12,
                  color: theme.colors.accent,
                  whiteSpace: "nowrap",
                  textShadow: `0 0 16px ${theme.colors.glow}`,
                }}
              >
                {formatHour(hour)}
              </div>
            ) : null}
            <div
              style={{
                width: "100%",
                maxWidth: 34,
                height: height * enter,
                background: color,
                opacity: isTop ? 1 : 0.62,
                borderRadius: theme.id === "space" ? 4 : 1,
                boxShadow: isTop ? `0 0 22px ${theme.colors.glow}` : undefined,
                border: `1px solid ${
                  isTop ? theme.colors.accent : "rgba(255,255,255,0.08)"
                }`,
                transformOrigin: "bottom",
              }}
            />
            <div
              style={{
                height: 22,
                fontFamily: theme.fonts.body,
                fontSize: 20,
                color: isTop ? theme.colors.accent : theme.colors.dim,
                opacity: hour % 3 === 0 ? 1 : 0,
              }}
            >
              {String(hour).padStart(2, "0")}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Productivity: React.FC<SceneProps> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const left = useEnter(8);
  const right = useEnter(18);
  const weekday = WEEKDAY_LABELS_PT[stats.productivity.topWeekday] ?? "—";
  const topHour = stats.productivity.topHour;
  const peakCount = Math.max(1, ...stats.productivity.byHour);

  return (
    <SceneShell>
      <SceneHeader
        theme={theme}
        index={4}
        year={stats.year}
        title="A HORA DO CÓDIGO"
        right="quando os seus commits aconteceram ao longo do dia"
      />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 520px",
          gap: 48,
          alignItems: "center",
        }}
      >
        <Panel theme={theme} delay={10} style={{ padding: "34px 38px 26px", opacity: left }}>
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
              COMMITS POR HORA
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Badge theme={theme} color={theme.colors.accent2}>
                {formatNumber(stats.contributions.commits)} commits
              </Badge>
            </div>
          </div>

          <HourBars stats={stats} theme={theme} frame={frame} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: theme.fonts.body,
              fontSize: 22,
              color: theme.colors.dim,
              borderTop: `1px solid ${theme.colors.grid}`,
              paddingTop: 14,
              marginTop: 8,
              letterSpacing: "0.08em",
            }}
          >
            <span>00h</span>
            <span>06h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </Panel>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: right,
            transform: `translateX(${(1 - right) * 30}px)`,
          }}
        >
          <Panel theme={theme} delay={22} style={{ padding: "30px 34px" }}>
            <Kicker theme={theme} color={theme.colors.accent}>
              DIA MAIS PRODUTIVO
            </Kicker>
            <div
              style={{
                fontFamily: theme.fonts.display,
                fontSize: theme.id === "space" ? 54 : 34,
                color: theme.colors.fg,
                marginTop: 12,
                lineHeight: 1.15,
                textShadow:
                  theme.id === "metroid"
                    ? `3px 3px 0 ${theme.colors.bgDeep}`
                    : theme.id === "pitfall"
                      ? "3px 3px 0 #2b1c0b"
                      : undefined,
              }}
            >
              {weekday}
            </div>
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 28,
                color: theme.colors.dim,
                marginTop: 8,
              }}
            >
              {formatNumber(stats.productivity.byWeekday[stats.productivity.topWeekday] ?? 0)}{" "}
              commits na amostra
            </div>
          </Panel>

          <Panel theme={theme} delay={28} style={{ padding: "30px 34px" }}>
            <Kicker theme={theme} color={theme.colors.accent2}>
              HORA DE PICO
            </Kicker>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 6 }}>
              <BigNumber
                theme={theme}
                value={formatHour(topHour)}
                size={theme.id === "space" ? 92 : 58}
                color={theme.colors.accent}
              />
              <div
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: 26,
                  color: theme.colors.dim,
                  paddingBottom: 12,
                }}
              >
                {peakCount} commits
              </div>
            </div>
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 26,
                color: theme.colors.dim,
                lineHeight: 1.3,
              }}
            >
              Foi nesse horário que você mais escreveu código em {stats.year}.
            </div>
          </Panel>
        </div>
      </div>
    </SceneShell>
  );
};
