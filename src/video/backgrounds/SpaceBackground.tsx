import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

const STAR_COUNT = 170;

const STARS = Array.from({ length: STAR_COUNT }, (_, index) => {
  const size = random(`star-size-${index}`) > 0.88 ? 4 : random(`star-size-2-${index}`) > 0.6 ? 3 : 2;
  return {
    x: random(`star-x-${index}`) * 100,
    y: random(`star-y-${index}`) * 100,
    size,
    speed: 0.15 + random(`star-speed-${index}`) * 0.55,
    phase: random(`star-phase-${index}`) * Math.PI * 2,
    hue: random(`star-hue-${index}`),
  };
});

const NEBULAE = [
  { x: 18, y: 32, size: 900, color: "rgba(81, 46, 168, 0.55)", speed: 0.0016, phase: 0 },
  { x: 78, y: 24, size: 760, color: "rgba(23, 132, 176, 0.42)", speed: 0.0011, phase: 2.1 },
  { x: 62, y: 78, size: 980, color: "rgba(196, 55, 150, 0.26)", speed: 0.0008, phase: 4.2 },
  { x: 8, y: 82, size: 620, color: "rgba(36, 82, 190, 0.3)", speed: 0.0013, phase: 1.2 },
];

export const SpaceBackground: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#03020f", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, #161352 0%, #0a0a2e 38%, #03020f 78%)",
        }}
      />

      {NEBULAE.map((nebula, index) => {
        const driftX = Math.sin(frame * nebula.speed + nebula.phase) * 70;
        const driftY = Math.cos(frame * nebula.speed * 0.8 + nebula.phase) * 40;
        const scale = 1 + Math.sin(frame * nebula.speed * 0.6 + nebula.phase) * 0.08;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${nebula.x}%`,
              top: `${nebula.y}%`,
              width: nebula.size,
              height: nebula.size,
              marginLeft: -nebula.size / 2,
              marginTop: -nebula.size / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${nebula.color} 0%, transparent 68%)`,
              filter: "blur(28px)",
              transform: `translate(${driftX}px, ${driftY}px) scale(${scale})`,
              opacity: 0.9,
            }}
          />
        );
      })}

      {STARS.map((star, index) => {
        const y = (star.y * 1080 + frame * star.speed) % 1120;
        const twinkle = 0.4 + Math.abs(Math.sin(frame * 0.035 + star.phase)) * 0.6;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${star.x}%`,
              top: y - 20,
              width: star.size,
              height: star.size,
              borderRadius: star.size > 2 ? 1 : "50%",
              background:
                star.hue > 0.82 ? "#ffd6f6" : star.hue > 0.55 ? "#a8f4ff" : "#ffffff",
              opacity: twinkle * 0.9,
              boxShadow:
                star.size > 2
                  ? `0 0 ${star.size * 3}px rgba(140, 235, 255, 0.85)`
                  : undefined,
            }}
          />
        );
      })}

      {/* Planeta distante com anel */}
      <div
        style={{
          position: "absolute",
          right: -120,
          top: 560,
          width: 660,
          height: 660,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, #b184ff 0%, #6b3fd4 28%, #2b1470 62%, #0b0730 100%)",
          boxShadow:
            "0 0 120px rgba(112, 70, 220, 0.55), inset -40px -50px 120px rgba(3, 2, 15, 0.9)",
          opacity: 0.92,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -260,
          top: 690,
          width: 940,
          height: 250,
          border: "3px solid rgba(180, 150, 255, 0.38)",
          borderRadius: "50%",
          transform: "rotate(-16deg)",
          boxShadow: "0 0 30px rgba(150, 120, 255, 0.22)",
        }}
      />

      {/* Estrela cadente ocasional */}
      {[0, 1].map((index) => {
        const cycle = 260;
        const local = (frame + index * 130) % cycle;
        if (local > 40) return null;
        const progress = local / 40;
        return (
          <div
            key={`shooting-${index}`}
            style={{
              position: "absolute",
              left: 260 + index * 520 + progress * 420,
              top: 120 + index * 190 + progress * 240,
              width: 170,
              height: 2,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(180,245,255,0.9) 100%)",
              transform: "rotate(32deg)",
              opacity: Math.sin(progress * Math.PI) * 0.9,
              filter: "drop-shadow(0 0 6px rgba(140,235,255,0.8))",
            }}
          />
        );
      })}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3,2,15,0.5) 0%, transparent 22%, transparent 76%, rgba(3,2,15,0.72) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
