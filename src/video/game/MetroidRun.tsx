/**
 * MetroidRun.tsx — palco do tema Super Metroid.
 *
 * Caçador espacial correndo para a direita, pulando, atirando.
 * Criaturas alienígenas entram pela direita e somem ao ser atingidas.
 * Cada mês termina com a traversal de uma porta.
 */

import React from "react";
import { interpolate } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { HUNTER, ALIEN } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject } from "./timeline";
import { phaseLocalFrame, jumpLift } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";

// ─────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────
const GAME_TOP = 260;
const GAME_BOTTOM = 1036;
const GAME_H = GAME_BOTTOM - GAME_TOP;

const FLOOR_Y = GAME_H - 100; // linha do chão
const CHAR_X = 240;
const CHAR_SCALE = 11;
const CHAR_W = 12 * CHAR_SCALE; // HUNTER: 12 cols
const CHAR_H = 18 * CHAR_SCALE; // HUNTER: 18 rows

// ─────────────────────────────────────────────
// Animação de corrida — simula ciclo via transform
// ─────────────────────────────────────────────
const runPose = (frame: number) => {
  const cycle = frame % 20;
  if (cycle < 5) return { skewX: -4, translateY: 0 };
  if (cycle < 10) return { skewX: 0, translateY: -6 };
  if (cycle < 15) return { skewX: 4, translateY: 0 };
  return { skewX: 0, translateY: -3 };
};

// ─────────────────────────────────────────────
// Projétil do caçador
// ─────────────────────────────────────────────
const SHOT_SPEED = 24; // px/frame
const SHOT_LIFEFRAMES = 45;

type Shot = {
  id: string;
  startX: number;
  startY: number;
  startFrame: number;
};

const buildShots = (phases: GamePhase[], introFrames: number): Shot[] => {
  const shots: Shot[] = [];
  for (const phase of phases) {
    if (!phase.hasActivity) continue;
    for (const obj of phase.objects) {
      const globalHit = phase.startFrame + obj.hitAt;
      const travelFrames = Math.round((1920 - CHAR_X - CHAR_W) / SHOT_SPEED);
      const fireFrame = globalHit - travelFrames;
      if (fireFrame < introFrames) continue;

      const charYEst = FLOOR_Y - CHAR_H + 10;
      shots.push({
        id: `shot-${phase.month}-${obj.id}`,
        startX: CHAR_X + CHAR_W,
        startY: charYEst + CHAR_H * 0.4,
        startFrame: fireFrame,
      });
    }
  }
  return shots;
};

// ─────────────────────────────────────────────
// Explosão alienígena (pisca e desaparece)
// ─────────────────────────────────────────────
const AlienBurst: React.FC<{
  x: number;
  y: number;
  age: number;
  theme: ThemeSpec;
}> = ({ x, y, age, theme }) => {
  if (age > 20) return null;
  const opacity = 1 - age / 20;
  const spread = age * 5;

  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2 + age * 0.1;
        const dx = Math.cos(angle) * spread;
        const dy = Math.sin(angle) * spread;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + dx - 6,
              top: y + dy - 6,
              width: 12,
              height: 12,
              background: i % 2 === 0 ? theme.colors.accent2 : theme.colors.accent,
              opacity: opacity * 0.9,
              boxShadow: `0 0 12px ${theme.colors.glow}`,
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
const SectorDoor: React.FC<{
  x: number;
  openProgress: number; // 0..1
  theme: ThemeSpec;
}> = ({ x, openProgress, theme }) => {
  const doorH = GAME_H * 0.6;
  const doorW = 60;
  const doorY = (GAME_H - doorH) / 2;
  const halfOpen = openProgress * (doorW / 2 + 10);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: doorY,
        width: doorW,
        height: doorH,
      }}
    >
      {/* Moldura */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `8px solid ${theme.colors.accent2}`,
          background: "transparent",
          boxShadow: `0 0 30px ${theme.colors.glow}`,
          zIndex: 2,
        }}
      />
      {/* Painel esquerdo */}
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
      {/* Painel direito */}
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
      {/* Brilho ao abrir */}
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
const ScorePopup: React.FC<{
  event: ScoreEvent;
  currentFrame: number;
  x: number;
  y: number;
  theme: ThemeSpec;
}> = ({ event, currentFrame, x, y, theme }) => {
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
const RunDust: React.FC<{ frame: number; color: string }> = ({ frame, color }) => {
  const puffs = [0, 1, 2].map((i) => {
    const age = (frame - i * 6) % 18;
    if (age < 0 || age > 14) return null;
    const opacity = (1 - age / 14) * 0.45;
    const spread = age * 2.5;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: CHAR_X - 10 - spread + i * 6,
          top: FLOOR_Y + 10,
          width: 8 + age,
          height: 6 + age * 0.4,
          borderRadius: "50%",
          background: color,
          opacity,
          filter: "blur(2px)",
        }}
      />
    );
  });
  return <>{puffs}</>;
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

export const MetroidRun: React.FC<Props> = ({
  theme,
  phase,
  globalFrame,
  allPhases,
  scoreEvents,
  introFrames,
  isIntro,
  isOutro,
}) => {
  const shots = buildShots(allPhases, introFrames);
  const localFrame = phase ? phaseLocalFrame(phase, globalFrame) : globalFrame;

  // Pulo
  const jumpHeight = phase ? jumpLift(phase, localFrame, 140) : 0;
  const isJumping = jumpHeight > 2;
  const pose = runPose(isJumping ? 0 : localFrame);

  // Posição Y do personagem
  const charY = FLOOR_Y - CHAR_H + 10 - jumpHeight + pose.translateY;

  // Tiro muzzle flash
  const recentShot = shots.find((s) => Math.abs(s.startFrame - globalFrame) < 4);
  const muzzleFlash = recentShot
    ? interpolate(Math.abs(recentShot.startFrame - globalFrame), [0, 4], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Projéteis ativos
  const activeShots = shots.filter((s) => {
    const age = globalFrame - s.startFrame;
    return age >= 0 && age < SHOT_LIFEFRAMES;
  });

  // Criaturas e posições
  const visiblePhases = allPhases.filter(
    (p) => p.endFrame + 60 >= globalFrame && p.startFrame - 120 <= globalFrame,
  );

  const recent = recentEvents(scoreEvents, globalFrame, 30);

  // Porta entre fases
  const doorPhasesWithDoor = phase
    ? allPhases.filter(
        (p) =>
          p.month >= phase.month - 1 &&
          p.month <= phase.month + 1,
      )
    : [];

  // Chão animado
  const scrollOffset = (globalFrame * 3.8) % 96;

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
          background:
            "repeating-linear-gradient(90deg, #0f0520 0 44px, #150829 44px 88px)",
          backgroundPosition: `${-scrollOffset}px 0`,
        }}
      />

      {/* Tiros */}
      {activeShots.map((shot) => {
        const age = globalFrame - shot.startFrame;
        const x = shot.startX + age * SHOT_SPEED;
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

      {/* Criaturas e explosões */}
      {visiblePhases.map((p) =>
        p.objects.map((obj) => {
          const globalSpawn = p.startFrame + obj.spawnAt;
          const globalHit = p.startFrame + obj.hitAt;
          if (globalFrame < globalSpawn || globalFrame > globalHit + 22) return null;

          const travelFrames = obj.hitAt - obj.spawnAt;
          const age = globalFrame - globalSpawn;
          const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;

          const startX = 1900;
          const endX = CHAR_X + CHAR_W + 60;
          const x = interpolate(travelPct, [0, 1], [startX, endX]);
          const baseY = FLOOR_Y - CHAR_H * 0.65 + obj.lane * 80;

          const destroyed = globalFrame >= globalHit;
          const destroyAge = globalFrame - globalHit;

          // Criatura pisca ao ser atingida
          const blinkOpacity =
            destroyAge >= 0 && destroyAge < 8 ? (Math.floor(destroyAge / 2) % 2 === 0 ? 0.2 : 1) : 1;

          if (destroyed && destroyAge > 20) return null;

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
                    filter: `drop-shadow(0 0 8px rgba(192,77,240,0.6))`,
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
                />
              )}
            </React.Fragment>
          );
        }),
      )}

      {/* Portas */}
      {doorPhasesWithDoor.map((p) => {
        // A porta aparece nos últimos 40 frames da fase
        const doorStartFrame = p.endFrame - 40;
        if (globalFrame < doorStartFrame - 60 || globalFrame > p.endFrame + 30) return null;

        // Posição X baseada no progresso da fase
        const doorGlobalX = 1600; // fixo à direita
        const openProgress =
          globalFrame >= doorStartFrame
            ? clamp((globalFrame - doorStartFrame) / 40, 0, 1)
            : 0;

        return (
          <SectorDoor
            key={`door-${p.month}`}
            x={doorGlobalX}
            openProgress={openProgress}
            theme={theme}
          />
        );
      })}

      {/* Score popups */}
      {recent.map((ev) => {
        let x = CHAR_X + CHAR_W + 40;
        let y = charY;
        for (const p of visiblePhases) {
          const obj = p.objects.find((o) => o.id === ev.objectId);
          if (obj) {
            const travelFrames = obj.hitAt - obj.spawnAt;
            const age = globalFrame - (p.startFrame + obj.spawnAt);
            const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;
            x = interpolate(travelPct, [0, 1], [1900, CHAR_X + CHAR_W + 60]) + 30;
            y = FLOOR_Y - CHAR_H * 0.65 + obj.lane * 80;
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
        <RunDust frame={localFrame} color="rgba(53,240,192,0.35)" />
      )}

      {/* Caçador */}
      <div
        style={{
          position: "absolute",
          left: CHAR_X,
          top: charY,
          transform: `skewX(${isJumping ? 0 : pose.skewX}deg)`,
          transformOrigin: "bottom center",
          filter:
            muzzleFlash > 0
              ? `drop-shadow(0 0 20px ${theme.colors.accent}) brightness(${1 + muzzleFlash * 0.6})`
              : `drop-shadow(0 0 14px rgba(53,240,192,0.4))`,
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
            left: CHAR_X + CHAR_W - 4,
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

      {/* Intro/Outro text */}
      {(isIntro || isOutro) && (
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
          {isIntro ? "INICIANDO MISSÃO" : "MISSÃO CONCLUÍDA"}
        </div>
      )}
    </div>
  );
};
