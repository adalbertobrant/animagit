/**
 * engine.ts — Git Runner game engine (Canvas 2D)
 *
 * Toda a lógica de jogo: física, colisão, estado, input.
 * Sem dependências externas — só canvas API.
 *
 * Sprites carregados via Image() a partir de /game/*.jpg
 */

// ─── Constantes de física ─────────────────────────────────────────────
export const CANVAS_W = 900;
export const CANVAS_H = 420;

const GRAVITY       = 0.55;
const JUMP_FORCE    = -13;
const MOVE_SPEED    = 3.8;
const SCROLL_SPEED  = 2.8;
const GROUND_Y      = CANVAS_H - 90; // Y do topo do chão

// Quique ao pisar em cima de uma PR box (não tira coração)
const STOMP_BOUNCE  = -10;

// Distância (px) em que uma PR box conta como "conflito por perto"
export const CONFLICT_RANGE = 320;

// Largura do nível em pixels (campo scrollável)
const LEVEL_WIDTH   = 6000;

// Após coletar N códigos → git workflow
const CODES_FOR_COMMIT = 5;

// ─── Tipos ────────────────────────────────────────────────────────────

export type GameStatus = "idle" | "playing" | "git-workflow" | "resolving" | "gameover" | "win";

export type GitStep = "add" | "commit" | "push" | "done";

export interface Entity {
  x: number;   // posição no mundo
  y: number;
  w: number;
  h: number;
}

export interface Star extends Entity {
  size: 1 | 2 | 3;
  collected: boolean;
}

export interface CodeItem extends Entity {
  variant: 1 | 2 | 3;
  collected: boolean;
}

export interface PRBox extends Entity {
  frame: number;   // índice do sprite de animação 0..8
  vy: number;      // velocidade vertical (pula quando próximo do jogador)
  dead: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;    // frames restantes
  color: string;
}

export interface GameState {
  status: GameStatus;
  cameraX: number;      // scroll do mundo
  player: {
    x: number;
    y: number;
    vy: number;
    onGround: boolean;
    animFrame: number;  // 0-7 mapeado para sprite atual
    facing: 1 | -1;
    invincible: number; // frames de invencibilidade após dano
  };
  lives: number;
  stars: Star[];
  codes: CodeItem[];
  prBoxes: PRBox[];
  codesCollected: number;
  starsCollected: number;
  score: number;
  gitStep: GitStep;
  gitTimer: number;     // frames restantes na animação do git workflow
  gitAnimFrame: number; // qual sprite mostrar durante workflow (1..5)
  floatingTexts: FloatingText[];
  wonAt: number;        // frame em que ganhou
  frame: number;        // contador global de frames
}

// ─── Sprites ──────────────────────────────────────────────────────────

const BASE = "/game/";

const SPRITE_PATHS: Record<string, string> = {
  "char-1":       BASE + "sprite-001.jpg",
  "char-2":       BASE + "sprite-002.jpg",
  "char-3":       BASE + "sprite-003.jpg",
  "char-4":       BASE + "sprite-004.jpg",
  "char-5":       BASE + "sprite-005.jpg",
  "char-6":       BASE + "sprite-006.jpg",
  "char-7":       BASE + "sprite-007.jpg",
  "char-8":       BASE + "sprite-008.jpg",
  "field":        BASE + "sprite-field.jpg",
  "mountain":     BASE + "sprite-montain.jpg",
  "start":        BASE + "sprite-start.jpg",
  "end":          BASE + "sprite-end.jpg",
  "castle":       BASE + "sprite-castle.jpg",
  "tower":        BASE + "sprite-tower.jpg",
  "heart-full":   BASE + "sprite-heart-full.jpg",
  "heart-dead":   BASE + "sprite-heart-dead.jpg",
  "star-1":       BASE + "sprite-star-1.jpg",
  "star-2":       BASE + "sprite-star-2.jpg",
  "star-3":       BASE + "sprite-star-3.jpg",
  "code-1":       BASE + "sprite-code-001.jpg",
  "code-2":       BASE + "sprite-code-002.jpg",
  "code-3":       BASE + "sprite-code-003.jpg",
  "pr-1":         BASE + "sprite-pr-001.jpg",
  "pr-2":         BASE + "sprite-pr-002.jpg",
  "pr-3":         BASE + "sprite-pr-003.jpg",
  "pr-4":         BASE + "sprite-pr-004.jpg",
  "pr-5":         BASE + "sprite-pr-005.jpg",
  "pr-6":         BASE + "sprite-pr-006.jpg",
  "pr-7":         BASE + "sprite-pr-007.jpg",
  "pr-8":         BASE + "sprite-pr-008.jpg",
  "pr-9":         BASE + "sprite-pr-009.jpg",
};

export const images: Record<string, HTMLImageElement> = {};

export const loadSprites = (): Promise<void> => {
  const promises = Object.entries(SPRITE_PATHS).map(([key, src]) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload  = () => resolve();
      img.onerror = () => resolve(); // não bloqueia em caso de erro
      img.src     = src;
      images[key] = img;
    });
  });
  return Promise.all(promises).then(() => undefined);
};

// ─── Geração do nível ─────────────────────────────────────────────────

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
};

export const buildLevel = (seed = 42): Pick<GameState, "stars" | "codes" | "prBoxes"> => {
  const rand = rng(seed);

  const stars: Star[] = [];
  const codes: CodeItem[] = [];
  const prBoxes: PRBox[] = [];

  // Espalha objetos ao longo do nível, evitando os primeiros 400px (área do START)
  for (let worldX = 500; worldX < LEVEL_WIDTH - 400; worldX += 180 + Math.floor(rand() * 120)) {
    const roll = rand();
    const y    = GROUND_Y - 80 - rand() * 60;

    if (roll < 0.3) {
      // estrela
      const size = rand() < 0.15 ? 3 : rand() < 0.4 ? 2 : 1;
      stars.push({ x: worldX, y, w: 36, h: 36, size: size as 1|2|3, collected: false });
    } else if (roll < 0.55) {
      // código
      const variant = (Math.floor(rand() * 3) + 1) as 1|2|3;
      codes.push({ x: worldX, y: GROUND_Y - 90, w: 40, h: 44, variant, collected: false });
    } else if (roll < 0.80) {
      // PR box
      prBoxes.push({
        x: worldX,
        y: GROUND_Y - 80,
        w: 64, h: 64,
        frame: 0,
        vy: 0,
        dead: false,
      });
    }
  }

  return { stars, codes, prBoxes };
};

// ─── Estado inicial ───────────────────────────────────────────────────

export const initialState = (seed = 42): GameState => ({
  status:          "playing",
  cameraX:         0,
  player: {
    x:          80,
    y:          GROUND_Y - 128,
    vy:         0,
    onGround:   false,
    animFrame:  0,
    facing:     1,
    invincible: 0,
  },
  lives:           3,
  codesCollected:  0,
  starsCollected:  0,
  score:           0,
  gitStep:         "done",
  gitTimer:        0,
  gitAnimFrame:    1,
  floatingTexts:   [],
  wonAt:           0,
  frame:           0,
  ...buildLevel(seed),
});

// ─── Input ────────────────────────────────────────────────────────────

export interface InputState {
  left:  boolean;
  right: boolean;
  jump:  boolean;
  jumpPressed: boolean; // só true no frame em que foi pressionado
}

// ─── AABB collision ───────────────────────────────────────────────────

const overlaps = (a: Entity, b: Entity): boolean =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

const playerEntity = (s: GameState): Entity => ({
  x: s.player.x,
  y: s.player.y,
  w: 52,
  h: 110,
});

// ─── Tick principal ───────────────────────────────────────────────────

export const tick = (state: GameState, input: InputState): GameState => {
  // cópia rasa (imutabilidade parcial para React)
  const s: GameState = {
    ...state,
    player: { ...state.player },
    floatingTexts: state.floatingTexts
      .map(t => ({ ...t, life: t.life - 1 }))
      .filter(t => t.life > 0),
    frame: state.frame + 1,
  };

  if (s.status === "gameover" || s.status === "win") return s;

  // ── conflito aberto: tudo congelado até o jogador responder ──
  if (s.status === "resolving") return state;

  // ── git workflow animation ──
  if (s.status === "git-workflow") {
    s.gitTimer--;
    // Cicla entre sprites 2..5 para mostrar o workflow
    const stepFrames = 40;
    const elapsed = 160 - s.gitTimer;
    s.gitAnimFrame = 2 + Math.floor(elapsed / stepFrames) % 4;
    if (s.gitTimer <= 0) {
      s.status    = "playing";
      s.gitStep   = "done";
      s.score    += 500;
      s.floatingTexts.push({ x: s.player.x - s.cameraX - 20, y: 180, text: "git push! +500", life: 80, color: "#38c950" });
    }
    return s;
  }

  const p = s.player;

  // ── movimento horizontal ──
  let dx = 0;
  if (input.left)  { dx = -MOVE_SPEED; p.facing = -1; }
  if (input.right) { dx =  MOVE_SPEED; p.facing =  1; }

  // auto-scroll suave: câmera segue o jogador
  const targetCamX = p.x - CANVAS_W * 0.3;
  s.cameraX = Math.max(0, Math.min(LEVEL_WIDTH - CANVAS_W, s.cameraX + (targetCamX - s.cameraX) * 0.12));

  // Atualiza posição X (limita ao nível)
  p.x = Math.max(0, Math.min(LEVEL_WIDTH - 60, p.x + dx));

  // ── física vertical ──
  if (input.jumpPressed && p.onGround) {
    p.vy = JUMP_FORCE;
    p.onGround = false;
  }
  p.vy += GRAVITY;
  p.y  += p.vy;

  // colisão com o chão
  if (p.y >= GROUND_Y - 110) {
    p.y       = GROUND_Y - 110;
    p.vy      = 0;
    p.onGround = true;
  } else {
    p.onGround = false;
  }

  // ── animação do personagem ──
  if (dx !== 0) {
    p.animFrame = Math.floor(s.frame / 8) % 2 === 0 ? 5 : 6; // corrida (sprite-006, 007)
  } else {
    p.animFrame = 0; // parado (sprite-001)
  }
  if (!p.onGround) p.animFrame = 6; // pulando (sprite-007)

  // ── invencibilidade ──
  if (p.invincible > 0) p.invincible--;

  let pe = playerEntity(s);

  // ── coleta de estrelas ──
  s.stars = s.stars.map(star => {
    if (star.collected) return star;
    if (overlaps(pe, { x: star.x, y: star.y, w: star.w, h: star.h })) {
      const pts = star.size === 3 ? 100 : star.size === 2 ? 50 : 20;
      s.score += pts;
      s.starsCollected++;
      s.floatingTexts.push({ x: star.x - s.cameraX, y: star.y - 20, text: `+${pts}`, life: 50, color: "#ffd23f" });
      return { ...star, collected: true };
    }
    return star;
  });

  // ── coleta de códigos ──
  s.codes = s.codes.map(code => {
    if (code.collected) return code;
    if (overlaps(pe, { x: code.x, y: code.y, w: code.w, h: code.h })) {
      s.codesCollected++;
      s.floatingTexts.push({ x: code.x - s.cameraX, y: code.y - 20, text: `código ${s.codesCollected}/${CODES_FOR_COMMIT}`, life: 60, color: "#5eeaff" });
      if (s.codesCollected % CODES_FOR_COMMIT === 0) {
        // inicia git workflow
        s.status      = "git-workflow";
        s.gitStep     = "add";
        s.gitTimer    = 160;
        s.gitAnimFrame = 2;
        s.floatingTexts.push({ x: CANVAS_W / 2 - 60, y: 140, text: "git add . && git commit && git push!", life: 100, color: "#38c950" });
      }
      return { ...code, collected: true };
    }
    return code;
  });

  // ── PR boxes ──
  const PR_ANIM_CYCLE = [1,2,3,4,5,6,7,8,9]; // sprite-pr-001 .. 009
  s.prBoxes = s.prBoxes.map(pr => {
    if (pr.dead) return pr;
    // anima frame
    const newFrame = Math.floor(s.frame / 10) % PR_ANIM_CYCLE.length;
    // pula na direção do jogador quando próximo
    let vy = pr.vy;
    const distX = Math.abs(pr.x - p.x);
    if (distX < 200 && pr.y >= GROUND_Y - 85) {
      vy = -9; // pula
    }
    vy += GRAVITY * 0.8;
    const newY = Math.min(pr.y + vy, GROUND_Y - 80);
    if (newY >= GROUND_Y - 80) vy = 0;

    const newPR = { ...pr, frame: newFrame, vy, y: newY };
    const box = { x: pr.x, y: pr.y, w: pr.w, h: pr.h };

    // colisão com jogador
    if (overlaps(pe, box)) {
      // veio de cima, caindo? é pisada: quica sem perder coração
      const prevBottom = p.y - p.vy + 110;
      const stomped = p.vy > 0 && prevBottom <= box.y + 14;

      if (stomped) {
        p.y        = box.y - 110;
        p.vy       = STOMP_BOUNCE;
        p.onGround = false;
        pe = playerEntity(s);
      } else if (p.invincible === 0) {
        s.lives--;
        p.invincible = 90;
        p.vy = -8; // knockback
        s.floatingTexts.push({ x: p.x - s.cameraX - 10, y: p.y - 20, text: "PR conflict! -1♥", life: 70, color: "#ff5c6c" });
        if (s.lives <= 0) {
          s.status = "gameover";
        }
      }
    }
    return newPR;
  });

  // ── win condition: chegou ao END (posição do castelo) ──
  const endX = LEVEL_WIDTH - 380;
  if (p.x >= endX && s.status === "playing") {
    s.status = "win";
    s.wonAt  = s.frame;
    s.score += 1000;
  }

  return s;
};

// ─── Resolução de conflito (git rebase / git merge) ───────────────────
//
// Fluxo: no ar, perto de uma PR box, ENTER abre o prompt e congela o jogo.
// O jogador digita um comando git válido; ENTER de novo resolve o conflito
// (box morre, +200, sem perder coração) ou, se o comando for inválido,
// custa 1 coração.

const distanceToPlayer = (s: GameState, pr: PRBox): number =>
  Math.abs(pr.x + pr.w / 2 - (s.player.x + 26));

const nearestConflict = (s: GameState): PRBox | undefined =>
  s.prBoxes
    .filter(pr => !pr.dead && distanceToPlayer(s, pr) <= CONFLICT_RANGE)
    .sort((a, b) => distanceToPlayer(s, a) - distanceToPlayer(s, b))[0];

/** Só dá para resolver conflito no ar, com uma PR box por perto. */
export const canResolveConflict = (s: GameState): boolean =>
  s.status === "playing" && !s.player.onGround && nearestConflict(s) !== undefined;

export const beginConflict = (s: GameState): GameState =>
  canResolveConflict(s) ? { ...s, status: "resolving" } : s;

export const cancelConflict = (s: GameState): GameState =>
  s.status === "resolving" ? { ...s, status: "playing" } : s;

/**
 * Comandos aceitos: `rebase`/`merge`, com ou sem o prefixo `git`.
 * Argumento opcional: uma branch/ref (`origin/main`, `HEAD~2`) ou uma flag
 * conhecida (`--abort`, `--continue`, `-i`, ...). `git push` não resolve.
 */
const GIT_RESOLUTION =
  /^(git )?(rebase|merge)(\s+(-[a-z]\b.*|--(abort|continue|skip|interactive|no-edit|no-ff|ff-only)\b.*|[^-\s]\S*))?$/i;

export const isValidGitResolution = (answer: string): boolean =>
  GIT_RESOLUTION.test(answer.trim().replace(/\s+/g, " "));

export const resolveConflict = (s: GameState, answer: string): GameState => {
  if (s.status !== "resolving") return s;

  const next: GameState = {
    ...s,
    status: "playing",
    player: { ...s.player },
    floatingTexts: [...s.floatingTexts],
  };

  if (!isValidGitResolution(answer)) {
    next.lives = Math.max(0, next.lives - 1);
    next.player.invincible = 90;
    next.floatingTexts.push({
      x: next.player.x - next.cameraX - 30,
      y: next.player.y - 20,
      text: "comando inválido! -1♥",
      life: 90,
      color: "#ff5c6c",
    });
    if (next.lives <= 0) next.status = "gameover";
    return next;
  }

  const target = nearestConflict(next);
  if (target) {
    next.prBoxes = next.prBoxes.map(pr => (pr === target ? { ...pr, dead: true } : pr));
    next.score += 200;
    next.floatingTexts.push({
      x: next.player.x - next.cameraX - 60,
      y: next.player.y - 30,
      text: "conflito resolvido! +200",
      life: 100,
      color: "#38c950",
    });
  }
  next.player.invincible = Math.max(next.player.invincible, 60);
  return next;
};

// ─── Render ───────────────────────────────────────────────────────────

const drawImg = (
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number, y: number,
  w: number, h: number,
  flipX = false,
) => {
  const img = images[key];
  if (!img?.complete || !img.naturalWidth) {
    // fallback: retângulo colorido
    ctx.fillStyle = "#5eeaff44";
    ctx.fillRect(x, y, w, h);
    return;
  }
  if (flipX) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(img, -x - w, y, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
};

export const render = (ctx: CanvasRenderingContext2D, s: GameState): void => {
  const cam = s.cameraX;

  // ── céu ──
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── montanha (parallax lento) ──
  const mtnW = 280;
  const mtnOffX = (cam * 0.25) % mtnW;
  for (let mx = -mtnOffX; mx < CANVAS_W + mtnW; mx += mtnW) {
    drawImg(ctx, "mountain", mx, CANVAS_H - 90 - 182, mtnW, 182);
  }

  // ── campo (chão tiled) ──
  const fieldW = 372;
  const fieldH = 90;
  const fieldOffX = cam % fieldW;
  for (let fx = -fieldOffX; fx < CANVAS_W + fieldW; fx += fieldW) {
    drawImg(ctx, "field", fx, CANVAS_H - fieldH, fieldW, fieldH);
  }

  // ── START ──
  const startScreenX = 60 - cam;
  if (startScreenX > -120 && startScreenX < CANVAS_W + 120) {
    drawImg(ctx, "start", startScreenX, GROUND_Y - 100, 96, 92);
  }

  // ── castelo + torre + END (fim do nível) ──
  const endX   = LEVEL_WIDTH - 380;
  const castleScreenX = endX - cam;
  if (castleScreenX > -300 && castleScreenX < CANVAS_W + 300) {
    drawImg(ctx, "castle", castleScreenX, GROUND_Y - 116, 220, 116);
    drawImg(ctx, "tower",  castleScreenX - 80, GROUND_Y - 180, 90, 180);
    drawImg(ctx, "end",    castleScreenX + 60, GROUND_Y - 130, 96, 92);
  }

  // ── estrelas ──
  s.stars.forEach(star => {
    if (star.collected) return;
    const sx = star.x - cam;
    if (sx < -60 || sx > CANVAS_W + 60) return;
    const key = `star-${star.size}`;
    const sz = star.size === 3 ? 44 : star.size === 2 ? 34 : 26;
    // leve flutuação
    const bob = Math.sin(s.frame * 0.08 + star.x * 0.01) * 4;
    drawImg(ctx, key, sx, star.y + bob, sz, sz);
  });

  // ── códigos ──
  s.codes.forEach(code => {
    if (code.collected) return;
    const cx = code.x - cam;
    if (cx < -60 || cx > CANVAS_W + 60) return;
    const key = `code-${code.variant}`;
    drawImg(ctx, key, cx, code.y, 40, 44);
  });

  // ── PR boxes ──
  s.prBoxes.forEach(pr => {
    if (pr.dead) return;
    const px = pr.x - cam;
    if (px < -80 || px > CANVAS_W + 80) return;
    const prKey = `pr-${pr.frame + 1}`;
    drawImg(ctx, prKey, px, pr.y, pr.w, pr.h);
  });

  // ── personagem ──
  const p = s.player;
  const screenX = p.x - cam;
  // pisca durante invencibilidade
  const visible = p.invincible === 0 || Math.floor(s.frame / 4) % 2 === 0;
  if (visible) {
    const charKeys = ["char-1","char-2","char-3","char-4","char-5","char-6","char-7","char-8"];
    let charKey: string;
    if (s.status === "git-workflow") {
      charKey = charKeys[Math.min(s.gitAnimFrame, 7)] ?? "char-2";
    } else {
      charKey = charKeys[Math.min(p.animFrame, 7)] ?? "char-1";
    }
    drawImg(ctx, charKey, screenX, p.y, 56, 112, p.facing === -1);
  }

  // ── dica: conflito ao alcance ──
  if (canResolveConflict(s)) {
    ctx.fillStyle = "#ffd23f";
    ctx.font      = "12px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ENTER: resolver conflito", screenX + 28, p.y - 18);
    ctx.textAlign = "left";
  }

  // ── HUD: vidas ──
  for (let i = 0; i < 3; i++) {
    const hKey = i < s.lives ? "heart-full" : "heart-dead";
    drawImg(ctx, hKey, 16 + i * 44, 14, 36, 36);
  }

  // ── HUD: score ──
  ctx.fillStyle = "#fff";
  ctx.font      = "bold 18px 'Press Start 2P', monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${s.score}`, CANVAS_W - 18, 36);
  ctx.textAlign = "left";

  // ── HUD: códigos acumulados ──
  ctx.fillStyle = "#5eeaff";
  ctx.font      = "14px 'Press Start 2P', monospace";
  ctx.fillText(`</> ${s.codesCollected % CODES_FOR_COMMIT}/${CODES_FOR_COMMIT}`, 16, 60);

  // ── textos flutuantes ──
  s.floatingTexts.forEach(ft => {
    const alpha = Math.min(1, ft.life / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = ft.color;
    ctx.font        = "bold 15px 'VT323', monospace";
    ctx.textAlign   = "center";
    ctx.fillText(ft.text, ft.x, ft.y - (30 - ft.life) * 0.6);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign   = "left";

  // ── git workflow overlay ──
  if (s.status === "git-workflow") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const steps: GitStep[] = ["add", "commit", "push"];
    const elapsed = 160 - s.gitTimer;
    const stepIdx = Math.min(Math.floor(elapsed / 50), 2);
    const stepLabels = ["git add .", "git commit -m 'feat'", "git push origin main"];

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(CANVAS_W / 2 - 240, CANVAS_H / 2 - 80, 480, 160);
    ctx.strokeStyle = "#38c950";
    ctx.lineWidth   = 2;
    ctx.strokeRect(CANVAS_W / 2 - 240, CANVAS_H / 2 - 80, 480, 160);

    ctx.fillStyle = "#38c950";
    ctx.font      = "bold 14px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("$ terminal", CANVAS_W / 2, CANVAS_H / 2 - 52);

    steps.forEach((_, i) => {
      const done = i <= stepIdx;
      ctx.fillStyle = done ? "#38c950" : "#555";
      ctx.font      = "13px 'VT323', monospace";
      ctx.fillText((done ? "✓ " : "  ") + (stepLabels[i] ?? ""), CANVAS_W / 2, CANVAS_H / 2 - 16 + i * 28);
    });
    ctx.textAlign = "left";
  }

  // ── GAME OVER ──
  if (s.status === "gameover") {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ff5c6c";
    ctx.font      = "bold 32px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 24);
    ctx.fillStyle = "#fff";
    ctx.font      = "14px 'Press Start 2P', monospace";
    ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
    ctx.fillText("Press ENTER to retry", CANVAS_W / 2, CANVAS_H / 2 + 54);
    ctx.textAlign = "left";
  }

  // ── WIN ──
  if (s.status === "win") {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ffd23f";
    ctx.font      = "bold 28px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("YOU WIN!", CANVAS_W / 2, CANVAS_H / 2 - 40);
    ctx.fillStyle = "#38c950";
    ctx.font      = "14px 'Press Start 2P', monospace";
    ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2);
    ctx.fillStyle = "#5eeaff";
    ctx.fillText(`Stars: ${s.starsCollected}  Codes: ${s.codesCollected}`, CANVAS_W / 2, CANVAS_H / 2 + 32);
    ctx.fillStyle = "#fff";
    ctx.fillText("Press ENTER to play again", CANVAS_W / 2, CANVAS_H / 2 + 68);
    ctx.textAlign = "left";
  }
};
