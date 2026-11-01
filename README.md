# Anima GitHub Local

Transforme o seu ano no GitHub em um vídeo MP4 animado — **100% na sua máquina**. Sem Lambda, sem banco, sem upload, sem telemetria. Você digita o usuário, escolhe um dos três temas e o Remotion renderiza o vídeo localmente com trilha chiptune original.

```bash
npm run dev      # → http://127.0.0.1:4317
npm run render -- --username seunome --theme pitfall --height 1080
```

---

## Branches disponíveis

O projeto tem três branches com features diferentes e independentes. Cada uma funciona de forma autônoma.

| Branch | Feature | Status |
|---|---|---|
| `main` | Animação estilo jogo com os três temas | ✅ Estável |
| `newFeature` | Jogo interativo **Git Runner** jogável no browser | 🧪 Experimental |
| `feature_cv` | Gerador de currículo em PDF/Markdown com análise ATS | 🧪 Experimental |

### Como testar cada branch

```bash
# Clonar o repositório
git clone <repo> animaGithubLocal
cd animaGithubLocal

# Branch principal — vídeo animado (padrão)
git checkout main
npm install && npm run setup && npm run dev

# Branch do jogo interativo
git checkout newFeature
npm install && npm run setup && npm run dev

# Branch do gerador de currículo
git checkout feature_cv
npm install && npm run setup && npm run dev
```

> Após trocar de branch, sempre rode `npm install` para garantir que as dependências estejam sincronizadas.

---

## Branch `main` — Animação do ano em código

### O que é

Gera um vídeo MP4 de ~53 segundos com a sua atividade no GitHub animada como um jogo retrô. O personagem corre pela tela mês a mês, coleta contribuições, enfrenta obstáculos e chega ao final com fogos de artifício.

### Temas disponíveis

| Tema | Universo | O que acontece |
|---|---|---|
| `space` | Arcade espacial | Nave destrói naves inimigas, asteroides e aliens mês a mês |
| `metroid` | Ficção científica 16-bit | Caçador desce labirinto com lava, água e pedras matando monstros variados |
| `pitfall` | Aventura de selva | Explorador pula onças, javalis, jacarés e buracos coletando tesouros |

Cada tema tem paleta, fontes, transições, HUD, trilha chiptune e sprites 100% originais.

### Instalação mínima (sem token)

O projeto inclui um snapshot real de `adalbertobrant` em `data/cache/`. Funciona offline imediatamente.

```bash
git checkout main
npm install
cp .env.example .env
npm run setup     # copia fontes, sintetiza áudio, baixa Chrome headless
npm run dev       # http://127.0.0.1:4317
```

### Instalação completa (com token do GitHub)

Para gerar vídeos de qualquer usuário público:

```bash
# Em .env:
GITHUB_TOKEN=ghp_...
```

Crie o token em <https://github.com/settings/tokens> — **nenhum escopo necessário** para perfis públicos.

```bash
npm run fetch -- --username octocat
npm run dev
```

### Render via CLI

```bash
npm run render -- --username adalbertobrant --theme space    --height 1080
npm run render -- --username octocat        --theme metroid  --height 720
npm run render -- --username adalbertobrant --theme pitfall  --year 2025
```

| Flag | Descrição | Padrão |
|---|---|---|
| `--username` | Usuário do GitHub ou URL | `DEFAULT_USERNAME` |
| `--theme` | `space`, `metroid` ou `pitfall` | `space` |
| `--height` | `1080` ou `720` | `VIDEO_HEIGHT` |
| `--year` | Ano a animar | Ano corrente |
| `--refresh` | Força nova consulta ao GitHub | Desligado |

Os vídeos são salvos em `out/<usuario>-<tema>-<ano>-<altura>p.mp4`.

### Studio do Remotion

```bash
npm run studio   # http://localhost:3000 — scrubber frame a frame
```

---

## Branch `newFeature` — Git Runner (jogo interativo)

### O que é

Um jogo de plataforma 2D jogável diretamente no browser, acessível pelo botão **🕹️ GIT RUNNER** no canto inferior direito da landing page.

### Como jogar

```bash
git checkout newFeature
npm install && npm run setup && npm run dev
# Abra http://127.0.0.1:4317
# Clique no botão 🕹️ GIT RUNNER (canto inferior direito)
```

### Mecânica

| Elemento | O que faz |
|---|---|
| **Personagem** | Dev de hoodie azul que corre automaticamente |
| **Estrelas** | Coletáveis espalhados pelo caminho (+20 / +50 / +100 pts) |
| **Códigos** | Coletar 5 aciona animação de `git add → commit → push` (+500 pts) |
| **PR Boxes** | Obstáculos que pulam em direção ao personagem; pisar por cima quica sem dano |
| **Corações** | 3 vidas; tomar dano de PR Box remove 1 |
| **START / END** | Placa de início e castelo no fim do nível |

### Controles

| Tecla | Ação |
|---|---|
| `← →` ou `A D` | Mover |
| `Espaço` ou `↑` | Pular |
| `ENTER` | Reiniciar após Game Over / Win |
| `ESC` | Fechar o jogo |

Controles touch também disponíveis na tela para mobile.

### Sprites

Todos os sprites são pixel art 32×32 originais (não usam assets de jogos comerciais):

| Arquivo | Uso |
|---|---|
| `sprite-001..008.jpg` | Ciclo de animação do personagem |
| `sprite-pr-001..009.jpg` | Animação da PR Box |
| `sprite-start.jpg` / `sprite-end.jpg` | Marcadores de início e fim |
| `sprite-heart-full.jpg` / `heart-dead.jpg` | Indicador de vidas |
| `sprite-star-1..3.jpg` | Estrelas (3 tamanhos) |
| `sprite-code-001..003.jpg` | Códigos coletáveis |
| `sprite-field.jpg` / `sprite-montain.jpg` | Chão e fundo |
| `sprite-castle.jpg` / `sprite-tower.jpg` | Castelo no fim do nível |

Os sprites ficam em `spriteNew/` e são copiados automaticamente para `public/game/` ao rodar o servidor.

---

## Branch `feature_cv` — Gerador de Currículo

### O que é

Gera um currículo profissional em **PDF** ou **Markdown** a partir dos seus repositórios do GitHub, com análise ATS e suporte opcional a IA (OpenAI / Gemini).

O botão **📄 CV** fica no canto superior direito da topbar.

### Como usar

```bash
git checkout feature_cv
npm install && npm run setup && npm run dev
# Abra http://127.0.0.1:4317
# Clique em 📄 CV (canto superior direito)
```

**Pré-requisito:** `GITHUB_TOKEN` configurado no `.env` (necessário para buscar os repositórios).

```env
GITHUB_TOKEN=ghp_...

# Opcional — enriquece a análise ATS com IA:
OPENAI_API_KEY=sk-...
# ou
GEMINI_API_KEY=...
```

### Fluxo

```
1. Preencher perfil pessoal (nome, email, título, LinkedIn, resumo, skills)
   → pode ser salvo localmente com "💾 Salvar perfil"

2. Escolher idioma (PT-BR ou EN) e formato (PDF ou Markdown)

3. Clicar em ⚡ Gerar currículo
   → busca todos os repos próprios (não fork) com commits nos últimos 2 anos
   → extrai: linguagem dominante, domínio, excerpt do README, contagem de commits
   → agrupa por linguagem + domínio

4. Ver resultado:
   - Aba Preview: Markdown gerado
   - Aba 🎯 ATS: score, pontos fortes, sugestões, keywords
   - Botões de download PDF e Markdown
```

### Agrupamento de repositórios

Os repos são organizados automaticamente em duas dimensões:

**Por linguagem dominante** — TypeScript, Python, Go, Rust, etc.

**Por domínio inferido** (via tópicos + linguagem + nome do repo):

| Domínio | Exemplos de keywords |
|---|---|
| Web | react, next, vue, frontend, tailwind |
| Backend | api, rest, graphql, express, fastapi |
| DevOps | docker, kubernetes, terraform, ci/cd |
| Data | pandas, spark, ml, llm, pipeline |
| Mobile | flutter, react-native, android, ios |
| CLI | cli, terminal, script, automation |
| Game | game, canvas, godot, phaser |
| Security | security, auth, oauth, crypto |
| Library | sdk, plugin, package, framework |
| Education | tutorial, course, demo, boilerplate |

### Análise ATS

Funciona sem API key (análise heurística local):

- **Score 0–100** — calculado por keywords técnicas encontradas + qualidade do perfil + volume de repos
- **Keywords encontradas** — termos técnicos presentes no currículo
- **Pontos fortes** — repo count, estrelas, diversidade de domínios e linguagens
- **Sugestões** — o que melhorar para passar em mais ATS scanners
- **Skills otimizadas** — reordenadas por relevância ATS

Com `OPENAI_API_KEY` ou `GEMINI_API_KEY`, o campo "Resumo da IA" é gerado por GPT-4o-mini ou Gemini 1.5 Flash.

### Arquivos gerados

Os arquivos ficam em `out/cv/`:

```
out/cv/
├─ seu-nome-cv-pt.md     ← Markdown em PT-BR
├─ seu-nome-cv-en.md     ← Markdown em EN
├─ seu-nome-cv-pt.pdf    ← PDF em PT-BR
└─ seu-nome-cv-en.pdf    ← PDF em EN
```

O PDF é gerado pelo Chrome Headless já presente no Remotion — sem dependência extra.

---

## Requisitos gerais

- **Node.js 20+** (testado com Node 26)
- npm
- Linux, macOS ou Windows
- ~1 GB de espaço livre (Chrome Headless Shell + dependências)

---

## Configuração via `.env`

Todas as variáveis são opcionais exceto onde indicado.

| Variável | Descrição | Padrão |
|---|---|---|
| `GITHUB_TOKEN` | Token para buscar/atualizar dados | vazio (usa cache) |
| `YEAR` | Ano animado | Ano corrente |
| `DEFAULT_USERNAME` | Usuário inicial da landing | `adalbertobrant` |
| `HOST` | Endereço do servidor | `127.0.0.1` |
| `PORT` | Porta do servidor | `4317` |
| `VIDEO_HEIGHT` | Resolução padrão (`1080` ou `720`) | `1080` |
| `REMOTION_CONCURRENCY` | Frames renderizados em paralelo | `4` |
| `OPENAI_API_KEY` | API key OpenAI para ATS (`feature_cv`) | vazio |
| `GEMINI_API_KEY` | API key Gemini para ATS (`feature_cv`) | vazio |

---

## Como alterar o código

### Alterar a duração do vídeo (`main`)

```ts
// src/video/constants.ts
export const INTRO_FRAMES = 120;   // abertura: 4 s
export const OUTRO_FRAMES = 246;   // encerramento: 8,2 s
export const RUN_FRAMES   = 1290;  // corrida mensal: ~43 s
// TOTAL_FRAMES é calculado automaticamente
```

Duração de cada mês: configurável em `src/video/game/timeline.ts`:

```ts
const EMPTY_PHASE_FRAMES = 30;   // mês vazio: 1 s
const ACTIVE_MIN_FRAMES  = 60;   // mês ativo mínimo: 2 s
const ACTIVE_MAX_FRAMES  = 150;  // mês ativo máximo: 5 s
```

### Criar sprites de pixel art

Os sprites usam uma grade de caracteres onde cada letra mapeia para uma cor hex:

```ts
// src/video/art/sprites.ts
export const MEU_SPRITE: Sprite = {
  palette: {
    k: "#08050f",  // contorno (k = "kontur")
    r: "#ff5c6c",  // vermelho
    ".": undefined // transparente
  },
  rows: [
    "..krrk..",
    ".krwwrk.",
    "krwwwwrk",
    ".krwwrk.",
    "..krrk..",
  ],
};
```

```tsx
// Uso em qualquer cena:
<PixelArt sprite={MEU_SPRITE} scale={8} />
// scale: personagens 10-11, objetos 6-7, inimigos 7-9
```

### Alterar paletas de tema

```ts
// src/video/theme.tsx — cores de cada tema
colors: {
  bg:      "#03020f",   // fundo principal
  accent:  "#5eeaff",   // destaque (score, glow)
  accent2: "#ff5cd6",   // cor secundária (bônus)
  fg:      "#eef6ff",   // texto principal
}
```

### Alterar os textos narrativos

```ts
// src/video/narrative.ts — função buildBeats()
if (m === peak) {
  headline = `${monthTitle} foi o mês mais intenso do ano.`;
  detail   = `${formatNumber(phase.count)} contribuições · ${formatNumber(phase.activeDays)} dias ativos.`;
}
```

---

## Estrutura do projeto

```
animaGithubLocal/
├─ data/
│  ├─ avatars/             avatar baixado do GitHub
│  ├─ cache/               snapshots JSON <usuario>-<ano>.json
│  └─ jobs.json            fila de render (não versionado)
├─ out/
│  ├─ *.mp4                vídeos gerados (não versionado)
│  └─ cv/                  currículos gerados (branch feature_cv)
├─ public/
│  ├─ audio/               trilhas .wav + sfx/
│  ├─ fonts/               fontes OFL
│  └─ game/                sprites do Git Runner (branch newFeature)
├─ spriteNew/              sprites originais 32×32 (branch newFeature)
├─ scripts/
│  ├─ copy-fonts.mjs
│  ├─ generate-audio.mjs
│  ├─ fetch.ts
│  ├─ render.ts
│  └─ start.ts
└─ src/
   ├─ shared/
   │  ├─ types.ts           GitHubStats, ThemeId, RenderJob
   │  ├─ github.ts          cliente GraphQL + REST do GitHub
   │  └─ cv-types.ts        tipos do currículo (branch feature_cv)
   ├─ server/
   │  ├─ index.ts           Express + rotas da API
   │  ├─ render-core.ts     Remotion bundler + renderMedia
   │  ├─ render-queue.ts    fila sequencial de jobs
   │  ├─ stats-store.ts     cache de snapshots
   │  ├─ cv-github.ts       busca repos para CV (branch feature_cv)
   │  ├─ cv-ats.ts          análise ATS + IA (branch feature_cv)
   │  └─ cv-render.ts       geração MD + PDF (branch feature_cv)
   ├─ video/
   │  ├─ constants.ts       VIDEO_FPS, TOTAL_FRAMES, durações
   │  ├─ theme.tsx           paletas dos 3 temas
   │  ├─ narrative.ts       textos narrativos por fase
   │  ├─ AnimaGithub.tsx    composição raiz → GameStage
   │  ├─ art/               PixelArt.tsx + sprites.ts
   │  ├─ backgrounds/       SpaceBackground, MetroidBackground, PitfallBackground
   │  └─ game/
   │     ├─ GameStage.tsx   compositor principal
   │     ├─ TopBand.tsx     faixa narrativa y=0..260
   │     ├─ timeline.ts     fases, objetos, pulos, scoreEvents
   │     ├─ score.ts        score incremental
   │     ├─ Fireworks.tsx   fogos + mensagem final
   │     ├─ SpaceRun.tsx    palco Espaço
   │     ├─ MetroidRun.tsx  palco Metroid
   │     └─ PitfallRun.tsx  palco Pitfall
   └─ web/
      ├─ App.tsx            landing page
      ├─ game/
      │  ├─ engine.ts       engine Canvas 2D (branch newFeature)
      │  └─ GitRunner.tsx   componente React do jogo (branch newFeature)
      └─ cv/
         └─ CvBuilder.tsx   modal do currículo (branch feature_cv)
```

---

## Solução de problemas

| Problema | Solução |
|---|---|
| Chrome Headless Shell não encontrado | `npx remotion browser ensure` |
| Render travado em "Preparando" | Aguarde ~15 s; o primeiro bundle é lento |
| Dados desatualizados | `npm run fetch -- --username <user> --refresh` com token |
| Porta 4317 ocupada | `fuser -k 4317/tcp && npm run dev` |
| Sem áudio ou fontes | `npm run setup` |
| CV: "GITHUB_TOKEN obrigatório" | Configure `GITHUB_TOKEN` no `.env` |
| CV: PDF não gerado | O fallback salva `.html`; abra no browser e use Ctrl+P |
| Jogo não carrega sprites | Verifique se `public/game/` existe; rode `npm run dev` novamente |

---

## Licença

Código próprio. Fontes Orbitron, Press Start 2P, VT323 e Atkinson Hyperlegible sob **SIL Open Font License 1.1**. Trilhas e SFX: síntese original em `scripts/generate-audio.mjs`. Remotion usado sob sua licença própria — gratuito para uso pessoal/open source; veja [remotion.dev/license](https://remotion.dev/license) para uso comercial.
