/**
 * GameStage.tsx — composição principal da animação v0.1.1.
 *
 * Substitui o TransitionSeries de infográficos do AnimaGithub.tsx.
 * Layout:
 *   y 0..260    → TopBand (narrativa + score)
 *   y 260..1036 → palco do jogo (SpaceRun / MetroidRun / PitfallRun)
 *   y 1036..1080 → barra de progresso do ano + HUD
 */

import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { GitHubStats, ThemeId } from "../../shared/types";
import { THEMES } from "../theme";
import { ScreenEffects } from "../Hud";
import { buildTimeline, findPhaseAtFrame } from "./timeline";
import { buildBeats, beatAtFrame } from "../narrative";
import { scoreAtFrame } from "./score";
import { TopBand } from "./TopBand";
import { SpaceRun } from "./SpaceRun";
import { MetroidRun } from "./MetroidRun";
import { PitfallRun } from "./PitfallRun";
import { TOTAL_FRAMES, VIDEO_FPS } from "../constants";

// HUD_HEIGHT region
const HUD_Y = 1036;
const GAME_BOTTOM = HUD_Y;

type Props = {
  stats: GitHubStats;
  theme: ThemeId;
};

export const GameStage: React.FC<Props> = ({ stats, theme: themeId }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const theme = THEMES[themeId];

  // ── Pre-calculate timeline and beats (deterministic, same every frame) ──
  const timeline = useMemo(() => buildTimeline(stats, themeId), [stats, themeId]);
  const beats = useMemo(() => buildBeats(stats, timeline), [stats, timeline]);

  // ── Current phase and beat ──
  const phase = findPhaseAtFrame(timeline, frame);
  const beat = beatAtFrame(beats, timeline, frame);

  // Beat start frame — used for TopBand fade-in
  const beatStartFrame = useMemo(() => {
    if (beat.month === 0) return 0;
    if (beat.month === 13) return timeline.runEnd;
    const p = timeline.phases.find((ph) => ph.month === beat.month);
    return p ? p.startFrame : 0;
  }, [beat.month, timeline]);

  // ── Score ──
  const { base: scoreBase, bonus: scoreBonus, total: scoreTotal } =
    scoreAtFrame(timeline.scoreEvents, frame);

  // ── Is intro / outro ──
  const isIntro = frame < timeline.runStart;
  const isOutro = frame >= timeline.runEnd;

  // ── Phase number ──
  const phaseNumber = phase?.month ?? (isIntro ? 0 : 13);
  const totalPhases = timeline.phases.filter((p) => p.hasActivity).length;

  // ── Energy (Metroid) — oscillates but never zeros ──
  const energyPct = useMemo(() => {
    const base = 0.72;
    const osc = Math.sin(frame * 0.03) * 0.18;
    return Math.max(0.2, Math.min(1, base + osc));
  }, [frame]);

  // ── Treasures (Pitfall) — count of collected objects ──
  const treasures = scoreBase; // 1 treasure = 1 base point collected

  // ── Barra de progresso inferior ──
  const progressPct = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });

  // ── Audio volume (fade in, sustain, fade out) ──
  const audioVolume = interpolate(
    frame,
    [0, 24, durationInFrames - 52, durationInFrames],
    [0, 0.55, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        fontFamily: theme.fonts.body,
        overflow: "hidden",
      }}
    >
      {/* Background — clips below TopBand to let it breathe */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          overflow: "hidden",
        }}
      >
        <theme.Background />
      </div>

      {/* Game stage (clips to 260..1036) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 260,
          width: 1920,
          height: GAME_BOTTOM - 260,
          overflow: "hidden",
        }}
      >
        {themeId === "pitfall" && (
          <PitfallRun
            theme={theme}
            phase={phase}
            globalFrame={frame}
            allPhases={timeline.phases}
            scoreEvents={timeline.scoreEvents}
            isIntro={isIntro}
            isOutro={isOutro}
          />
        )}
        {themeId === "space" && (
          <SpaceRun
            theme={theme}
            phase={phase}
            globalFrame={frame}
            allPhases={timeline.phases}
            scoreEvents={timeline.scoreEvents}
            introFrames={timeline.introFrames}
            isIntro={isIntro}
            isOutro={isOutro}
          />
        )}
        {themeId === "metroid" && (
          <MetroidRun
            theme={theme}
            phase={phase}
            globalFrame={frame}
            allPhases={timeline.phases}
            scoreEvents={timeline.scoreEvents}
            introFrames={timeline.introFrames}
            isIntro={isIntro}
            isOutro={isOutro}
          />
        )}
      </div>

      {/* TopBand — sits on top at y=0..260 */}
      <TopBand
        theme={theme}
        beat={beat}
        beatStartFrame={beatStartFrame}
        timeline={timeline}
        scoreTotal={scoreTotal}
        scoreBonus={scoreBonus}
        currentFrame={frame}
        phaseNumber={phaseNumber}
        totalPhases={totalPhases}
        energyPct={energyPct}
        treasures={treasures}
      />

      {/* HUD inferior — barra de progresso do ano */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: HUD_Y,
          width: 1920,
          height: 1080 - HUD_Y,
          backgroundColor: "rgba(0,0,0,0.55)",
          borderTop: `2px solid ${theme.colors.panelBorder}`,
          display: "flex",
          alignItems: "center",
          paddingLeft: 48,
          paddingRight: 48,
          gap: 20,
        }}
      >
        {/* Login */}
        <span
          style={{
            fontFamily: theme.fonts.display,
            fontSize: 18,
            letterSpacing: "0.12em",
            color: theme.colors.dim,
          }}
        >
          <span style={{ color: theme.colors.accent }}>@</span>
          {stats.login.toUpperCase()}
        </span>

        {/* Barra de progresso */}
        <div
          style={{
            flex: 1,
            height: 6,
            background: theme.colors.cellEmpty,
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${theme.colors.panelBorder}`,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: theme.colors.accent,
              boxShadow: `0 0 10px ${theme.colors.glow}`,
              borderRadius: 3,
            }}
          />
        </div>

        {/* Ano */}
        <span
          style={{
            fontFamily: theme.fonts.display,
            fontSize: 18,
            letterSpacing: "0.1em",
            color: theme.colors.dim,
          }}
        >
          {stats.year} <span style={{ color: theme.colors.accent }}>·</span> ANIMA GITHUB
        </span>
      </div>

      {/* Screen effects (scanlines, vignette) */}
      <ScreenEffects theme={theme} />

      {/* Background music */}
      <Audio
        src={staticFile(theme.audio)}
        loop
        volume={audioVolume}
      />
    </AbsoluteFill>
  );
};
