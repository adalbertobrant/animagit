/**
 * cv-ats.ts — análise ATS local + chamada opcional à IA
 *
 * Sem API key obrigatória: análise heurística sempre funciona.
 * Se OPENAI_API_KEY ou GEMINI_API_KEY estiver no .env, enriquece com IA.
 */

import type { AtsAnalysis, CvData, CvLanguage } from "../shared/cv-types.js";

// ── Keywords técnicas para ATS por domínio ───────────────────────
const ATS_KEYWORDS_TECH = [
  // Linguagens
  "typescript","javascript","python","java","go","rust","kotlin","swift","c#","c++","ruby","php","scala",
  // Frameworks
  "react","next.js","vue","angular","svelte","node.js","express","fastapi","django","spring","laravel",
  // Cloud / DevOps
  "aws","gcp","azure","docker","kubernetes","terraform","ci/cd","github actions","linux",
  // Data / IA
  "sql","postgresql","mongodb","redis","elasticsearch","kafka","spark","pandas","tensorflow","pytorch","llm","rag",
  // Práticas
  "rest api","graphql","microservices","tdd","ddd","solid","clean architecture","agile","scrum",
  // Soft
  "open source","team","collaboration","documentation","code review",
];

const ATS_KEYWORDS_PT = [
  "desenvolvedor","engenheiro","arquitetura","back-end","front-end","full stack","devops","dados","inteligência artificial",
  "código aberto","colaboração","documentação","revisão de código","testes",
];

const ATS_KEYWORDS_EN = [
  "developer","engineer","architecture","backend","frontend","full-stack","devops","data","artificial intelligence",
  "open source","collaboration","documentation","code review","testing","software",
];

// ── Análise heurística local ─────────────────────────────────────
export const analyzeAtsLocal = (cv: CvData): AtsAnalysis => {
  const lang = cv.language;
  const allText = [
    cv.profile.summary,
    cv.profile.title,
    cv.profile.skills.join(" "),
    cv.repos.map(r => `${r.description} ${r.readmeExcerpt} ${r.topics.join(" ")}`).join(" "),
  ].join(" ").toLowerCase();

  // Encontra keywords presentes
  const techFound = ATS_KEYWORDS_TECH.filter(k => allText.includes(k.toLowerCase()));
  const softFound = (lang === "pt" ? ATS_KEYWORDS_PT : ATS_KEYWORDS_EN)
    .filter(k => allText.includes(k.toLowerCase()));
  const keywords = [...new Set([...techFound, ...softFound])];

  // Score: base 40 + até 30 por keywords + até 15 por repos + 15 por perfil
  const keywordScore  = Math.min(30, keywords.length * 2);
  const repoScore     = Math.min(15, cv.repos.length);
  const profileScore  = [
    cv.profile.summary.length > 50,
    cv.profile.skills.length >= 5,
    cv.profile.linkedin.length > 0,
    cv.profile.title.length > 0,
    cv.profile.location.length > 0,
  ].filter(Boolean).length * 3;
  const score = Math.min(100, 40 + keywordScore + repoScore + profileScore);

  // Sugestões
  const suggestions: string[] = [];
  if (cv.profile.summary.length < 80)
    suggestions.push(lang === "pt"
      ? "Expanda o resumo profissional com pelo menos 2 frases sobre seu perfil e objetivos."
      : "Expand the professional summary with at least 2 sentences about your profile and goals.");
  if (cv.profile.skills.length < 8)
    suggestions.push(lang === "pt"
      ? "Adicione mais habilidades técnicas (mínimo 8 recomendado para ATS)."
      : "Add more technical skills (minimum 8 recommended for ATS).");
  if (!cv.profile.linkedin)
    suggestions.push(lang === "pt"
      ? "Inclua seu perfil do LinkedIn — muitos sistemas ATS o exigem."
      : "Include your LinkedIn profile — many ATS systems require it.");
  if (cv.repos.filter(r => r.stars > 0).length === 0)
    suggestions.push(lang === "pt"
      ? "Mencione projetos com estrelas ou forks para demonstrar impacto."
      : "Mention projects with stars or forks to demonstrate impact.");
  if (keywords.length < 10)
    suggestions.push(lang === "pt"
      ? `Adicione mais palavras-chave técnicas ao resumo. Faltam: ${ATS_KEYWORDS_TECH.filter(k => !allText.includes(k)).slice(0,5).join(", ")}.`
      : `Add more technical keywords to your summary. Missing: ${ATS_KEYWORDS_TECH.filter(k => !allText.includes(k)).slice(0,5).join(", ")}.`);

  // Pontos fortes
  const strengths: string[] = [];
  if (cv.repos.length >= 10)
    strengths.push(lang === "pt"
      ? `Portfólio ativo com ${cv.repos.length} repositórios nos últimos 2 anos.`
      : `Active portfolio with ${cv.repos.length} repositories in the last 2 years.`);
  const topStars = cv.repos.reduce((s, r) => s + r.stars, 0);
  if (topStars > 0)
    strengths.push(lang === "pt"
      ? `${topStars} estrelas acumuladas no GitHub demonstram reconhecimento da comunidade.`
      : `${topStars} total GitHub stars demonstrate community recognition.`);
  const domains = [...new Set(cv.repos.map(r => r.domain))];
  if (domains.length >= 3)
    strengths.push(lang === "pt"
      ? `Atuação em ${domains.length} domínios diferentes: ${domains.slice(0,4).join(", ")}.`
      : `Work across ${domains.length} different domains: ${domains.slice(0,4).join(", ")}.`);
  const langs = [...new Set(cv.repos.map(r => r.language))].filter(Boolean);
  if (langs.length >= 3)
    strengths.push(lang === "pt"
      ? `Proficiência em ${langs.slice(0,5).join(", ")}.`
      : `Proficiency in ${langs.slice(0,5).join(", ")}.`);

  // Skills otimizadas por relevância ATS
  const optimizedSkills = [
    ...cv.profile.skills.filter(s => ATS_KEYWORDS_TECH.includes(s.toLowerCase())),
    ...cv.profile.skills.filter(s => !ATS_KEYWORDS_TECH.includes(s.toLowerCase())),
    ...techFound.filter(k => !cv.profile.skills.map(s => s.toLowerCase()).includes(k)).slice(0, 6),
  ].slice(0, 20);

  // Resumo gerado localmente
  const topLangs = langs.slice(0, 3).join(", ");
  const topDomains = domains.slice(0, 3).join(", ");
  const aiSummary = lang === "pt"
    ? `Desenvolvedor com ${cv.repos.length} projetos ativos nos últimos 2 anos, especializado em ${topLangs}. Atua principalmente nas áreas de ${topDomains}. Score ATS estimado: ${score}/100.`
    : `Developer with ${cv.repos.length} active projects in the last 2 years, specialized in ${topLangs}. Main areas: ${topDomains}. Estimated ATS score: ${score}/100.`;

  return { score, keywords, suggestions, strengths, aiSummary, optimizedSkills };
};

// ── Enriquecimento via OpenAI (opcional) ─────────────────────────
const tryOpenAI = async (
  prompt: string,
  apiKey: string,
): Promise<string | null> => {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message.content ?? null;
  } catch {
    return null;
  }
};

// ── Enriquecimento via Gemini (opcional) ─────────────────────────
const tryGemini = async (
  prompt: string,
  apiKey: string,
): Promise<string | null> => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { candidates: { content: { parts: { text: string }[] } }[] };
    return data.candidates[0]?.content.parts[0]?.text ?? null;
  } catch {
    return null;
  }
};

// ── Análise completa ─────────────────────────────────────────────
export const analyzeCv = async (
  cv: CvData,
  openaiKey?: string,
  geminiKey?: string,
): Promise<AtsAnalysis> => {
  const local = analyzeAtsLocal(cv);
  const lang  = cv.language;

  // Tenta IA se tiver API key
  const aiKey = openaiKey ?? geminiKey;
  if (!aiKey) return local;

  const topRepos = cv.repos
    .slice(0, 5)
    .map(r => `- ${r.name} (${r.language}, ${r.domain}): ${r.description}`)
    .join("\n");

  const prompt = lang === "pt"
    ? `Você é um especialista em otimização de currículos e sistemas ATS. Analise este perfil de desenvolvedor e escreva um parágrafo de 3-4 frases em português, destacando os pontos mais relevantes para recrutadores técnicos. Seja objetivo e use linguagem profissional.\n\nPerfil:\nNome: ${cv.profile.name}\nTítulo: ${cv.profile.title}\nResumo: ${cv.profile.summary}\nHabilidades: ${cv.profile.skills.join(", ")}\nPrincipais projetos:\n${topRepos}`
    : `You are an ATS and resume optimization expert. Analyze this developer profile and write a 3-4 sentence paragraph in English highlighting the most relevant points for technical recruiters. Be concise and professional.\n\nProfile:\nName: ${cv.profile.name}\nTitle: ${cv.profile.title}\nSummary: ${cv.profile.summary}\nSkills: ${cv.profile.skills.join(", ")}\nTop projects:\n${topRepos}`;

  const aiText = openaiKey
    ? await tryOpenAI(prompt, openaiKey)
    : await tryGemini(prompt, geminiKey!);

  return {
    ...local,
    aiSummary: aiText ?? local.aiSummary,
  };
};
