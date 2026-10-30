/**
 * MetroidRun.tsx — palco do tema Super Metroid (v0.1.1-r3)
 *
 * Labirinto subterrâneo com água, lava, pedras, diamantes e paredes.
 * Caçador desce e percorre o labirinto da esquerda para a direita.
 * Monstros variados a cada mês (5 tipos diferentes).
 * Ao final do mês sai pela direita e entra num novo setor.
 */

import React from "react";
import { interpolate } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { HUNTER } from "../art/sprites";
import type { ThemeSpec } from "../theme";
import type { GamePhase, RunObject, GameTimeline } from "./timeline";
import { phaseLocalFrame, jumpLift } from "./timeline";
import type { ScoreEvent } from "./timeline";
import { recentEvents } from "./score";
import { clamp } from "./prng";
import { Fireworks, OutroMessage } from "./Fireworks";

// ─── Layout ──────────────────────────────────
const GAME_H   = 776;
const FLOOR_Y  = GAME_H - 100;
const CHAR_SC  = 11;
const CHAR_W   = 12 * CHAR_SC;
const CHAR_H   = 18 * CHAR_SC;
const CHAR_X_START = 80;
const CHAR_X_END   = 1820;

// ─── Intensidade ─────────────────────────────
const monthIntensity = (phase: GamePhase | null, all: GamePhase[]) => {
  if (!phase || phase.count === 0) return 0;
  return clamp(phase.count / Math.max(...all.map(p => p.count), 1), 0, 1);
};

// ─── Posição X: percorre a tela da esquerda para a direita ───────────
const charXAtFrame = (phase: GamePhase | null, globalFrame: number, intensity: number): number => {
  if (!phase) return CHAR_X_START + 60;
  const local = globalFrame - phase.startFrame;
  const dur   = phase.durationInFrames;
  const base  = clamp(local / dur, 0, 1);
  const exitStart = dur - 15;
  if (local >= exitStart) {
    const exitPct = (local - exitStart) / 15;
    return CHAR_X_END * (base + exitPct * 0.22);
  }
  const osc = Math.sin(globalFrame * 0.1) * 22 * intensity;
  return CHAR_X_START + (CHAR_X_END - CHAR_X_START - 180) * base + osc;
};

// ─── Ciclo de corrida ─────────────────────────
type RunPose = { skewX: number; translateY: number; rotateZ: number };
const runPose = (frame: number, intensity: number): RunPose => {
  const cl = Math.round(18 - intensity * 5);
  const t  = (frame % cl) / cl;
  return {
    translateY: -Math.abs(Math.sin(t * Math.PI)) * (5 + intensity * 20),
    skewX:       Math.sin(t * Math.PI * 2) * (4 + intensity * 5),
    rotateZ:     Math.sin(t * Math.PI * 2 + 0.6) * (2 + intensity * 3),
  };
};

// ─── Sprites de monstros do labirinto (arte original) ────────────────

// Blob de lava
const LAVA_BLOB_ROWS = [
  "...krrk...",
  "..krookk..",
  ".kroooork.",
  "krooooork.",
  "krooooork.",
  ".kroooork.",
  "..krorkk..",
  "...krrk...",
];
const LAVA_BLOB_PAL: Record<string,string> = { k:"#08050f", r:"#cc2200", o:"#ff6622" };

// Aranha de caverna
const SPIDER_ROWS = [
  "k.kgggk.k",
  ".kgggggk.",
  "kgwggwggk",
  "kgggggggk",
  ".kgggggk.",
  "k.k.k.k.k",
];
const SPIDER_PAL: Record<string,string> = { k:"#08050f", g:"#3a1a4a", w:"#dd88ff" };

// Criatura de pedra
const GOLEM_ROWS = [
  "..ksssk...",
  ".ksddddsk.",
  "ksdddddsk.",
  "ksdddddsk.",
  ".kssssssk.",
  "..ksdsk...",
  ".ksdddsk..",
  "ksd...dsk.",
];
const GOLEM_PAL: Record<string,string> = { k:"#08050f", s:"#4a4444", d:"#7a7070" };

// Morcego
const BAT_ROWS = [
  "k.kkkkk.k",
  "kkpkpkpkk",
  "kpppppppk",
  ".kppkppk.",
  "..kppk...",
  "...kk....",
];
const BAT_PAL: Record<string,string> = { k:"#08050f", p:"#5a2878" };

// Alien do labirinto (diferente do original)
const MAZE_ALIEN_ROWS = [
  "..kaaaak..",
  ".kaaaaaak.",
  "kawggwgaak",
  "kaaaaaaaak",
  "ka.a.a.aak",
  ".kaaaaak..",
  "..kak.kk..",
];
const MAZE_ALIEN_PAL: Record<string,string> = { k:"#08050f", a:"#0a8060", g:"#80ffcc", w:"#ffffff" };

const MONSTER_SPRITES = [
  { rows: LAVA_BLOB_ROWS, palette: LAVA_BLOB_PAL, sc: 7 },
  { rows: SPIDER_ROWS,    palette: SPIDER_PAL,    sc: 8 },
  { rows: GOLEM_ROWS,     palette: GOLEM_PAL,     sc: 8 },
  { rows: BAT_ROWS,       palette: BAT_PAL,        sc: 8 },
  { rows: MAZE_ALIEN_ROWS,palette: MAZE_ALIEN_PAL, sc: 7 },
];

// ─── Elementos do labirinto (decoração de fundo) ──────────────────────
const MazeDeco: React.FC<{ frame: number; phase: GamePhase | null; theme: ThemeSpec }> = ({
  frame, phase, theme,
}) => {
  const month = phase?.month ?? 1;
  // Lava ou água no fundo dependendo do mês
  const isLava = month % 3 === 0;
  const floorColor   = isLava ? "#8b1a00" : "#0a3050";
  const floorGlow    = isLava ? "rgba(220,80,0,0.5)" : "rgba(0,120,220,0.4)";
  const scrollOffset = (frame * 2.2) % 80;

  return <>
    {/* Piso de labirinto animado */}
    <div style={{
      position:"absolute", left:0, right:0,
      top: FLOOR_Y + CHAR_H - 24, height:24,
      background: floorColor,
      borderTop: `5px solid ${isLava ? "#ff4400" : "#1a80c0"}`,
      boxShadow: `0 -4px 20px ${floorGlow}`,
      backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.06) 0 40px,transparent 40px 80px)",
      backgroundPosition: `${-scrollOffset}px 0`,
    }}/>
    {/* Reflexo de lava/água */}
    <div style={{
      position:"absolute", left:0, right:0, bottom:0,
      top: FLOOR_Y + CHAR_H + 0,
      background: isLava
        ? "repeating-linear-gradient(90deg,#4a0800 0 40px,#3a0600 40px 80px)"
        : "repeating-linear-gradient(90deg,#061828 0 40px,#040e18 40px 80px)",
      backgroundPosition: `${-scrollOffset}px 0`,
    }}/>
    {/* Pedras/diamantes nas paredes */}
    {Array.from({length:6},(_,i) => {
      const x = ((i * 320) - (frame * 2.8) % 1920 + 1920) % 1960 - 40;
      const isDiamond = (i + month) % 3 === 0;
      return <div key={i} style={{
        position:"absolute", left: x,
        top: FLOOR_Y - 60 - (i%3)*40,
        width: isDiamond ? 18 : 24, height: isDiamond ? 18 : 16,
        background: isDiamond
          ? `radial-gradient(circle,#a0e8ff,${theme.colors.accent})`
          : "#4a3a3a",
        clipPath: isDiamond ? "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" : undefined,
        borderRadius: isDiamond ? 0 : 3,
        boxShadow: isDiamond ? `0 0 12px ${theme.colors.glow}` : undefined,
        opacity: 0.85,
      }}/>;
    })}
    {/* Stalactites do teto */}
    {Array.from({length:8},(_,i) => {
      const x = ((i * 240) - (frame * 1.4) % 1920 + 1920) % 1960 - 40;
      const h = 30 + (i%4)*25;
      return <div key={`stal-${i}`} style={{
        position:"absolute", left: x, top: 0,
        width: 22, height: h,
        background: "linear-gradient(180deg,#1a0a2e,#2a1050)",
        clipPath: "polygon(0 0,100% 0,50% 100%)",
      }}/>;
    })}
  </>;
};

// ─── Tiros do caçador ─────────────────────────
const SHOT_SPEED = 26;
const SHOT_LIFE  = 48;
type Shot = { id:string; startX:number; startY:number; startFrame:number };

const buildShots = (phases: GamePhase[], introFrames: number): Shot[] => {
  const shots: Shot[] = [];
  for (const phase of phases) {
    if (!phase.hasActivity) continue;
    for (const obj of phase.objects) {
      const globalHit    = phase.startFrame + obj.hitAt;
      const travelFrames = Math.round((1920 - CHAR_X_START - CHAR_W) / SHOT_SPEED);
      const fireFrame    = globalHit - travelFrames;
      if (fireFrame < introFrames) continue;
      shots.push({
        id: `shot-${phase.month}-${obj.id}`,
        startX: CHAR_X_START + CHAR_W,
        startY: FLOOR_Y - CHAR_H + 10 + CHAR_H * 0.4,
        startFrame: fireFrame,
      });
    }
  }
  return shots;
};

// ─── Explosão de monstro ─────────────────────
const MonsterBurst: React.FC<{x:number;y:number;age:number;theme:ThemeSpec;big?:boolean}> = ({
  x, y, age, theme, big=false,
}) => {
  if (age > 22) return null;
  const n  = big ? 8 : 5;
  const sp = age * (big ? 7 : 5.5);
  const op = 1 - age / 22;
  return <>
    {age < 5 && <div style={{position:"absolute",left:x-14,top:y-14,width:28,height:28,borderRadius:"50%",background:"#fff",opacity:(1-age/5)*0.85,boxShadow:`0 0 30px ${theme.colors.accent}`}}/>}
    {Array.from({length:n},(_,i) => {
      const a = (i/n)*Math.PI*2 + age*0.1;
      const px=x+Math.cos(a)*sp, py=y+Math.sin(a)*sp;
      const sz = big ? 12 : 8;
      return <div key={i} style={{position:"absolute",left:px-sz/2,top:py-sz/2,width:sz,height:sz,background:i%2===0?theme.colors.accent2:theme.colors.accent,opacity:op*0.9,boxShadow:`0 0 ${sz*2}px ${theme.colors.glow}`}}/>;
    })}
  </>;
};

// ─── Porta de setor ──────────────────────────
const SectorDoor: React.FC<{x:number;openProgress:number;theme:ThemeSpec}> = ({x,openProgress,theme}) => {
  const dH = GAME_H * 0.6;
  const dW = 60;
  const dY = (GAME_H - dH) / 2;
  const half = openProgress * (dW/2 + 10);
  return <div style={{position:"absolute",left:x,top:dY,width:dW,height:dH}}>
    <div style={{position:"absolute",inset:0,border:`8px solid ${theme.colors.accent2}`,boxShadow:`0 0 30px ${theme.colors.glow}`,zIndex:2}}/>
    <div style={{position:"absolute",left:8,top:8,width:"calc(50% - 8px)",height:"calc(100% - 16px)",background:"linear-gradient(90deg,#3d1a66,#1b0b34)",transform:`translateX(${-half}px)`,zIndex:1,borderRight:`2px solid ${theme.colors.accent}44`}}/>
    <div style={{position:"absolute",right:8,top:8,width:"calc(50% - 8px)",height:"calc(100% - 16px)",background:"linear-gradient(270deg,#3d1a66,#1b0b34)",transform:`translateX(${half}px)`,zIndex:1,borderLeft:`2px solid ${theme.colors.accent}44`}}/>
    {openProgress > 0.3 && <div style={{position:"absolute",inset:8,background:`radial-gradient(ellipse,${theme.colors.accent}55 0%,transparent 70%)`,opacity:openProgress,zIndex:3}}/>}
  </div>;
};

// ─── Score popup ─────────────────────────────
const ScorePopup: React.FC<{event:ScoreEvent;currentFrame:number;x:number;y:number;theme:ThemeSpec}> = ({
  event, currentFrame, x, y, theme,
}) => {
  const age = currentFrame - event.frame;
  if (age < 0 || age > 28) return null;
  const op = interpolate(age,[0,4,24,28],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <div style={{position:"absolute",left:x,top:y-age*2.8,fontFamily:theme.fonts.display,fontSize:event.bonus?26:21,color:event.bonus?theme.colors.accent2:theme.colors.accent,textShadow:`0 0 14px ${theme.colors.glow}`,opacity:op,pointerEvents:"none",zIndex:10}}>{event.bonus?"+5 BÔNUS":`+${event.points}`}</div>;
};

// ─── Poeira de corrida ────────────────────────
const RunDust: React.FC<{charX:number;frame:number;intensity:number;theme:ThemeSpec}> = ({
  charX, frame, intensity, theme,
}) => {
  const count = 2 + Math.round(intensity * 3);
  return <>{Array.from({length:count},(_,i) => {
    const age = (frame - i*5) % 18;
    if (age < 0 || age > 14) return null;
    const op = (1-age/14)*(0.4+intensity*0.3);
    const sp = age*(2+intensity*1.5);
    return <div key={i} style={{position:"absolute",left:charX-10-sp+i*6,top:FLOOR_Y+14,width:8+age,height:6+age*0.4,borderRadius:"50%",background:`rgba(53,240,192,0.35)`,opacity:op,filter:"blur(2px)"}}/>;
  })}</>;
};

// ─── Componente principal ─────────────────────
type Props = {
  theme:ThemeSpec; phase:GamePhase|null; globalFrame:number;
  allPhases:GamePhase[]; scoreEvents:ScoreEvent[];
  introFrames:number; timeline:GameTimeline; isIntro:boolean; isOutro:boolean;
};

export const MetroidRun: React.FC<Props> = ({
  theme, phase, globalFrame, allPhases, scoreEvents, introFrames, timeline, isIntro, isOutro,
}) => {
  const shots     = buildShots(allPhases, introFrames);
  const intensity = monthIntensity(phase, allPhases);
  const localFrame= phase ? phaseLocalFrame(phase, globalFrame) : globalFrame;
  const outroFrame= isOutro ? globalFrame - timeline.runEnd : -1;

  const jumpHeight = phase ? jumpLift(phase, localFrame, 150) : 0;
  const isJumping  = jumpHeight > 2;

  const charX = isOutro
    ? 860 + Math.sin(globalFrame * 0.05) * 110
    : charXAtFrame(phase, globalFrame, intensity);

  const pose = runPose(isIntro || isOutro ? globalFrame : localFrame, isOutro ? 1 : intensity);
  const charY = FLOOR_Y - CHAR_H + 10 - jumpHeight + (isJumping ? 0 : pose.translateY);

  const recentShot = shots.find(s => Math.abs(s.startFrame - globalFrame) < 4);
  const muzzleFlash = recentShot
    ? interpolate(Math.abs(recentShot.startFrame - globalFrame),[0,4],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"})
    : 0;

  const activeShots = shots.filter(s => { const a=globalFrame-s.startFrame; return a>=0&&a<SHOT_LIFE; });

  const visiblePhases = allPhases.filter(p => p.endFrame+60>=globalFrame && p.startFrame-120<=globalFrame);
  const recent = recentEvents(scoreEvents, globalFrame, 30);

  // Monster positions
  const monsterPositions = new Map<string,{x:number;y:number;sprIdx:number}>();
  for (const p of visiblePhases) {
    for (const obj of p.objects) {
      const travel = obj.hitAt - obj.spawnAt;
      const age    = globalFrame - (p.startFrame + obj.spawnAt);
      const tp     = travel > 0 ? clamp(age/travel, 0, 1) : 1;
      const x = interpolate(tp,[0,1],[1900, charX + CHAR_W + 60]);
      const baseY = FLOOR_Y - CHAR_H * 0.65 + obj.lane * 90;
      // Deterministic monster type from object id
      const sprIdx = (obj.id.charCodeAt(3) + (phase?.month ?? 1)) % MONSTER_SPRITES.length;
      monsterPositions.set(obj.id, { x, y: baseY, sprIdx });
    }
  }

  // Portas
  const doorPhases = phase
    ? allPhases.filter(p => p.month >= phase.month - 1 && p.month <= phase.month + 1)
    : [];

  const scrollOffset = (globalFrame * (3.8 + intensity * 3)) % 96;

  return (
    <div style={{position:"absolute",left:0,top:0,width:1920,height:GAME_H,overflow:"hidden"}}>

      {/* Decoração do labirinto: chão, paredes, diamantes, stalactites */}
      <MazeDeco frame={globalFrame} phase={phase} theme={theme} />

      {/* Chão animado */}
      <div style={{
        position:"absolute",left:0,right:0,
        top: FLOOR_Y + CHAR_H - 30, height:22,
        background:"#1a0b2e",
        borderTop:`6px solid ${theme.colors.accent2}`,
        backgroundImage:"repeating-linear-gradient(90deg,rgba(192,77,240,0.1) 0 44px,transparent 44px 88px)",
        backgroundPosition:`${-scrollOffset}px 0`,
        boxShadow:`0 0 20px rgba(192,77,240,0.25)`,
      }}/>

      {/* Tiros */}
      {activeShots.map(shot => {
        const age = globalFrame - shot.startFrame;
        const x   = charX + CHAR_W + age * SHOT_SPEED;
        if (x > 1960) return null;
        return <div key={shot.id} style={{position:"absolute",left:x,top:shot.startY-4,width:34,height:8,borderRadius:4,background:`linear-gradient(90deg,transparent,${theme.colors.accent} 50%,#fff)`,boxShadow:`0 0 12px ${theme.colors.glow}`,opacity:0.95}}/>;
      })}

      {/* Monstros e explosões */}
      {visiblePhases.map(p =>
        p.objects.map(obj => {
          const globalSpawn = p.startFrame + obj.spawnAt;
          const globalHit   = p.startFrame + obj.hitAt;
          if (globalFrame < globalSpawn || globalFrame > globalHit + 22) return null;
          const pos = monsterPositions.get(obj.id);
          if (!pos) return null;
          const destroyed  = globalFrame >= globalHit;
          const destroyAge = globalFrame - globalHit;
          const blinkOp    = destroyAge>=0&&destroyAge<8?(Math.floor(destroyAge/2)%2===0?0.2:1):1;
          if (destroyed && destroyAge > 22) return null;
          const monster = MONSTER_SPRITES[pos.sprIdx]!;
          const sc = obj.variant===2 ? monster.sc + 2 : monster.sc;
          // Bat and blob float up and down
          const floatY = pos.sprIdx<=1 ? Math.sin(globalFrame*0.12 + pos.sprIdx)*18 : 0;
          return <React.Fragment key={obj.id}>
            {!destroyed ? (
              <div style={{position:"absolute",left:pos.x,top:pos.y+floatY,opacity:blinkOp,filter:`drop-shadow(0 0 8px rgba(192,77,240,0.6))`,zIndex:5}}>
                <PixelArt sprite={{rows:monster.rows,palette:monster.palette}} scale={sc}/>
              </div>
            ) : (
              <MonsterBurst x={pos.x+(monster.rows[0]?.length??8)*sc*0.5} y={pos.y+monster.rows.length*sc*0.5} age={destroyAge} theme={theme} big={obj.variant===2}/>
            )}
          </React.Fragment>;
        })
      )}

      {/* Portas */}
      {doorPhases.map(p => {
        const doorStart = p.endFrame - 40;
        if (globalFrame < doorStart - 60 || globalFrame > p.endFrame + 30) return null;
        const openProgress = globalFrame >= doorStart ? clamp((globalFrame - doorStart)/40, 0, 1) : 0;
        return <SectorDoor key={`door-${p.month}`} x={1620} openProgress={openProgress} theme={theme}/>;
      })}

      {/* Score popups */}
      {recent.map(ev => {
        let x=charX+CHAR_W+40, y=charY;
        for (const p of visiblePhases) {
          const obj = p.objects.find(o => o.id===ev.objectId);
          if (obj) { const pos=monsterPositions.get(obj.id); if(pos){x=pos.x+30;y=pos.y;} break; }
        }
        return <ScorePopup key={`${ev.objectId}-${ev.frame}`} event={ev} currentFrame={globalFrame} x={x} y={y} theme={theme}/>;
      })}

      {/* Poeira */}
      {!isJumping && <RunDust charX={charX} frame={localFrame} intensity={intensity} theme={theme}/>}

      {/* Caçador */}
      <div style={{
        position:"absolute", left:charX, top:charY,
        transform:`skewX(${isJumping?0:pose.skewX}deg) rotate(${isJumping?-10:pose.rotateZ}deg)`,
        transformOrigin:"bottom center",
        filter: muzzleFlash>0
          ? `drop-shadow(0 0 22px ${theme.colors.accent}) brightness(${1+muzzleFlash*0.7})`
          : `drop-shadow(0 0 14px rgba(53,240,192,0.45)) drop-shadow(2px 4px 6px rgba(0,0,0,0.5))`,
        zIndex:8,
      }}>
        <PixelArt sprite={HUNTER} scale={CHAR_SC}/>
      </div>

      {/* Muzzle flash */}
      {muzzleFlash>0 && <div style={{position:"absolute",left:charX+CHAR_W-4,top:charY+CHAR_H*0.35,width:28,height:28,borderRadius:"50%",background:theme.colors.accent,opacity:muzzleFlash*0.9,boxShadow:`0 0 24px ${theme.colors.glow}`,zIndex:9}}/>}

      {/* Fogos + mensagem final */}
      {isOutro && outroFrame>=0 && <>
        <Fireworks outroFrame={outroFrame} themeId={theme.id} seed={timeline.seed} stageW={1920} stageH={GAME_H}/>
        <OutroMessage outroFrame={outroFrame} themeId={theme.id} login={timeline.login}
          totalContribs={timeline.baseTotal} year={timeline.year}
          accentColor={theme.colors.accent} glowColor={theme.colors.glow}
          fontDisplay={theme.fonts.display} fontNarrative={theme.fonts.narrative}/>
      </>}

      {/* Intro */}
      {isIntro && <div style={{position:"absolute",left:0,right:0,top:"40%",textAlign:"center",fontFamily:theme.fonts.display,fontSize:30,letterSpacing:"0.14em",color:theme.colors.accent,textShadow:`0 0 28px ${theme.colors.glow}`}}>INICIANDO MISSÃO</div>}
    </div>
  );
};
