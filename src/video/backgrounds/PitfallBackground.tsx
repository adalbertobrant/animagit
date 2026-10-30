import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

type Tree = {
  x: number;
  height: number;
  width: number;
  shade: number;
};

const makeTrees = (seed: string, count: number): Tree[] =>
  Array.from({ length: count }, (_, index) => ({
    x: random(`${seed}-x-${index}`) * 2100 - 100,
    height: 150 + random(`${seed}-h-${index}`) * 360,
    width: 60 + random(`${seed}-w-${index}`) * 110,
    shade: random(`${seed}-s-${index}`),
  }));

const FAR_TREES = makeTrees("far", 18);
const MID_TREES = makeTrees("mid", 12);
const NEAR_TREES = makeTrees("near", 7);

const TreeLayer: React.FC<{
  trees: Tree[];
  color: string;
  trunk: string;
  baseY: number;
  speed: number;
  frame: number;
  leafColor: string;
}> = ({ trees, color, trunk, baseY, speed, frame, leafColor }) => {
  const offset = (frame * speed) % 2100;
  return (
    <>
      {trees.map((tree, index) => {
        const x = ((tree.x - offset + 2100) % 2100) - 100;
        const trunkWidth = Math.max(10, tree.width * 0.16);
        return (
          <div key={index} style={{ position: "absolute", left: x, bottom: baseY }}>
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: (tree.width - trunkWidth) / 2,
                width: trunkWidth,
                height: tree.height * 0.62,
                background: trunk,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: tree.height * 0.42,
                left: 0,
                width: tree.width,
                height: tree.height * 0.42,
                background: color,
                clipPath:
                  tree.shade > 0.5
                    ? "polygon(50% 0%, 100% 38%, 86% 100%, 14% 100%, 0% 38%)"
                    : "polygon(50% 0%, 94% 30%, 100% 100%, 0% 100%, 6% 30%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: tree.height * 0.62,
                left: tree.width * 0.16,
                width: tree.width * 0.68,
                height: tree.height * 0.3,
                background: leafColor,
                clipPath: "polygon(50% 0%, 100% 42%, 88% 100%, 12% 100%, 0% 42%)",
                opacity: 0.85,
              }}
            />
          </div>
        );
      })}
    </>
  );
};

export const PitfallBackground: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#080a05", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #050704 0%, #0a1208 38%, #17240d 66%, #2a3312 100%)",
        }}
      />

      {/* Estrelas de 8 bits */}
      {Array.from({ length: 46 }, (_, index) => {
        const x = random(`pf-star-x-${index}`) * 1920;
        const y = random(`pf-star-y-${index}`) * 480;
        const on = Math.sin(frame * 0.03 + random(`pf-star-p-${index}`) * 6) > 0.2;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 4,
              height: 4,
              background: on ? "#f4f0d0" : "#8f8a5a",
              opacity: on ? 0.9 : 0.35,
            }}
          />
        );
      })}

      {/* Sol pixelado */}
      <div
        style={{
          position: "absolute",
          right: 210,
          top: 110,
          width: 230,
          height: 230,
          background:
            "radial-gradient(circle, #fff3b0 0%, #ffd23f 52%, #e8a51c 78%, #b06f0e 100%)",
          clipPath:
            "polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)",
          boxShadow: "0 0 90px rgba(255, 210, 63, 0.42)",
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 360,
          width: 360,
          height: 8,
          background: "rgba(255, 210, 63, 0.22)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 190,
          top: 388,
          width: 280,
          height: 6,
          background: "rgba(255, 210, 63, 0.14)",
        }}
      />

      <TreeLayer
        trees={FAR_TREES}
        color="#12200c"
        trunk="#0d1808"
        leafColor="#1a2e0f"
        baseY={230}
        speed={0.18}
        frame={frame}
      />
      <TreeLayer
        trees={MID_TREES}
        color="#1d3a13"
        trunk="#152a0d"
        leafColor="#2a5219"
        baseY={170}
        speed={0.42}
        frame={frame}
      />

      {/* Cipós pendurados */}
      {Array.from({ length: 9 }, (_, index) => {
        const x = 80 + index * 220 + random(`vine-${index}`) * 60;
        const length = 90 + random(`vine-l-${index}`) * 210;
        return (
          <div key={index} style={{ position: "absolute", left: x, top: 0, width: 6, height: length, background: "#2f5a1d" }}>
            {Array.from({ length: Math.floor(length / 46) }, (_, leaf) => (
              <div
                key={leaf}
                style={{
                  position: "absolute",
                  top: leaf * 44 + 14,
                  left: leaf % 2 === 0 ? -14 : 6,
                  width: 18,
                  height: 12,
                  background: "#3f7a28",
                }}
              />
            ))}
          </div>
        );
      })}

      <TreeLayer
        trees={NEAR_TREES}
        color="#24480f"
        trunk="#1a330a"
        leafColor="#38701a"
        baseY={120}
        speed={0.78}
        frame={frame}
      />

      {/* Chão */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 74,
          height: 92,
          background: "#4a3517",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,210,63,0.12) 0 36px, transparent 36px 72px), repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 12px, transparent 12px 24px)",
          backgroundPosition: `${(frame * 2) % 72}px 0, 0 0`,
          borderTop: "8px solid #6b5124",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 78,
          background:
            "linear-gradient(180deg, #123c69 0%, #0b2a4c 60%, #071c33 100%)",
          borderTop: "6px solid #1f5a8a",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 54,
          height: 10,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(122,201,220,0.5) 0 48px, transparent 48px 96px)",
          backgroundPosition: `${(frame * 1.8) % 96}px 0`,
          opacity: 0.55,
        }}
      />

      {/* Crocodilos espiando */}
      {[180, 760, 1430].map((left, index) => (
        <div
          key={left}
          style={{
            position: "absolute",
            left,
            bottom: 32,
            width: 132,
            height: 34,
            background: "#3f6f27",
            clipPath: "polygon(0 100%, 8% 20%, 24% 44%, 38% 8%, 52% 44%, 68% 12%, 82% 44%, 94% 24%, 100% 100%)",
            opacity: 0.95,
          }}
        >
          <div style={{ position: "absolute", left: 24 + index * 2, top: 12, width: 10, height: 10, background: "#f4f0d0" }} />
          <div style={{ position: "absolute", right: 24, top: 12, width: 10, height: 10, background: "#f4f0d0" }} />
        </div>
      ))}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(8,10,5,0.55) 0%, transparent 25%, transparent 72%, rgba(8,10,5,0.65) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
