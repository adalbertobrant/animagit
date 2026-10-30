import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

const SPORES = Array.from({ length: 26 }, (_, index) => ({
  x: random(`spore-x-${index}`) * 100,
  y: 18 + random(`spore-y-${index}`) * 70,
  size: 3 + random(`spore-size-${index}`) * 6,
  phase: random(`spore-phase-${index}`) * Math.PI * 2,
  speed: 0.2 + random(`spore-speed-${index}`) * 0.7,
}));

const PILLARS = [80, 360, 680, 1030, 1370, 1680];

export const MetroidBackground: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#070312", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 18%, #2a1050 0%, #150829 42%, #070312 82%)",
        }}
      />

      {/* Parede distante com blocos */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.45,
          backgroundImage:
            "linear-gradient(rgba(192,77,240,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(192,77,240,0.07) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          transform: `translateY(${(frame * 0.06) % 72}px)`,
        }}
      />

      {/* Colunas da caverna */}
      {PILLARS.map((left, index) => (
        <div
          key={left}
          style={{
            position: "absolute",
            left,
            top: 0,
            width: 120 + (index % 3) * 26,
            height: 1080,
            background:
              index % 2 === 0
                ? "linear-gradient(180deg, rgba(44,18,80,0.85), rgba(14,6,28,0.95))"
                : "linear-gradient(180deg, rgba(30,12,58,0.8), rgba(10,4,22,0.95))",
            clipPath:
              index % 2 === 0
                ? "polygon(18% 0, 82% 0, 100% 100%, 0 100%)"
                : "polygon(0 0, 100% 0, 86% 100%, 12% 100%)",
            transform: `translateX(${Math.sin(frame * 0.004 + index) * 10}px)`,
            opacity: 0.7,
          }}
        />
      ))}

      {/* Estalactites */}
      <svg
        width="1920"
        height="220"
        viewBox="0 0 1920 220"
        style={{ position: "absolute", top: 0, left: 0, opacity: 0.9 }}
      >
        {Array.from({ length: 20 }, (_, index) => {
          const x = index * 100 + random(`stal-x-${index}`) * 40;
          const width = 40 + random(`stal-w-${index}`) * 60;
          const height = 70 + random(`stal-h-${index}`) * 150;
          return (
            <polygon
              key={index}
              points={`${x},0 ${x + width},0 ${x + width / 2},${height}`}
              fill={index % 3 === 0 ? "#1d0b3b" : "#150829"}
            />
          );
        })}
      </svg>

      {/* Névoa roxa deslizando */}
      {[0, 1, 2].map((index) => (
        <div
          key={`fog-${index}`}
          style={{
            position: "absolute",
            left: -200 + Math.sin(frame * 0.003 + index * 2) * 120,
            top: 380 + index * 170,
            width: 2300,
            height: 150,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(150,70,230,0.12) 30%, rgba(90,40,150,0.15) 55%, transparent 100%)",
            filter: "blur(18px)",
          }}
        />
      ))}

      {/* Esporos bioluminescentes */}
      {SPORES.map((spore, index) => {
        const y = spore.y * 10 + Math.sin(frame * 0.02 * spore.speed + spore.phase) * 26;
        const glow = 0.35 + Math.abs(Math.sin(frame * 0.04 + spore.phase)) * 0.65;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${spore.x}%`,
              top: y,
              width: spore.size,
              height: spore.size,
              borderRadius: "50%",
              background: index % 4 === 0 ? "#35f0c0" : "#c04df0",
              opacity: glow * 0.9,
              boxShadow: `0 0 ${spore.size * 5}px ${index % 4 === 0 ? "rgba(53,240,192,0.8)" : "rgba(192,77,240,0.8)"}`,
            }}
          />
        );
      })}

      {/* Lago ácido no chão */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 150,
          background:
            "linear-gradient(180deg, rgba(53,240,192,0) 0%, rgba(53,240,192,0.18) 35%, rgba(10,60,48,0.92) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 92,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(53,240,192,0.22) 0 26px, rgba(53,240,192,0.05) 26px 52px)",
          backgroundPosition: `${(frame * 1.6) % 52}px 0`,
          maskImage: "linear-gradient(180deg, transparent, black 55%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, black 55%)",
          filter: "blur(1px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 46,
          height: 4,
          background: "rgba(53, 240, 192, 0.55)",
          boxShadow: "0 0 26px 8px rgba(53,240,192,0.35)",
        }}
      />
    </AbsoluteFill>
  );
};
