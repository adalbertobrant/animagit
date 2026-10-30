import React from "react";
import { useCurrentFrame } from "remotion";
import { formatNumber } from "../../shared/types";
import { useCountUp, useEnter } from "../lib/anim";
import { Kicker, Panel, SceneHeader, SceneShell } from "../ui";
import type { SceneProps } from "./types";

type IconKind = "pr" | "star" | "bug" | "repo";

const Icon: React.FC<{ kind: IconKind; color: string }> = ({ kind, color }) => {
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg width={58} height={58} viewBox="0 0 64 64">
      {kind === "pr" ? (
        <>
          <circle cx="18" cy="16" r="7" {...common} />
          <circle cx="18" cy="48" r="7" {...common} />
          <circle cx="46" cy="48" r="7" {...common} />
          <path d="M18 23v18M46 41V30a8 8 0 0 0-8-8h-9" {...common} />
          <path d="M35 16l-7 6 7 6" {...common} />
        </>
      ) : null}
      {kind === "star" ? (
        <path
          d="M32 8l7.2 14.6L55 25l-11.5 11.2L46.2 52 32 44.5 17.8 52l2.7-15.8L9 25l15.8-2.4z"
          {...common}
        />
      ) : null}
      {kind === "bug" ? (
        <>
          <rect x="18" y="18" width="28" height="34" rx="14" {...common} />
          <path d="M32 18V9M18 28H8M46 28h10M18 42H6M46 42h12M22 52l-6 6M42 52l6 6" {...common} />
          <circle cx="25" cy="31" r="2.5" fill={color} />
          <circle cx="39" cy="31" r="2.5" fill={color} />
        </>
      ) : null}
      {kind === "repo" ? (
        <>
          <path d="M12 12h30a10 10 0 0 1 10 10v30H22a10 10 0 0 0-10 10z" {...common} />
          <path d="M12 12v40M22 52h30" {...common} />
          <path d="M24 24h16M24 34h12" {...common} />
        </>
      ) : null}
    </svg>
  );
};

const HighlightCard: React.FC<{
  theme: SceneProps["theme"];
  kind: IconKind;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  delay: number;
}> = ({ theme, kind, label, sublabel, value, color, delay }) => {
  const enter = useEnter(delay);
  const count = useCountUp(value, delay + 6, 36);

  return (
    <Panel
      theme={theme}
      delay={delay}
      style={{
        padding: "32px 30px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 380,
        borderColor: color,
        boxShadow:
          theme.id === "space"
            ? `0 0 34px ${color}22, inset 0 0 40px ${color}11`
            : `inset 0 0 30px ${color}18`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 12}px)` }}>
          <Icon kind={kind} color={color} />
        </div>
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: 22,
            color: theme.colors.dim,
            letterSpacing: "0.14em",
            textAlign: "right",
            maxWidth: 190,
            lineHeight: 1.2,
          }}
        >
          {sublabel}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: theme.id === "space" ? 96 : 68,
            lineHeight: 1,
            color,
            textShadow:
              theme.id === "space"
                ? `0 0 30px ${color}66`
                : theme.id === "metroid"
                  ? `4px 4px 0 ${theme.colors.bgDeep}`
                  : "4px 4px 0 #2b1c0b",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatNumber(count)}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: 27,
            letterSpacing: "0.14em",
            color: theme.colors.fg,
            marginTop: 12,
          }}
        >
          {label}
        </div>
      </div>
    </Panel>
  );
};

export const Highlights: React.FC<SceneProps> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const enter = useEnter(8);

  return (
    <SceneShell>
      <SceneHeader
        theme={theme}
        index={5}
        year={stats.year}
        title="O PLACAR DO ANO"
        right={`@${stats.login} · tudo calculado localmente`}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 30,
          opacity: enter,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 26,
          }}
        >
          <HighlightCard
            theme={theme}
            kind="pr"
            label="PULL REQUESTS"
            sublabel="abertos no ano"
            value={stats.contributions.pullRequests}
            color={theme.colors.accent}
            delay={12}
          />
          <HighlightCard
            theme={theme}
            kind="star"
            label="ESTRELAS DADAS"
            sublabel="projetos que você salvou"
            value={stats.highlights.starsGiven}
            color={theme.colors.accent3}
            delay={18}
          />
          <HighlightCard
            theme={theme}
            kind="bug"
            label="ISSUES FECHADAS"
            sublabel={`${stats.highlights.issuesOpened} abertas`}
            value={stats.highlights.issuesClosed}
            color={theme.colors.success}
            delay={24}
          />
          <HighlightCard
            theme={theme}
            kind="repo"
            label="REPOSITÓRIOS"
            sublabel="onde você commitou"
            value={stats.highlights.repositoriesContributed}
            color={theme.colors.accent2}
            delay={30}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            borderTop: `1px solid ${theme.colors.grid}`,
            paddingTop: 24,
            marginTop: 4,
          }}
        >
          <Kicker theme={theme} color={theme.colors.dim}>
            {formatNumber(stats.highlights.followers)} seguidores ·{" "}
            {formatNumber(stats.highlights.publicRepos)} repositórios públicos ·{" "}
            {formatNumber(stats.contributions.reviews)} reviews
          </Kicker>
          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 24,
              letterSpacing: "0.14em",
              color: frame % 60 < 30 ? theme.colors.accent : theme.colors.dim,
            }}
          >
            {frame % 60 < 30 ? "■ DADOS VERIFICADOS" : "□ DADOS VERIFICADOS"}
          </div>
        </div>
      </div>
    </SceneShell>
  );
};
