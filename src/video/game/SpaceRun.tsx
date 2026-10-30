/**
 * SpaceRun.tsx — palco do tema Espaço (v0.1.1-r3)
 *
 * Nave percorre a tela da esquerda para a direita durante cada mês.
 * Inimigos variados: nave inimiga, meteoro, alien voador, planeta pequeno, asteroide.
 * Ao final do mês a nave sai pela direita e entra num novo setor.
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

// ─── Layout ──────────────────────────────────
const GAME_H   = 776;
const SHIP_SC  = 9;
const SHIP_W   = 14 * SHIP_SC;
const SHIP_H   = 21 * SHIP_SC;

// A nave percorre a tela horizontalmente ao longo do mês
const SHIP_X_START = 80;
const SHIP_X_END   = 1820;
const SHIP_Y_MID   = GAME_H / 2 - SHIP_H / 2;

// ─── Intensidade ─────────────────────────────
const monthIntensity = (phase: GamePhase | null, all: GamePhase[]) => {
  if (!phase || phase.count === 0) return 0;
  return clamp(phase.count / Math.max(...all.map(p => p.count), 1), 0, 1);
};

// ─── Posição X da nave ────────────────────────
const shipXAtFrame = (phase: GamePhase | null, globalFrame: number, intensity: number): number => {
  if (!phase) return SHIP_X_START + 60;
  const local = globalFrame - phase.startFrame;
  const dur   = phase.durationInFrames;
  const base  = clamp(local / dur, 0, 1);
  const exitStart = dur - 15;
  if (local >= exitStart) {
    const exitPct = (local - exitStart) / 15;
    return SHIP_X_END * (base + exitPct * 0.25);
  }
  const osc = Math.sin(globalFrame * 0.09) * 30 * intensity;
  return SHIP_X_START + (SHIP_X_END - SHIP_X_START - 200) * base + osc;
};

// ─── Sprites de inimigos espaciais (arte original) ────────────────────

// Nave inimiga
const ENEMY_SHIP_ROWS = [
  "....krrrk....",
  "...krbbbrk...",
  "..krbwwwbrk..",
  ".krbwwwwwbrk.",
  "krrrrrrrrrrk.",
  ".krrwwwwrrk..",
  "..krrrrrk....",
  "....krrk.....",
];
const ENEMY_SHIP_PALETTE: Record<string,string> = {
  k:"#08050f", r:"#c02020", b:"#401010", w:"#ff6666"
};

// Alien voador
const FLYING_ALIEN_ROWS = [
  "..kggggk..",
  ".kgwggwgk.",
  "kgggggggggk",
  "kg.g.g.ggk.",
  ".kgggggggk.",
  "..kk.k.kk..",
  "...k...k...",
];
const FLYING_ALIEN_PALETTE: Record<string,string> = {
  k:"#08050f", g:"#20c080", w:"#80ffcc"
};

// Asteroide
const ASTEROID_ROWS = [
  "..kkkk..",
  ".kddddk.",
  "kddddddk",
  "kddddddk",
  ".kddddk.",
  "..kkkk..",
];
const ASTEROID_PALETTE: Record<string,string> = {
  k:"#08050f", d:"#7a6850"
};

// Planeta pequeno
const PLANET_ROWS = [
  "....kppppk....",
  "...kpllllpk...",
  "..kplllllllk..",
  "..kplpplplpk..",
  "..kpllllllpk..",
  "...kplllppk...",
  "....kppppk....",
];
const PLANET_PALETTE: Record<string,string> = {
  k:"#08050f", p:"#304080", l:"#6080c0"
};

// Meteoro grande
const METEOR_ROWS = [
  "...kkkk...",
  "..kddddk..",
  ".kdddddddk",
  "kdddddddddk",
  "kdddddddddk",
  ".kdddddddk.",
  "..kddddk...",
  "...kkkk....",
];
const METEOR_PALETTE: Record<string,string> = {
  k:"#08050f", d:"#9a8060"
};

const ENEMY_SPRITES = [
  { rows: ENEMY_SHIP_ROWS,    palette: ENEMY_SHIP_PALETTE,    sc: 8,  label:"nave"     },
  { rows: FLYING_ALIEN_ROWS,  palette: FLYING_ALIEN_PALETTE,  sc: 7,  label:"alien"    },
  { rows: ASTEROID_ROWS,      palette: ASTEROID_PALETTE,      sc: 9,  label:"asteroide"},
  { rows: PLANET_ROWS,        palette: PLANET_PALETTE,        sc: 8,  label:"planeta"  },
  { rows: METEOR_ROWS,        palette: METEOR_PALETTE,        sc: 8,  label:"meteoro"  },
];

// ─── Projéteis ───────────────────────────────
const SHOT_SPEED = 30;
type Projectile = { id:string; startX:number; startY:number; startFrame:number };

const buildProjectiles = (phases: GamePhase[], introFrames: number): Projectile[] => {
  const res: Projectile[] = [];
  for (const phase of phases) {
    if (!phase.hasActivity) continue;
    for (const obj of phase.objects) {
      const globalHit  = phase.startFrame + obj.hitAt;
      const travelFrames = Math.round((1920 - SHIP_X_START - SHIP_W) / SHOT_SPEED);
      const fireFrame  = globalHit - travelFrames;
      if (fireFrame < introFrames) continue;
      const shipYOffset = Math.sin(fireFrame * 0.04) * 70;
      res.push({ id:`proj-${phase.month}-${obj.id}`, startX: SHIP_X_START+SHIP_W, startY: SHIP_Y_MID+SHIP_H/2+shipYOffset, startFrame: fireFrame });
    }
  }
  return res;
};

// ─── Explosão ────────────────────────────────
const Explosion: React.FC<{x:number;y:number;age:number;color:string;big?:boolean}> = ({
  x, y, age, color, big=false,
}) => {
  if (age > 22) return null;
  const n  = big ? 10 : 6;
  const sp = age * (big ? 8 : 5.5);
  const op = 1 - age/22;
  return <>
    {age < 5 && <div style={{position:"absolute",left:x-20,top:y-20,width:40,height:40,borderRadius:"50%",background:"#fff",opacity:(1-age/5)*0.9,boxShadow:`0 0 40px ${color}`}}/>}
    {Array.from({length:n},(_,i) => {
      const a = (i/n)*Math.PI*2;
      const spd = 0.65 + (i%3)*0.2;
      const px=x+Math.cos(a)*sp*spd, py=y+Math.sin(a)*sp*spd;
      const sz=(big?14:9)+(age>8?0:4);
      return <div key={i} style={{position:"absolute",left:px-sz/2,top:py-sz/2,width:sz,height:sz,background:i%3===0?"#fff":i%3===1?color:"#ffd166",opacity:op*0.9,boxShadow:`0 0 ${sz*2}px ${color}`,borderRadius:i%2===0?"50%":2}}/>;
    })}
    <div style={{position:"absolute",left:x-sp*0.7,top:y-sp*0.7,width:sp*1.4,height:sp*1.4,borderRadius:"50%",background:`radial-gradient(circle,${color}66 0%,transparent 70%)`,opacity:op*0.5}}/>
  </>;
};

// ─── Score popup ─────────────────────────────
const ScorePopup: React.FC<{event:ScoreEvent;x:number;y:number;currentFrame:number;theme:ThemeSpec}> = ({
  event, x, y, currentFrame, theme,
}) => {
  const age = currentFrame - event.frame;
  if (age < 0 || age > 28) return null;
  const op = interpolate(age,[0,4,24,28],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  return <div style={{position:"absolute",left:x,top:y-age*2.8,fontFamily:theme.fonts.display,fontSize:event.bonus?28:22,color:event.bonus?theme.colors.accent2:theme.colors.accent,textShadow:`0 0 14px ${theme.colors.glow}`,opacity:op,pointerEvents:"none",zIndex:10}}>{event.bonus?"+5 BÔNUS":`+${event.points}`}</div>;
};

// ─── Componente principal ─────────────────────
type Props = {
  theme:ThemeSpec; phase:GamePhase|null; globalFrame:number;
  allPhases:GamePhase[]; scoreEvents:ScoreEvent[];
  introFrames:number; timeline:GameTimeline; isIntro:boolean; isOutro:boolean;
};

export const SpaceRun: React.FC<Props> = ({
  theme, phase, globalFrame, allPhases, scoreEvents, introFrames, timeline, isIntro, isOutro,
}) => {
  const projectiles = buildProjectiles(allPhases, introFrames);
  const intensity   = monthIntensity(phase, allPhases);
  const outroFrame  = isOutro ? globalFrame - timeline.runEnd : -1;

  // Nave: posição X percorre a tela + oscilação vertical
  const shipX   = isOutro ? 900 + Math.sin(globalFrame*0.05)*180 : shipXAtFrame(phase, globalFrame, intensity);
  const oscAmp  = 45 + intensity * 80;
  const oscSpd  = 0.035 + intensity * 0.025;
  const shipY   = SHIP_Y_MID + Math.sin(globalFrame * oscSpd) * oscAmp;
  const shipTilt= Math.sin(globalFrame * oscSpd * 0.7) * (4 + intensity * 6);
  const flameSc = 1 + Math.sin(globalFrame * 0.35) * (0.18 + intensity * 0.2);

  const recentHit = scoreEvents.find(e => !e.bonus && Math.abs(e.frame - globalFrame) < 8);
  const shipFlash = recentHit ? interpolate(Math.abs(recentHit.frame-globalFrame),[0,8],[1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}) : 0;

  const activeProjectiles = projectiles.filter(p => { const a=globalFrame-p.startFrame; return a>=0&&a<55; });

  const visiblePhases = allPhases.filter(p => p.endFrame+60>=globalFrame && p.startFrame-120<=globalFrame);

  const recent = recentEvents(scoreEvents, globalFrame, 30);

  // Posições dos inimigos
  const enemyPositions = new Map<string,{x:number;y:number;variant:number}>();
  for (const p of visiblePhases) {
    for (const obj of p.objects) {
      const travel = obj.hitAt - obj.spawnAt;
      const age    = globalFrame - (p.startFrame + obj.spawnAt);
      const tp     = travel > 0 ? clamp(age/travel, 0, 1) : 1;
      const x = interpolate(tp, [0,1], [1900, shipX + SHIP_W + 20]);
      const baseY = GAME_H * 0.18 + obj.lane * GAME_H * 0.58;
      enemyPositions.set(obj.id, { x, y: baseY, variant: obj.variant });
    }
  }

  // Paleta de setor muda por mês
  const sectorColors = [
    "#03020f","#050318","#02050e","#080214","#040a1a",
    "#0a0218","#030810","#060214","#020a0e","#080318",
    "#040610","#0a021a",
  ];
  const bgColor = sectorColors[(phase?.month ?? 0) % sectorColors.length] ?? "#03020f";

  return (
    <div style={{position:"absolute",left:0,top:0,width:1920,height:GAME_H,overflow:"hidden",background:bgColor}}>

      {/* Projéteis */}
      {activeProjectiles.map(proj => {
        const age = globalFrame - proj.startFrame;
        const x   = proj.startX + age * SHOT_SPEED;
        if (x > 1980) return null;
        return <div key={proj.id} style={{position:"absolute",left:x,top:proj.startY-3,width:34,height:6,background:`linear-gradient(90deg,transparent,${theme.colors.accent} 40%,#fff)`,borderRadius:3,boxShadow:`0 0 10px ${theme.colors.glow}`,opacity:0.9}}/>;
      })}

      {/* Inimigos e explosões */}
      {visiblePhases.map(p =>
        p.objects.map(obj => {
          const globalSpawn = p.startFrame + obj.spawnAt;
          const globalHit   = p.startFrame + obj.hitAt;
          if (globalFrame < globalSpawn || globalFrame > globalHit + 22) return null;
          const pos = enemyPositions.get(obj.id);
          if (!pos) return null;
          const destroyed  = globalFrame >= globalHit;
          const destroyAge = globalFrame - globalHit;
          if (destroyed && destroyAge > 22) return null;

          // Seleciona sprite pelo hash do id do objeto (determinístico)
          const sprIdx = (obj.id.charCodeAt(4) + obj.id.charCodeAt(5)) % ENEMY_SPRITES.length;
          const enemy  = ENEMY_SPRITES[sprIdx]!;
          const sc     = obj.variant===2 ? enemy.sc + 2 : enemy.sc;

          // Rotação: naves e asteroides giram
          const spin = (globalFrame - globalSpawn) * (sprIdx % 2 === 0 ? 1.8 : -1.2);

          return <React.Fragment key={obj.id}>
            {!destroyed ? (
              <div style={{
                position:"absolute", left: pos.x, top: pos.y,
                transform: sprIdx >= 2 ? `rotate(${spin}deg)` : undefined,
                filter:`drop-shadow(0 0 8px rgba(200,50,50,0.6))`,
                zIndex:5,
              }}>
                <PixelArt sprite={{rows:enemy.rows,palette:enemy.palette}} scale={sc} />
              </div>
            ) : (
              <Explosion
                x={pos.x + (enemy.rows[0]?.length??8)*sc*0.5}
                y={pos.y + enemy.rows.length*sc*0.5}
                age={destroyAge} color={theme.colors.accent} big={obj.variant===2}
              />
            )}
          </React.Fragment>;
        })
      )}

      {/* Score popups */}
      {recent.map(ev => {
        let x=shipX+SHIP_W+80, y=shipY+SHIP_H/2;
        for (const p of visiblePhases) {
          const obj = p.objects.find(o => o.id===ev.objectId);
          if (obj) { const pos=enemyPositions.get(obj.id); if(pos){x=pos.x+30;y=pos.y;} break; }
        }
        return <ScorePopup key={`${ev.objectId}-${ev.frame}`} event={ev} x={x} y={y} currentFrame={globalFrame} theme={theme}/>;
      })}

      {/* Nave */}
      <div style={{
        position:"absolute", left: shipX, top: shipY,
        transform:`rotate(${shipTilt}deg)`, transformOrigin:"center center",
        filter: shipFlash>0 ? `drop-shadow(0 0 24px ${theme.colors.accent}) brightness(${1+shipFlash*0.9})` : `drop-shadow(0 0 18px rgba(94,234,255,0.5))`,
        zIndex:8,
      }}>
        <PixelArt sprite={ROCKET} scale={SHIP_SC} />
        <div style={{position:"absolute",left:SHIP_W*0.3,top:SHIP_H*0.7,transform:`scaleY(${flameSc})`,transformOrigin:"top center",opacity:0.95}}>
          <PixelArt sprite={FLAME} scale={8} />
        </div>
      </div>

      {/* Fogos + mensagem final */}
      {isOutro && outroFrame>=0 && <>
        <Fireworks outroFrame={outroFrame} themeId={theme.id} seed={timeline.seed} stageW={1920} stageH={GAME_H}/>
        <OutroMessage outroFrame={outroFrame} themeId={theme.id} login={timeline.login}
          totalContribs={timeline.baseTotal} year={timeline.year}
          accentColor={theme.colors.accent} glowColor={theme.colors.glow}
          fontDisplay={theme.fonts.display} fontNarrative={theme.fonts.narrative}/>
      </>}

      {/* Intro */}
      {isIntro && <div style={{position:"absolute",left:0,right:0,top:"42%",textAlign:"center",fontFamily:theme.fonts.display,fontSize:36,letterSpacing:"0.14em",color:theme.colors.accent,textShadow:`0 0 28px ${theme.colors.glow}`}}>PREPARAR PARA DECOLAGEM</div>}
    </div>
  );
};
