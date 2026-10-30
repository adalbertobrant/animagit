/**
 * PitfallRun.tsx — palco do tema Pitfall!
 *
 * Explorador correndo para a direita, pulando obstáculos, coletando tesouros.
 * O mundo scrolla da direita para a esquerda (câmera fixa).
 * Cada objeto coletado representa um lote de contribuições.
 */

import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { COIN, GEM, CHEST, EXPLORER } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject, ObstacleEvent } from "./timeline";
import { phaseLocalFrame, jumpLift } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";

// ─────────────────────────────────────────────
// Constantes de layout
// ─────────────────────────────────────────────
const GAME_TOP = 260;
const GAME_BOTTOM = 1036;
const GAME_H = GAME_BOTTOM - GAME_TOP; // 776 px

const GROUND_Y = GAME_H - 120; // y relativo ao topo do palco
const CHAR_X = 260; // posição X fixa do explorador
const CHAR_SCALE = 10;

// Largura de sprite do EXPLORER: 12 colunas → 120 px
const CHAR_W = 12 * CHAR_SCALE;
const CHAR_H = 16 * CHAR_SCALE; // 16 linhas

// Velocidade do scroll (px por frame)
const SCROLL_SPEED = 4.2;

// ─────────────────────────────────────────────
// Animação de corrida (4 poses alternando a cada 6 frames)
// As poses são transformações CSS sobre o sprite estático.
// ─────────────────────────────────────────────
const runPose = (localFrame: number) => {
  const cycle = localFrame % 24;
  // 4 poses de 6 frames: lean-back, neutral, lean-forward, neutral
  if (cycle < 6) return { scaleX: 1, skewX: -3 };
  if (cycle < 12) return { scaleX: 1, skewX: 0 };
  if (cycle < 18) return { scaleX: 1, skewX: 3 };
  return { scaleX: 1, skewX: 0 };
};

// ─────────────────────────────────────────────
// Sprite de obstáculo (tronco simples, arte original)
// ─────────────────────────────────────────────
const LOG_ROWS = [
  "kbbbbbbbbk",
  "kbyyyybbk.",
  "kbyyyybbk.",
  "kbbbbbbbbk",
];
const LOG_PALETTE: Record<string, string> = {
  k: "#08050f",
  b: "#4a2f16",
  y: "#8a5a2b",
};

const ROCK_ROWS = [
  "..kkkk..",
  ".kgggggk.",
  "kgggggggk",
  "kgggggggk",
  ".kgggggk.",
  "..kkkk..",
];
const ROCK_PALETTE: Record<string, string> = {
  k: "#08050f",
  g: "#6b6b5a",
};

const SNAKE_ROWS = [
  "....kgk...",
  "...kgggk..",
  "..kgwwgk..",
  "..kggggk..",
  "...kggk...",
  "....kk....",
];
const SNAKE_PALETTE: Record<string, string> = {
  k: "#08050f",
  g: "#3f7a28",
  w: "#f4f0d0",
};

const OBSTACLE_SPRITES = [
  { rows: LOG_ROWS, palette: LOG_PALETTE },
  { rows: ROCK_ROWS, palette: ROCK_PALETTE },
  { rows: SNAKE_ROWS, palette: SNAKE_PALETTE },
];

// ─────────────────────────────────────────────
// Poeira nos pés
// ─────────────────────────────────────────────
const DustPuff: React.FC<{
  x: number;
  y: number;
  frame: number;
  color: string;
}> = ({ x, y, frame, color }) => {
  const puffs = [0, 1, 2].map((i) => {
    const age = (frame - i * 5) % 18;
    if (age < 0 || age > 14) return null;
    const opacity = 1 - age / 14;
    const spread = age * 3;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x - 12 - spread + i * 8,
          top: y - 8,
          width: 10 + age,
          height: 8 + age * 0.5,
          borderRadius: "50%",
          background: color,
          opacity: opacity * 0.5,
          filter: "blur(2px)",
        }}
      />
    );
  });
  return <>{puffs}</>;
};

// ─────────────────────────────────────────────
// Popup de pontos (+1, +5 BÔNUS)
// ─────────────────────────────────────────────
const ScorePopup: React.FC<{
  event: ScoreEvent;
  currentFrame: number;
  theme: ThemeSpec;
}> = ({ event, currentFrame, theme }) => {
  const age = currentFrame - event.frame;
  if (age < 0 || age > 30) return null;
  const opacity = interpolate(age, [0, 6, 26, 30], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = age * 2.5;

  return (
    <div
      style={{
        position: "absolute",
        left: CHAR_X + CHAR_W + 20,
        top: GROUND_Y - 60 - rise,
        fontFamily: theme.fonts.display,
        fontSize: event.bonus ? 26 : 22,
        color: event.bonus ? theme.colors.accent2 : theme.colors.accent,
        textShadow: `0 0 12px ${theme.colors.glow}`,
        opacity,
        pointerEvents: "none",
        letterSpacing: "0.05em",
        zIndex: 10,
      }}
    >
      {event.bonus ? `+5 BÔNUS` : `+${event.points}`}
    </div>
  );
};

// ─────────────────────────────────────────────
// Objeto coletável (COIN / GEM / CHEST)
// ─────────────────────────────────────────────
const CollectableObject: React.FC<{
  obj: RunObject;
  phase: GamePhase;
  currentFrame: number;
  globalFrame: number;
  theme: ThemeSpec;
}> = ({ obj, phase, currentFrame, globalFrame, theme }) => {
  const hitGlobal = phase.startFrame + obj.hitAt;
  const spawnGlobal = phase.startFrame + obj.spawnAt;

  if (globalFrame < spawnGlobal || globalFrame > hitGlobal + 12) return null;

  const collected = globalFrame >= hitGlobal;

  // Posição X: viaja da direita para a esquerda
  const travelFrames = obj.hitAt - obj.spawnAt;
  const age = globalFrame - spawnGlobal;
  const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;
  const startX = 1920 - GAME_TOP; // entra pela direita
  const x = interpolate(travelPct, [0, 1], [startX, CHAR_X + CHAR_W - 20]);

  // Y baseado na lane
  const baseY = GROUND_Y - 80 - obj.lane * 120;

  // Brilho ao ser coletado
  const collectAge = globalFrame - hitGlobal;
  const collectScale = collected
    ? interpolate(collectAge, [0, 6, 12], [1.2, 1.8, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1 + Math.sin(globalFrame * 0.18) * 0.06;
  const collectOpacity = collected
    ? interpolate(collectAge, [0, 3, 12], [1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const sprite = obj.variant === 2 ? CHEST : obj.lane > 0.6 ? GEM : COIN;
  const scale = obj.variant === 2 ? 7 : 6;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: baseY,
        transform: `scale(${collectScale})`,
        transformOrigin: "center center",
        opacity: collectOpacity,
        filter: collected
          ? `drop-shadow(0 0 14px ${theme.colors.accent}) brightness(2)`
          : `drop-shadow(0 0 6px ${theme.colors.glow})`,
        zIndex: 5,
      }}
    >
      <PixelArt sprite={sprite} scale={scale} />
    </div>
  );
};

// ─────────────────────────────────────────────
// Obstáculo (tronco/pedra/cobra) com pulo automático
// ─────────────────────────────────────────────
const Obstacle: React.FC<{
  obs: ObstacleEvent;
  phase: GamePhase;
  globalFrame: number;
  theme: ThemeSpec;
}> = ({ obs, phase, globalFrame, theme }) => {
  const hitGlobal = phase.startFrame + obs.hitAt;
  const spawnGlobal = phase.startFrame + obs.spawnAt;

  if (globalFrame < spawnGlobal || globalFrame > hitGlobal + 6) return null;

  const travelFrames = obs.hitAt - obs.spawnAt;
  const age = globalFrame - spawnGlobal;
  const travelPct = travelFrames > 0 ? clamp(age / travelFrames, 0, 1) : 1;
  const startX = 1920;
  const x = interpolate(travelPct, [0, 1], [startX, CHAR_X + CHAR_W + 40]);

  const sprite = OBSTACLE_SPRITES[obs.variant % OBSTACLE_SPRITES.length]!;
  const scale = 8;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: GROUND_Y - sprite.rows.length * scale + 10,
        filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.5))`,
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
  isIntro: boolean;
  isOutro: boolean;
};

export const PitfallRun: React.FC<Props> = ({
  theme,
  phase,
  globalFrame,
  allPhases,
  scoreEvents,
  isIntro,
  isOutro,
}) => {
  const { fps } = useVideoConfig();

  // Frame local dentro da fase
  const localFrame = phase ? phaseLocalFrame(phase, globalFrame) : globalFrame;

  // Altura do pulo (usando jumpLift da timeline)
  const jumpHeight = phase ? jumpLift(phase, localFrame, 130) : 0;
  const isJumping = jumpHeight > 2;

  // Posição Y do personagem
  const charY = GROUND_Y - CHAR_H + 10 - jumpHeight;

  // Pose de corrida
  const pose = runPose(isIntro || isOutro ? 0 : localFrame);

  // Paralaxe do chão — marca de velocidade
  const scrollOffset = (globalFrame * SCROLL_SPEED) % 120;

  // Eventos recentes para popups
  const recent = recentEvents(scoreEvents, globalFrame, 32);

  // Transição de fase: flash sutil na borda
  const phaseChangeFrames = 20;
  const isNearPhaseEnd =
    phase &&
    phase.endFrame - globalFrame < phaseChangeFrames &&
    phase.endFrame - globalFrame > 0;
  const levelFlash = isNearPhaseEnd
    ? interpolate(
        phase!.endFrame - globalFrame,
        [0, phaseChangeFrames],
        [0.4, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  // Objetos visíveis: fase atual + um pouco da próxima
  const visiblePhases = phase
    ? allPhases.filter(
        (p) =>
          Math.abs(p.month - phase.month) <= 1 &&
          p.endFrame + 60 >= globalFrame &&
          p.startFrame - 60 <= globalFrame + 120,
      )
    : [];

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
      {/* Flash de troca de fase */}
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

      {/* Chão animado */}
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
      {/* Faixa de água embaixo */}
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
            theme={theme}
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
            currentFrame={localFrame}
            globalFrame={globalFrame}
            theme={theme}
          />
        )),
      )}

      {/* Poeira */}
      {!isJumping && (
        <DustPuff
          x={CHAR_X}
          y={GROUND_Y + CHAR_H - 40}
          frame={localFrame}
          color="rgba(139, 90, 43, 0.6)"
        />
      )}

      {/* Explorador */}
      <div
        style={{
          position: "absolute",
          left: CHAR_X,
          top: charY,
          transform: `skewX(${isJumping ? 0 : pose.skewX}deg)`,
          transformOrigin: "bottom center",
          filter: `drop-shadow(0 0 10px rgba(255, 210, 63, 0.3))`,
          zIndex: 8,
        }}
      >
        <PixelArt sprite={EXPLORER} scale={CHAR_SCALE} />
      </div>

      {/* Popups de score */}
      {recent.map((ev) => (
        <ScorePopup
          key={`${ev.objectId}-${ev.frame}`}
          event={ev}
          currentFrame={globalFrame}
          theme={theme}
        />
      ))}

      {/* Texto de intro/outro no palco */}
      {(isIntro || isOutro) && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "40%",
            textAlign: "center",
            fontFamily: theme.fonts.display,
            fontSize: 36,
            letterSpacing: "0.12em",
            color: theme.colors.accent,
            textShadow: `0 0 24px ${theme.colors.glow}`,
            opacity: 0.9,
          }}
        >
          {isIntro ? "INSERIR CRÉDITO" : "EXPEDIÇÃO CONCLUÍDA"}
        </div>
      )}
    </div>
  );
};
