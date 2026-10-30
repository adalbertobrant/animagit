import React from "react";
import { useCurrentFrame } from "remotion";
import { formatDatePt, formatNumber } from "../../shared/types";
import { PixelArt } from "../art/PixelArt";
import { FLAME } from "../art/sprites";
import { useCountUp, useEnter } from "../lib/anim";
import { Badge, BigNumber, Kicker, Panel, SceneHeader, SceneShell } from "../ui";
import type { SceneProps } from "./types";

export const Streak: React.FC<SceneProps> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const left = useEnter(8);
  const right = useEnter(20);
  const streak = useCountUp(stats.contributions.longestStreak, 14, 40);
  const todayIso = new Date().toISOString().slice(0, 10);
  const pastDays = stats.contributions.calendar.filter((day) => day.date <= todayIso);
  const lastDays = pastDays.slice(-42);
  const flameScale = 13 + Math.sin(frame * 0.18) * 0.4;

  return (
    <SceneShell>
      <SceneHeader
        theme={theme}
        index={2}
        year={stats.year}
        title="O SEU MAIOR COMBO"
        right={`${stats.contributions.activeDays} dias com pelo menos 1 contribuição`}
      />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 820px",
          gap: 54,
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: left,
            transform: `translateX(${(1 - left) * -26}px)`,
          }}
        >
          <Kicker theme={theme} color={theme.colors.accent}>
            DIAS SEGUIDOS
          </Kicker>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: 14 }}>
            <BigNumber
              theme={theme}
              value={formatNumber(streak)}
              color={theme.colors.accent3}
            />
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 48,
                color: theme.colors.fg,
                paddingBottom: 18,
              }}
            >
              dias
            </div>
          </div>

          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 34,
              lineHeight: 1.3,
              color: theme.colors.dim,
              maxWidth: 640,
              marginTop: 12,
            }}
          >
            Essa foi a sua maior sequência de dias com contribuições em {stats.year}. Disciplina
            também é uma forma de código.
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
            <Badge theme={theme} color={theme.colors.accent}>
              sequência atual: {stats.contributions.currentStreak} dias
            </Badge>
            {stats.contributions.bestDay ? (
              <Badge theme={theme} color={theme.colors.accent3}>
                melhor dia: {formatDatePt(stats.contributions.bestDay.date)} ·{" "}
                {stats.contributions.bestDay.count}
              </Badge>
            ) : null}
          </div>
        </div>

        <Panel
          theme={theme}
          delay={20}
          style={{
            padding: "34px 44px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            opacity: right,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
            <div
              style={{
                position: "relative",
                width: 250,
                height: 250,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 16,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,92,43,0.35) 0%, rgba(255,210,63,0.12) 44%, transparent 70%)",
                  filter: "blur(6px)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  transform: `scale(${flameScale / 13})`,
                  filter: "drop-shadow(0 0 26px rgba(255,120,40,0.55))",
                }}
              >
                <PixelArt sprite={FLAME} scale={14} />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <Kicker theme={theme} color={theme.colors.accent3}>
                ÚLTIMOS 42 DIAS
              </Kicker>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(14, 1fr)",
                  gap: 7,
                  marginTop: 16,
                }}
              >
                {lastDays.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count}`}
                    style={{
                      aspectRatio: "1",
                      background:
                        day.count > 0
                          ? day.count > 4
                            ? theme.colors.accent3
                            : theme.colors.accent
                          : theme.colors.cellEmpty,
                      border: `1px solid ${theme.colors.grid}`,
                      borderRadius: theme.cellRadius,
                      boxShadow:
                        day.count > 4 ? `0 0 10px ${theme.colors.glow}` : undefined,
                      opacity: day.count > 0 ? 1 : 0.55,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: theme.fonts.body,
                  fontSize: 22,
                  color: theme.colors.dim,
                  marginTop: 12,
                }}
              >
                <span>42 dias atrás</span>
                <span style={{ color: theme.colors.accent }}>hoje</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              borderTop: `1px solid ${theme.colors.grid}`,
              paddingTop: 20,
            }}
          >
            <Badge theme={theme}>
              {formatNumber(stats.contributions.total)} contribuições
            </Badge>
            <Badge theme={theme}>
              {formatNumber(stats.contributions.commits)} commits
            </Badge>
            <Badge theme={theme}>
              {stats.contributions.activeDays} dias ativos
            </Badge>
          </div>
        </Panel>
      </div>
    </SceneShell>
  );
};
