/**
 * SpaceRun.tsx — palco do tema Espaço.
 *
 * Nave no terço esquerdo, dispara projéteis, meteoros entram pela direita.
 * Cada meteoro destruído representa um lote de contribuições.
 */

import React from "react";
import { interpolate } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { ROCKET, FLAME } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject } from "./timeline";
import { phaseLocalFrame } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";

// ─────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────
const GAME_TOP = 260;
const GAME_BOTTOM = 1036;
const GAME_H = GAME_BOTTOM - GAME_TOP;

const SHIP_X = 220;
const SHIP_SCALE = 9;
const SHIP_W = 14 * SHIP_SCALE; // ROCKET has 14 columns
const SHIP_H = 21 * SHIP_SCALE; // ROCKET has 21 rows

// Y oscila em torno do centro vertical do palco
const SHIP_BASE_Y = GAME_H / 2 - SHIP_H / 2;

// ─────────────────────────────────────────────
// Projétil
// ─────────────────────────────────────────────
type Projectile = {
  id: string;
  startX: number;
  startY: number;
  startFrame: number;
  targetX: number;
};

const MAX_PROJECTILES = 3;
const PROJECTILE_SPEED = 26; // px per frame
const PROJECTILE_LENGTH = 28;

// Gera os frames de disparo: a cada ~14 frames quando há objetos no palco
const buildProjectiles = (phases: GamePhase[], introFrames: number): Projectile[] => {
  const result: Projectile[] = [];
  for (const phase of phases) {
    if (!phase.hasActivity) continue;
    // Disparo ligado ao hitAt de cada objeto (começa alguns frames antes)
    for (const obj of phase.objects) {
      const globalHit = phase.startFrame + obj.hitAt;
      const travelFrames = Math.round(
        (1920 - SHIP_X - SHIP_W) / PROJECTILE_SPEED,
      );
      const fireFrame = globalHit - travelFrames;
      if (fireFrame < introFrames) continue;

      const targetX = 1920;
      const shipYOffset =
        Math.sin(fireFrame * 0.04) * 60; // posição Y estimada da nave
      const startY = SHIP_BASE_Y + SHIP_H / 2 + shipYOffset;

      result.push({
        id: `proj-${phase.month}-${obj.id}`,
        startX: SHIP_X + SHIP_W,
        startY,
        startFrame: fireFrame,
        targetX,
      });
    }
  }
  return result;
};

// ─────────────────────────────────────────────
// Meteoro (arte original em pixel art inline)
// ─────────────────────────────────────────────
const METEOR_ROWS = [
  "..kkkk..",
  ".krrggk.",
  "krgggggk",
  "krgggggk",
  "krgggggk",
  ".kggggk.",
  "..kkkk..",
];
const METEOR_PALETTE: Record<string, string> = {
  k: "#08050f",
  r: "#4a3520",
  g: "#7a6040",
};

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
const METEOR_BIG_PALETTE: Record<string, string> = {
  k: "#08050f",
  r: "#6a4830",
  g: "#9a7850",
};

// ─────────────────────────────────────────────
// Explosão
// ─────────────────────────────────────────────
const Explosion: React.FC<{
  x: number;
  y: number;
  age: number;
  color: string;
  big?: boolean;
}> = ({ x, y, age, color, big = false }) => {
  if (age > 18) return null;
  const spread = age * (big ? 7 : 5);
  const opacity = 1 - age / 18;
  const particles = big ? 8 : 5;

  return (
    <>
      {Array.from({ length: particles }, (_, i) => {
        const angle = (i / particles) * Math.PI * 2;
        const dx = Math.cos(angle) * spread;
        const dy = Math.sin(angle) * spread;
        const size = (big ? 14 : 8) + (age > 8 ? 0 : 4);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + dx - size / 2,
              top: y + dy - size / 2,
              width: size,
              height: size,
              background: i % 2 === 0 ? color : "#ffd166",
              opacity: opacity * 0.9,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              borderRadius: 2,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: x - spread * 0.6,
          top: y - spread * 0.6,
          width: spread * 1.2,
          height: spread * 1.2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}88 0%, transparent 70%)`,
          opacity: opacity * 0.6,
        }}
      />
    </>
  );
};

// ─────────────────────────────────────────────
// Score popup
// ─────────────────────────────────────────────
const ScorePopup: React.FC<{
  event: ScoreEvent;
  x: number;
  y: number;
  currentFrame: number;
  theme: ThemeSpec;
}> = ({ event, x, y, currentFrame, theme }) => {
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
        top: y - age * 2.5,
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
  isIntro,
  isOutro,
}) => {
  // Construir projéteis em memo (seria useMemo num componente real)
  const projectiles = buildProjectiles(allPhases, introFrames);

  const localFrame = phase ? phaseLocalFrame(phase, globalFrame) : globalFrame;

  // Nave oscila verticalmente
  const shipY = SHIP_BASE_Y + Math.sin(globalFrame * 0.04) * 60;
  const shipTilt = Math.sin(globalFrame * 0.025) * 4;
  const flameScale = 1 + Math.sin(globalFrame * 0.35) * 0.18;

  // Projéteis ativos
  const activeProjectiles = projectiles.filter((p) => {
    const age = globalFrame - p.startFrame;
    return age >= 0 && age < 50;
  });

  // Objetos (meteoros) e suas posições
  const visiblePhases = allPhases.filter(
    (p) =>
      p.endFrame + 60 >= globalFrame &&
      p.startFrame - 120 <= globalFrame,
  );

  const recent = recentEvents(scoreEvents, globalFrame, 30);

  // Hit positions para explosões e popups
  const hitPositions = new Map<string, { x: number; y: number }>();
  for (const p of visiblePhases) {
    for (const obj of p.objects) {
      const globalHit = p.startFrame + obj.hitAt;
      const travel = obj.hitAt - obj.spawnAt;
      const travelPct = travel > 0
        ? clamp((globalFrame - (p.startFrame + obj.spawnAt)) / travel, 0, 1)
        : 1;
      const startX = 1900;
      const endX = SHIP_X + SHIP_W + 10;
      const x = interpolate(travelPct, [0, 1], [startX, endX]);
      const baseY = GAME_H * 0.3 + obj.lane * GAME_H * 0.45;
      hitPositions.set(obj.id, { x, y: baseY });
    }
  }

  // Flash da nave ao acertar
  const recentHit = scoreEvents.find((e) => !e.bonus && Math.abs(e.frame - globalFrame) < 8);
  const shipFlash = recentHit
    ? interpolate(Math.abs(recentHit.frame - globalFrame), [0, 8], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

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

      {/* Meteoros */}
      {visiblePhases.map((p) =>
        p.objects.map((obj) => {
          const globalSpawn = p.startFrame + obj.spawnAt;
          const globalHit = p.startFrame + obj.hitAt;
          if (globalFrame < globalSpawn || globalFrame > globalHit + 20) return null;

          const pos = hitPositions.get(obj.id);
          if (!pos) return null;

          const destroyed = globalFrame >= globalHit;
          const destroyAge = globalFrame - globalHit;

          if (destroyed && destroyAge > 18) return null;

          const spin = (globalFrame - globalSpawn) * (obj.lane > 0.5 ? 2 : -1.5);
          const scale = obj.variant === 2 ? 9 : 7;
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
                    filter: `drop-shadow(0 0 6px rgba(120,80,40,0.6))`,
                    zIndex: 5,
                  }}
                >
                  <PixelArt
                    sprite={{ rows: sprite, palette }}
                    scale={scale}
                  />
                </div>
              ) : (
                <Explosion
                  x={pos.x + (sprite[0]?.length ?? 8) * scale * 0.5}
                  y={pos.y + sprite.length * scale * 0.5}
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
        // Tenta achar a posição do meteoro associado
        let x = SHIP_X + SHIP_W + 80;
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
          left: SHIP_X,
          top: shipY,
          transform: `rotate(${shipTilt}deg)`,
          transformOrigin: "center center",
          filter: shipFlash > 0
            ? `drop-shadow(0 0 22px ${theme.colors.accent}) brightness(${1 + shipFlash * 0.8})`
            : `drop-shadow(0 0 18px rgba(94,234,255,0.45))`,
          zIndex: 8,
        }}
      >
        <PixelArt sprite={ROCKET} scale={SHIP_SCALE} />
        {/* Chama */}
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

      {/* Intro/Outro text */}
      {(isIntro || isOutro) && (
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
          {isIntro ? "PREPARAR PARA DECOLAGEM" : "ANO CONCLUÍDO"}
        </div>
      )}
    </div>
  );
};
