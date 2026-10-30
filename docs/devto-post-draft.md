# I Turned My GitHub Year Into a Retro Game — Rendered Locally With React and Remotion

*Draft for dev.to — #opensource #webdev #javascript #react*

---

Every December I see those "GitHub Wrapped" posts and feel the same mix of curiosity and discomfort: what exactly are those services doing with my token? Where is my contribution data going? Why do I have to wait in a queue for someone else's server to render a video about *my* year?

So I built my own, entirely on my machine. No cloud, no upload, no third-party service. Just Node, React, and a headless Chrome.

This is the story of building **Anima GitHub Local** — and everything I learned from the open source ecosystem that made it possible.

---

## What it does

You run `npm run dev`, open `http://127.0.0.1:4317`, type your GitHub username, pick a theme, and click render. A few minutes later you have a ~53-second H.264 MP4 on your disk.

The video is styled as a retro game. Your contributions become in-game events:

- **Space**: your ship crosses each month's sector destroying enemy ships, asteroids, and aliens. More contributions = more enemies, higher speed.
- **Metroid**: a space hunter descends through a subterranean maze with lava, water, and diamonds, fighting monsters that vary each month.
- **Pitfall!**: an explorer runs through the jungle jumping over jaguars, boars, caimans, and pit holes collecting treasures.

The score increments in real time as events happen — it never teleports to the final total. At the end, fireworks go off and the message *"keep the open source always alive at your heart, give first."* types itself letter by letter.

---

## The stack

Everything I used is open source:

**[Remotion](https://www.remotion.dev/)** — the core. Remotion is a framework by [Jonny Burger](https://github.com/JonnyBurger) that lets you write videos as React components. Each frame is a React render; `useCurrentFrame()` is your timeline. It handles bundling (Webpack), rendering (headless Chrome via Puppeteer-core), and encoding (ffmpeg). I'd never have been able to build this without it. The `@remotion/transitions`, `@remotion/player` and `@remotion/renderer` packages are all part of that ecosystem.

**[React 18](https://react.dev/)** — the UI layer, both for the video composition and for the landing page. The same `AnimaGithub` component renders in the browser preview (`@remotion/player`) and gets passed to `renderMedia` for the actual MP4.

**[Vite](https://vitejs.dev/)** — the landing page bundler, running as middleware inside Express in dev mode. Zero separate ports.

**[Express](https://expressjs.com/)** — the local server. Handles the render queue, serves the API, and streams the finished MP4.

**[TypeScript](https://www.typescriptlang.org/)** — strict mode throughout. The shared types between server, video, and web layers (`GitHubStats`, `GameTimeline`, `Beat`) are what kept this project from becoming a mess.

**[Atkinson Hyperlegible](https://brailleinstitute.org/freefont)** by the Braille Institute — the narrative font. It was designed specifically for low-vision readers: maximum letter differentiation, generous spacing. It reads perfectly at 40px over a busy game background.

**[Orbitron](https://fonts.google.com/specimen/Orbitron)**, **[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)**, **[VT323](https://fonts.google.com/specimen/VT323)** — the display fonts for HUD labels and score. All via `@fontsource`, all SIL OFL licensed.

The **GitHub GraphQL API** does the heavy lifting for contributions — the `contributionsCollection` query is remarkably complete. I also use the commit search REST endpoint to compute productivity by hour of day.

---

## The architecture that surprised me

The most interesting design decision was the **game timeline engine** in `src/video/game/timeline.ts`.

The problem: contributions are just numbers. January had 38 commits, February had 3. How do you turn that into a video that doesn't stall in the quiet months and doesn't feel cramped in the busy ones?

The solution: **proportional frame allocation weighted by √contributions**. Each month gets between 60 frames (2s) and 150 frames (5s), distributed so that the busiest months get more screen time, but not so much that quiet months feel skipped.

```ts
const weights = active.map(({ month }) => Math.sqrt(month.count + 1));
```

Square root instead of linear — because a month with 100 commits shouldn't get 10× more time than one with 10 commits. It should feel about 3× more intense.

Then I built a **deterministic PRNG** seeded by `login:year:theme:anima-0.1.1`. Every spawn position, every enemy trajectory, every firework launch delay is computed from that seed. Same input always produces the same video. No `Math.random()` anywhere in the render path.

---

## The pixel art system

All sprites are original. I was inspired by the aesthetic of those classic games but I couldn't use their actual assets — legally or ethically. So I drew everything in the same grid format:

```ts
export const COIN: Sprite = {
  palette: { c: "#8a5a12", y: "#ffd23f", w: "#fff6c9" },
  rows: [
    "..cccc..",
    ".cyyyyc.",
    "cyywwyyc",
    "cywyywyc",
    // ...
  ],
};
```

Each character in the string is a pixel. The `PixelArt` component maps them to `div` elements in a CSS grid. Scale 6 = each "pixel" is a 6×6 CSS square. Deterministic, serializable, easy to edit in any text editor.

The chiptune soundtracks are synthesized the same way — in `scripts/generate-audio.mjs`, entirely in JavaScript, using square waves, triangle waves, and noise functions. No samples. No libraries. You can read exactly how the Pitfall melody is constructed.

---

## What I learned from the community

I'd be lying if I said this was built in a vacuum. Several open source projects and people shaped how I thought about this:

**[github-unwrapped-2023](https://github.com/remotion-dev/github-unwrapped-2023)** by the Remotion team — this is the reference that proved the idea was viable. Their architecture of fetching GitHub stats and rendering them with Remotion is what I followed. I read their code for hours. My implementation is different (local-first, game-style instead of infographic, no cloud dependencies), but their open approach to showing the full codebase made it possible to learn the pattern.

**[Jonny Burger's](https://twitter.com/JNYBGR) writing on the Remotion blog** — specifically the posts about determinism in video rendering. The rule "never use `Date.now()` or `Math.random()` inside a Remotion composition" is his, and it's the single most important constraint in this entire project.

**[Fireship's](https://www.youtube.com/@Fireship) video on Remotion** — honestly where I first saw that writing videos in React was a real thing and not a toy.

The **GitHub GraphQL API documentation** is genuinely excellent. The `contributionsCollection` type, the `contributionCalendar`, the `commitContributionsByRepository` with language breakdown — whoever designed that API made building tools like this accessible.

---

## Running it yourself

```bash
git clone https://github.com/adalbertobrant/animaGithubLocal
cd animaGithubLocal
npm install
npm run setup   # copies fonts, synthesizes audio, downloads Chrome headless
npm run dev     # → http://127.0.0.1:4317
```

No token needed to try it — there's a real snapshot included for my profile. With a GitHub token in `.env` you can render for any public profile.

CLI render:

```bash
npm run render -- --username YOUR_USERNAME --theme pitfall --height 1080
```

The video lands in `out/YOUR_USERNAME-pitfall-2026-1080p.mp4`.

---

## What's next

A few things I'd like to explore:

- **More themes** — a Doom corridor, a Zelda overworld, a Sonic loop.
- **Multiplayer comparison** — two users side by side, their contributions competing.
- **Better sprite animation** — true frame-by-frame walk cycles instead of CSS skew simulation. The `PixelArt` component supports multiple frames already; I just need to draw them.
- **Web version** — a SaaS variant that renders on a server, for people who don't want to run Node locally.

If you build something with this, or fork it into your own theme, I'd love to see it. Open an issue, send a PR, or just post your video.

The whole point is that your data stays yours. Keep the open source always alive at your heart, give first.

---

*Source: [github.com/adalbertobrant/animaGithubLocal](https://github.com/adalbertobrant/animaGithubLocal)*

*Built with: [Remotion](https://remotion.dev) · [React](https://react.dev) · [Vite](https://vitejs.dev) · [GitHub GraphQL API](https://docs.github.com/en/graphql) · [Atkinson Hyperlegible](https://brailleinstitute.org/freefont)*

---

### Tags sugeridas para dev.to

`#opensource` `#webdev` `#javascript` `#react` `#remotion` `#github` `#pixelart` `#typescript` `#showdev`
