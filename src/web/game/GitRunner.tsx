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
  beginConflict,
  canResolveConflict,
  cancelConflict,
  initialState,
  loadSprites,
  render,
  resolveConflict,
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

  // ── prompt de resolução de conflito ──
  const [promptOpen, setPromptOpen] = useState(false);
  const [answer, setAnswer]         = useState("");
  const promptRef      = useRef(false);
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { promptRef.current = promptOpen; }, [promptOpen]);
  useEffect(() => {
    if (promptOpen) promptInputRef.current?.focus();
  }, [promptOpen]);

  // ── carrega sprites uma vez ──
  useEffect(() => {
    loadSprites().then(() => setLoaded(true));
  }, []);

  // ── reset ──
  const reset = useCallback(() => {
    stateRef.current = initialState(Math.floor(Math.random() * 9999));
    setStatus("playing");
    setPromptOpen(false);
    setAnswer("");
  }, []);

  // ── conflito: abrir / responder / cancelar ──
  const openConflict = useCallback(() => {
    const next = beginConflict(stateRef.current);
    if (next.status !== "resolving") return;
    stateRef.current = next;
    promptRef.current = true;
    setAnswer("");
    setPromptOpen(true);
  }, []);

  const submitAnswer = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    stateRef.current = resolveConflict(stateRef.current, answer);
    promptRef.current = false;
    setPromptOpen(false);
    setAnswer("");
  }, [answer]);

  const cancelAnswer = useCallback(() => {
    stateRef.current = cancelConflict(stateRef.current);
    promptRef.current = false;
    setPromptOpen(false);
    setAnswer("");
  }, []);

  // ── input teclado ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // com o prompt aberto, quem trata as teclas é o <input>
      if (promptRef.current) return;

      const inp = inputRef.current;
      if (e.code === "ArrowLeft"  || e.code === "KeyA") inp.left  = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") inp.right = true;
      if (e.code === "ArrowUp"    || e.code === "Space" || e.code === "KeyW") inp.jump  = true;
      if (e.code === "Enter") {
        const s = stateRef.current;
        if (s.status === "gameover" || s.status === "win") {
          reset();
        } else if (canResolveConflict(s)) {
          openConflict();
        }
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
  }, [onClose, reset, openConflict]);

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
          ← → mover &nbsp; SPACE pular &nbsp; ENTER no ar: conflito &nbsp; ESC fechar
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

        {/* Prompt de conflito: o jogo fica congelado enquanto isso está aberto */}
        {promptOpen && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(5,8,14,0.82)",
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1.4,
          }}>
            <form
              onSubmit={submitAnswer}
              style={{
                width: 560,
                background: "#0d1117",
                border: "3px solid #38c950",
                borderRadius: 6,
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxShadow: "0 18px 40px rgba(0,0,0,0.7)",
              }}
            >
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 13,
                color: "#ffd23f",
                letterSpacing: "0.04em",
              }}>
                ⚔ CONFLITO DE MERGE
              </div>

              <div style={{ fontFamily: "'VT323', monospace", fontSize: 20, color: "#8fa6c8" }}>
                Digite o comando git que resolve o conflito:
              </div>

              <input
                ref={promptInputRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { e.preventDefault(); cancelAnswer(); }
                }}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder="git rebase origin/main"
                style={{
                  background: "#05080e",
                  border: "2px solid #5eeaff55",
                  borderRadius: 4,
                  color: "#5eeaff",
                  fontFamily: "'VT323', monospace",
                  fontSize: 22,
                  padding: "10px 12px",
                  outline: "none",
                }}
              />

              <div style={{ fontFamily: "'VT323', monospace", fontSize: 17, color: "#6b7f9e" }}>
                aceita: <code>git rebase &lt;branch&gt;</code> · <code>git merge &lt;branch&gt;</code>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={cancelAnswer}
                  style={{
                    background: "transparent",
                    border: "2px solid #ff5c6c",
                    color: "#ff5c6c",
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 10,
                    padding: "9px 14px",
                    cursor: "pointer",
                    borderRadius: 3,
                  }}
                >
                  ESC CANCELAR
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#38c950",
                    border: "2px solid #38c950",
                    color: "#05080e",
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 10,
                    padding: "9px 14px",
                    cursor: "pointer",
                    borderRadius: 3,
                  }}
                >
                  ENTER RESOLVER
                </button>
              </div>
            </form>
          </div>
        )}
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
          <TouchBtn label="⌨ CONFLITO" onStart={openConflict} onEnd={() => {}} />
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
