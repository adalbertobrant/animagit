/**
 * GitRunner.tsx — componente React que envolve o engine Canvas
 *
 * Responsabilidades:
 * - Carregar sprites
 * - Game loop via requestAnimationFrame
 * - Captura de input de teclado
 * - Renderizar o <canvas>
 * - Botão fechar para voltar à landing
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CANVAS_W,
  CANVAS_H,
  GameState,
  InputState,
  initialState,
  loadSprites,
  render,
  tick,
} from "./engine";

interface Props {
  onClose: () => void;
}

export const GitRunner: React.FC<Props> = ({ onClose }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef<GameState>(initialState());
  const inputRef   = useRef<InputState>({ left: false, right: false, jump: false, jumpPressed: false });
  const rafRef     = useRef<number>(0);
  const prevJump   = useRef(false);
  const [loaded, setLoaded]   = useState(false);
  const [status, setStatus]   = useState<GameState["status"]>("playing");

  // ── carrega sprites uma vez ──
  useEffect(() => {
    loadSprites().then(() => setLoaded(true));
  }, []);

  // ── reset ──
  const reset = useCallback(() => {
    stateRef.current = initialState(Math.floor(Math.random() * 9999));
    setStatus("playing");
  }, []);

  // ── input teclado ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      if (e.code === "ArrowLeft"  || e.code === "KeyA") inp.left  = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") inp.right = true;
      if (e.code === "ArrowUp"    || e.code === "Space" || e.code === "KeyW") inp.jump  = true;
      if (e.code === "Enter") {
        const s = stateRef.current;
        if (s.status === "gameover" || s.status === "win") reset();
      }
      // fecha com Escape
      if (e.code === "Escape") onClose();
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      if (e.code === "ArrowLeft"  || e.code === "KeyA") inp.left  = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") inp.right = false;
      if (e.code === "ArrowUp"    || e.code === "Space" || e.code === "KeyW") inp.jump  = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup",   up);
    };
  }, [onClose, reset]);

  // ── game loop ──
  useEffect(() => {
    if (!loaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const inp = inputRef.current;
      // detecta borda de subida do jump
      inp.jumpPressed = inp.jump && !prevJump.current;
      prevJump.current = inp.jump;

      stateRef.current = tick(stateRef.current, inp);
      render(ctx, stateRef.current);

      // sincroniza status para React (pouco frequente, só quando muda)
      const newStatus = stateRef.current.status;
      setStatus(prev => prev !== newStatus ? newStatus : prev);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded]);

  // ── controles touch / botões na tela ──
  const holdLeft  = useCallback((active: boolean) => { inputRef.current.left  = active; }, []);
  const holdRight = useCallback((active: boolean) => { inputRef.current.right = active; }, []);
  const doJump    = useCallback(() => {
    inputRef.current.jump = true;
    inputRef.current.jumpPressed = true;
    setTimeout(() => { inputRef.current.jump = false; }, 80);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, width: CANVAS_W }}>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 18,
          color: "#ffd23f",
          letterSpacing: "0.06em",
          flex: 1,
        }}>
          🕹️ GIT RUNNER
        </span>
        <span style={{
          fontFamily: "'VT323', monospace",
          fontSize: 16,
          color: "#8fa6c8",
        }}>
          ← → mover &nbsp; SPACE pular &nbsp; ESC fechar
        </span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "2px solid #ff5c6c",
            color: "#ff5c6c",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11,
            padding: "6px 14px",
            cursor: "pointer",
            borderRadius: 3,
          }}
        >
          ✕ FECHAR
        </button>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", lineHeight: 0 }}>
        {!loaded && (
          <div style={{
            position: "absolute", inset: 0,
            background: "#0d1117",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 14, color: "#5eeaff",
          }}>
            carregando sprites…
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: "block",
            border: "3px solid #5eeaff44",
            borderRadius: 4,
            imageRendering: "pixelated",
          }}
        />
      </div>

      {/* Controles touch */}
      <div style={{ display: "flex", gap: 12, width: CANVAS_W, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <TouchBtn
            label="◀"
            onStart={() => holdLeft(true)}
            onEnd={() => holdLeft(false)}
          />
          <TouchBtn
            label="▶"
            onStart={() => holdRight(true)}
            onEnd={() => holdRight(false)}
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {(status === "gameover" || status === "win") && (
            <TouchBtn label="↺ REINICIAR" onStart={reset} onEnd={() => {}} wide />
          )}
          <TouchBtn label="▲ PULAR" onStart={doJump} onEnd={() => {}} />
        </div>
      </div>
    </div>
  );
};

// ── Botão touch helper ──────────────────────────────────────────────
const TouchBtn: React.FC<{
  label: string;
  onStart: () => void;
  onEnd: () => void;
  wide?: boolean;
}> = ({ label, onStart, onEnd, wide = false }) => (
  <button
    onMouseDown={onStart}
    onMouseUp={onEnd}
    onMouseLeave={onEnd}
    onTouchStart={(e) => { e.preventDefault(); onStart(); }}
    onTouchEnd={(e)   => { e.preventDefault(); onEnd();   }}
    style={{
      background: "#161b22",
      border: "2px solid #5eeaff44",
      color: "#fff",
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 13,
      padding: wide ? "10px 22px" : "10px 18px",
      cursor: "pointer",
      borderRadius: 4,
      userSelect: "none",
      WebkitUserSelect: "none",
      minWidth: wide ? 160 : 60,
    }}
  >
    {label}
  </button>
);
