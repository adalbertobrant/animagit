# Anima GitHub Local

Transforme o seu ano no GitHub em um vídeo MP4 animado — **100% na sua máquina**. Sem Lambda, sem banco, sem upload, sem telemetria. Você digita o usuário, escolhe uma das três temáticas e o Remotion renderiza o vídeo localmente com trilha chiptune original.

```
npm run dev       → landing em http://127.0.0.1:4317
npm run render -- --username seunome --theme pitfall --height 1080
```

Vídeos ficam em `out/<usuario>-<tema>-<ano>-<altura>p.mp4`.

---

## Temas disponíveis

| Tema | Universo | O que acontece no vídeo |
|---|---|---|
| `space` | Arcade espacial | Nave percorre setores destruindo naves inimigas, asteroides, aliens e planetas |
| `metroid` | Ficção científica 16-bit | Caçador desce labirinto com lava, água e pedras, matando monstros variados |
| `pitfall` | Aventura de selva | Explorador atravessa a selva pulando onças, javalis, jacarés e buracos |

Cada tema tem paleta, fontes, transições, HUD, trilha chiptune e sprites 100% originais. Nenhum asset de Nintendo, Atari ou de licenças pagas é usado.

---

## Requisitos

- **Node.js 20+** (testado com Node 26)
- npm
- Linux, macOS ou Windows
- ~1 GB de espaço livre (Chrome Headless Shell + dependências)

O Chrome Headless Shell é baixado automaticamente pelo Remotion no primeiro `npm run setup`.

---

## Instalação mínima (sem token do GitHub)

O projeto inclui um snapshot real de `adalbertobrant` em `data/cache/`. Com ele você consegue rodar, ver o preview e gerar um MP4 sem nenhuma configuração extra.

```bash
git clone <repo> animaGithubLocal
cd animaGithubLocal
npm install
npm run setup      # copia fontes, sintetiza áudio, baixa Chrome headless
npm run dev        # sobe em http://127.0.0.1:4317
```

Abra o browser em `http://127.0.0.1:4317`, clique em **Gerar vídeo MP4** e aguarde.

> **Porta ocupada?** `fuser -k 4317/tcp && npm run dev`

---

## Instalação completa (com token do GitHub)

Para gerar vídeos de qualquer usuário e atualizar dados:

```bash
cp .env.example .env
# edite .env e preencha GITHUB_TOKEN=ghp_...
```

Crie o token em <https://github.com/settings/tokens> — **nenhum escopo é necessário** para perfis públicos.

```bash
npm run fetch -- --username octocat   # baixa e grava em data/cache/
npm run dev
```

---

## Uso pela landing page

```bash
npm run dev
```

Na página em `http://127.0.0.1:4317`:

1. Digite o usuário do GitHub (ou cole a URL completa).
2. Clique em **carregar** para puxar o snapshot.
3. Escolha o tema e a resolução (1080p ou 720p).
4. Clique em **Gerar vídeo MP4**.
5. Acompanhe o progresso e baixe quando terminar.

---

## Uso pela linha de comando

```bash
# render básico
npm run render -- --username adalbertobrant --theme space --height 1080

# outros exemplos
npm run render -- --username octocat --theme metroid --height 720
npm run render -- --username adalbertobrant --theme pitfall --year 2025 --height 1080

# forçar atualização dos dados (requer GITHUB_TOKEN)
npm run render -- --username adalbertobrant --theme space --refresh
```

| Flag | Descrição | Padrão |
|---|---|---|
| `--username` | usuário do GitHub ou URL completa | `DEFAULT_USERNAME` do `.env` |
| `--theme` | `space`, `metroid` ou `pitfall` | `space` |
| `--height` | `1080` ou `720` | `VIDEO_HEIGHT` do `.env` |
| `--year` | ano a animar (2008 até hoje) | ano corrente |
| `--refresh` | força nova consulta ao GitHub | desligado |

---

## Uso com o Studio do Remotion

Para inspecionar a composição frame a frame:

```bash
npm run studio
```

O Studio abre em `http://localhost:3000` com scrubber, zoom e inspeção de props.

---

## Configuração via `.env`

Todas as variáveis são opcionais. O projeto funciona sem nenhuma delas usando os valores padrão.

| Variável | Descrição | Padrão |
|---|---|---|
| `GITHUB_TOKEN` | token para buscar/atualizar dados | vazio (usa cache) |
| `YEAR` | ano animado | ano corrente |
| `DEFAULT_USERNAME` | usuário inicial da landing | `adalbertobrant` |
| `HOST` | endereço do servidor | `127.0.0.1` |
| `PORT` | porta do servidor | `4317` |
| `VIDEO_HEIGHT` | resolução padrão (`1080` ou `720`) | `1080` |
| `REMOTION_CONCURRENCY` | frames renderizados em paralelo | automático |

---

## Como alterar o código

### Alterar a duração do vídeo

Tudo parte de `src/video/constants.ts`:

```ts
// src/video/constants.ts

export const VIDEO_FPS = 30;           // taxa de frames (não mude sem retestar)

export const INTRO_FRAMES = 120;       // abertura: 120 frames = 4 s
export const OUTRO_FRAMES = 246;       // encerramento: 246 frames = 8,2 s
export const RUN_FRAMES = 1596 - INTRO_FRAMES - 186; // corrida mensal (~43 s)

// TOTAL_FRAMES é calculado automaticamente:
export const TOTAL_FRAMES = INTRO_FRAMES + RUN_FRAMES + OUTRO_FRAMES;
```

**Exemplos práticos:**

```ts
// Vídeo mais curto (~40 s total)
export const INTRO_FRAMES = 90;
export const OUTRO_FRAMES = 180;
export const RUN_FRAMES = 900;

// Vídeo mais longo (~70 s total)
export const INTRO_FRAMES = 150;
export const OUTRO_FRAMES = 300;
export const RUN_FRAMES = 1650;

// Outro 5 s mais longo (ex.: mais tempo para a mensagem final)
export const OUTRO_FRAMES = 396; // +150 frames = +5 s
```

A duração de cada mês é calculada automaticamente por `allocatePhaseFrames()` em `src/video/game/timeline.ts`, proporcional à raiz quadrada das contribuições, com mínimo de 2 s e máximo de 5 s por mês ativo.

```ts
// src/video/game/timeline.ts — ajuste os limites por mês
const EMPTY_PHASE_FRAMES = 30;    // mês vazio: 1 s
const ACTIVE_MIN_FRAMES  = 60;    // mês ativo mínimo: 2 s
const ACTIVE_MAX_FRAMES  = 150;   // mês ativo máximo: 5 s
```

---

### Criar ou modificar sprites

Os sprites usam um formato próprio de pixel art: uma grade de caracteres onde cada letra mapeia para uma cor hex. O componente `PixelArt` em `src/video/art/PixelArt.tsx` renderiza a grade como divs CSS.

**Formato de um sprite:**

```ts
// src/video/art/sprites.ts
import type { Sprite } from "./PixelArt";

export const MEU_SPRITE: Sprite = {
  palette: {
    k: "#08050f",   // contorno preto (k = "kontur")
    r: "#ff5c6c",   // vermelho
    w: "#ffffff",   // branco
    ".": undefined, // ponto = transparente (não precisa declarar)
  },
  rows: [
    "..krrk..",   // cada string é uma linha de pixels
    ".krwwrk.",   // mesmo comprimento em todas as linhas
    "krwwwwrk",
    "krwwwwrk",
    ".krwwrk.",
    "..krrk..",
  ],
};
```

**Dicas de edição:**

- Todas as `rows` devem ter o mesmo comprimento; use `.` para transparência.
- O contorno `k: "#08050f"` quase preto é padrão em todos os sprites.
- Quanto maior o `scale` passado ao `<PixelArt>`, maior o sprite na tela (cada pixel vira um quadrado de `scale` px).
- Sprites de personagem usam `scale` 10–11; objetos coletáveis usam 6–7; inimigos 7–9.

**Para usar o sprite em cena:**

```tsx
// Qualquer arquivo em src/video/game/
import { PixelArt } from "../art/PixelArt";
import { MEU_SPRITE } from "../art/sprites";

// Dentro do JSX:
<PixelArt sprite={MEU_SPRITE} scale={8} />
```

**Sprites existentes em `src/video/art/sprites.ts`:**

| Export | Tema | Uso |
|---|---|---|
| `EXPLORER` | Pitfall | Personagem principal |
| `COIN` | Pitfall | Coletável comum |
| `GEM` | Pitfall | Coletável raro |
| `CHEST` | Pitfall | Coletável bônus |
| `CROC` | Pitfall | Decoração |
| `HUNTER` | Metroid | Personagem principal |
| `ALIEN` | Metroid | Inimigo (legado) |
| `ROCKET` | Space | Nave principal |
| `FLAME` | Space | Propulsão da nave |

Os sprites inline dos inimigos (onça, javali, jacaré, naves inimigas, monstros do labirinto) estão declarados diretamente nos arquivos de cena:

- `src/video/game/PitfallRun.tsx` — animais da selva
- `src/video/game/SpaceRun.tsx` — naves e inimigos espaciais
- `src/video/game/MetroidRun.tsx` — monstros do labirinto

Para promover um sprite inline a export global, mova-o para `src/video/art/sprites.ts` e importe onde necessário.

---

### Alterar cores e paletas de tema

As paletas ficam em `src/video/theme.tsx`:

```ts
// src/video/theme.tsx
export const THEMES: Record<ThemeId, ThemeSpec> = {
  space: {
    colors: {
      bg:          "#03020f",   // cor de fundo principal
      accent:      "#5eeaff",   // cor de destaque (score, glow)
      accent2:     "#ff5cd6",   // cor secundária (bônus)
      accent3:     "#ffd166",   // cor terciária
      fg:          "#eef6ff",   // texto principal
      dim:         "#8fa6c8",   // texto secundário
      glow:        "rgba(94, 234, 255, 0.55)",
      cells:       ["#14536e", "#1f8ba8", "#38cfe3", "#d8fbff"], // heatmap
      // ...
    },
    // ...
  },
};
```

---

### Alterar os beats narrativos (textos das cenas)

Os textos que aparecem na faixa superior são gerados em `src/video/narrative.ts`:

```ts
// src/video/narrative.ts — função buildBeats()
// Edite os templates de manchete e detalhe por condição:

if (m === peak) {
  headline = `${monthTitle} foi o mês mais intenso do ano.`;
  detail   = `${formatNumber(phase.count)} contribuições · ${formatNumber(phase.activeDays)} dias ativos.`;
}
```

Adicione novos campos ao tipo `Beat` se quiser mais linhas de texto:

```ts
export type Beat = {
  id:       string;
  month:    number;
  label:    string;    // kicker: "MARÇO · FASE 03"
  headline: string;    // manchete principal
  detail:   string;    // detalhe com métrica
  accent:   "neutral" | "success" | "warning";
};
```

---

### Adicionar sprites de SFX ou alterar os efeitos sonoros

Os efeitos são gerados em `scripts/generate-audio.mjs` e mapeados em `src/video/sfx.ts`.

Para adicionar um novo efeito:

```js
// scripts/generate-audio.mjs — no final do arquivo
const sfxMeuEfeito = makeSfx(0.3, (b) => {
  addNote(b, { start: 0, duration: 0.25, midi: n("C", 6), gain: 0.2, wave: "square" });
});
await writeFile(resolve(sfxDir, "meu-efeito.wav"), toWav(sfxMeuEfeito));
```

```ts
// src/video/sfx.ts
export type SfxKey = "shoot" | "hit" | "coin" | "jump" | "levelup" | "bonus" | "finish" | "meu-efeito";

export const SFX_FILES: Record<SfxKey, string> = {
  // ...
  "meu-efeito": "audio/sfx/meu-efeito.wav",
};
```

Rode `npm run audio` para regenerar todos os WAVs.

---

## Estrutura do projeto

```
animaGithubLocal/
├─ data/
│  ├─ avatars/            avatar baixado do GitHub
│  ├─ cache/              snapshots JSON  <usuario>-<ano>.json
│  └─ jobs.json           fila de render (não versionado)
├─ docs/                  briefings de versão
├─ out/                   vídeos MP4 (não versionado)
├─ public/
│  ├─ audio/              trilhas .wav + sfx/
│  └─ fonts/              fontes OFL copiadas do @fontsource
├─ scripts/
│  ├─ copy-fonts.mjs      copia fontes para public/fonts
│  ├─ generate-audio.mjs  sintetiza trilhas chiptune + SFX
│  ├─ fetch.ts            consulta GitHub → data/cache/
│  ├─ render.ts           CLI de render
│  └─ start.ts            servidor em modo produção
└─ src/
   ├─ shared/
   │  ├─ types.ts          GitHubStats, ThemeId, RenderJob e helpers
   │  └─ github.ts         cliente GraphQL + REST do GitHub
   ├─ server/
   │  ├─ index.ts          Express + rotas da API
   │  ├─ render-core.ts    Remotion bundler + renderMedia
   │  ├─ render-queue.ts   fila sequencial de jobs
   │  ├─ stats-store.ts    cache de snapshots JSON
   │  └─ config.ts         leitura do .env
   ├─ video/
   │  ├─ constants.ts      VIDEO_FPS, TOTAL_FRAMES, INTRO/OUTRO/RUN_FRAMES
   │  ├─ theme.tsx          ThemeSpec + paletas dos 3 temas
   │  ├─ narrative.ts      Beat[] — textos derivados dos dados
   │  ├─ AnimaGithub.tsx   composição raiz → delega para GameStage
   │  ├─ Root.tsx           entrada do Remotion
   │  ├─ Hud.tsx            HUD de cantos e efeitos de tela
   │  ├─ art/
   │  │  ├─ PixelArt.tsx   componente de grade de pixels
   │  │  └─ sprites.ts     sprites compartilhados (ROCKET, HUNTER, EXPLORER…)
   │  ├─ backgrounds/      SpaceBackground, MetroidBackground, PitfallBackground
   │  ├─ game/
   │  │  ├─ GameStage.tsx  compositor principal (TopBand + Run + HUD)
   │  │  ├─ TopBand.tsx    faixa narrativa y=0..260
   │  │  ├─ timeline.ts    buildTimeline, fases, objetos, pulos, scoreEvents
   │  │  ├─ score.ts       scoreAtFrame, recentEvents
   │  │  ├─ prng.ts        PRNG determinístico com seed
   │  │  ├─ Fireworks.tsx  fogos de artifício + OutroMessage
   │  │  ├─ SpaceRun.tsx   palco do tema Espaço
   │  │  ├─ MetroidRun.tsx palco do tema Metroid
   │  │  └─ PitfallRun.tsx palco do tema Pitfall
   │  ├─ scenes/           cenas legadas (não usadas na composição)
   │  └─ themes/art.tsx    artes de intro (SpaceIntroArt etc.)
   └─ web/
      ├─ App.tsx           landing page
      ├─ api.ts            cliente REST da landing
      └─ styles.css        estilos da landing
```

---

## Como funciona por dentro

```
Browser (React + @remotion/player)
    │  REST /api/*
Express server
    ├─ GET  /api/stats      → stats-store → data/cache/ ou GitHub API
    ├─ POST /api/render     → render-queue → render-core
    ├─ GET  /api/jobs/:id   → polling de progresso
    └─ GET  /videos/*       → serve out/*.mp4

render-core
    ├─ bundle()             → Webpack empacota src/video/index.ts (uma vez por sessão)
    ├─ selectComposition()  → resolve TOTAL_FRAMES com inputProps reais
    └─ renderMedia()        → Chrome headless, codec H.264, scale para 720p/1080p

Composição Remotion (por frame):
    GameStage
    ├─ buildTimeline(stats, theme)   → 12 fases, objetos, pulos, scoreEvents
    ├─ buildBeats(stats, timeline)   → textos narrativos por fase
    ├─ scoreAtFrame(events, frame)   → score incremental
    ├─ TopBand                       → y 0..260
    ├─ [Space|Metroid|Pitfall]Run    → y 260..1036
    └─ HUD inferior + ScreenEffects  → y 1036..1080
```

**Determinismo:** toda a animação é calculada a partir de `useCurrentFrame()`. Nenhum `Math.random()` solto. O PRNG usa seed `login:year:theme:anima-0.1.1` — mesmo input sempre gera o mesmo vídeo.

---

## Build de produção

```bash
npm run build   # typecheck + Vite build → dist/web/
npm start       # Express serve dist/web + /videos
```

---

## Solução de problemas

| Problema | Solução |
|---|---|
| Chrome Headless Shell não encontrado | `npx remotion browser ensure` |
| Render travado em "Preparando" | O primeiro bundle leva ~15 s; aguarde ou veja o log do terminal |
| Dados desatualizados | `npm run fetch -- --username <user> --refresh` com token no `.env` |
| Porta 4317 ocupada | `fuser -k 4317/tcp && npm run dev` |
| Sem áudio ou fontes | `npm run setup` |
| Typecheck falhando | `npm run typecheck` mostra a linha exata |

---

## Licença

Código próprio. Fontes Orbitron, Press Start 2P, VT323 e Atkinson Hyperlegible sob **SIL Open Font License 1.1**. Trilhas e SFX: síntese original em `scripts/generate-audio.mjs`. Remotion usado sob sua licença própria (gratuita para uso pessoal/open source; veja [remotion.dev/license](https://remotion.dev/license) para uso comercial).
