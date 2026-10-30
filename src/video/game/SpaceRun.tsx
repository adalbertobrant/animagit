/**
 * SpaceRun.tsx — palco do tema Espaço (v0.1.1-r2)
 *
 * Novidades:
 * - Nave percorre verticalmente mais quando o mês é intenso
 * - Velocidade horizontal e amplitude de oscilação proporcionais às contribuições
 * - Partículas de celebração ao destruir meteoros
 * - Fogos de artifício + mensagem final no outro
 */

import React from "react";
import { interpolate } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { ROCKET, FLAME } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject, GameTimeline } from "./timeline";
import { phaseLocalFrame } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";
import { Fireworks, OutroMessage } from "./Fireworks";

// ─────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────
const GAME_TOP = 0;
const GAME_H = 776;

const SHIP_SCALE = 9;
const SHIP_W = 14 * SHIP_SCALE;
const SHIP_H = 21 * SHIP_SCALE;

// X oscila entre SHIP_X_MIN e SHIP_X_MAX proporcionalmente
const SHIP_X_BASE = 180;
const SHIP_X_MAX = 520;

const SHIP_Y_CENTER = GAME_H / 2 - SHIP_H / 2;

// ─────────────────────────────────────────────
// Intensidade do mês
// ─────────────────────────────────────────────
const monthIntensity = (phase: GamePhase | null, allPhases: GamePhase[]): number => {
  if (!phase || phase.count === 0) return 0;
  const maxCount = Math.max(...allPhases.map((p) => p.count), 1);
  return clamp(phase.count / maxCount, 0, 1);
};

// ─────────────────────────────────────────────
// Projéteis
// ─────────────────────────────────────────────
type Projectile = {
  id: string;
  startX: number;
  startY: number;
  startFrame: number;
};

const PROJECTILE_SPEED = 28;
const PROJECTILE_LENGTH = 32;

const buildProjectiles = (phases: GamePhase[], introFrames: number): Projectile[] => {
  const result: Projectile[] = [];
  for (const phase of phases) {
    if (!phase.hasActivity) continue;
    for (const obj of phase.objects) {
      const globalHit = phase.startFrame + obj.hitAt;
      const travelFrames = Math.round((1920 - SHIP_X_BASE - SHIP_W) / PROJECTILE_SPEED);
      const fireFrame = globalHit - travelFrames;
      if (fireFrame < introFrames) continue;
      const shipYOffset = Math.sin(fireFrame * 0.04) * 70;
      result.push({
        id: `proj-${phase.month}-${obj.id}`,
        startX: SHIP_X_BASE + SHIP_W,
        startY: SHIP_Y_CENTER + SHIP_H / 2 + shipYOffset,
        startFrame: fireFrame,
      });
    }
  }
  return result;
};

// ─────────────────────────────────────────────
// Meteoros
// ─────────────────────────────────────────────
const METEOR_ROWS = ["..kkkk..", ".krrggk.", "krgggggk", "krgggggk", "krgggggk", ".kggggk.", "..kkkk.."];
const METEOR_PALETTE: Record<string, string> = { k: "#08050f", r: "#4a3520", g: "#7a6040" };
const METEOR_BIG_ROWS = [
  "...kkkkkk...",
  "..krrggggk..",
  ".krggggggggk",
  "krgggggggggk",
  "krgggggggggk",
  "krgggggggggk",
  ".kggggggggk.",
  "..kggggggk..",
  "...kkkkkk...",
];
const METEOR_BIG_PALETTE: Record<string, string> = { k: "#08050f", r: "#6a4830", g: "#9a7850" };

// ─────────────────────────────────────────────
// Explosão com partículas coloridas
// ─────────────────────────────────────────────
const Explosion: React.FC<{
  x: number;
  y: number;
  age: number;
  color: string;
  big?: boolean;
}> = ({ x, y, age, color, big = false }) => {
  if (age > 22) return null;
  const particles = big ? 10 : 6;
  const spread = age * (big ? 8 : 5.5);
  const opacity = 1 - age / 22;

  return (
    <>
      {/* Flash central */}
      {age < 5 && (
        <div
          style={{
            position: "absolute",
            left: x - 20,
            top: y - 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: (1 - age / 5) * 0.9,
            boxShadow: `0 0 40px ${color}`,
          }}
        />
      )}
      {Array.from({ length: particles }, (_, i) => {
        const angle = (i / particles) * Math.PI * 2;
        const speed = 0.65 + (i % 3) * 0.2;
        const px = x + Math.cos(angle) * spread * speed;
        const py = y + Math.sin(angle) * spread * speed;
        const size = (big ? 14 : 9) + (age > 8 ? 0 : 4);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px - size / 2,
              top: py - size / 2,
              width: size,
              height: size,
              background: i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? color : "#ffd166",
              opacity: opacity * 0.9,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              borderRadius: i % 2 === 0 ? "50%" : 2,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: x - spread * 0.7,
          top: y - spread * 0.7,
          width: spread * 1.4,
          height: spread * 1.4,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`,
          opacity: opacity * 0.5,
        }}
      />
    </>
  );
};

// ─────────────────────────────────────────────
// Score popup
// ─────────────────────────────────────────────
const ScorePopup: React.FC<{ event: ScoreEvent; x: number; y: number; currentFrame: number; theme: ThemeSpec }> = ({
  event, x, y, currentFrame, theme,
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
        fontSize: event.bonus ? 28 : 22,
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

export const SpaceRun: React.FC<Props> = ({
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
  const projectiles = buildProjectiles(allPhases, introFrames);
  const intensity = monthIntensity(phase, allPhases);

  // Nave: amplitude de oscilação e X proporcional à intensidade
  const oscAmp = 50 + intensity * 90;         // ±50..140 px vertical
  const oscSpeed = 0.035 + intensity * 0.025; // mais rápida quando intenso
  const shipX = isOutro
    ? SHIP_X_BASE + Math.sin(globalFrame * 0.05) * 200 + 300 // celebra mais ao centro
    : SHIP_X_BASE + Math.sin(globalFrame * 0.015) * (intensity * 160);

  const shipY = SHIP_Y_CENTER + Math.sin(globalFrame * oscSpeed) * oscAmp;
  const shipTilt = Math.sin(globalFrame * oscSpeed * 0.7) * (4 + intensity * 6);
  const flameScale = 1 + Math.sin(globalFrame * 0.35) * (0.18 + intensity * 0.2);

  const recentHit = scoreEvents.find((e) => !e.bonus && Math.abs(e.frame - globalFrame) < 8);
  const shipFlash = recentHit
    ? interpolate(Math.abs(recentHit.frame - globalFrame), [0, 8], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const activeProjectiles = projectiles.filter((p) => {
    const age = globalFrame - p.startFrame;
    return age >= 0 && age < 55;
  });

  const visiblePhases = allPhases.filter(
    (p) => p.endFrame + 60 >= globalFrame && p.startFrame - 120 <= globalFrame,
  );

  const recent = recentEvents(scoreEvents, globalFrame, 30);

  const hitPositions = new Map<string, { x: number; y: number }>();
  for (const p of visiblePhases) {
    for (const obj of p.objects) {
      const travel = obj.hitAt - obj.spawnAt;
      const age = globalFrame - (p.startFrame + obj.spawnAt);
      const travelPct = travel > 0 ? clamp(age / travel, 0, 1) : 1;
      const x = interpolate(travelPct, [0, 1], [1900, shipX + SHIP_W + 10]);
      const baseY = GAME_H * 0.22 + obj.lane * GAME_H * 0.52;
      hitPositions.set(obj.id, { x, y: baseY });
    }
  }

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
      {/* Projéteis */}
      {activeProjectiles.map((proj) => {
        const age = globalFrame - proj.startFrame;
        const x = proj.startX + age * PROJECTILE_SPEED;
        if (x > 1980) return null;
        return (
          <div
            key={proj.id}
            style={{
              position: "absolute",
              left: x,
              top: proj.startY - 3,
              width: PROJECTILE_LENGTH,
              height: 6,
              background: `linear-gradient(90deg, transparent, ${theme.colors.accent} 40%, #fff)`,
              borderRadius: 3,
              boxShadow: `0 0 10px ${theme.colors.glow}`,
              opacity: 0.9,
            }}
          />
        );
      })}

      {/* Meteoros + explosões */}
      {visiblePhases.map((p) =>
        p.objects.map((obj) => {
          const globalSpawn = p.startFrame + obj.spawnAt;
          const globalHit = p.startFrame + obj.hitAt;
          if (globalFrame < globalSpawn || globalFrame > globalHit + 22) return null;
          const pos = hitPositions.get(obj.id);
          if (!pos) return null;
          const destroyed = globalFrame >= globalHit;
          const destroyAge = globalFrame - globalHit;
          if (destroyed && destroyAge > 22) return null;
          const spin = (globalFrame - globalSpawn) * (obj.lane > 0.5 ? 2.2 : -1.8);
          const sprScale = obj.variant === 2 ? 9 : 7;
          const sprite = obj.variant === 2 ? METEOR_BIG_ROWS : METEOR_ROWS;
          const palette = obj.variant === 2 ? METEOR_BIG_PALETTE : METEOR_PALETTE;
          return (
            <React.Fragment key={obj.id}>
              {!destroyed ? (
                <div
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    transform: `rotate(${spin}deg)`,
                    filter: "drop-shadow(0 0 6px rgba(120,80,40,0.6))",
                    zIndex: 5,
                  }}
                >
                  <PixelArt sprite={{ rows: sprite, palette }} scale={sprScale} />
                </div>
              ) : (
                <Explosion
                  x={pos.x + (sprite[0]?.length ?? 8) * sprScale * 0.5}
                  y={pos.y + sprite.length * sprScale * 0.5}
                  age={destroyAge}
                  color={theme.colors.accent}
                  big={obj.variant === 2}
                />
              )}
            </React.Fragment>
          );
        }),
      )}

      {/* Score popups */}
      {recent.map((ev) => {
        let x = shipX + SHIP_W + 80;
        let y = shipY + SHIP_H / 2;
        for (const p of visiblePhases) {
          const obj = p.objects.find((o) => o.id === ev.objectId);
          if (obj) {
            const pos = hitPositions.get(obj.id);
            if (pos) { x = pos.x + 30; y = pos.y; }
            break;
          }
        }
        return (
          <ScorePopup
            key={`${ev.objectId}-${ev.frame}`}
            event={ev}
            x={x}
            y={y}
            currentFrame={globalFrame}
            theme={theme}
          />
        );
      })}

      {/* Nave */}
      <div
        style={{
          position: "absolute",
          left: shipX,
          top: shipY,
          transform: `rotate(${shipTilt}deg)`,
          transformOrigin: "center center",
          filter: shipFlash > 0
            ? `drop-shadow(0 0 24px ${theme.colors.accent}) brightness(${1 + shipFlash * 0.9})`
            : `drop-shadow(0 0 18px rgba(94,234,255,0.5))`,
          zIndex: 8,
        }}
      >
        <PixelArt sprite={ROCKET} scale={SHIP_SCALE} />
        <div
          style={{
            position: "absolute",
            left: SHIP_W * 0.3,
            top: SHIP_H * 0.7,
            transform: `scaleY(${flameScale})`,
            transformOrigin: "top center",
            opacity: 0.95,
          }}
        >
          <PixelArt sprite={FLAME} scale={8} />
        </div>
      </div>

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
            top: "42%",
            textAlign: "center",
            fontFamily: theme.fonts.display,
            fontSize: 36,
            letterSpacing: "0.14em",
            color: theme.colors.accent,
            textShadow: `0 0 28px ${theme.colors.glow}`,
          }}
        >
          PREPARAR PARA DECOLAGEM
        </div>
      )}
    </div>
  );
};
