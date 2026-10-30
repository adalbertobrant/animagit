/**
 * PitfallRun.tsx — palco do tema Pitfall! (v0.1.1-r2)
 *
 * Novidades:
 * - Personagem viaja por toda a tela horizontalmente (não fica fixo na esquerda)
 * - Velocidade de corrida proporcional à intensidade do mês
 * - Ciclo de corrida mais expressivo com bounce vertical e arm-swing via rotate
 * - Partículas de celebração (estrelinhas) ao coletar itens
 * - Fogos de artifício + mensagem final no outro
 */

import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { COIN, GEM, CHEST, EXPLORER } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject, ObstacleEvent, GameTimeline } from "./timeline";
import { phaseLocalFrame, jumpLift } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";
import { Fireworks, OutroMessage } from "./Fireworks";

// ─────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────
const GAME_TOP = 0;   // relativo ao container do palco (que já começa em y=260)
const GAME_H = 776;   // 1036 - 260

const GROUND_Y = GAME_H - 120;
const CHAR_SCALE = 10;
const CHAR_W = 12 * CHAR_SCALE;
const CHAR_H = 16 * CHAR_SCALE;

// X range do personagem (percorre a tela toda)
const CHAR_X_MIN = 120;
const CHAR_X_MAX = 680;

const SCROLL_SPEED_BASE = 3.5;

// ─────────────────────────────────────────────
// Intensidade do mês: 0..1 (proporcional às contribuições)
// ─────────────────────────────────────────────
const monthIntensity = (phase: GamePhase | null, allPhases: GamePhase[]): number => {
  if (!phase || phase.count === 0) return 0;
  const maxCount = Math.max(...allPhases.map((p) => p.count), 1);
  return clamp(phase.count / maxCount, 0, 1);
};

// ─────────────────────────────────────────────
// Posição X do personagem — oscila pelo terço esquerdo
// proporcional à intensidade do mês
// ─────────────────────────────────────────────
const charXAtFrame = (globalFrame: number, intensity: number): number => {
  // Base: oscila entre CHAR_X_MIN e CHAR_X_MIN + range*intensity
  const range = CHAR_X_MAX - CHAR_X_MIN;
  const travelAmp = CHAR_X_MIN + range * intensity * 0.7;
  // Movimento senoidal lento para frente/trás
  const osc = Math.sin(globalFrame * (0.018 + intensity * 0.022)) * travelAmp * 0.5;
  return clamp(CHAR_X_MIN + travelAmp * 0.25 + osc, CHAR_X_MIN, CHAR_X_MAX);
};

// ─────────────────────────────────────────────
// Ciclo de corrida mais expressivo
// ─────────────────────────────────────────────
type RunPose = { skewX: number; bounceY: number; rotateZ: number };

const runPose = (localFrame: number, intensity: number): RunPose => {
  // Ciclo mais curto (mais rápido) quando mês é intenso
  const cycleLen = Math.round(20 - intensity * 6); // 20..14 frames
  const cycle = localFrame % cycleLen;
  const t = cycle / cycleLen;

  // Bounce vertical sinusoidal — mais alto quando intenso
  const bounceAmp = 6 + intensity * 18;
  const bounceY = -Math.abs(Math.sin(t * Math.PI)) * bounceAmp;

  // Skew de inclinação
  const skewX = Math.sin(t * Math.PI * 2) * (3 + intensity * 5);

  // Rotação leve de braço/corpo
  const rotateZ = Math.sin(t * Math.PI * 2 + 0.8) * (2 + intensity * 4);

  return { skewX, bounceY, rotateZ };
};

// ─────────────────────────────────────────────
// Partículas de celebração ao coletar
// ─────────────────────────────────────────────
const CelebrationParticles: React.FC<{
  x: number;
  y: number;
  age: number;
  color: string;
  count?: number;
}> = ({ x, y, age, color, count = 8 }) => {
  if (age > 22) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const speed = 3 + (i % 3) * 2;
        const spread = age * speed;
        const gravity = age * age * 0.15;
        const sz = 6 + (i % 3) * 3;
        const op = clamp(1 - age / 22, 0, 1);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(angle) * spread - sz / 2,
              top: y + Math.sin(angle) * spread + gravity - sz / 2,
              width: sz,
              height: sz,
              borderRadius: i % 2 === 0 ? "50%" : 1,
              background: i % 3 === 0 ? "#ffffff" : color,
              opacity: op,
              boxShadow: `0 0 ${sz * 2}px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};

// ─────────────────────────────────────────────
// Sprite de obstáculo
// ─────────────────────────────────────────────
const LOG_ROWS = ["kbbbbbbbbk", "kbyyyybbk.", "kbyyyybbk.", "kbbbbbbbbk"];
const LOG_PALETTE: Record<string, string> = { k: "#08050f", b: "#4a2f16", y: "#8a5a2b" };

const ROCK_ROWS = ["..kkkk..", ".kgggggk.", "kgggggggk", "kgggggggk", ".kgggggk.", "..kkkk.."];
const ROCK_PALETTE: Record<string, string> = { k: "#08050f", g: "#6b6b5a" };

const SNAKE_ROWS = ["....kgk...", "...kgggk..", "..kgwwgk..", "..kggggk..", "...kggk...", "....kk...."];
const SNAKE_PALETTE: Record<string, string> = { k: "#08050f", g: "#3f7a28", w: "#f4f0d0" };

const OBSTACLE_SPRITES = [
  { rows: LOG_ROWS, palette: LOG_PALETTE },
  { rows: ROCK_ROWS, palette: ROCK_PALETTE },
  { rows: SNAKE_ROWS, palette: SNAKE_PALETTE },
];

// ─────────────────────────────────────────────
// Poeira nos pés
// ─────────────────────────────────────────────
const DustPuff: React.FC<{ x: number; y: number; frame: number; color: string; intensity: number }> = ({
  x, y, frame, color, intensity,
}) => {
  const count = 2 + Math.round(intensity * 3);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const age = (frame - i * 4) % 16;
        if (age < 0 || age > 14) return null;
        const op = (1 - age / 14) * (0.4 + intensity * 0.3);
        const spread = age * (2 + intensity * 1.5);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 10 - spread + i * 7,
              top: y - 6,
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
// Score popup
// ─────────────────────────────────────────────
const ScorePopup: React.FC<{ event: ScoreEvent; currentFrame: number; charX: number; theme: ThemeSpec }> = ({
  event, currentFrame, charX, theme,
}) => {
  const age = currentFrame - event.frame;
  if (age < 0 || age > 30) return null;
  const opacity = interpolate(age, [0, 6, 26, 30], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: charX + CHAR_W + 10,
        top: GROUND_Y - 80 - age * 2.8,
        fontFamily: theme.fonts.display,
        fontSize: event.bonus ? 28 : 22,
        color: event.bonus ? theme.colors.accent2 : theme.colors.accent,
        textShadow: `0 0 12px ${theme.colors.glow}`,
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
// Objeto coletável
// ─────────────────────────────────────────────
const CollectableObject: React.FC<{
  obj: RunObject;
  phase: GamePhase;
  globalFrame: number;
  charX: number;
  theme: ThemeSpec;
}> = ({ obj, phase, globalFrame, charX, theme }) => {
  const hitGlobal = phase.startFrame + obj.hitAt;
  const spawnGlobal = phase.startFrame + obj.spawnAt;
  if (globalFrame < spawnGlobal || globalFrame > hitGlobal + 22) return null;

  const collected = globalFrame >= hitGlobal;
  const travelFrames = obj.hitAt - obj.spawnAt;
  const age = globalFrame - spawnGlobal;
  const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;
  const startX = 1920;
  const endX = charX + CHAR_W - 20;
  const x = interpolate(travelPct, [0, 1], [startX, endX]);

  const baseY = GROUND_Y - 80 - obj.lane * 130;
  const bobY = baseY + Math.sin(globalFrame * 0.22 + obj.lane * 3) * 8;

  const collectAge = globalFrame - hitGlobal;
  const collectScale = collected
    ? interpolate(collectAge, [0, 6, 14], [1.3, 2.0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1 + Math.sin(globalFrame * 0.18 + obj.lane) * 0.08;
  const collectOpacity = collected
    ? interpolate(collectAge, [0, 4, 14], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  const sprite = obj.variant === 2 ? CHEST : obj.lane > 0.6 ? GEM : COIN;
  const scale = obj.variant === 2 ? 7 : 6;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: bobY,
          transform: `scale(${collectScale})`,
          transformOrigin: "center center",
          opacity: collectOpacity,
          filter: collected
            ? `drop-shadow(0 0 18px ${theme.colors.accent}) brightness(2.5)`
            : `drop-shadow(0 0 6px ${theme.colors.glow})`,
          zIndex: 5,
        }}
      >
        <PixelArt sprite={sprite} scale={scale} />
      </div>
      {/* Partículas de celebração */}
      {collected && (
        <CelebrationParticles
          x={x + (sprite.rows[0]?.length ?? 8) * scale * 0.5}
          y={bobY + sprite.rows.length * scale * 0.5}
          age={collectAge}
          color={obj.variant === 2 ? theme.colors.accent2 : theme.colors.accent}
          count={obj.variant === 2 ? 12 : 8}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────
// Obstáculo
// ─────────────────────────────────────────────
const Obstacle: React.FC<{
  obs: ObstacleEvent;
  phase: GamePhase;
  globalFrame: number;
  charX: number;
}> = ({ obs, phase, globalFrame, charX }) => {
  const hitGlobal = phase.startFrame + obs.hitAt;
  const spawnGlobal = phase.startFrame + obs.spawnAt;
  if (globalFrame < spawnGlobal || globalFrame > hitGlobal + 6) return null;

  const travelFrames = obs.hitAt - obs.spawnAt;
  const age = globalFrame - spawnGlobal;
  const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;
  const x = interpolate(travelPct, [0, 1], [1920, charX + CHAR_W + 50]);

  const sprite = OBSTACLE_SPRITES[obs.variant % OBSTACLE_SPRITES.length]!;
  const scale = 8;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: GROUND_Y - sprite.rows.length * scale + 10,
        filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
        zIndex: 4,
      }}
    >
      <PixelArt sprite={sprite as import("../art/PixelArt").Sprite} scale={scale} />
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
  timeline: GameTimeline;
  isIntro: boolean;
  isOutro: boolean;
};

export const PitfallRun: React.FC<Props> = ({
  theme,
  phase,
  globalFrame,
  allPhases,
  scoreEvents,
  timeline,
  isIntro,
  isOutro,
}) => {
  useVideoConfig();

  const localFrame = phase ? phaseLocalFrame(phase, globalFrame) : globalFrame;
  const intensity = monthIntensity(phase, allPhases);

  // Pulo
  const jumpHeight = phase ? jumpLift(phase, localFrame, 140) : 0;
  const isJumping = jumpHeight > 2;

  // Posição X dinâmica
  const charX = isOutro
    ? 800 + Math.sin(globalFrame * 0.04) * 80 // celebra no centro da tela
    : charXAtFrame(globalFrame, intensity);

  // Pose de corrida
  const pose = runPose(isIntro || isOutro ? globalFrame : localFrame, isOutro ? 1 : intensity);

  // Y do personagem
  const charY = GROUND_Y - CHAR_H + 10 - jumpHeight + (isJumping ? 0 : pose.bounceY);

  // Scroll proporcional à intensidade
  const scrollSpeed = SCROLL_SPEED_BASE + intensity * 4.5;
  const scrollOffset = (globalFrame * scrollSpeed) % 120;

  // Eventos recentes
  const recent = recentEvents(scoreEvents, globalFrame, 32);

  // Flash de fase
  const phaseChangeFrames = 20;
  const isNearPhaseEnd = phase && phase.endFrame - globalFrame < phaseChangeFrames && phase.endFrame - globalFrame > 0;
  const levelFlash = isNearPhaseEnd
    ? interpolate(phase!.endFrame - globalFrame, [0, phaseChangeFrames], [0.35, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Fases visíveis
  const visiblePhases = phase
    ? allPhases.filter(
        (p) =>
          Math.abs(p.month - phase.month) <= 1 &&
          p.endFrame + 60 >= globalFrame &&
          p.startFrame - 60 <= globalFrame + 120,
      )
    : [];

  // Outro
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
      {/* Flash troca de fase */}
      {levelFlash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: theme.colors.accent,
            opacity: levelFlash,
            zIndex: 20,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Chão animado — mais rápido quando intenso */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: GROUND_Y + CHAR_H - 40,
          height: 28,
          background: "#4a3517",
          borderTop: "6px solid #6b5124",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,210,63,0.12) 0 36px, transparent 36px 72px)",
          backgroundPosition: `${-scrollOffset}px 0`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 60,
          background: "linear-gradient(180deg, #123c69 0%, #071c33 100%)",
          borderTop: "5px solid #1f5a8a",
        }}
      />

      {/* Obstáculos */}
      {visiblePhases.map((p) =>
        p.obstacles.map((obs) => (
          <Obstacle
            key={obs.id}
            obs={obs}
            phase={p}
            globalFrame={globalFrame}
            charX={charX}
          />
        )),
      )}

      {/* Objetos coletáveis */}
      {visiblePhases.map((p) =>
        p.objects.map((obj) => (
          <CollectableObject
            key={obj.id}
            obj={obj}
            phase={p}
            globalFrame={globalFrame}
            charX={charX}
            theme={theme}
          />
        )),
      )}

      {/* Poeira */}
      {!isJumping && (
        <DustPuff
          x={charX}
          y={GROUND_Y + CHAR_H - 38}
          frame={localFrame}
          color="rgba(139, 90, 43, 0.65)"
          intensity={intensity}
        />
      )}

      {/* Explorador */}
      <div
        style={{
          position: "absolute",
          left: charX,
          top: charY,
          transform: `skewX(${isJumping ? 0 : pose.skewX}deg) rotate(${isJumping ? -12 : pose.rotateZ}deg)`,
          transformOrigin: "bottom center",
          filter: `drop-shadow(0 0 10px rgba(255, 210, 63, 0.35)) drop-shadow(2px 4px 6px rgba(0,0,0,0.5))`,
          zIndex: 8,
        }}
      >
        <PixelArt sprite={EXPLORER} scale={CHAR_SCALE} />
      </div>

      {/* Score popups */}
      {recent.map((ev) => (
        <ScorePopup
          key={`${ev.objectId}-${ev.frame}`}
          event={ev}
          currentFrame={globalFrame}
          charX={charX}
          theme={theme}
        />
      ))}

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

      {/* Texto de intro */}
      {isIntro && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "38%",
            textAlign: "center",
            fontFamily: theme.fonts.display,
            fontSize: 36,
            letterSpacing: "0.12em",
            color: theme.colors.accent,
            textShadow: `0 0 24px ${theme.colors.glow}`,
            opacity: 0.9,
          }}
        >
          INSERIR CRÉDITO
        </div>
      )}
    </div>
  );
};
