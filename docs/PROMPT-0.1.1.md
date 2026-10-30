# Prompt de implementação — animaGithubLocal 0.1.1

> **Versão alvo:** `0.1.1`
> **Escopo:** redesenhar o vídeo dos três temas para uma linguagem de **jogo em movimento**, com o texto narrativo fixo na faixa superior e o restante da tela dedicado à ação.
> **Não implementar agora:** este documento é o briefing para a próxima sessão de trabalho.

---

## 1. Missão para o agente

Você vai evoluir o projeto `~/git/animaGithubLocal` da versão 0.1 para a 0.1.1.

O vídeo atual parece um conjunto de painéis e dashboards animados. A nova versão deve parecer **um jogo rodando**: o texto fica na parte de cima, legível, enquanto o resto da tela mostra um personagem/nave atravessando o ano do GitHub, andando, pulando, atirando e coletando coisas. Cada ação na tela deve representar um dado real do ano.

O resultado continua sendo um MP4 local, gerado pelo Remotion, com a mesma landing page, API, fila e CLI. Não há mudança de backend, autenticação, banco ou cloud.

**Frase-guia:** “O topo conta a história; embaixo, o jogo mostra a história acontecendo.”

---

## 2. Contexto técnico atual

- Projeto: `~/git/animaGithubLocal`
- Stack: React 18 + Vite 6 + Remotion `4.0.539` + Express 4 + TypeScript.
- Composição principal: `src/video/AnimaGithub.tsx`.
- Hoje ela usa `TransitionSeries` com sete cenas de infográfico: `Intro`, `Contributions`, `Streak`, `Languages`, `Productivity`, `Highlights`, `Outro`.
- Cenários e sprites atuais ficam em `src/video/backgrounds`, `src/video/themes/art.tsx` e `src/video/art`.
- HUD atual: `src/video/Hud.tsx` (cantos, REC, ano, login, barra de progresso).
- Dados: `GitHubStats` em `src/shared/types.ts`. O calendário diário (`stats.contributions.calendar`) permite agregar contribuições por mês.
- Dados já disponíveis: total, commits, PRs, issues, reviews, repositórios, dias ativos, maior sequência, melhor dia, linguagens, produtividade por hora/dia, destaques, top repos e estrelas.
- Áudio: trilhas WAV originais em `public/audio`.
- Fontes locais: Orbitron, Press Start 2P e VT323 em `public/fonts`.
- Render: 1920×1080, 30 fps, 1596 frames (~53,2 s).
- O snapshot real de `adalbertobrant` em 2026 está em `data/cache`.

**Não reutilizar assets da Nintendo, Atari ou de bibliotecas pagas.** Tudo deve continuar sendo arte original inspirada nos universos, não cópia de sprites existentes.

---

## 3. Mudança central de layout

### 3.1 Faixa de texto no topo

Reservar a parte superior da tela para a narrativa e o placar:

- Área segura total: 48 px nas laterais.
- **Faixa de texto:** de `y = 0` até `y = 260` (aproximadamente 24% da altura).
- **Palco do jogo:** de `y = 260` até `y = 1036` (antes da barra de progresso inferior).
- **HUD inferior:** `y = 1036` até `y = 1080`.
- Nenhum texto narrativo pode invadir o palco do jogo.
- A faixa superior pode ter fundo semitransparente, gradiente escuro ou painel do tema, desde que o palco continue visível e integrado.

### 3.2 Estrutura da faixa superior

Organizar em duas colunas:

**Esquerda — narrativa**
- Linha 1 (kicker): mês/fase e contexto curto. Ex.: `MARÇO · FASE 03`.
- Linha 2 (manchete): frase principal, no máximo 2 linhas.
- Linha 3 (detalhe): métrica curta ou consequência. Ex.: `38 contribuições · 12 dias ativos`.
- Máximo de 3 blocos de texto simultâneos. Não empilhar mais do que isso.

**Direita — placar**
- Score grande, com incremento visível.
- Indicador de fase/mês.
- Barra de progresso do ano ou contador `03/12`.
- No Metroid: barra de energia.
- No Pitfall: score estilo arcade e vidas ou “tesouros”.
- No Espaço: score, combos e integridade da nave.

O texto deve ser trocado por corte seco, fade curto ou “type-on” de 6–10 frames. Não usar texto que entre e saia a cada frame.

### 3.3 Tipografia legível

O problema atual é que as fontes pixel deixam a leitura difícil. A regra nova:

- Adicionar uma fonte legível para a narrativa: **Atkinson Hyperlegible** (via `@fontsource/atkinson-hyperlegible`) ou, se indisponível, `IBM Plex Sans`/`Arial` com peso 600.
- Copiar a fonte para `public/fonts` no fluxo já existente de `scripts/copy-fonts.mjs`.
- Usar a fonte legível em todo texto de leitura: manchete, detalhe, números e legendas.
- **Press Start 2P e Orbitron** ficam restritas a:
  - títulos muito curtos;
  - labels de HUD;
  - score;
  - nomes de fase.
- Tamanhos mínimos no arquivo 1080p:
  - manchete: 40 px;
  - detalhe: 28 px;
  - kicker: 22 px;
  - score: 34 px;
  - labels de HUD: 20 px (nunca abaixo disso).
- Contraste mínimo de 4,5:1. Usar sombra/contorno quando o texto estiver sobre cenário claro.
- Em 720p, a manchete não pode ficar menor que 26 px efetivos; testar o frame renderizado.
- Não usar caixa alta em frases longas. Caixa alta apenas em kicker, score e labels curtos.

---

## 4. Nova estrutura narrativa

### 4.1 Duração

- Manter 1920×1080, 30 fps e ~53 s como padrão.
- Manter a opção 720p.
- A duração pode ser redistribuída internamente, mas o total deve continuar próximo de 1596 frames.
- Estrutura sugerida:
  - **0–4 s:** abertura curta, logo/marca e início do jogo.
  - **4–47 s:** corrida principal, dividida em fases mensais.
  - **47–53 s:** placar final, resumo e assinatura.

### 4.2 Fases mensais

Agregar `stats.contributions.calendar` em 12 buckets mensais.

Regras:

- Cada mês com atividade vira uma fase.
- Meses sem atividade não desaparecem: viram um cartão curto de “mês silencioso” (0,8–1,2 s) ou uma fase curta sem inimigos/objetos.
- A duração de cada fase é proporcional ao volume de contribuições do mês:
  - mínimo: 2 s;
  - máximo: 5 s;
  - meses vazios: 0,8–1,2 s.
- A soma deve caber na janela de 43 s; ajustar proporcionalmente.
- O texto da fase deve citar o mês e pelo menos um dado real.
- O jogo não para entre meses: a passagem de fase é uma transição visual no palco (mudança de cenário, portal, túnel, amanhecer, troca de paleta), não um novo slide de dashboard.

### 4.3 Beats de narrativa

Criar uma lista de beats em `src/video/narrative.ts` (ou equivalente), derivada dos dados, com campos:

```ts
type Beat = {
  id: string;
  month: number;        // 1..12
  label: string;        // "MARÇO · FASE 03"
  headline: string;     // frase principal
  detail: string;       // métrica curta
  accent: "neutral" | "success" | "warning";
};
```

Exemplos de manchetes:

- `"Você voltou 65 dias neste ano."`
- `"Março foi o mês mais intenso: 38 contribuições."`
- `"Python liderou 49,9% do seu código."`
- `"Sua maior sequência: 5 dias seguidos."`
- `"O tesouro do ano: adalbertobrant/lipai."`
- `"Placar final: 242 contribuições."`

Regras de escrita:

- Português do Brasil.
- Uma ideia por manchete.
- Sem jargão técnico desnecessário.
- Não repetir o mesmo dado em manchete e detalhe.
- Não prometer algo que o vídeo não mostra.
- O texto deve ser compreensível sem ouvir o áudio.

---

## 5. Mecânica por tema

Todos os temas compartilham:

- Movimento automático; o vídeo não depende de interação.
- Animações determinísticas por frame (`useCurrentFrame`, `interpolate`, `spring`), nunca `setTimeout`, `Date.now` ou `Math.random` sem seed.
- Personagem/nave sempre visível no terço inferior do palco.
- Eventos sincronizados com o beat de texto: quando a manchete fala de contribuições, objetos aparecem/morrem/colecionam.
- Placar incremental, nunca um número que salta do zero ao total.
- Partículas, explosões, poeira e screen shake com moderação.
- Nenhum texto solto no meio do palco, exceto `+1`, `+5`, `BÔNUS` e feedbacks muito curtos.

### 5.1 Espaço — nave destruindo meteoros

**Sensação:** shooter horizontal/vertical simples, com a nave em deslocamento contínuo e meteoros entrando pela direita.

- A nave fica no terço inferior esquerdo, com propulsão animada.
- Disparo automático em intervalos regulares; projéteis visíveis.
- Meteoros representam contribuições.
- Cada meteoro destruído vale **1 ponto**.
- Meteoros grandes/especiais representam PRs, issues ou repositórios e valem **+5 pontos de bônus**, exibidos separadamente.
- A cada mês, muda o setor: paleta, densidade de estrelas, planetas ao fundo e nome do setor.
- O topo mostra `SETOR 03 · MARÇO`, a manchete do mês e o score.
- Se o mês não tiver atividade, a nave atravessa um setor vazio com texto curto.
- Fechamento: “ANO CONCLUÍDO” com score total, contribuições e bônus.

**Feedback visual obrigatório:** flash no cano, recuo da nave, explosão em pixels, fragmentos, pequeno shake e `+1` flutuante.

### 5.2 Super Metroid — personagem andando, pulando e caçando criaturas

**Sensação:** runner de ação 16-bit em caverna, com o personagem correndo da esquerda para a direita.

- Personagem original inspirado em caçador espacial, sem copiar sprite da Nintendo.
- Corrida automática com ciclo de 4–8 frames.
- Pulos automáticos sobre abismos, plataformas e obstáculos.
- Disparo automático contra criaturas que entram pela direita.
- Cada criatura morta representa uma contribuição e vale **1 ponto**.
- Criaturas maiores representam PRs/issues e valem **+5 bônus**.
- Cada mês é um **setor** da caverna, com porta/gate ao final.
- Ao concluir o mês, o personagem atravessa a porta e o cenário muda de paleta/estrutura; o topo anuncia o próximo setor.
- Meses sem atividade: corredor vazio, com texto de “silêncio no setor”.
- Barra de energia no HUD; ela pode oscilar, mas não deve “zerar” o vídeo.
- O mês com mais contribuições pode ter uma criatura maior, mas não é obrigatório.
- Fechamento: “MISSÃO CONCLUÍDA” com total de abates, contribuições e maior sequência.

**Feedback visual obrigatório:** poeira ao correr, arco de pulo, muzzle flash, criatura piscando ao levar dano, explosão e porta abrindo.

### 5.3 Pitfall — personagem correndo, pulando e pegando tesouros

**Sensação:** aventura de selva 8-bit, com corrida lateral e coleta.

- Personagem original inspirado em explorador, sem copiar sprite da Atari.
- Corrida automática da esquerda para a direita.
- Pulos sobre troncos, pedras, buracos e cobras.
- Tesouros representam contribuições, commits, PRs e estrelas.
- Cada tesouro coletado vale **1 ponto**; tesouros especiais (PR, repositório, streak) valem **+5 bônus**.
- A cada mês, a paisagem muda: paleta, vegetação, clima, templo ao fundo.
- O topo mostra `EXPEDIÇÃO · MARÇO`, a manchete e o score.
- Meses sem atividade: travessia curta com texto de “trilha vazia”.
- O maior tesouro do ano é o repositório de destaque (`stats.topRepos[0]`), apresentado no fechamento.
- Fechamento: “EXPEDIÇÃO CONCLUÍDA” com score, tesouros e top repo.

**Feedback visual obrigatório:** poeira, moeda girando, brilho ao coletar, `+1` subindo, tropeço/recuperação ao pular, colisão sem violência explícita.

---

## 6. Direção de animação e arte

- Manter a identidade de cada tema, mas trocar a linguagem de “dashboard” por “jogo”.
- Cenários com parallax em 2–3 camadas.
- Sprites em pixel art, com contorno e sombra para destacar do fundo.
- Personagem/nave com silhueta clara mesmo em 720p.
- Cada fase precisa de pelo menos 3 elementos de cenário distintos para não parecer um fundo parado.
- Usar paletas existentes em `src/video/theme.tsx` como base; pode ajustar luminosidade e contraste para leitura.
- Scanlines e vinheta podem continuar, mas com opacidade menor durante o gameplay para não prejudicar a leitura.
- Evitar excesso de partículas: o texto e a ação principal devem dominar.
- O palco deve ter “chão” ou linha de base clara para o personagem; no Espaço, uma faixa de estrelas/poeira.
- Nada de cenas de infográfico com cards, tabelas ou gráficos ocupando o palco. Métricas vão para o topo.

---

## 7. Áudio e efeitos

Manter as trilhas atuais como música de fundo. Adicionar efeitos curtos e originais, sintetizados localmente em `scripts/generate-audio.mjs`:

- `shoot.wav` — disparo no Espaço/Metroid;
- `hit.wav` — acerto em meteoro/criatura;
- `coin.wav` — coleta no Pitfall;
- `jump.wav` — pulo;
- `levelup.wav` — mudança de mês/setor;
- `bonus.wav` — PR/issue/repositório especial;
- `finish.wav` — placar final.

Regras:

- Exportar em `public/audio/sfx/`.
- Volume baixo (0.15–0.35) para não competir com a trilha.
- Disparos não podem soar a cada frame; limitar a 2–3 por segundo.
- O áudio deve ser determinístico e local.
- Não usar samples externos.

---

## 8. Plano técnico sugerido

### 8.1 Arquivos novos

```
src/video/
├─ narrative.ts                 # beats mensais e textos derivados dos dados
├─ game/
│  ├─ GameStage.tsx             # palco único, faixa superior + jogo + HUD
│  ├─ TopBand.tsx               # narrativa, score e fase
│  ├─ timeline.ts               # buckets mensais, durações e seed
│  ├─ score.ts                  # pontuação, bônus e contadores
│  ├─ spawn.ts                  # geradores determinísticos de eventos
│  ├─ Runner.tsx                # personagem base (correr, pular, atirar)
│  ├─ SpaceRun.tsx              # nave + meteoros
│  ├─ MetroidRun.tsx            # caçador + criaturas + portas
│  └─ PitfallRun.tsx            # explorador + tesouros + obstáculos
└─ sfx.ts                       # mapa de efeitos para <Audio>
```

### 8.2 Arquivos alterados

- `src/video/AnimaGithub.tsx`: substituir a sequência de cenas de infográfico por `GameStage`.
- `src/video/constants.ts`: adicionar `GAME_TOP`, `GAME_BOTTOM`, `TOP_BAND_HEIGHT`; ajustar durações se necessário.
- `src/video/Hud.tsx`: transformar o HUD em parte da faixa superior; remover textos que colidam com a narrativa.
- `src/video/theme.tsx`: adicionar fontes legíveis e metadados de fase.
- `src/video/fonts.ts` e `scripts/copy-fonts.mjs`: carregar/copiar a fonte legível.
- `package.json`: adicionar `@fontsource/atkinson-hyperlegible` (ou alternativa local).
- `scripts/generate-audio.mjs`: gerar os SFX.
- `src/web/App.tsx`: atualizar a lista de cenas do preview e a descrição dos temas, se necessário.
- `README.md`: documentar a nova linguagem visual e os SFX.

As cenas antigas podem permanecer no repositório como legado, mas não devem ser montadas na composição principal.

### 8.3 Determinismo e performance

- Pré-calcular buckets, beats, spawns e durações em `useMemo`.
- Usar PRNG com seed fixa (`seed = hash(login + year + theme)`) para variações.
- Nada de `Math.random()` direto no render.
- Evitar criar arrays grandes a cada frame.
- Limitar a ~40–60 sprites simultâneos.
- Testar 1080p e 720p; o texto deve continuar legível no 720p.
- O bundle e o render devem continuar funcionando com `npm run render` e pela landing.

---

## 9. Critérios de aceite

A versão 0.1.1 só é considerada pronta se todos os itens abaixo passarem:

### Layout e leitura

- [ ] Em todos os frames, o texto narrativo está acima de `y = 260`.
- [ ] O palco do jogo não contém cards, tabelas, gráficos ou blocos de texto.
- [ ] A manchete tem no mínimo 40 px no 1080p e 26 px no 720p.
- [ ] A fonte narrativa é legível; Press Start 2P não é usada em frases longas.
- [ ] O texto tem contraste suficiente sobre o cenário e não é cortado.
- [ ] O placar e a fase são visíveis o tempo todo.
- [ ] A barra de progresso do ano permanece visível.

### Jogo

- [ ] Espaço: a nave atira, destrói meteoros e o score sobe a cada abate.
- [ ] Metroid: o personagem corre, pula, atira e mata criaturas; cada mês tem um setor e uma transição de nível.
- [ ] Pitfall: o personagem corre, pula, coleta tesouros e desvia de obstáculos.
- [ ] Cada mês com atividade aparece como uma fase com texto próprio.
- [ ] Meses sem atividade têm um beat curto e não quebram a continuidade.
- [ ] O jogo nunca fica parado por mais de 1 s.
- [ ] O placar final bate com os dados mostrados.
- [ ] Nenhum asset de Nintendo/Atari é usado.

### Técnico

- [ ] `npm run typecheck` passa.
- [ ] `npm run build` passa.
- [ ] Render 720p dos três temas conclui sem erro.
- [ ] Render 1080p dos três temas conclui sem erro.
- [ ] O vídeo tem ~53 s, 30 fps, H.264 + AAC estéreo.
- [ ] O mesmo input gera o mesmo vídeo (determinismo).
- [ ] A landing continua funcionando e o preview mostra a nova composição.
- [ ] A CLI continua funcionando com `--theme`, `--height` e `--username`.

### Inspeção visual

Renderizar stills nos frames aproximados de 1 s, 8 s, 16 s, 24 s, 32 s, 40 s, 48 s e 52 s de cada tema. Conferir:

- texto no topo, sem colisão;
- personagem/nave visível;
- mês/fase coerente;
- score mudando;
- cenário sem repetição óbvia;
- leitura confortável em 720p.

---

## 10. Fora de escopo

- Não alterar a landing além de textos/descrições e lista de cenas.
- Não mexer na API, fila, jobs, cache ou autenticação.
- Não adicionar cloud, banco, upload ou analytics.
- Não criar novos temas.
- Não usar assets de terceiros.
- Não implementar interação do usuário no vídeo.
- Não trocar a stack nem atualizar o Remotion.

---

## 11. Ordem de implementação recomendada

1. Criar `timeline.ts` e `narrative.ts`; validar buckets mensais e textos com o snapshot real.
2. Criar `TopBand.tsx` e o layout de faixa superior com dados estáticos.
3. Criar `GameStage.tsx` com um palco vazio e a linha do tempo dos beats.
4. Implementar `SpaceRun` e validar score/explosões.
5. Implementar `MetroidRun` e validar corrida/pulo/abates/portas.
6. Implementar `PitfallRun` e validar corrida/pulo/coleta.
7. Trocar a composição principal para `GameStage`.
8. Adicionar fonte legível e ajustar tamanhos/contraste.
9. Adicionar SFX e mixagem.
10. Renderizar stills, corrigir composição e só então gerar os MP4 finais.

---

## 12. Decisões adotadas neste briefing

Estas decisões podem ser revistas antes da implementação:

1. **Meses:** cada mês com atividade vira fase; meses vazios recebem um beat curto. Não são 12 fases obrigatórias de duração igual.
2. **Pontuação:** 1 ponto por contribuição representada; PRs, issues, repositórios e streaks especiais dão bônus separado. O placar final mostra pontos + bônus.
3. **Texto:** a faixa superior é permanente, mas o texto muda por beat; não é um título único.
4. **Fonte:** a narrativa usa uma fonte legível nova; as fontes pixel ficam para labels curtos.
5. **Duração:** mantém ~53 s e 1596 frames, com redistribuição interna por atividade mensal.

---

## 13. Resultado esperado

Ao final, o vídeo deve ser assistível sem explicação: em qualquer frame, dá para entender **em que mês está**, **o que aconteceu naquele mês** e **o que o personagem/nave está fazendo agora**. A sensação deve ser de estar vendo um jogo jogando sozinho o ano do usuário — não um relatório animado.
