import React from "react";
import { useCurrentFrame } from "remotion";
import { PixelArt } from "../art/PixelArt";
import { ALIEN, CHEST, CROC, EXPLORER, FLAME, HUNTER, ROCKET } from "../art/sprites";

const glow = (color: string, size: number) => `0 0 ${size}px ${color}`;

export const SpaceIntroArt: React.FC<{ login: string }> = () => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame * 0.045) * 16;
  const tilt = -10 + Math.sin(frame * 0.03) * 5;

  return (
    <div style={{ position: "relative", width: 560, height: 520 }}>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 110,
          width: 310,
          height: 310,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, #d6c4ff 0%, #8b5cf6 22%, #4c1d95 58%, #150a38 100%)",
          boxShadow: "0 0 90px rgba(139, 92, 246, 0.45)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 242,
          width: 460,
          height: 88,
          border: "3px solid rgba(196, 181, 253, 0.5)",
          borderRadius: "50%",
          transform: "rotate(-18deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 300,
          top: 26 + float,
          transform: `rotate(${tilt}deg)`,
          filter: `drop-shadow(0 0 22px rgba(94, 234, 255, 0.55))`,
        }}
      >
        <PixelArt sprite={ROCKET} scale={10} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 376,
          top: 290 + float,
          transform: `rotate(${tilt}deg) scaleY(${1.1 + Math.sin(frame * 0.3) * 0.16})`,
          transformOrigin: "top center",
          opacity: 0.95,
        }}
      >
        <PixelArt sprite={FLAME} scale={9} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 18,
          top: 70,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#5eeaff",
          boxShadow: glow("rgba(94,234,255,0.9)", 24),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 500,
          top: 408,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#ff5cd6",
          boxShadow: glow("rgba(255,92,214,0.9)", 20),
        }}
      />
    </div>
  );
};

export const MetroidIntroArt: React.FC<{ login: string }> = () => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame * 0.06) * 7;
  const doorOpen = Math.min(1, Math.max(0, (frame - 18) / 34));

  return (
    <div style={{ position: "relative", width: 600, height: 520 }}>
      {/* Porta da caverna */}
      <div
        style={{
          position: "absolute",
          left: 190,
          top: 36,
          width: 300,
          height: 330,
          background: "linear-gradient(180deg, #2a1050, #120726)",
          border: "10px solid #6b2fa0",
          boxShadow:
            "0 0 60px rgba(192,77,240,0.35), inset 0 0 50px rgba(53,240,192,0.14)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: 10,
            bottom: 10,
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(53,240,192,0.28), rgba(12,6,28,0.95) 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 10 + (1 - doorOpen) * 0,
            top: 10,
            width: `calc(50% - 10px)`,
            height: "calc(100% - 20px)",
            background: "linear-gradient(90deg, #3d1a66, #1b0b34)",
            transform: `translateX(${-doorOpen * 132}px)`,
            borderRight: "2px solid rgba(53,240,192,0.4)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            width: `calc(50% - 10px)`,
            height: "calc(100% - 20px)",
            background: "linear-gradient(270deg, #3d1a66, #1b0b34)",
            transform: `translateX(${doorOpen * 132}px)`,
            borderLeft: "2px solid rgba(53,240,192,0.4)",
          }}
        />
      </div>

      {/* Plataforma */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 392,
          width: 450,
          height: 26,
          background: "#2a1050",
          borderTop: "6px solid #c04df0",
          boxShadow: "0 0 30px rgba(192,77,240,0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 418,
          width: 430,
          height: 54,
          background:
            "repeating-linear-gradient(90deg, #1a0b2e 0 44px, #2a1050 44px 88px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 244,
          top: 392 - 18 * 11 + bob,
          filter: "drop-shadow(0 0 18px rgba(53, 240, 192, 0.45))",
        }}
      >
        <PixelArt sprite={HUNTER} scale={11} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 452,
          top: 108 + Math.sin(frame * 0.05 + 1.4) * 20,
          filter: "drop-shadow(0 0 18px rgba(192, 77, 240, 0.6))",
        }}
      >
        <PixelArt sprite={ALIEN} scale={7} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 40,
          top: 120,
          width: 8,
          height: 8,
          background: "#35f0c0",
          boxShadow: glow("rgba(53,240,192,0.9)", 18),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 240,
          width: 6,
          height: 6,
          background: "#c04df0",
          boxShadow: glow("rgba(192,77,240,0.9)", 16),
        }}
      />
    </div>
  );
};

export const PitfallIntroArt: React.FC<{ login: string }> = () => {
  const frame = useCurrentFrame();
  const bob = Math.abs(Math.sin(frame * 0.08)) * 8;

  return (
    <div style={{ position: "relative", width: 600, height: 520 }}>
      <div
        style={{
          position: "absolute",
          right: 46,
          top: 28,
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, #fff3b0 0%, #ffd23f 54%, #e8a51c 100%)",
          clipPath:
            "polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)",
          boxShadow: "0 0 70px rgba(255,210,63,0.35)",
          opacity: 0.9,
        }}
      />

      {/* Árvores */}
      {[
        { x: 20, h: 250, w: 110, c: "#1d3a13" },
        { x: 130, h: 300, w: 90, c: "#24480f" },
        { x: 440, h: 270, w: 100, c: "#1d3a13" },
      ].map((tree, index) => (
        <div key={index} style={{ position: "absolute", left: tree.x, bottom: 112 }}>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: tree.w / 2 - 8,
              width: 16,
              height: tree.h * 0.6,
              background: "#2b1c0b",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: tree.h * 0.38,
              width: tree.w,
              height: tree.h * 0.55,
              background: tree.c,
              clipPath: "polygon(50% 0%, 100% 40%, 86% 100%, 14% 100%, 0% 40%)",
            }}
          />
        </div>
      ))}

      <div
        style={{
          position: "absolute",
          left: 190,
          top: 388 + bob,
          filter: "drop-shadow(0 0 12px rgba(255, 210, 63, 0.25))",
        }}
      >
        <PixelArt sprite={EXPLORER} scale={11} />
      </div>

      <div style={{ position: "absolute", left: 386, top: 402 }}>
        <PixelArt sprite={CHEST} scale={8} />
      </div>

      <div style={{ position: "absolute", left: 120, top: 454 }}>
        <PixelArt sprite={CROC} scale={7} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 70,
          top: 0,
          width: 6,
          height: 250,
          background: "#2f5a1d",
        }}
      >
        {[0, 1, 2, 3].map((leaf) => (
          <div
            key={leaf}
            style={{
              position: "absolute",
              top: 32 + leaf * 52,
              left: leaf % 2 === 0 ? -16 : 8,
              width: 22,
              height: 14,
              background: "#3f7a28",
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 86,
          top: 470,
          width: 430,
          height: 14,
          background: "#123c69",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 86,
          top: 484,
          width: 430,
          height: 30,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(122,201,220,0.45) 0 40px, transparent 40px 80px)",
          backgroundPosition: `${(frame * 1.4) % 80}px 0`,
          opacity: 0.6,
        }}
      />
    </div>
  );
};
