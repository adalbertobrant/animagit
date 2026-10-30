import React from "react";
import { useCurrentFrame } from "remotion";
import { formatNumber } from "../../shared/types";
import { useEnter } from "../lib/anim";
import { Badge, Kicker, SceneShell, SplitText } from "../ui";
import type { SceneProps } from "./types";

export const Outro: React.FC<SceneProps> = ({ stats, theme }) => {
  const frame = useCurrentFrame();
  const enter = useEnter(6);
  const artEnter = useEnter(20);
  const nextYear = stats.year + 1;

  return (
    <SceneShell>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: theme.fonts.display,
          fontSize: theme.id === "space" ? 520 : 360,
          lineHeight: 0.8,
          color: "transparent",
          WebkitTextStroke: `2px ${theme.colors.accent}`,
          opacity: 0.07 * enter,
          letterSpacing: "-0.04em",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {stats.year}
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 560px",
          alignItems: "center",
          gap: 40,
        }}
      >
        <div style={{ opacity: enter }}>
          <Kicker theme={theme} color={theme.colors.accent}>
            FIM DA TRANSMISSÃO // {stats.year}
          </Kicker>

          <div style={{ marginTop: 22 }}>
            <SplitText text="NOS VEMOS" theme={theme} size={theme.id === "space" ? 94 : 64} delay={8} />
            <SplitText
              text={`EM ${nextYear}`}
              theme={theme}
              size={theme.id === "space" ? 94 : 64}
              delay={18}
              color={theme.colors.accent}
            />
          </div>

          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 34,
              lineHeight: 1.3,
              color: theme.colors.dim,
              maxWidth: 780,
              marginTop: 26,
              opacity: useEnter(36),
            }}
          >
            {formatNumber(stats.contributions.total)} contribuições,{" "}
            {formatNumber(stats.contributions.commits)} commits e{" "}
            {formatNumber(stats.highlights.repositoriesContributed)} repositórios depois, o seu{" "}
            {stats.year} virou filme.
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              marginTop: 34,
              flexWrap: "wrap",
              opacity: useEnter(44),
            }}
          >
            <Badge theme={theme} color={theme.colors.accent}>
              github.com/{stats.login}
            </Badge>
            <Badge theme={theme}>100% local · sem upload</Badge>
            <Badge theme={theme} color={theme.colors.accent2}>
              Remotion + React
            </Badge>
          </div>

          <div
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 27,
              color: theme.colors.dim,
              letterSpacing: "0.08em",
              marginTop: 28,
              opacity: useEnter(52),
            }}
          >
            {frame % 70 < 35 ? "GERADO NA SUA MÁQUINA" : "PRONTO PARA ASSISTIR DE NOVO"}
          </div>
        </div>

        <div
          style={{
            opacity: artEnter,
            transform: `translateY(${(1 - artEnter) * 30}px)`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <theme.IntroArt login={stats.login} />
        </div>
      </div>
    </SceneShell>
  );
};
