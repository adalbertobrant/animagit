import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  springTiming,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { GitHubStats, ThemeId } from "../shared/types";
import { Hud, ScreenEffects } from "./Hud";
import { TRANSITION_FRAMES, SCENE_DURATIONS } from "./constants";
import { Contributions } from "./scenes/Contributions";
import { Highlights } from "./scenes/Highlights";
import { Intro } from "./scenes/Intro";
import { Languages } from "./scenes/Languages";
import { Outro } from "./scenes/Outro";
import { Productivity } from "./scenes/Productivity";
import { Streak } from "./scenes/Streak";
import { THEMES } from "./theme";

export type AnimaGithubProps = {
  stats: GitHubStats;
  theme: ThemeId;
};

const getPresentation = (theme: ThemeId) => {
  if (theme === "metroid") return wipe({ direction: "from-left" });
  if (theme === "pitfall") return slide({ direction: "from-bottom" });
  return fade();
};

export const AnimaGithub: React.FC<AnimaGithubProps> = ({ stats, theme: themeId }) => {
  const theme = THEMES[themeId];
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const presentation = getPresentation(themeId) as TransitionPresentation<
    Record<string, unknown>
  >;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        fontFamily: theme.fonts.body,
        overflow: "hidden",
      }}
    >
      <theme.Background />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.intro}>
          <Intro stats={stats} theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={presentation}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_FRAMES,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.contributions}>
          <Contributions stats={stats} theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={presentation}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_FRAMES,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.streak}>
          <Streak stats={stats} theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={presentation}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_FRAMES,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.languages}>
          <Languages stats={stats} theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={presentation}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_FRAMES,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.productivity}>
          <Productivity stats={stats} theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={presentation}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_FRAMES,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.highlights}>
          <Highlights stats={stats} theme={theme} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={presentation}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANSITION_FRAMES,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.outro}>
          <Outro stats={stats} theme={theme} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Hud theme={theme} login={stats.login} year={stats.year} score={stats.contributions.total} />
      <ScreenEffects theme={theme} />

      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 4,
          width: "100%",
          background: "rgba(0,0,0,0.35)",
          zIndex: 50,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${interpolate(
              frame,
              [0, durationInFrames],
              [0, 100],
              { extrapolateRight: "clamp" },
            )}%`,
            background: theme.colors.accent,
            boxShadow: `0 0 12px ${theme.colors.glow}`,
          }}
        />
      </div>

      <Audio
        src={staticFile(theme.audio)}
        loop
        volume={(frame) =>
          interpolate(
            frame,
            [0, 24, durationInFrames - 52, durationInFrames],
            [0, 0.55, 0.55, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
      />
    </AbsoluteFill>
  );
};
