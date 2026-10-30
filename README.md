# Anima GitHub Local

Transforme o seu ano no GitHub em um vídeo MP4 — **100% na sua máquina**. Sem Lambda, sem banco, sem upload, sem telemetria. Você digita o usuário, escolhe uma das três temáticas e o Remotion renderiza o vídeo localmente.

Temas disponíveis:

| Tema | Inspiração | Paleta |
| --- | --- | --- |
| `space` | arcade espacial | ciano, magenta e amarelo |
| `metroid` | ficção científica 16-bit | verde, roxo e coral |
| `pitfall` | aventura de selva | amarelo, laranja e verde |

Cada tema tem cenário, sprites, transições, HUD, tipografia e trilha chiptune próprios. Todos os assets são originais e sintetizados no próprio projeto.

## O que o vídeo mostra

Duração de ~53 segundos, 1920×1080 a 30 fps, sete cenas:

1. **Abertura** — usuário, avatar e ano.
2. **Contribuições** — total no ano e calendário de atividade.
3. **Sequência** — dias ativos, maior sequência e sequência atual.
4. **Linguagens** — distribuição por linguagem.
5. **Produtividade** — commits, pull requests, issues e repositórios.
6. **Destaques** — estrelas recebidas/dadas, seguidores e repositório de destaque.
7. **Encerramento** — resumo do ano.

## Requisitos

- Node.js 20+ (testado com Node 26)
- npm
- Linux, macOS ou Windows
- ~1 GB de espaço livre (Chrome Headless Shell + dependências)

O Chrome Headless Shell é baixado pelo próprio Remotion no `npm run setup`; não é preciso ter o Chrome do sistema.

## Instalação

```bash
cd ~/git/animaGithubLocal
npm install
cp .env.example .env   # opcional: preencha o GITHUB_TOKEN
npm run setup
```

`npm run setup` faz três coisas:

1. copia as fontes OFL de `@fontsource` para `public/fonts`;
2. sintetiza as três trilhas chiptune em `public/audio` (WAV);
3. garante o Chrome Headless Shell local.

> Se o `npm install` reclamar do postinstall do esbuild, o projeto continua funcionando: o build e o render usam o binário já presente em `node_modules`.

### Token do GitHub (opcional)

O projeto já inclui um snapshot real de `adalbertobrant` em `data/cache/`. **Sem token**, a landing e o render usam esse cache e funcionam offline. Com token, é possível atualizar os dados e gerar vídeos de outros usuários.

Crie um token em <https://github.com/settings/tokens> (nenhum escopo é necessário para dados públicos) e coloque em `.env`:

```env
GITHUB_TOKEN=ghp_...
```

O arquivo `.env` está no `.gitignore` e nunca deve ser versionado.

## Uso pela landing page

```bash
npm run dev
```

Abra <http://127.0.0.1:4317>.

Na página você pode:

- informar um usuário ou URL do GitHub (padrão: `adalbertobrant`);
- alternar entre os três temas e ver o preview animado;
- escolher 1080p ou 720p;
- gerar o MP4 com progresso em tempo real;
- baixar o vídeo e acessar renders recentes.

Os arquivos ficam em `out/` com o nome:

```
<usuario>-<tema>-<ano>-<altura>p.mp4
```

Exemplo: `out/adalbertobrant-space-2026-720p.mp4`.

## Render pela linha de comando

```bash
npm run render -- --username adalbertobrant --theme metroid --height 1080
```

Opções:

| Flag | Descrição | Padrão |
| --- | --- | --- |
| `--username` | usuário ou URL do GitHub | `DEFAULT_USERNAME` |
| `--theme` | `space`, `metroid` ou `pitfall` | `space` |
| `--height` | `1080` ou `720` | `VIDEO_HEIGHT` |
| `--year` | ano a animar | ano corrente |
| `--refresh` | força nova consulta ao GitHub (requer token) | desligado |
| `--help` | ajuda | — |

Também é possível usar o Studio do Remotion para inspecionar cenas:

```bash
npm run studio
```

## Build de produção

```bash
npm run build   # typecheck + Vite build em dist/web
npm start       # servidor Express em http://127.0.0.1:4317
```

Em produção o Express serve `dist/web` e os vídeos de `out/` em `/videos`. Em desenvolvimento, o Vite roda em middleware mode na mesma porta, sem proxy separado.

## Configuração

Variáveis em `.env` (todas opcionais):

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `GITHUB_TOKEN` | token para consultar/atualizar dados | vazio (usa cache) |
| `YEAR` | ano animado | ano corrente |
| `DEFAULT_USERNAME` | usuário inicial da landing | `adalbertobrant` |
| `HOST` | endereço do servidor | `127.0.0.1` |
| `PORT` | porta do servidor | `4317` |
| `VIDEO_HEIGHT` | resolução padrão | `1080` |
| `REMOTION_CONCURRENCY` | frames renderizados em paralelo | automático |

## Estrutura

```
animaGithubLocal/
├─ data/
│  ├─ avatars/            avatar baixado do GitHub
│  ├─ cache/              snapshots JSON por usuário/ano
│  └─ jobs.json           histórico da fila de render (não versionado)
├─ out/                   vídeos MP4 gerados (não versionado)
├─ public/
│  ├─ audio/              trilhas chiptune sintetizadas
│  └─ fonts/              fontes OFL copiadas para uso local
├─ scripts/
│  ├─ copy-fonts.mjs      copia fontes de @fontsource
│  ├─ generate-audio.mjs  sintetiza os WAVs
│  ├─ fetch.ts            consulta o GitHub e grava o snapshot
│  ├─ render.ts           render via CLI
│  └─ start.ts            sobe o servidor em modo produção
├─ src/
│  ├─ shared/             tipos, temas e cliente do GitHub
│  ├─ video/              composição Remotion, temas, cenas e HUD
│  ├─ server/             Express, fila, cache, bundle e render
│  └─ web/                landing page em React
├─ remotion.config.ts
└─ vite.config.ts
```

O snapshot tem o formato `data/cache/<usuario>-<ano>.json`. Se o GitHub estiver indisponível ou sem token, `getStats` cai automaticamente para o cache e a resposta indica `source: "local"`.

## Como funciona por dentro

1. A landing consulta `GET /api/stats`, que normaliza o snapshot em `GitHubStats`.
2. `POST /api/render` cria um job e o coloca em uma fila **sequencial**.
3. O servidor empacota a composição uma vez (`@remotion/bundler`), garante o Chrome local (`@remotion/renderer`) e renderiza com `renderMedia`.
4. O progresso é persistido em `data/jobs.json` e exposto por polling em `GET /api/jobs/:id`.
5. Ao terminar, o Express serve o MP4 em `/videos/...` e a landing libera o download.

Renders do mesmo usuário, tema, ano e resolução são reaproveitados se já existir um job concluído.

## Limitações e notas

- Tudo roda localmente; não há autenticação, banco remoto, cloud ou envio de dados para terceiros além das consultas opcionais à API do GitHub.
- Sem token, somente usuários/anos que já têm snapshot em `data/cache` funcionam offline.
- A API pública do GitHub tem limite de requisições; para uso frequente ou vários usuários, use `GITHUB_TOKEN`.
- O primeiro render é mais lento porque empacota a composição e inicia o Chrome; os seguintes reaproveitam o bundle.
- Áudios e sprites são originais. Nenhum asset de Nintendo, Atari ou de bibliotecas pagas é usado — as trilhas do projeto de referência (`github-unwrapped`) não são reutilizadas por questões de licença.
- O ano é calculado dinamicamente e pode ser sobrescrito com `YEAR`.
- A fila é de propósito sequencial para não saturar a máquina. Renders simultâneos aguardam na fila.

## Solução de problemas

**"Chrome Headless Shell não encontrado"** — rode `npx remotion browser ensure`.

**Render travado em "Preparando"** — o primeiro bundle pode levar alguns segundos. Veja os logs do job na landing ou o terminal do servidor.

**Dados desatualizados** — use `npm run fetch -- --username <usuario> --refresh` com `GITHUB_TOKEN` configurado, ou envie `"refresh": true` no `POST /api/render`.

**Porta ocupada** — altere `PORT` no `.env` e reinicie.

**Falta de áudio/fontes** — rode `npm run setup` novamente; ele regenera `public/audio` e `public/fonts`.

## Licença e créditos

Código próprio deste projeto. Fontes: Orbitron, Press Start 2P e VT323 (SIL Open Font License). Trilhas: síntese original em `scripts/generate-audio.mjs`. Remotion é usado sob a licença da Remotion; confira os termos para uso comercial.
