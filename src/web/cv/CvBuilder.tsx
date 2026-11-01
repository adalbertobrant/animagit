/**
 * CvBuilder.tsx — modal completo para gerar o currículo
 *
 * Fluxo:
 * 1. Formulário de perfil pessoal (com opção de salvar)
 * 2. Escolha: idioma + formato (PDF / Markdown)
 * 3. Geração com log em tempo real (polling)
 * 4. Preview do Markdown + botão de download
 * 5. Painel ATS com score, keywords, pontos fortes e sugestões
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AtsAnalysis, CvData, CvLanguage, CvFormat, PersonalProfile } from "../../shared/cv-types";

// ── Perfil vazio padrão ──────────────────────────────────────────
const emptyProfile = (): PersonalProfile => ({
  name: "", title: "", email: "", phone: "",
  location: "", linkedin: "", website: "", summary: "", skills: [],
});

const STORAGE_KEY = "animagithub_cv_profile";

const loadSavedProfile = (): PersonalProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyProfile(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return emptyProfile();
};

// ── Componentes auxiliares ───────────────────────────────────────
const Field: React.FC<{
  label: string; id: string; value: string; required?: boolean;
  onChange: (v: string) => void; placeholder?: string; multiline?: boolean; hint?: string;
}> = ({ label, id, value, required, onChange, placeholder, multiline, hint }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 240 }}>
    <label htmlFor={id} style={{ fontSize: 12, color: "#8fa6c8", letterSpacing: "0.04em" }}>
      {label}{required && <span style={{ color: "#ff5c6c" }}> *</span>}
    </label>
    {multiline ? (
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={fieldStyle}
      />
    ) : (
      <input
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={fieldStyle}
      />
    )}
    {hint && <span style={{ fontSize: 11, color: "#5a6a8a" }}>{hint}</span>}
  </div>
);

const fieldStyle: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: 5,
  color: "#e6edf3",
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  resize: "vertical",
};

const Btn: React.FC<{
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; variant?: "primary" | "ghost" | "danger"; style?: React.CSSProperties;
}> = ({ children, onClick, disabled, variant = "primary", style }) => {
  const colors = {
    primary: { bg: "#238636", border: "#2ea043", color: "#fff" },
    ghost:   { bg: "transparent", border: "#30363d", color: "#8fa6c8" },
    danger:  { bg: "transparent", border: "#ff5c6c44", color: "#ff5c6c" },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        color: colors.color,
        padding: "9px 18px",
        fontSize: 13,
        fontFamily: "'Atkinson Hyperlegible', Arial, sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// ── Score visual ATS ─────────────────────────────────────────────
const AtsScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 75 ? "#2ea043" : score >= 50 ? "#ffd23f" : "#ff5c6c";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={38} fill="none" stroke="#30363d" strokeWidth={8} />
        <circle cx={45} cy={45} r={38} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${2 * Math.PI * 38 * score / 100} ${2 * Math.PI * 38 * (1 - score / 100)}`}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x={45} y={52} textAnchor="middle" fill={color}
          style={{ font: "bold 20px Arial" }}>
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: "#8fa6c8" }}>ATS Score</span>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────────
interface Props {
  username: string;
  onClose: () => void;
}

type Step = "form" | "generating" | "result";

export const CvBuilder: React.FC<Props> = ({ username, onClose }) => {
  const [step,     setStep]     = useState<Step>("form");
  const [profile,  setProfile]  = useState<PersonalProfile>(loadSavedProfile);
  const [language, setLanguage] = useState<CvLanguage>("pt");
  const [format,   setFormat]   = useState<CvFormat>("markdown");
  const [runAts,   setRunAts]   = useState(true);
  const [skillInput, setSkillInput] = useState("");

  const [logs,     setLogs]     = useState<string[]>([]);
  const [error,    setError]    = useState<string | null>(null);
  const [cvData,   setCvData]   = useState<CvData | null>(null);
  const [mdText,   setMdText]   = useState<string>("");
  const [pdfUrl,   setPdfUrl]   = useState<string>("");
  const [mdUrl,    setMdUrl]    = useState<string>("");
  const [activeTab, setActiveTab] = useState<"preview" | "ats">("preview");

  const logsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const setField = useCallback(<K extends keyof PersonalProfile>(key: K, val: PersonalProfile[K]) => {
    setProfile(p => ({ ...p, [key]: val }));
  }, []);

  const addSkill = () => {
    const sk = skillInput.trim();
    if (sk && !profile.skills.includes(sk)) {
      setField("skills", [...profile.skills, sk]);
    }
    setSkillInput("");
  };

  const saveProfile = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    alert(language === "pt" ? "Perfil salvo localmente!" : "Profile saved locally!");
  };

  const generate = async () => {
    if (!profile.name.trim()) { setError(language === "pt" ? "Nome obrigatório." : "Name is required."); return; }
    if (!profile.email.trim()) { setError(language === "pt" ? "Email obrigatório." : "Email is required."); return; }
    setError(null);
    setStep("generating");
    setLogs([language === "pt" ? "Conectando ao GitHub…" : "Connecting to GitHub…"]);

    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, profile, language, format, runAts }),
      });
      const json = await res.json() as {
        ok: boolean; data?: CvData; logs?: string[];
        markdownText?: string; markdownUrl?: string; pdfUrl?: string; error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro desconhecido");
      setLogs(json.logs ?? []);
      setCvData(json.data ?? null);
      setMdText(json.markdownText ?? "");
      setMdUrl(json.markdownUrl ? `${window.location.origin}${json.markdownUrl}` : "");
      setPdfUrl(json.pdfUrl   ? `${window.location.origin}${json.pdfUrl}` : "");
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("form");
    }
  };

  const ats = cvData?.atsAnalysis;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.82)",
      zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 12,
        width: "100%", maxWidth: 860,
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid #30363d",
          background: "#0d1117",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📄</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#e6edf3" }}>
                {language === "pt" ? "Gerar Currículo" : "Generate CV"}
              </div>
              <div style={{ fontSize: 12, color: "#8fa6c8" }}>@{username}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Idioma */}
            <div style={{ display: "flex", border: "1px solid #30363d", borderRadius: 6, overflow: "hidden" }}>
              {(["pt","en"] as CvLanguage[]).map(l => (
                <button key={l} onClick={() => setLanguage(l)} style={{
                  padding: "6px 14px", fontSize: 12, cursor: "pointer",
                  background: language === l ? "#238636" : "transparent",
                  border: "none", color: language === l ? "#fff" : "#8fa6c8",
                  fontFamily: "inherit",
                }}>
                  {l === "pt" ? "🇧🇷 PT" : "🇺🇸 EN"}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{
              background: "transparent", border: "1px solid #ff5c6c44",
              borderRadius: 6, color: "#ff5c6c", padding: "6px 12px",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>

          {/* ── STEP: FORM ── */}
          {step === "form" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 13, color: "#8fa6c8", margin: 0 }}>
                {language === "pt"
                  ? "Preencha seus dados pessoais. Os repositórios dos últimos 2 anos serão buscados automaticamente do GitHub."
                  : "Fill in your personal data. Repositories from the last 2 years will be fetched automatically from GitHub."}
              </p>

              {error && (
                <div style={{ background: "#3d0f0f", border: "1px solid #ff5c6c44", borderRadius: 6, padding: "10px 14px", color: "#ff5c6c", fontSize: 13 }}>
                  {error}
                </div>
              )}

              {/* Dados básicos */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                <Field id="name"     label={language==="pt"?"Nome completo *":"Full name *"}         required value={profile.name}     onChange={v => setField("name",v)}     placeholder="Adalberto Brant" />
                <Field id="title"    label={language==="pt"?"Título profissional":"Professional title"}       value={profile.title}    onChange={v => setField("title",v)}    placeholder="Desenvolvedor Full Stack" />
                <Field id="email"    label={language==="pt"?"Email *":"Email *"}                      required value={profile.email}    onChange={v => setField("email",v)}    placeholder="voce@email.com" />
                <Field id="phone"    label={language==="pt"?"Telefone":"Phone"}                                value={profile.phone}    onChange={v => setField("phone",v)}    placeholder="+55 11 99999-9999" />
                <Field id="location" label={language==="pt"?"Localização":"Location"}                         value={profile.location} onChange={v => setField("location",v)} placeholder="São Paulo, Brasil" />
                <Field id="linkedin" label="LinkedIn"                                                          value={profile.linkedin} onChange={v => setField("linkedin",v)} placeholder="linkedin.com/in/voce" />
                <Field id="website"  label={language==="pt"?"Site / Portfolio":"Website / Portfolio"}         value={profile.website}  onChange={v => setField("website",v)}  placeholder="https://voce.dev" />
              </div>

              {/* Resumo */}
              <Field id="summary" label={language==="pt"?"Resumo profissional":"Professional summary"}
                multiline value={profile.summary} onChange={v => setField("summary",v)}
                placeholder={language==="pt"
                  ? "Desenvolvedor com X anos de experiência em…"
                  : "Developer with X years of experience in…"}
                hint={language==="pt"
                  ? "2-4 frases. Aparece no topo do currículo e é o que a IA analisa primeiro."
                  : "2-4 sentences. Appears at the top and is what AI analyzes first."}
              />

              {/* Skills */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#8fa6c8" }}>
                  {language==="pt" ? "Habilidades técnicas" : "Technical skills"}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder={language==="pt" ? "TypeScript, Docker, AWS… ENTER para adicionar" : "TypeScript, Docker, AWS… ENTER to add"}
                    style={{ ...fieldStyle, flex: 1 }}
                  />
                  <Btn onClick={addSkill} variant="ghost">+</Btn>
                </div>
                {profile.skills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profile.skills.map(sk => (
                      <span key={sk} style={{
                        background: "#21262d", border: "1px solid #30363d",
                        borderRadius: 20, padding: "3px 10px",
                        fontSize: 12, color: "#e6edf3",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        {sk}
                        <button onClick={() => setField("skills", profile.skills.filter(s => s !== sk))}
                          style={{ background: "none", border: "none", color: "#8fa6c8", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1 }}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Opções */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "12px 0", borderTop: "1px solid #21262d" }}>
                {/* Formato */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#8fa6c8" }}>
                    {language==="pt" ? "Formato de saída" : "Output format"}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["markdown","pdf"] as CvFormat[]).map(f => (
                      <button key={f} onClick={() => setFormat(f)} style={{
                        padding: "7px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer",
                        background: format === f ? "#1f6feb" : "transparent",
                        border: `1px solid ${format === f ? "#388bfd" : "#30363d"}`,
                        color: format === f ? "#fff" : "#8fa6c8", fontFamily: "inherit",
                      }}>
                        {f === "pdf" ? "📋 PDF" : "📝 Markdown"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ATS */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="runAts" checked={runAts} onChange={e => setRunAts(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#238636" }} />
                  <label htmlFor="runAts" style={{ fontSize: 13, color: "#e6edf3", cursor: "pointer" }}>
                    {language==="pt" ? "Analisar ATS / IA" : "ATS / AI analysis"}
                  </label>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={saveProfile}>
                  {language==="pt" ? "💾 Salvar perfil" : "💾 Save profile"}
                </Btn>
                <Btn onClick={generate} disabled={!profile.name || !profile.email}>
                  {language==="pt" ? "⚡ Gerar currículo" : "⚡ Generate CV"}
                </Btn>
              </div>
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === "generating" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36 }}>⚙️</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#e6edf3" }}>
                {language==="pt" ? "Gerando seu currículo…" : "Generating your CV…"}
              </div>
              <div ref={logsRef} style={{
                width: "100%", maxHeight: 200,
                background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
                padding: 12, overflowY: "auto",
                fontFamily: "'VT323', monospace", fontSize: 14, color: "#5eeaff",
                lineHeight: 1.6,
              }}>
                {logs.map((l, i) => <div key={i}>$ {l}</div>)}
                <div style={{ animation: "blink 1s infinite" }}>▊</div>
              </div>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === "result" && cvData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header de resultado */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#2ea043" }}>
                    ✅ {language==="pt" ? "Currículo gerado!" : "CV generated!"}
                  </div>
                  <div style={{ fontSize: 12, color: "#8fa6c8", marginTop: 2 }}>
                    {cvData.repos.length} {language==="pt" ? "repositórios" : "repositories"} · {cvData.groups.length} {language==="pt" ? "grupos" : "groups"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {mdUrl && (
                    <a href={mdUrl} download style={{ textDecoration: "none" }}>
                      <Btn variant="ghost">📝 {language==="pt" ? "Baixar Markdown" : "Download Markdown"}</Btn>
                    </a>
                  )}
                  {pdfUrl && (
                    <a href={pdfUrl} download style={{ textDecoration: "none" }}>
                      <Btn>📋 {language==="pt" ? "Baixar PDF" : "Download PDF"}</Btn>
                    </a>
                  )}
                  <Btn variant="ghost" onClick={() => setStep("form")}>
                    {language==="pt" ? "↩ Editar" : "↩ Edit"}
                  </Btn>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #30363d", gap: 0 }}>
                {(["preview","ats"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: "8px 18px", background: "transparent",
                    border: "none", borderBottom: activeTab === tab ? "2px solid #1f6feb" : "2px solid transparent",
                    color: activeTab === tab ? "#e6edf3" : "#8fa6c8",
                    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {tab === "preview"
                      ? (language==="pt" ? "📄 Preview" : "📄 Preview")
                      : (language==="pt" ? "🎯 Análise ATS" : "🎯 ATS Analysis")}
                  </button>
                ))}
              </div>

              {/* Preview Markdown */}
              {activeTab === "preview" && (
                <pre style={{
                  background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
                  padding: 16, overflowX: "auto", fontSize: 12, lineHeight: 1.6,
                  color: "#e6edf3", fontFamily: "'Courier New', monospace",
                  maxHeight: 420, overflowY: "auto", whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {mdText || generateMarkdownPreview(cvData, language)}
                </pre>
              )}

              {/* ATS */}
              {activeTab === "ats" && ats && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <AtsScoreRing score={ats.score} />
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#e6edf3", marginBottom: 8 }}>
                        {language==="pt" ? "Resumo da IA" : "AI Summary"}
                      </div>
                      <p style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.6, margin: 0 }}>
                        {ats.aiSummary}
                      </p>
                    </div>
                  </div>
                  {ats.strengths.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#2ea043", marginBottom: 6 }}>
                        ✅ {language==="pt" ? "Pontos fortes" : "Strengths"}
                      </div>
                      {ats.strengths.map((s, i) => (
                        <div key={i} style={{ fontSize: 13, color: "#c9d1d9", padding: "3px 0" }}>{s}</div>
                      ))}
                    </div>
                  )}
                  {ats.suggestions.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#ffd23f", marginBottom: 6 }}>
                        💡 {language==="pt" ? "Sugestões" : "Suggestions"}
                      </div>
                      {ats.suggestions.map((s, i) => (
                        <div key={i} style={{ fontSize: 13, color: "#c9d1d9", padding: "3px 0" }}>{s}</div>
                      ))}
                    </div>
                  )}
                  {ats.keywords.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#8fa6c8", marginBottom: 6 }}>
                        🔑 {language==="pt" ? "Keywords encontradas" : "Keywords found"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {ats.keywords.map(k => (
                          <span key={k} style={{
                            background: "#21262d", border: "1px solid #30363d",
                            borderRadius: 20, padding: "2px 9px", fontSize: 11, color: "#8fa6c8",
                          }}>
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "ats" && !ats && (
                <div style={{ color: "#8fa6c8", fontSize: 13, padding: "20px 0" }}>
                  {language==="pt" ? "Análise ATS não executada. Marque a opção ao gerar." : "ATS analysis not run. Check the option when generating."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Gera um preview rápido sem chamar a API (fallback)
const generateMarkdownPreview = (cv: CvData, lang: CvLanguage): string => {
  const lines = [
    `# ${cv.profile.name}`,
    `### ${cv.profile.title}`,
    ``,
    `📧 ${cv.profile.email} · 📍 ${cv.profile.location}`,
    ``,
    cv.profile.summary,
    ``,
    `## ${lang === "pt" ? "Repositórios" : "Repositories"} (${cv.repos.length})`,
    ``,
    ...cv.groups.slice(0, 3).flatMap(g => [
      `### ${g.language} — ${g.domain}`,
      ...g.repos.slice(0, 2).map(r => `- **${r.name}** — ${r.description}`),
      ``,
    ]),
    `…`,
  ];
  return lines.join("\n");
};
