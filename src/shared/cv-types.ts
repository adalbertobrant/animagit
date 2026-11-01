/**
 * cv-types.ts — tipos compartilhados para a feature de currículo
 */

export type CvLanguage = "pt" | "en";
export type CvFormat   = "pdf" | "markdown";

// ── Perfil pessoal preenchido pelo usuário ──────────────────────────
export type PersonalProfile = {
  name:       string;
  title:      string;       // "Desenvolvedor Full Stack"
  email:      string;
  phone:      string;
  location:   string;       // "São Paulo, Brasil"
  linkedin:   string;       // URL ou handle
  website:    string;
  summary:    string;       // parágrafo livre de apresentação
  skills:     string[];     // ["TypeScript","Docker","AWS",...]
};

// ── Repositório processado ─────────────────────────────────────────
export type CvRepo = {
  name:           string;
  fullName:       string;   // owner/repo
  url:            string;
  description:    string;   // topics/bio do repo
  readmeExcerpt:  string;   // primeiras 2-3 linhas do README
  stars:          number;
  forks:          number;
  language:       string;   // linguagem dominante
  topics:         string[];
  domain:         string;   // categoria inferida: Web, DevOps, Data, Mobile, etc.
  lastCommitAt:   string;   // ISO
  createdAt:      string;   // ISO
  commitCount:    number;   // commits nos últimos 2 anos
  languages:      Record<string, number>; // { TypeScript: 12345, ... }
};

// ── Grupo por linguagem + domínio ──────────────────────────────────
export type CvGroup = {
  language: string;
  domain:   string;
  repos:    CvRepo[];
};

// ── Resultado completo da análise de ATS ──────────────────────────
export type AtsAnalysis = {
  score:          number;   // 0-100
  keywords:       string[]; // palavras-chave encontradas
  suggestions:    string[]; // sugestões de melhoria
  strengths:      string[]; // pontos fortes identificados
  aiSummary:      string;   // parágrafo gerado por IA (ou heurística local)
  optimizedSkills:string[]; // skills reordenadas por relevância ATS
};

// ── Payload completo do CV ─────────────────────────────────────────
export type CvData = {
  profile:    PersonalProfile;
  repos:      CvRepo[];
  groups:     CvGroup[];
  generatedAt:string;
  language:   CvLanguage;
  atsAnalysis:AtsAnalysis | null;
};

// ── Request da API ─────────────────────────────────────────────────
export type CvRequest = {
  username:   string;
  profile:    PersonalProfile;
  language:   CvLanguage;
  format:     CvFormat;
  runAts:     boolean;
};

export type CvResponse = {
  ok:         boolean;
  data?:      CvData;
  markdown?:  string;       // quando format=markdown
  error?:     string;
};
