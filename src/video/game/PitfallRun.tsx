/**
 * PitfallRun.tsx — palco do tema Pitfall! (v0.1.1-r3)
 *
 * Selva brasileira: explorador atravessa a tela mês a mês.
 * Obstáculos originais: onça pintada, javali, jacaré, buraco.
 * Tesouros: moeda, gema, baú.
 * Personagem percorre a tela da esquerda para a direita; ao final do mês
 * faz uma corrida de saída e a fase muda com flash + nova paleta.
 */

import React from "react";
import { interpolate } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { COIN, GEM, CHEST, EXPLORER } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject, ObstacleEvent, GameTimeline } from "./timeline";
import { phaseLocalFrame, jumpLift } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";
import { Fireworks, OutroMessage } from "./Fireworks";

// ─── Layout ──────────────────────────────────
const GAME_H = 776;
const GROUND_Y = GAME_H - 118;
const CHAR_SCALE = 10;
const CHAR_W = 12 * CHAR_SCALE;
const CHAR_H = 16 * CHAR_SCALE;

// O explorador percorre toda a tela da esquerda para a direita
// durante a fase. No final do mês, corre além do limite direito (saída).
const CHAR_X_START = 100;
const CHAR_X_END   = 1820;  // sai pela direita

// ─── Intensidade ─────────────────────────────
const monthIntensity = (phase: GamePhase | null, all: GamePhase[]) => {
  if (!phase || phase.count === 0) return 0;
  return clamp(phase.count / Math.max(...all.map(p => p.count), 1), 0, 1);
};

// ─── Posição X: corre da esquerda para a direita durante a fase ───────
const charXAtFrame = (phase: GamePhase | null, globalFrame: number, intensity: number): number => {
  if (!phase) return CHAR_X_START + 80;
  const local = globalFrame - phase.startFrame;
  const dur   = phase.durationInFrames;
  // Progresso linear 0→1 ao longo da fase + pequena oscilação
  const base = clamp(local / dur, 0, 1);
  // Nos últimos 15 frames, corre rápido para fora (saída de fase)
  const exitStart = dur - 15;
  if (local >= exitStart) {
    const exitPct = (local - exitStart) / 15;
    return CHAR_X_END * (base + exitPct * 0.2);
  }
  const osc = Math.sin(globalFrame * 0.12) * 18 * intensity;
  return CHAR_X_START + (CHAR_X_END - CHAR_X_START) * base + osc;
};

// ─── Ciclo de corrida ─────────────────────────
type RunPose = { skewX: number; bounceY: number; rotateZ: number };
const runPose = (localFrame: number, intensity: number): RunPose => {
  const cl = Math.round(18 - intensity * 5);
  const t  = (localFrame % cl) / cl;
  return {
    skewX:   Math.sin(t * Math.PI * 2) * (3 + intensity * 5),
    bounceY: -Math.abs(Math.sin(t * Math.PI)) * (6 + intensity * 18),
    rotateZ: Math.sin(t * Math.PI * 2 + 0.8) * (2 + intensity * 4),
  };
};

// ─── Sprites de animais da selva (arte original) ──────────────────────

// Onça pintada
const JAGUAR_ROWS = [
  "....kooook....",
  "...koyyyyok...",
  "..koyykkyyok..",
  "..koyyyyyook..",
  "..kooooooook..",
  ".kooooooooook.",
  "kookkookkoookk",
  "kooyooyooyooyk",
  ".kooooooooook.",
  "..ko....ok....",
  ".koo....ook...",
  "koo......ook..",
];
const JAGUAR_PALETTE: Record<string,string> = {
  k:"#08050f", o:"#c8730a", y:"#f5c842", r:"#7a1f1f"
};

// Javali
const BOAR_ROWS = [
  "...kbbbbbk...",
  "..kbgggggbk..",
  ".kbgwgggwgbk.",
  ".kbbgggggbbk.",
  "kbbbbbbbbbbbk",
  "kbgbgbgbgbgbk",
  ".kbbk.k.kbbk.",
  "..kk.....kk..",
];
const BOAR_PALETTE: Record<string,string> = {
  k:"#08050f", b:"#3a2a1a", g:"#6b5030", w:"#e0c8a0"
};

// Jacaré
const CAIMAN_ROWS = [
  "..kgggggggggk.",
  ".kggwggggwggk.",
  "kgggggggggggk.",
  "kgggggggggggk.",
  ".kwgwgwgwgwgk.",
  "..k.k.k.k.k...",
];
const CAIMAN_PALETTE: Record<string,string> = {
  k:"#08050f", g:"#3a6e1f", w:"#c8e8a0"
};

// Buraco no chão (não é sprite — desenhado como CSS, mas representado aqui)
// Usamos SVG inline via PixelArt; como é retangular, usamos um elemento div.

const ANIMAL_SPRITES = [
  { rows: JAGUAR_ROWS, palette: JAGUAR_PALETTE, label: "onça",   tall: true  },
  { rows: BOAR_ROWS,   palette: BOAR_PALETTE,   label: "javali", tall: false },
  { rows: CAIMAN_ROWS, palette: CAIMAN_PALETTE, label: "jacaré", tall: false },
];

// ─── Buraco ───────────────────────────────────
const PitHole: React.FC<{ x: number }> = ({ x }) => (
  <div style={{
    position: "absolute",
    left: x,
    top: GROUND_Y + CHAR_H - 36,
    width: 96,
    height: 22,
    background: "#0b0908",
    borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
    boxShadow: "inset 0 6px 14px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.5)",
    zIndex: 4,
  }} />
);

// ─── Partículas de celebração ─────────────────
const CelebrationParticles: React.FC<{x:number;y:number;age:number;color:string;count?:number}> = ({
  x, y, age, color, count = 8,
}) => {
  if (age > 24) return null;
  return <>
    {Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      const sp = 3 + (i % 3) * 2.2;
      const sz = 5 + (i % 3) * 3;
      const op = clamp(1 - age / 24, 0, 1);
      return <div key={i} style={{
        position:"absolute",
        left: x + Math.cos(a) * age * sp - sz/2,
        top:  y + Math.sin(a) * age * sp + age*age*0.12 - sz/2,
        width: sz, height: sz,
        borderRadius: i%2===0 ? "50%" : 1,
        background: i%3===0 ? "#ffffff" : color,
        opacity: op,
        boxShadow: `0 0 ${sz*2}px ${color}`,
      }} />;
    })}
  </>;
};

// ─── Score popup ─────────────────────────────
const ScorePopup: React.FC<{event:ScoreEvent;currentFrame:number;charX:number;theme:ThemeSpec}> = ({
  event, currentFrame, charX, theme,
}) => {
  const age = currentFrame - event.frame;
  if (age < 0 || age > 32) return null;
  const op = interpolate(age, [0,6,28,32], [0,1,1,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <div style={{
    position:"absolute", left: charX + CHAR_W + 12, top: GROUND_Y - 80 - age * 2.8,
    fontFamily: theme.fonts.display, fontSize: event.bonus ? 28 : 22,
    color: event.bonus ? theme.colors.accent2 : theme.colors.accent,
    textShadow:`0 0 12px ${theme.colors.glow}`, opacity: op, pointerEvents:"none", zIndex:10,
  }}>{event.bonus ? "+5 BÔNUS" : `+${event.points}`}</div>;
};

// ─── Objeto coletável ─────────────────────────
const CollectableObject: React.FC<{
  obj:RunObject; phase:GamePhase; globalFrame:number; charX:number; theme:ThemeSpec;
}> = ({ obj, phase, globalFrame, charX, theme }) => {
  const hitG   = phase.startFrame + obj.hitAt;
  const spawnG = phase.startFrame + obj.spawnAt;
  if (globalFrame < spawnG || globalFrame > hitG + 24) return null;
  const collected = globalFrame >= hitG;
  const tp = obj.hitAt - obj.spawnAt;
  const travelPct = tp > 0 ? clamp((globalFrame - spawnG) / tp, 0, 1) : 1;
  // Objetos vêm da direita em direção ao explorador
  const x = interpolate(travelPct, [0,1], [1900, charX + CHAR_W - 10]);
  const baseY = GROUND_Y - 80 - obj.lane * 130;
  const bobY  = baseY + Math.sin(globalFrame * 0.2 + obj.lane * 3) * 9;
  const cAge  = globalFrame - hitG;
  const cScale = collected
    ? interpolate(cAge, [0,6,14], [1.4,2.2,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"})
    : 1 + Math.sin(globalFrame * 0.18 + obj.lane) * 0.09;
  const cOp = collected
    ? interpolate(cAge, [0,4,14], [1,1,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"}) : 1;
  const sprite = obj.variant===2 ? CHEST : obj.lane>0.6 ? GEM : COIN;
  const sc = obj.variant===2 ? 7 : 6;
  return <>
    <div style={{
      position:"absolute", left: x, top: bobY,
      transform:`scale(${cScale})`, transformOrigin:"center center", opacity: cOp,
      filter: collected
        ? `drop-shadow(0 0 18px ${theme.colors.accent}) brightness(2.5)`
        : `drop-shadow(0 0 7px ${theme.colors.glow})`,
      zIndex:5,
    }}>
      <PixelArt sprite={sprite} scale={sc} />
    </div>
    {collected && <CelebrationParticles
      x={x + (sprite.rows[0]?.length??8)*sc*0.5} y={bobY + sprite.rows.length*sc*0.5}
      age={cAge} color={obj.variant===2 ? theme.colors.accent2 : theme.colors.accent}
      count={obj.variant===2 ? 12 : 8}
    />}
  </>;
};

// ─── Obstáculo (animal ou buraco) ─────────────
const Obstacle: React.FC<{obs:ObstacleEvent;phase:GamePhase;globalFrame:number;charX:number}> = ({
  obs, phase, globalFrame, charX,
}) => {
  const hitG   = phase.startFrame + obs.hitAt;
  const spawnG = phase.startFrame + obs.spawnAt;
  if (globalFrame < spawnG || globalFrame > hitG + 8) return null;
  const tp = obs.hitAt - obs.spawnAt;
  const travelPct = tp > 0 ? clamp((globalFrame - spawnG) / tp, 0, 1) : 1;
  const x = interpolate(travelPct, [0,1], [1920, charX + CHAR_W + 50]);

  // variant 0=jaguar, 1=boar, 2=caiman, 3=pit
  if (obs.variant === 3) {
    // Buraco: aparece fixo um pouco à frente do explorador
    return <PitHole x={charX + CHAR_W + 90} />;
  }

  const animalIdx = obs.variant % ANIMAL_SPRITES.length;
  const animal = ANIMAL_SPRITES[animalIdx]!;
  const sc = animal.tall ? 7 : 8;

  return <div style={{
    position:"absolute", left: x,
    top: GROUND_Y - animal.rows.length * sc + (animal.tall ? 0 : 8),
    filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
    zIndex:4,
  }}>
    <PixelArt sprite={{ rows: animal.rows, palette: animal.palette }} scale={sc} />
  </div>;
};

// ─── Poeira ───────────────────────────────────
const DustPuff: React.FC<{x:number;frame:number;intensity:number}> = ({x,frame,intensity}) => {
  const count = 2 + Math.round(intensity * 3);
  return <>
    {Array.from({length:count},(_,i) => {
      const age = (frame - i * 4) % 16;
      if (age < 0 || age > 14) return null;
      const op = (1 - age/14) * (0.4 + intensity*0.3);
      const sp = age * (2 + intensity * 1.5);
      return <div key={i} style={{
        position:"absolute", left: x - 10 - sp + i*7, top: GROUND_Y + CHAR_H - 44,
        width: 8+age, height: 6+age*0.4, borderRadius:"50%",
        background:"rgba(139,90,43,0.65)", opacity:op, filter:"blur(2px)",
      }}/>;
    })}
  </>;
};

// ─── Transição de fase: flash + banner de fase ─
const PhaseTransition: React.FC<{phase:GamePhase;globalFrame:number;theme:ThemeSpec}> = ({
  phase, globalFrame, theme,
}) => {
  const framesTillEnd = phase.endFrame - globalFrame;
  if (framesTillEnd > 22 || framesTillEnd < 0) return null;
  const flash = interpolate(framesTillEnd, [0,22], [0,0.45], {extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <div style={{
    position:"absolute", inset:0, background: theme.colors.accent, opacity: flash,
    zIndex:20, pointerEvents:"none",
  }}/>;
};

// ─── Componente principal ─────────────────────
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
  theme, phase, globalFrame, allPhases, scoreEvents, timeline, isIntro, isOutro,
}) => {
  const localFrame = phase ? phaseLocalFrame(phase, globalFrame) : globalFrame;
  const intensity  = monthIntensity(phase, allPhases);

  // Posição X: atravessa a tela ao longo da fase
  const charX = isOutro
    ? 800 + Math.sin(globalFrame * 0.05) * 120
    : charXAtFrame(phase, globalFrame, intensity);

  const jumpHeight = phase ? jumpLift(phase, localFrame, 145) : 0;
  const isJumping  = jumpHeight > 2;
  const pose = runPose(isIntro || isOutro ? globalFrame : localFrame, isOutro ? 1 : intensity);
  const charY = GROUND_Y - CHAR_H + 10 - jumpHeight + (isJumping ? 0 : pose.bounceY);

  const scrollSpeed  = 3.5 + intensity * 5;
  const scrollOffset = (globalFrame * scrollSpeed) % 120;
  const recent       = recentEvents(scoreEvents, globalFrame, 32);
  const outroFrame   = isOutro ? globalFrame - timeline.runEnd : -1;

  // Fases visíveis para objetos/obstáculos
  const visiblePhases = phase
    ? allPhases.filter(p =>
        Math.abs(p.month - phase.month) <= 1 &&
        p.endFrame + 60 >= globalFrame &&
        p.startFrame - 60 <= globalFrame + 120,
      )
    : [];

  // Cor de fundo da selva varia ligeiramente por mês (paleta cíclica)
  const jungleHues = [
    "#0a1208","#0c1a0a","#0e1f0c","#0a1a10","#091512",
    "#101808","#0d1a07","#0b1a0f","#111e0a","#0c1610",
    "#0e1b0c","#0b1908",
  ];
  const bgColor = jungleHues[(phase?.month ?? 1) % jungleHues.length] ?? "#0a1208";

  return (
    <div style={{position:"absolute",left:0,top:0,width:1920,height:GAME_H,overflow:"hidden",background:bgColor}}>

      {/* Flash transição de fase */}
      {phase && <PhaseTransition phase={phase} globalFrame={globalFrame} theme={theme} />}

      {/* Gramado / terra */}
      <div style={{
        position:"absolute",left:0,right:0,
        top: GROUND_Y + CHAR_H - 40, height:32,
        background:"#3a2a10",
        borderTop:"7px solid #5a4018",
        backgroundImage:"repeating-linear-gradient(90deg,rgba(255,210,63,0.1) 0 36px,transparent 36px 72px)",
        backgroundPosition:`${-scrollOffset}px 0`,
      }}/>
      {/* Água embaixo */}
      <div style={{
        position:"absolute",left:0,right:0,bottom:0,height:64,
        background:"linear-gradient(180deg,#0d3a5e 0%,#061a2e 100%)",
        borderTop:"5px solid #1a6090",
      }}/>

      {/* Buracos fixos por fase (variant 3) */}
      {visiblePhases.map(p =>
        p.obstacles.filter(o => o.variant === 3).map((obs, i) => {
          const hitG = p.startFrame + obs.hitAt;
          if (Math.abs(globalFrame - hitG) > 45) return null;
          return <PitHole key={`pit-${p.month}-${i}`} x={charX + CHAR_W + 80} />;
        })
      )}

      {/* Obstáculos animais */}
      {visiblePhases.map(p =>
        p.obstacles.filter(o => o.variant !== 3).map(obs => (
          <Obstacle key={obs.id} obs={obs} phase={p} globalFrame={globalFrame} charX={charX} />
        ))
      )}

      {/* Objetos coletáveis */}
      {visiblePhases.map(p =>
        p.objects.map(obj => (
          <CollectableObject key={obj.id} obj={obj} phase={p} globalFrame={globalFrame} charX={charX} theme={theme} />
        ))
      )}

      {/* Poeira */}
      {!isJumping && <DustPuff x={charX} frame={localFrame} intensity={intensity} />}

      {/* Explorador */}
      <div style={{
        position:"absolute", left: charX, top: charY,
        transform:`skewX(${isJumping?0:pose.skewX}deg) rotate(${isJumping?-14:pose.rotateZ}deg)`,
        transformOrigin:"bottom center",
        filter:`drop-shadow(0 0 10px rgba(255,210,63,0.4)) drop-shadow(2px 4px 6px rgba(0,0,0,0.6))`,
        zIndex:8,
      }}>
        <PixelArt sprite={EXPLORER} scale={CHAR_SCALE} />
      </div>

      {/* Score popups */}
      {recent.map(ev => (
        <ScorePopup key={`${ev.objectId}-${ev.frame}`} event={ev} currentFrame={globalFrame} charX={charX} theme={theme} />
      ))}

      {/* Fogos + mensagem final */}
      {isOutro && outroFrame >= 0 && <>
        <Fireworks outroFrame={outroFrame} themeId={theme.id} seed={timeline.seed} stageW={1920} stageH={GAME_H} />
        <OutroMessage outroFrame={outroFrame} themeId={theme.id} login={timeline.login}
          totalContribs={timeline.baseTotal} year={timeline.year}
          accentColor={theme.colors.accent} glowColor={theme.colors.glow}
          fontDisplay={theme.fonts.display} fontNarrative={theme.fonts.narrative} />
      </>}

      {/* Intro */}
      {isIntro && <div style={{
        position:"absolute",left:0,right:0,top:"38%",textAlign:"center",
        fontFamily:theme.fonts.display,fontSize:36,letterSpacing:"0.12em",
        color:theme.colors.accent,textShadow:`0 0 24px ${theme.colors.glow}`,opacity:0.9,
      }}>INSERIR CRÉDITO</div>}
    </div>
  );
};
