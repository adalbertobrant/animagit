import React from "react";
import { useCurrentFrame } from "remotion";
import type { DayContribution } from "../../shared/types";
import { formatNumber, MONTH_LABELS_PT, WEEKDAY_SHORT_PT } from "../../shared/types";
import { interpolate } from "remotion";
import { useCountUp, useEnter } from "../lib/anim";
import { Badge, BigNumber, Kicker, Panel, SceneHeader, SceneShell, Stat } from "../ui";
import type { SceneProps } from "./types";

type Cell = DayContribution | null;

const buildColumns = (calendar: DayContribution[]): Cell[][] => {
  const firstWeekday = calendar[0]?.weekday ?? 0;
  const padded: Cell[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...calendar,
  ];

  const columns: Cell[][] = [];
  for (let index = 0; index < padded.length; index += 7) {
    const column = padded.slice(index, index + 7);
    while (column.length < 7) column.push(null);
    columns.push(column);
  }

  return columns;
};

const monthForColumn = (column: Cell[]): number | null => {
  const firstDay = column.find((day): day is DayContribution => day !== null);
  if (!firstDay) return null;
  return Number(firstDay.date.slice(5, 7)) - 1;
};

const CalendarHalf: React.FC<{
  columns: Cell[][];
  offset: number;
  theme: SceneProps["theme"];
  max: number;
  frame: number;
}> = ({ columns, offset, theme, max, frame }) => {
  let previousMonth = -1;

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {columns.map((column, columnIndex) => {
        const month = monthForColumn(column);
        const showMonth = month !== null && month !== previousMonth;
        if (month !== null) previousMonth = month;

        return (
          <div
            key={columnIndex}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              width: 30,
            }}
          >
            {showMonth ? (
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  left: 0,
                  fontFamily: theme.fonts.body,
                  fontSize: 24,
                  color: theme.colors.dim,
                  letterSpacing: "0.1em",
                  whiteSpace: "nowrap",
                }}
              >
                {MONTH_LABELS_PT[month]}
              </div>
            ) : null}

            {column.map((day, rowIndex) => {
              const start = 16 + (columnIndex + offset) * 1.05 + rowIndex * 2.4;
              const reveal = interpolate(frame, [start, start + 7], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              const count = day?.count ?? 0;
              const level =
                count === 0
                  ? 0
                  : Math.min(4, 1 + Math.floor((count / Math.max(1, max)) * 3.999));
              const color = level === 0 ? theme.colors.cellEmpty : theme.colors.cells[level - 1];

              return (
                <div
                  key={rowIndex}
                  title={day ? `${day.date}: ${day.count}` : undefined}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: theme.cellRadius,
                    background: color,
                    border:
                      level === 0
                        ? `1px solid ${theme.colors.grid}`
                        : theme.id === "pitfall"
                          ? "1px solid rgba(0,0,0,0.35)"
                          : "1px solid rgba(255,255,255,0.08)",
                    boxShadow:
                      level === 4
                        ? `0 0 16px ${theme.colors.glow}`
                        : theme.id === "pitfall" && level > 0
                          ? "2px 2px 0 rgba(0,0,0,0.45)"
                          : undefined,
                    opacity: reveal,
                    transform: `scale(${0.55 + reveal * 0.45})`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const Contributions: React.FC<SceneProps> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const columns = buildColumns(stats.contributions.calendar);
  const midpoint = Math.ceil(columns.length / 2);
  const leftColumns = columns.slice(0, midpoint);
  const rightColumns = columns.slice(midpoint);
  const max = stats.contributions.calendar.reduce(
    (current, day) => Math.max(current, day.count),
    1,
  );
  const total = useCountUp(stats.contributions.total, 16, 46);
  const leftEnter = useEnter(10);
  const topRepo = stats.topRepos[0];

  return (
    <SceneShell>
      <SceneHeader
        theme={theme}
        index={1}
        year={stats.year}
        title="O ANO EM NÚMEROS"
        right={`@${stats.login} · ${stats.contributions.activeDays} dias ativos`}
      />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "500px 1fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: leftEnter,
            transform: `translateX(${(1 - leftEnter) * -30}px)`,
          }}
        >
          <Kicker theme={theme} color={theme.colors.accent}>
            CONTRIBUIÇÕES EM {stats.year}
          </Kicker>

          <div style={{ marginTop: 12, marginBottom: 2 }}>
            <BigNumber theme={theme} value={formatNumber(total)} />
          </div>

          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 40,
              lineHeight: 1,
              color: theme.colors.fg,
              marginBottom: 34,
            }}
          >
            contribuições no ano
          </div>

          <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
            <Stat
              theme={theme}
              label="commits"
              value={formatNumber(stats.contributions.commits)}
              accent
            />
            <Stat
              theme={theme}
              label="repositórios"
              value={formatNumber(stats.contributions.repositories)}
            />
            <Stat
              theme={theme}
              label="seguidores"
              value={formatNumber(stats.highlights.followers)}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <Badge theme={theme}>
              {stats.contributions.activeDays} dias ativos
            </Badge>
            <Badge theme={theme} color={theme.colors.accent2}>
              sequência: {stats.contributions.longestStreak} dias
            </Badge>
          </div>

          {topRepo ? (
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 28,
                color: theme.colors.dim,
                lineHeight: 1.3,
              }}
            >
              <span style={{ color: theme.colors.accent }}>TOP REPO </span>
              {topRepo.name} · {topRepo.contributions} commits
            </div>
          ) : null}

          {stats.contributions.bestDay ? (
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 26,
                color: theme.colors.dim,
                marginTop: 10,
              }}
            >
              Melhor dia: {stats.contributions.bestDay.date.split("-").reverse().join("/")} com{" "}
              {stats.contributions.bestDay.count} contribuições.
            </div>
          ) : null}
        </div>

        <Panel theme={theme} delay={16} style={{ padding: "44px 46px 40px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 26,
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
              MAPA DO ANO
            </div>
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 26,
                letterSpacing: "0.14em",
                color: theme.colors.dim,
              }}
            >
              {WEEKDAY_SHORT_PT.join(" · ")}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 26, paddingTop: 10 }}>
            <CalendarHalf
              columns={leftColumns}
              offset={0}
              theme={theme}
              max={max}
              frame={frame}
            />
            <CalendarHalf
              columns={rightColumns}
              offset={leftColumns.length}
              theme={theme}
              max={max}
              frame={frame}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 26,
              paddingTop: 18,
              borderTop: `1px solid ${theme.colors.grid}`,
            }}
          >
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 24,
                color: theme.colors.dim,
                letterSpacing: "0.08em",
              }}
            >
              CADA QUADRADO É UM DIA
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: 22,
                  color: theme.colors.dim,
                  marginRight: 4,
                }}
              >
                MENOS
              </span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  style={{
                    width: 20,
                    height: 20,
                    background:
                      level === 0 ? theme.colors.cellEmpty : theme.colors.cells[level - 1],
                    border: `1px solid ${theme.colors.grid}`,
                    borderRadius: theme.cellRadius,
                  }}
                />
              ))}
              <span
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: 22,
                  color: theme.colors.dim,
                  marginLeft: 4,
                }}
              >
                MAIS
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </SceneShell>
  );
};
