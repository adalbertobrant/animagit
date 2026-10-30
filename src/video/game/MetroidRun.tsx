/**
 * MetroidRun.tsx — palco do tema Super Metroid (v0.1.1-r2)
 *
 * Novidades:
 * - Caçador percorre mais tela horizontal e verticalmente quando o mês é intenso
 * - Ciclo de corrida mais expressivo com bounce vertical maior
 * - Partículas de celebração ao destruir alienígenas
 * - Fogos de artifício + mensagem final no outro
 */

import React from "react";
import { interpolate } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { HUNTER, ALIEN } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject, GameTimeline } from "./timeline";
import { phaseLocalFrame, jumpLift } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";
import { Fireworks, OutroMessage } from "./Fireworks";

// ─────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────
const GAME_TOP = 0;
const GAME_H = 776;

const FLOOR_Y = GAME_H - 100;
const CHAR_SCALE = 11;
const CHAR_W = 12 * CHAR_SCALE;
const CHAR_H = 18 * CHAR_SCALE;

const CHAR_X_MIN = 120;
const CHAR_X_MAX = 600;

// ─────────────────────────────────────────────
// Intensidade
// ─────────────────────────────────────────────
const monthIntensity = (phase: GamePhase | null, allPhases: GamePhase[]): number => {
  if (!phase || phase.count === 0) return 0;
  const maxCount = Math.max(...allPhases.map((p) => p.count), 1);
  return clamp(phase.count / maxCount, 0, 1);
};

// ─────────────────────────────────────────────
// Posição X do caçador
// ─────────────────────────────────────────────
const charXAtFrame = (globalFrame: number, intensity: number): number => {
  const range = CHAR_X_MAX - CHAR_X_MIN;
  const amp = CHAR_X_MIN + range * intensity * 0.65;
  const osc = Math.sin(globalFrame * (0.016 + intensity * 0.02)) * amp * 0.5;
  return clamp(CHAR_X_MIN + amp * 0.25 + osc, CHAR_X_MIN, CHAR_X_MAX);
};

// ─────────────────────────────────────────────
// Ciclo de corrida expressivo
// ─────────────────────────────────────────────
type RunPose = { skewX: number; translateY: number; rotateZ: number };

const runPose = (frame: number, intensity: number): RunPose => {
  const cycleLen = Math.round(18 - intensity * 5); // 18..13
  const cycle = frame % cycleLen;
  const t = cycle / cycleLen;
  const bounceAmp = 5 + intensity * 20;
  const translateY = -Math.abs(Math.sin(t * Math.PI)) * bounceAmp;
  const skewX = Math.sin(t * Math.PI * 2) * (4 + intensity * 5);
  const rotateZ = Math.sin(t * Math.PI * 2 + 0.6) * (2 + intensity * 3);
  return { skewX, translateY, rotateZ };
};

// ─────────────────────────────────────────────
// Tiros
// ─────────────────────────────────────────────
const SHOT_SPEED = 26;
const SHOT_LIFEFRAMES = 48;

type Shot = { id: string; startX: number; startY: number; startFrame: number };

const buildShots = (phases: GamePhase[], introFrames: number): Shot[] => {
  const shots: Shot[] = [];
  for (const phase of phases) {
    if (!phase.hasActivity) continue;
    for (const obj of phase.objects) {
      const globalHit = phase.startFrame + obj.hitAt;
      const travelFrames = Math.round((1920 - CHAR_X_MIN - CHAR_W) / SHOT_SPEED);
      const fireFrame = globalHit - travelFrames;
      if (fireFrame < introFrames) continue;
      shots.push({
        id: `shot-${phase.month}-${obj.id}`,
        startX: CHAR_X_MIN + CHAR_W,
        startY: FLOOR_Y - CHAR_H + 10 + CHAR_H * 0.4,
        startFrame: fireFrame,
      });
    }
  }
  return shots;
};

// ─────────────────────────────────────────────
// Partículas de celebração ao destruir criatura
// ─────────────────────────────────────────────
const AlienBurst: React.FC<{ x: number; y: number; age: number; theme: ThemeSpec; big?: boolean }> = ({
  x, y, age, theme, big = false,
}) => {
  if (age > 22) return null;
  const count = big ? 8 : 5;
  const spread = age * (big ? 7 : 5.5);
  const opacity = 1 - age / 22;
  return (
    <>
      {/* Flash */}
      {age < 5 && (
        <div
          style={{
            position: "absolute",
            left: x - 14,
            top: y - 14,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: (1 - age / 5) * 0.85,
            boxShadow: `0 0 30px ${theme.colors.accent}`,
          }}
        />
      )}
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + age * 0.1;
        const px = x + Math.cos(angle) * spread;
        const py = y + Math.sin(angle) * spread;
        const size = big ? 12 : 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px - size / 2,
              top: py - size / 2,
              width: size,
              height: size,
              background: i % 2 === 0 ? theme.colors.accent2 : theme.colors.accent,
              opacity: opacity * 0.9,
              boxShadow: `0 0 ${size * 2}px ${theme.colors.glow}`,
            }}
          />
        );
      })}
    </>
  );
};

// ─────────────────────────────────────────────
// Porta entre meses
// ─────────────────────────────────────────────
const SectorDoor: React.FC<{ x: number; openProgress: number; theme: ThemeSpec }> = ({
  x, openProgress, theme,
}) => {
  const doorH = GAME_H * 0.6;
  const doorW = 60;
  const doorY = (GAME_H - doorH) / 2;
  const halfOpen = openProgress * (doorW / 2 + 10);
  return (
    <div style={{ position: "absolute", left: x, top: doorY, width: doorW, height: doorH }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `8px solid ${theme.colors.accent2}`,
          boxShadow: `0 0 30px ${theme.colors.glow}`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 8,
          width: `calc(50% - 8px)`,
          height: `calc(100% - 16px)`,
          background: "linear-gradient(90deg, #3d1a66, #1b0b34)",
          transform: `translateX(${-halfOpen}px)`,
          zIndex: 1,
          borderRight: `2px solid ${theme.colors.accent}44`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          width: `calc(50% - 8px)`,
          height: `calc(100% - 16px)`,
          background: "linear-gradient(270deg, #3d1a66, #1b0b34)",
          transform: `translateX(${halfOpen}px)`,
          zIndex: 1,
          borderLeft: `2px solid ${theme.colors.accent}44`,
        }}
      />
      {openProgress > 0.3 && (
        <div
          style={{
            position: "absolute",
            inset: 8,
            background: `radial-gradient(ellipse, ${theme.colors.accent}55 0%, transparent 70%)`,
            opacity: openProgress,
            zIndex: 3,
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Score popup
// ─────────────────────────────────────────────
const ScorePopup: React.FC<{ event: ScoreEvent; currentFrame: number; x: number; y: number; theme: ThemeSpec }> = ({
  event, currentFrame, x, y, theme,
}) => {
  const age = currentFrame - event.frame;
  if (age < 0 || age > 28) return null;
  const opacity = interpolate(age, [0, 4, 24, 28], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - age * 2.8,
        fontFamily: theme.fonts.display,
        fontSize: event.bonus ? 26 : 21,
        color: event.bonus ? theme.colors.accent2 : theme.colors.accent,
        textShadow: `0 0 14px ${theme.colors.glow}`,
        opacity,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {event.bonus ? "+5 BÔNUS" : `+${event.points}`}
    </div>
  );
};

// ─────────────────────────────────────────────
// Poeira de corrida
// ─────────────────────────────────────────────
const RunDust: React.FC<{ charX: number; frame: number; color: string; intensity: number }> = ({
  charX, frame, color, intensity,
}) => {
  const count = 2 + Math.round(intensity * 3);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const age = (frame - i * 5) % 18;
        if (age < 0 || age > 14) return null;
        const op = (1 - age / 14) * (0.4 + intensity * 0.3);
        const spread = age * (2 + intensity * 1.5);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: charX - 10 - spread + i * 6,
              top: FLOOR_Y + 14,
              width: 8 + age,
              height: 6 + age * 0.4,
              borderRadius: "50%",
              background: color,
              opacity: op,
              filter: "blur(2px)",
            }}
          />
        );
      })}
    </>
  );
};

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
type Props = {
  theme: ThemeSpec;
  phase: GamePhase | null;
  globalFrame: number;
  allPhases: GamePhase[];
  scoreEvents: ScoreEvent[];
  introFrames: number;
  timeline: GameTimeline;
  isIntro: boolean;
  isOutro: boolean;
};

export const MetroidRun: React.FC<Props> = ({
  theme,
  phase,
  globalFrame,
  allPhases,
  scoreEvents,
  introFrames,
  timeline,
  isIntro,
  isOutro,
}) => {
  const shots = buildShots(allPhases, introFrames);
  const intensity = monthIntensity(phase, allPhases);
  const localFrame = phase ? phaseLocalFrame(phase, globalFrame) : globalFrame;

  // Pulo
  const jumpHeight = phase ? jumpLift(phase, localFrame, 150) : 0;
  const isJumping = jumpHeight > 2;

  // Posição X
  const charX = isOutro
    ? 800 + Math.sin(globalFrame * 0.04) * 100
    : charXAtFrame(globalFrame, intensity);

  const pose = runPose(isIntro || isOutro ? globalFrame : localFrame, isOutro ? 1 : intensity);
  const charY = FLOOR_Y - CHAR_H + 10 - jumpHeight + (isJumping ? 0 : pose.translateY);

  // Muzzle flash
  const recentShot = shots.find((s) => Math.abs(s.startFrame - globalFrame) < 4);
  const muzzleFlash = recentShot
    ? interpolate(Math.abs(recentShot.startFrame - globalFrame), [0, 4], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const activeShots = shots.filter((s) => {
    const age = globalFrame - s.startFrame;
    return age >= 0 && age < SHOT_LIFEFRAMES;
  });

  const visiblePhases = allPhases.filter(
    (p) => p.endFrame + 60 >= globalFrame && p.startFrame - 120 <= globalFrame,
  );

  const recent = recentEvents(scoreEvents, globalFrame, 30);

  const doorPhasesWithDoor = phase
    ? allPhases.filter((p) => p.month >= phase.month - 1 && p.month <= phase.month + 1)
    : [];

  const scrollOffset = (globalFrame * (3.8 + intensity * 3)) % 96;

  const outroFrame = isOutro ? globalFrame - timeline.runEnd : -1;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: GAME_TOP,
        width: 1920,
        height: GAME_H,
        overflow: "hidden",
      }}
    >
      {/* Chão */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: FLOOR_Y + CHAR_H - 30,
          height: 22,
          background: "#1a0b2e",
          borderTop: `6px solid ${theme.colors.accent2}`,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(192,77,240,0.1) 0 44px, transparent 44px 88px)",
          backgroundPosition: `${-scrollOffset}px 0`,
          boxShadow: `0 0 20px rgba(192,77,240,0.25)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          top: FLOOR_Y + CHAR_H + 0,
          background: "repeating-linear-gradient(90deg, #0f0520 0 44px, #150829 44px 88px)",
          backgroundPosition: `${-scrollOffset}px 0`,
        }}
      />

      {/* Tiros */}
      {activeShots.map((shot) => {
        const age = globalFrame - shot.startFrame;
        // Adjust shot startX to follow charX approximately
        const x = charX + CHAR_W + age * SHOT_SPEED;
        if (x > 1960) return null;
        return (
          <div
            key={shot.id}
            style={{
              position: "absolute",
              left: x,
              top: shot.startY - 4,
              width: 32,
              height: 8,
              borderRadius: 4,
              background: `linear-gradient(90deg, transparent, ${theme.colors.accent} 50%, #fff)`,
              boxShadow: `0 0 12px ${theme.colors.glow}`,
              opacity: 0.95,
            }}
          />
        );
      })}

      {/* Criaturas */}
      {visiblePhases.map((p) =>
        p.objects.map((obj) => {
          const globalSpawn = p.startFrame + obj.spawnAt;
          const globalHit = p.startFrame + obj.hitAt;
          if (globalFrame < globalSpawn || globalFrame > globalHit + 22) return null;

          const travelFrames = obj.hitAt - obj.spawnAt;
          const age = globalFrame - globalSpawn;
          const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;
          const x = interpolate(travelPct, [0, 1], [1900, charX + CHAR_W + 60]);
          const baseY = FLOOR_Y - CHAR_H * 0.65 + obj.lane * 90;

          const destroyed = globalFrame >= globalHit;
          const destroyAge = globalFrame - globalHit;
          const blinkOpacity =
            destroyAge >= 0 && destroyAge < 8 ? (Math.floor(destroyAge / 2) % 2 === 0 ? 0.2 : 1) : 1;
          if (destroyed && destroyAge > 22) return null;
          const creatureScale = obj.variant === 2 ? 9 : 7;

          return (
            <React.Fragment key={obj.id}>
              {!destroyed ? (
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    top: baseY,
                    opacity: blinkOpacity,
                    filter: "drop-shadow(0 0 8px rgba(192,77,240,0.6))",
                    zIndex: 5,
                  }}
                >
                  <PixelArt sprite={ALIEN} scale={creatureScale} />
                </div>
              ) : (
                <AlienBurst
                  x={x + (12 * creatureScale) / 2}
                  y={baseY + (10 * creatureScale) / 2}
                  age={destroyAge}
                  theme={theme}
                  big={obj.variant === 2}
                />
              )}
            </React.Fragment>
          );
        }),
      )}

      {/* Portas */}
      {doorPhasesWithDoor.map((p) => {
        const doorStartFrame = p.endFrame - 40;
        if (globalFrame < doorStartFrame - 60 || globalFrame > p.endFrame + 30) return null;
        const openProgress = globalFrame >= doorStartFrame
          ? clamp((globalFrame - doorStartFrame) / 40, 0, 1)
          : 0;
        return (
          <SectorDoor
            key={`door-${p.month}`}
            x={1600}
            openProgress={openProgress}
            theme={theme}
          />
        );
      })}

      {/* Score popups */}
      {recent.map((ev) => {
        let x = charX + CHAR_W + 40;
        let y = charY;
        for (const p of visiblePhases) {
          const obj = p.objects.find((o) => o.id === ev.objectId);
          if (obj) {
            const travelFrames = obj.hitAt - obj.spawnAt;
            const age = globalFrame - (p.startFrame + obj.spawnAt);
            const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;
            x = interpolate(travelPct, [0, 1], [1900, charX + CHAR_W + 60]) + 30;
            y = FLOOR_Y - CHAR_H * 0.65 + obj.lane * 90;
            break;
          }
        }
        return (
          <ScorePopup
            key={`${ev.objectId}-${ev.frame}`}
            event={ev}
            currentFrame={globalFrame}
            x={x}
            y={y}
            theme={theme}
          />
        );
      })}

      {/* Poeira */}
      {!isJumping && (
        <RunDust
          charX={charX}
          frame={localFrame}
          color="rgba(53,240,192,0.35)"
          intensity={intensity}
        />
      )}

      {/* Caçador */}
      <div
        style={{
          position: "absolute",
          left: charX,
          top: charY,
          transform: `skewX(${isJumping ? 0 : pose.skewX}deg) rotate(${isJumping ? -10 : pose.rotateZ}deg)`,
          transformOrigin: "bottom center",
          filter:
            muzzleFlash > 0
              ? `drop-shadow(0 0 22px ${theme.colors.accent}) brightness(${1 + muzzleFlash * 0.7})`
              : `drop-shadow(0 0 14px rgba(53,240,192,0.45)) drop-shadow(2px 4px 6px rgba(0,0,0,0.5))`,
          zIndex: 8,
        }}
      >
        <PixelArt sprite={HUNTER} scale={CHAR_SCALE} />
      </div>

      {/* Muzzle flash */}
      {muzzleFlash > 0 && (
        <div
          style={{
            position: "absolute",
            left: charX + CHAR_W - 4,
            top: charY + CHAR_H * 0.35,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: theme.colors.accent,
            opacity: muzzleFlash * 0.9,
            boxShadow: `0 0 24px ${theme.colors.glow}`,
            zIndex: 9,
          }}
        />
      )}

      {/* Fogos de artifício no outro */}
      {isOutro && outroFrame >= 0 && (
        <Fireworks
          outroFrame={outroFrame}
          themeId={theme.id}
          seed={timeline.seed}
          stageW={1920}
          stageH={GAME_H}
        />
      )}

      {/* Mensagem final */}
      {isOutro && outroFrame >= 0 && (
        <OutroMessage
          outroFrame={outroFrame}
          themeId={theme.id}
          login={timeline.login}
          totalContribs={timeline.baseTotal}
          year={timeline.year}
          accentColor={theme.colors.accent}
          glowColor={theme.colors.glow}
          fontDisplay={theme.fonts.display}
          fontNarrative={theme.fonts.narrative}
        />
      )}

      {/* Intro text */}
      {isIntro && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "40%",
            textAlign: "center",
            fontFamily: theme.fonts.display,
            fontSize: 30,
            letterSpacing: "0.14em",
            color: theme.colors.accent,
            textShadow: `0 0 28px ${theme.colors.glow}`,
          }}
        >
          INICIANDO MISSÃO
        </div>
      )}
    </div>
  );
};
