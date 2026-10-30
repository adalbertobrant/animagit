# prompt_master — animaGithubLocal 0.1.1

> Prompt de implementação. Leia este arquivo inteiro antes de editar código.
> Briefing de produto: `docs/PROMPT-0.1.1.md`. Este arquivo descreve o estado real do repositório e o que falta para o vídeo parecer um jogo.

## Missão

Fazer os três temas (`space`, `metroid`, `pitfall`) parecerem um jogo que se joga sozinho durante ~53 s.

O texto narrativo fica na faixa superior. O palco abaixo mostra, o tempo todo, o personagem ou a nave em ação: correndo, pulando, atirando e coletando. Cada objeto coletado ou destruído representa um dado real do ano no GitHub. O placar sobe na hora do evento, não aparece já no total.

Não mudar API, fila, jobs, cache, autenticação nem a stack (React 18, Vite 6, Remotion `4.0.539`, Express 4). Arte original. Nenhum sprite, sample ou asset da Nintendo, Atari ou de bibliotecas pagas.

## Por que os sprites não se mexem como um jogo

A composição principal ainda é um infográfico. `src/video/AnimaGithub.tsx` monta sete cenas com `TransitionSeries`: `Intro`, `Contributions`, `Streak`, `Languages`, `Productivity`, `Highlights`, `Outro`. Depois da abertura, o palco vira calendário, barras, cards e números. O personagem some.

Os sprites existem, mas só como ilustração parada:

| Sprite | Onde aparece | Movimento real |
| --- | --- | --- |
| `ROCKET` + `FLAME` | `SpaceIntroArt` na Intro e no Outro | flutua com `Math.sin` e a chama estica |
| `HUNTER` + `ALIEN` | `MetroidIntroArt` na Intro e no Outro | sobe e desce alguns pixels; a porta abre uma vez |
| `EXPLORER` + `CHEST` + `CROC` | `PitfallIntroArt` na Intro e no Outro | o explorador oscila 8 px; baú e crocodilo ficam fixos |
| `COIN`, `GEM` | definidos em `src/video/art/sprites.ts` | **nunca são renderizados** |
| `FLAME` | também na cena `Streak` | decoração ao lado do número da sequência |

`PixelArt` desenha um único frame: uma grade CSS a partir de `rows`. Não há ciclo de corrida, pulo, tiro ou moeda girando. Cada personagem é uma pose só.

Os fundos se movem sem o personagem. `PitfallBackground` desloca árvores e o chão. `SpaceBackground` faz as estrelas descerem. `MetroidBackground` anima esporos e o lago. Isso é cenário. Não é gameplay. Os crocodilos do Pitfall estão colados em `left: 180 | 760 | 1430` e não cruzam o explorador.

A simulação do jogo já foi escrita e ninguém a usa. `buildTimeline` em `src/video/game/timeline.ts` calcula as 12 fases mensais, os objetos, os pulos, os obstáculos e os `scoreEvents`. `src/video/game/prng.ts` fornece o PRNG com seed. Nenhum outro arquivo importa esses módulos. `COIN` e `GEM` também não têm import fora de `sprites.ts`.

Constantes de palco já existem em `src/video/constants.ts` (`TOP_BAND_HEIGHT = 260`, `GAME_TOP`, `GAME_BOTTOM = 1036`, `INTRO_FRAMES = 120`, `OUTRO_FRAMES = 186`, `RUN_FRAMES`) e a composição principal as ignora. Ela ainda usa `SCENE_DURATIONS` e `TOTAL_FRAMES` das sete cenas.

O HUD do Pitfall mostra `SCORE` já no valor final (`stats.contributions.total`). Não incrementa quando algo é coletado, porque nada é coletado.

## O que reaproveitar

Não reescrever o que já está certo.

- `buildTimeline`, `allocatePhaseFrames`, `findPhaseAtFrame`, `phaseLocalFrame`, `jumpLift` e os tipos `GamePhase`, `RunObject`, `JumpEvent`, `ObstacleEvent`, `ScoreEvent`.
- `createRng` / `hashString`. Seed atual: `` `${login}:${year}:${theme}:anima-0.1.1` ``.
- Sprites e paletas em `src/video/art/sprites.ts` e o componente `PixelArt`.
- Fundos em `src/video/backgrounds/*`. Recortar o palco para `y = 260..1036`; o parallax continua.
- Paletas, áudio de fundo e fontes em `src/video/theme.tsx` e `src/video/fonts.ts`. Atkinson Hyperlegible já está em `public/fonts` e em `theme.fonts.narrative`.
- Snapshot de teste: `data/cache/adalbertobrant-2026.json`.
- Landing, `src/server/*`, CLI `scripts/render.ts`. Só ajustar textos da landing se a lista de cenas mudar.

As cenas em `src/video/scenes/` podem ficar no repositório. Não montá-las em `AnimaGithub`.

## Comportamento obrigatório

Layout, em 1920×1080:

- Faixa narrativa: `y = 0` até `y = 260`. Nenhum parágrafo narrativo abaixo disso.
- Palco: `y = 260` até `y = 1036`. Sem cards, tabelas, gráficos ou blocos de texto. Feedback curto (`+1`, `+5`, `BÔNUS`) pode flutuar no palco.
- HUD inferior: `y = 1036` até `y = 1080`, com a barra de progresso do ano.
- Margem lateral de 48 px na faixa de texto.

A faixa tem duas colunas. Esquerda: kicker (`MARÇO · FASE 03`), manchete (no máximo 2 linhas) e detalhe. Direita: score que sobe, fase `03/12` e, por tema, energia (Metroid), tesouros (Pitfall) ou integridade/combo (Espaço). Troca de texto por corte, fade curto ou type-on de 6–10 frames.

Tipografia:

- Leitura (manchete, detalhe, números, legendas): Atkinson Hyperlegible.
- Press Start 2P e Orbitron só em kicker, score, labels curtos e nome de fase.
- Mínimos em 1080p: manchete 40 px, detalhe 28 px, kicker 22 px, score 34 px, label de HUD 20 px.
- Em 720p a manchete efetiva não pode ficar abaixo de 26 px. O `Player` e o render escalam o quadro; não reduzir a fonte do arquivo 1080p para “caber” no 720p.
- Contraste mínimo 4,5:1. Sombra ou contorno quando o fundo for claro.
- Caixa alta só em kicker, score e labels curtos.

Tempo: 30 fps, ~1596 frames, ~53 s. Abertura 120 frames. Corrida `RUN_FRAMES`. Fechamento 186 frames. A duração de cada mês já sai de `allocatePhaseFrames`: mês ativo entre 2 s e 5 s, mês vazio ~1 s, soma exata de `RUN_FRAMES`. O jogo não corta para um slide entre meses. A troca de fase é visual no palco (paleta, portal, túnel, amanhecer) enquanto o personagem continua se movendo.

Determinismo: `useCurrentFrame`, `interpolate`, `spring`. Sem `setTimeout`, `Date.now` ou `Math.random()` solto. Pré-calcular timeline, beats e spawns em `useMemo`. Limite de cerca de 40–60 sprites ao mesmo tempo.

Pontuação, já modelada em `timeline.ts`:

- Cada objeto representa um lote de contribuições. A soma de `object.points` no mês é o `count` daquele mês. Não spawnar uma moeda por contribuição quando o mês tem dezenas: o teto atual é ~16 objetos, com pontos distribuídos.
- Objeto bônus (`variant === 2`) soma +5 à parte, no frame `hitAt + 2`. Bônus vêm de PRs, issues, top repo e streak, com teto de 8 unidades.
- O placar visível é a soma dos `scoreEvents` cujo `frame` já passou. No último frame, pontos + bônus batem com `timeline.totalScore`, e a parte base bate com o total de contribuições do calendário.

## Mecânica na tela

Personagem ou nave sempre visível, no terço esquerdo do palco. O mundo anda para a esquerda (câmera parada). O jogador não controla nada.

**Espaço.** Nave no terço inferior esquerdo, chama animada. Disparo automático, no máximo 2–3 tiros por segundo, com projétil visível. Meteoros entram pela direita. No `hitAt` do objeto: flash, recuo curto, explosão em pixels, `+1` (ou `+N` se o objeto vale vários pontos) e, se for bônus, `+5`. Mês vazio: setor sem meteoros e texto curto. Fecho: `ANO CONCLUÍDO`.

**Metroid.** Caçador correndo para a direita em ciclo visível (troca de pose ou passada, não só um bob de 8 px). Pulos nos `phase.jumps` usando `jumpLift`. Tiro contra criaturas que entram pela direita. Criatura pisca e some no `hitAt`. Cada mês termina atravessando uma porta; a paleta do setor muda. Barra de energia no HUD pode oscilar e não zera. Mês vazio: corredor sem criaturas. Fecho: `MISSÃO CONCLUÍDA`.

**Pitfall.** Explorador correndo, pulando os `obstacles` (tronco, pedra, buraco, cobra — arte original, colisão sem violência gráfica). Tesouros (`COIN`, `GEM`, `CHEST` para o bônus) entram pela direita e somem no `hitAt` com brilho e `+1` / `+5` subindo. Poeira nos pés. Mês vazio: trilha sem tesouro. No fecho, o maior tesouro é `stats.topRepos[0]`. Fecho: `EXPEDIÇÃO CONCLUÍDA`.

O jogo não pode ficar visualmente parado por mais de 1 s. Mês vazio ainda tem parallax e passada.

## Arquivos a criar

```
src/video/narrative.ts          # beats a partir de GameTimeline + GitHubStats
src/video/game/GameStage.tsx    # fundo + faixa + palco + HUD + áudio
src/video/game/TopBand.tsx
src/video/game/score.ts         # score visível no frame, a partir de scoreEvents
src/video/game/SpaceRun.tsx
src/video/game/MetroidRun.tsx
src/video/game/PitfallRun.tsx
src/video/sfx.ts                # só se os WAV existirem; ver pergunta em aberto
```

`AnimaGithub.tsx` passa a renderizar `GameStage` no lugar do `TransitionSeries`. `Root.tsx` continua com `id="AnimaGithub"` e a mesma `durationInFrames` (`TOTAL_FRAMES` precisa continuar ~1596; hoje ele é a soma das cenas menos as transições, que já dá 1596).

`narrative.ts` produz, por fase, pelo menos:

```ts
type Beat = {
  id: string;
  month: number;
  label: string;
  headline: string;
  detail: string;
  accent: "neutral" | "success" | "warning";
};
```

Português do Brasil. Uma ideia por manchete. Não repetir o mesmo número na manchete e no detalhe. Exemplos: “Março foi o mês mais intenso.” / detalhe “38 contribuições · 12 dias ativos”. Abertura e fecho também são beats, fora das 12 fases.

Sprites: se a pose única ficar ilegível como corrida, desenhar 2–4 frames originais no mesmo formato de `rows` (caracteres + paleta), sem copiar grade de jogo comercial. A moeda do Pitfall precisa de pelo menos duas silhuetas para parecer que gira.

## Áudio

Manter `public/audio/{space,metroid,pitfall}.wav` em loop, volume como hoje (sobe em 24 frames, desce nos últimos 52).

Efeitos curtos, só se forem sintetizados em `scripts/generate-audio.mjs` e gravados em `public/audio/sfx/`: `shoot`, `hit`, `coin`, `jump`, `levelup`, `bonus`, `finish`. Volume 0.15–0.35. Não disparar um sample por frame. Sem samples externos. Se os arquivos não existirem, o vídeo segue mudo nos efeitos e a música de fundo continua.

## Critério de pronto

- Em qualquer frame da corrida dá para ver o mês, a manchete e o personagem ou a nave fazendo uma ação.
- Espaço: tiro, meteoro destruído, score sobe no frame do abate.
- Metroid: corrida, pulo, tiro, criatura some, porta entre meses.
- Pitfall: corrida, pulo sobre obstáculo, moeda ou gema coletada, `+1` sobe.
- Mês sem contribuições não quebra a continuidade.
- Placar final coerente com `timeline.baseTotal` e `timeline.bonusTotal`.
- `npm run typecheck` e `npm run build` passam.
- O mesmo `stats` + tema gera a mesma timeline (mesma seed).

Inspeção: stills por volta de 1 s, 8 s, 16 s, 24 s, 32 s, 40 s, 48 s e 52 s, nos três temas, em 1080p. Texto acima de `y = 260`, personagem visível, score diferente entre o meio e o fim.

## Fora de escopo

Não criar tema novo. Não adicionar controle do usuário. Não trocar o Remotion. Não alterar a fila nem o formato do snapshot. Não commitar `.env`, `out/` ou `data/jobs.json`.

## Ordem

1. Ligar `buildTimeline` num teste ou num `console` temporário com o snapshot e conferir que a soma dos pontos base equals `contributions` derivadas do calendário.
2. `TopBand` com beats estáticos do snapshot.
3. `GameStage` com palco vazio, personagem parado no terço esquerdo, fundo já cortado na faixa `GAME_TOP..GAME_BOTTOM`.
4. `PitfallRun`: corrida, moedas e pulos. Este é o caso que o usuário descreveu (“coletando as moedas”).
5. `SpaceRun` e `MetroidRun`.
6. Trocar `AnimaGithub` para `GameStage`.
7. Ajustar contraste e tamanho da faixa. SFX por último.

## Decisões já tomadas

1. Câmera fixa, mundo scrollando. O personagem não atravessa a tela inteira e some.
2. Objetos agrupam contribuições. Um mês de 38 contribuições não spawna 38 moedas.
3. A faixa de texto é permanente; o conteúdo muda por fase.
4. As cenas antigas saem da composição e permanecem no disco.
5. Duração global continua ~1596 frames a 30 fps.
