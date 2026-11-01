import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  formatDatePt,
  formatNumber,
  formatUpdatedAt,
  THEME_IDS,
  THEME_INFO,
  type GitHubStats,
  type Resolution,
  type ThemeId,
} from "../shared/types";
import { AnimaGithub } from "../video/AnimaGithub";
import { TOTAL_FRAMES, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "../video/constants";
import {
  getConfig,
  getJob,
  getJobs,
  getStats,
  startRender,
  type ConfigResponse,
  type JobView,
  type StatsResponse,
} from "./api";
import { GitRunner } from "./game/GitRunner";
import { CvBuilder } from "./cv/CvBuilder";

const THEME_SWATCHES: Record<ThemeId, [string, string, string]> = {
  space: ["#5eeaff", "#ff5cd6", "#ffd166"],
  metroid: ["#35f0c0", "#c04df0", "#ff5c6c"],
  pitfall: ["#ffd23f", "#e8590c", "#7bc950"],
};

const STATUS_LABEL: Record<JobView["status"], string> = {
  queued: "Na fila",
  bundling: "Preparando",
  rendering: "Renderizando",
  done: "Pronto",
  error: "Erro",
};

const ACTIVE_STATUSES: JobView["status"][] = ["queued", "bundling", "rendering"];

const VIDEO_SECONDS = Math.round(TOTAL_FRAMES / VIDEO_FPS);
const FRAMES_LABEL = TOTAL_FRAMES.toLocaleString("pt-BR");

const SCENES = [
  "Abertura",
  "Contribuições",
  "Sequência",
  "Linguagens",
  "Produtividade",
  "Destaques",
  "Encerramento",
] as const;

const isActive = (job: JobView | null): boolean =>
  job !== null && ACTIVE_STATUSES.includes(job.status);

const ThemeCard: React.FC<{
  id: ThemeId;
  selected: boolean;
  onSelect: (id: ThemeId) => void;
}> = ({ id, selected, onSelect }) => {
  const info = THEME_INFO[id];
  const swatches = THEME_SWATCHES[id];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`theme-card ${selected ? "is-selected" : ""}`}
      data-theme={id}
      onClick={() => onSelect(id)}
    >
      <span className="theme-card-top">
        <span className="theme-emoji" aria-hidden="true">
          {info.emoji}
        </span>
        <span className="theme-check" aria-hidden="true">
          {selected ? "◆" : "◇"}
        </span>
      </span>
      <span className="theme-name">{info.name}</span>
      <span className="theme-subtitle">{info.subtitle}</span>
      <span className="theme-description">{info.description}</span>
      <span className="theme-swatches" aria-hidden="true">
        {swatches.map((color) => (
          <i key={color} style={{ background: color }} />
        ))}
      </span>
    </button>
  );
};

const StatChip: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div className={`stat-chip ${accent ? "is-accent" : ""}`}>
    <span className="stat-value">{value}</span>
    <span className="stat-label">{label}</span>
  </div>
);

export const App: React.FC = () => {
  const [gameOpen, setGameOpen] = useState(false);
  const [cvOpen,   setCvOpen]   = useState(false);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [username, setUsername] = useState("adalbertobrant");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [theme, setTheme] = useState<ThemeId>("space");
  const [height, setHeight] = useState<Resolution>(1080);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [job, setJob] = useState<JobView | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [recent, setRecent] = useState<JobView[]>([]);

  const year = config?.year ?? new Date().getFullYear();
  const themeInfo = THEME_INFO[theme];
  const busy = isActive(job) || starting;

  const loadRecent = useCallback(async () => {
    try {
      const data = await getJobs();
      setRecent(data.jobs.filter((item) => item.status === "done" && item.outputUrl).slice(0, 6));
    } catch {
      // A lista de renders recentes é opcional.
    }
  }, []);

  const loadStats = useCallback(
    async (rawUsername: string, refresh = false) => {
      setLoadingStats(true);
      setStatsError(null);
      try {
        const data = await getStats(rawUsername, year, refresh);
        setStats(data);
        setUsername(data.login);
        return data;
      } catch (error) {
        setStats(null);
        setStatsError(error instanceof Error ? error.message : String(error));
        return null;
      } finally {
        setLoadingStats(false);
      }
    },
    [year],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cfg = await getConfig();
        if (cancelled) return;
        setConfig(cfg);
        setUsername(cfg.defaultUsername);
        setHeight(cfg.videoHeight);
        setLoadingStats(true);
        try {
          const data = await getStats(cfg.defaultUsername, cfg.year);
          if (!cancelled) setStats(data);
        } catch (error) {
          if (!cancelled) {
            setStatsError(error instanceof Error ? error.message : String(error));
          }
        } finally {
          if (!cancelled) setLoadingStats(false);
        }
        void loadRecent();
      } catch (error) {
        if (!cancelled) {
          setStatsError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadRecent]);

  useEffect(() => {
    const jobId = job?.id;
    const jobStatus = job?.status;
    if (!jobId || !jobStatus || !ACTIVE_STATUSES.includes(jobStatus)) return;

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const data = await getJob(jobId);
        if (cancelled) return;
        setJob(data.job);
        if (data.job.status === "done" || data.job.status === "error") {
          window.clearInterval(timer);
          void loadRecent();
        }
      } catch {
        // Mantém o último estado conhecido e tenta de novo no próximo ciclo.
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [job?.id, job?.status, loadRecent]);

  const statsForYear = stats && stats.year === year ? stats : null;

  const handleLoad = (event: React.FormEvent) => {
    event.preventDefault();
    void loadStats(username);
  };

  const handleRender = async () => {
    if (!statsForYear) return;
    setStarting(true);
    setRenderError(null);
    setJob(null);

    try {
      const data = await startRender({
        username: statsForYear.login,
        theme,
        height,
      });
      setJob(data.job);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : String(error));
    } finally {
      setStarting(false);
    }
  };

  const progress = job ? Math.round(job.progress * 100) : 0;

  const heroStats = useMemo(() => {
    if (!statsForYear) return null;
    const c = statsForYear.contributions;
    return [
      { label: "contribuições", value: formatNumber(c.total), accent: true },
      { label: "commits", value: formatNumber(c.commits) },
      { label: "dias ativos", value: formatNumber(c.activeDays) },
      { label: "maior sequência", value: `${c.longestStreak} dias` },
      { label: "linguagens", value: formatNumber(statsForYear.languages.length) },
    ];
  }, [statsForYear]);

  return (
    <div className="app" data-theme={theme}>
      <div className="sky" aria-hidden="true">
        <span className="sky-grid" />
        <span className="sky-glow" />
        <span className="sky-scanlines" />
      </div>

      <header className="topbar">
        <a className="brand" href="/" aria-label="Anima GitHub, início">
          <span className="brand-mark" aria-hidden="true">
            ▶
          </span>
          <span className="brand-name">
            ANIMA<span>GITHUB</span>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="chip chip-local">100% local</span>
          <span className="topbar-year">{year}</span>
          {/* Botão de currículo */}
          <button
            onClick={() => setCvOpen(true)}
            style={{
              background: "transparent",
              border: "1px solid #388bfd66",
              borderRadius: 6,
              color: "#388bfd",
              padding: "5px 13px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
            aria-label="Gerar currículo"
          >
            📄 CV
          </button>
          {statsForYear ? (
            <a
              className="topbar-user"
              href={`https://github.com/${statsForYear.login}`}
              target="_blank"
              rel="noreferrer"
            >
              @{statsForYear.login}
            </a>
          ) : null}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <i aria-hidden="true" />
              O SEU ANO EM CÓDIGO · {year}
            </span>
            <h1>
              Seu GitHub virou
              <br />
              <em>um jogo.</em>
            </h1>
            <p className="hero-lead">
              Escolha um universo, conecte seu usuário e renderize um vídeo MP4 com as suas
              contribuições de {year}. Sem nuvem, sem upload: a animação acontece inteira no seu
              computador.
            </p>
            <div className="hero-tags">
              <span>🚀 Espaço</span>
              <span>👾 Super Metroid</span>
              <span>🪙 Pitfall!</span>
            </div>
          </div>

          <div className="hero-aside" aria-hidden="true">
            <div className="hero-screen">
              <div className="hero-screen-inner">
                <span className="hero-screen-label">{themeInfo.emoji} {themeInfo.name}</span>
                <span className="hero-screen-value">{year}</span>
                <span className="hero-screen-caption">PLAYER 01 · INSERT COIN</span>
              </div>
            </div>
            <div className="hero-coin">1 CRÉDITO = 1 ANO DE COMMITS</div>
          </div>
        </section>

        {heroStats ? (
          <section className="stats-strip" aria-label="Resumo do seu ano">
            {heroStats.map((item) => (
              <StatChip key={item.label} {...item} />
            ))}
            <button
              type="button"
              className="stats-refresh"
              onClick={() => void loadStats(username, true)}
              disabled={loadingStats}
              title="Consultar o GitHub novamente (requer GITHUB_TOKEN)"
            >
              {loadingStats ? "…" : "↻ atualizar dados"}
            </button>
          </section>
        ) : null}

        <section className="workspace">
          <div className="panel composer">
            <div className="panel-heading">
              <span className="panel-kicker">01 · CONFIGURAR</span>
              <h2>Monte a sua fita</h2>
            </div>

            <form className="field" onSubmit={handleLoad}>
              <label htmlFor="username">Usuário do GitHub</label>
              <div className="input-row">
                <span className="input-prefix">github.com/</span>
                <input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="adalbertobrant"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loadingStats}
                />
                <button type="submit" className="btn-ghost" disabled={loadingStats}>
                  {loadingStats ? "…" : "carregar"}
                </button>
              </div>
              <p className="field-hint">
                {config?.hasToken
                  ? "Token do GitHub configurado: os dados podem ser atualizados agora."
                  : "Sem GITHUB_TOKEN: usamos o snapshot local em data/cache. Para outros usuários, configure o token no .env."}
              </p>
            </form>

            {statsForYear ? (
              <div className="profile">
                {statsForYear.avatarUrl ? (
                  <img
                    className="profile-avatar"
                    src={statsForYear.avatarUrl}
                    alt={`Avatar de ${statsForYear.login}`}
                    width={48}
                    height={48}
                  />
                ) : (
                  <span className="profile-avatar profile-avatar-empty">@</span>
                )}
                <div className="profile-text">
                  <strong>{statsForYear.name || statsForYear.login}</strong>
                  <span>
                    @{statsForYear.login} · {formatNumber(statsForYear.publicRepos)} repos públicos ·{" "}
                    {formatNumber(statsForYear.followers)} seguidores
                  </span>
                </div>
                <span className={`profile-source ${statsForYear.source === "local" ? "" : "is-live"}`}>
                  {statsForYear.source === "local" ? "cache local" : "GitHub API"}
                </span>
              </div>
            ) : null}

            {statsError ? (
              <div className="alert" role="alert">
                <strong>Não foi possível carregar os dados.</strong>
                <span>{statsError}</span>
              </div>
            ) : null}

            <div className="field">
              <span className="field-label">Tema do vídeo</span>
              <div className="theme-grid" role="radiogroup" aria-label="Escolha o tema">
                {THEME_IDS.map((id) => (
                  <ThemeCard
                    key={id}
                    id={id}
                    selected={theme === id}
                    onSelect={setTheme}
                  />
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Qualidade</span>
              <div className="segmented" role="radiogroup" aria-label="Resolução">
                <button
                  type="button"
                  role="radio"
                  aria-checked={height === 1080}
                  className={height === 1080 ? "is-selected" : ""}
                  onClick={() => setHeight(1080)}
                >
                  <strong>1080p</strong>
                  <span>Full HD · mais nítido</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={height === 720}
                  className={height === 720 ? "is-selected" : ""}
                  onClick={() => setHeight(720)}
                >
                  <strong>720p</strong>
                  <span>HD · render mais rápido</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="cta"
              onClick={() => void handleRender()}
              disabled={!statsForYear || busy}
            >
              <span className="cta-icon" aria-hidden="true">
                {busy ? "⟳" : "▶"}
              </span>
              {busy ? "Renderizando…" : "Gerar vídeo MP4"}
            </button>
            <p className="cta-note">
              Render local · {VIDEO_WIDTH}×{VIDEO_HEIGHT} · {VIDEO_FPS} fps · {VIDEO_SECONDS} segundos
              · áudio original
            </p>

            {renderError ? (
              <div className="alert" role="alert">
                <strong>O render não começou.</strong>
                <span>{renderError}</span>
              </div>
            ) : null}

            {job ? (
              <div className={`job job-${job.status}`} aria-live="polite">
                <div className="job-head">
                  <span className="job-status">
                    <i aria-hidden="true" />
                    {STATUS_LABEL[job.status]}
                  </span>
                  <span className="job-percent">
                    {job.status === "done" ? "100%" : job.status === "error" ? "—" : `${progress}%`}
                  </span>
                </div>
                <div className="job-bar">
                  <span style={{ width: `${job.status === "done" ? 100 : progress}%` }} />
                </div>
                <p className="job-message">{job.message ?? "Aguardando…"}</p>

                {job.status === "error" && job.error ? (
                  <p className="job-error">{job.error}</p>
                ) : null}

                {job.status === "done" && job.outputUrl ? (
                  <div className="job-result">
                    <video src={job.outputUrl} controls playsInline preload="metadata" />
                    <div className="job-actions">
                      <a className="btn-download" href={job.outputUrl} download>
                        ↓ Baixar MP4
                      </a>
                      <span className="job-file">
                        {job.username}-{job.theme}-{job.year}-{job.height}p.mp4
                      </span>
                    </div>
                  </div>
                ) : null}

                {job.logs.length > 0 && job.status !== "done" ? (
                  <details className="job-logs">
                    <summary>Ver log do render</summary>
                    <pre>{job.logs.slice(-8).join("\n")}</pre>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="panel preview">
            <div className="panel-heading preview-heading">
              <div>
                <span className="panel-kicker">02 · PRÉVIA AO VIVO</span>
                <h2>{themeInfo.emoji} {themeInfo.name}</h2>
              </div>
              <span className="preview-badge">{height}p</span>
            </div>

            <div className="player-frame">
              {statsForYear ? (
                <Player
                  key={`${theme}-${statsForYear.login}-${height}`}
                  component={AnimaGithub}
                  inputProps={{ stats: statsForYear, theme }}
                  durationInFrames={TOTAL_FRAMES}
                  compositionWidth={VIDEO_WIDTH}
                  compositionHeight={VIDEO_HEIGHT}
                  fps={VIDEO_FPS}
                  controls
                  loop
                  doubleClickToFullscreen
                  acknowledgeRemotionLicense
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="player-placeholder">
                  <span className="player-placeholder-icon">{themeInfo.emoji}</span>
                  <strong>{loadingConfig || loadingStats ? "Carregando dados…" : "Sem dados para exibir"}</strong>
                  <span>Informe um usuário do GitHub com cache local ou configure o token.</span>
                </div>
              )}
              <span className="player-scanlines" aria-hidden="true" />
            </div>

            <p className="preview-caption">
              {themeInfo.subtitle}. Use o controle de play para navegar pelas 7 cenas do ano.
            </p>

            <div className="specs">
              <span>1920×1080</span>
              <span>30 fps</span>
              <span>H.264 MP4</span>
              <span>sem upload</span>
            </div>

            {statsForYear ? (
              <p className="preview-meta">
                dados de{" "}
                {formatDatePt(statsForYear.contributions.calendar[0]?.date ?? `${year}-01-01`)} a{" "}
                {formatDatePt(
                  statsForYear.contributions.calendar[
                    statsForYear.contributions.calendar.length - 1
                  ]?.date ?? `${year}-12-31`,
                )}{" "}
                · atualizado em {formatUpdatedAt(statsForYear.generatedAt)}
              </p>
            ) : null}

            <div className="scene-list" aria-label="Cenas do vídeo">
              <span className="scene-list-title">7 cenas</span>
              {SCENES.map((scene, index) => (
                <span key={scene} className="scene-item">
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  {scene}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="how">
          <div className="how-heading">
            <span className="panel-kicker">COMO FUNCIONA</span>
            <h2>Três passos. Nenhum servidor na nuvem.</h2>
          </div>
          <ol className="steps">
            <li>
              <span className="step-number">01</span>
              <strong>Conecte</strong>
              <p>
                Lemos o seu ano pelo GraphQL do GitHub — ou usamos o snapshot local já salvo em{" "}
                <code>data/cache</code>.
              </p>
            </li>
            <li>
              <span className="step-number">02</span>
              <strong>Escolha o universo</strong>
              <p>
                Espaço, Super Metroid ou Pitfall: cada tema tem paleta, cenário, transições e
                trilha chiptune próprios.
              </p>
            </li>
            <li>
              <span className="step-number">03</span>
              <strong>Renderize</strong>
              <p>
                O Remotion monta os {FRAMES_LABEL} quadros no seu Chrome headless e entrega um MP4
                em <code>out/</code>.
              </p>
            </li>
          </ol>
        </section>

        {recent.length > 0 ? (
          <section className="recent">
            <div className="recent-heading">
              <span className="panel-kicker">RENDERS RECENTES</span>
              <h2>Seus vídeos neste computador</h2>
            </div>
            <div className="recent-grid">
              {recent.map((item) => (
                <article key={item.id} className="recent-card" data-theme={item.theme}>
                  <span className="recent-emoji" aria-hidden="true">
                    {THEME_INFO[item.theme].emoji}
                  </span>
                  <div className="recent-info">
                    <strong>
                      @{item.username} · {THEME_INFO[item.theme].name}
                    </strong>
                    <span>
                      {item.year} · {item.height}p · {formatUpdatedAt(item.updatedAt)}
                    </span>
                  </div>
                  {item.outputUrl ? (
                    <div className="recent-actions">
                      <a href={item.outputUrl} target="_blank" rel="noreferrer">
                        abrir
                      </a>
                      <a href={item.outputUrl} download>
                        baixar
                      </a>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="notes">
          <div className="note">
            <span aria-hidden="true">🔒</span>
            <div>
              <strong>Privacidade de verdade</strong>
              <p>
                Nenhum vídeo, estatística ou token sai da sua máquina. O servidor escuta apenas em{" "}
                <code>127.0.0.1</code>.
              </p>
            </div>
          </div>
          <div className="note">
            <span aria-hidden="true">🎵</span>
            <div>
              <strong>Trilha original</strong>
              <p>
                Os três temas chiptune foram sintetizados localmente para este projeto — sem
                bibliotecas de áudio de terceiros.
              </p>
            </div>
          </div>
          <div className="note">
            <span aria-hidden="true">🕹️</span>
            <div>
              <strong>Arte original</strong>
              <p>
                Pixel art e cenários próprios inspirados na estética dos clássicos, sem assets da
                Nintendo ou Atari.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Botão flutuante: jogar Git Runner ── */}
      <button
        onClick={() => setGameOpen(true)}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 1000,
          background: "linear-gradient(135deg, #ffd23f, #e8590c)",
          border: "none",
          borderRadius: 8,
          padding: "14px 22px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 4px 24px rgba(255,210,63,0.45), 0 2px 8px rgba(0,0,0,0.5)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 32px rgba(255,210,63,0.7), 0 2px 8px rgba(0,0,0,0.5)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(255,210,63,0.45), 0 2px 8px rgba(0,0,0,0.5)";
        }}
        aria-label="Jogar Git Runner"
      >
        <span style={{ fontSize: 22 }}>🕹️</span>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: "#0d1117",
          letterSpacing: "0.05em",
          lineHeight: 1.4,
        }}>
          JOGAR<br />GIT RUNNER
        </span>
      </button>

      {/* ── Overlay do jogo ── */}
      {gameOpen && <GitRunner onClose={() => setGameOpen(false)} />}

      {/* ── Overlay do currículo ── */}
      {cvOpen && (
        <CvBuilder
          username={statsForYear?.login ?? username}
          onClose={() => setCvOpen(false)}
        />
      )}

      <footer className="footer">
        <span>
          ANIMA<span className="footer-accent">GITHUB</span> · {year}
        </span>
        <span>
          dados: <code>data/cache</code> · vídeos: <code>out/</code> · render: Remotion
        </span>
      </footer>
    </div>
  );
};
