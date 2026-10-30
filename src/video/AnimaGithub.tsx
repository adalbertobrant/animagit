/**
 * AnimaGithub.tsx — composição raiz do vídeo.
 *
 * v0.1.1: substitui o TransitionSeries de infográficos por GameStage,
 * que renderiza a animação estilo jogo com palco contínuo.
 *
 * As cenas antigas (Intro, Contributions, etc.) permanecem no repositório
 * em src/video/scenes/ mas não são montadas aqui.
 */

import React from "react";
import type { GitHubStats, ThemeId } from "../shared/types";
import { GameStage } from "./game/GameStage";

export type AnimaGithubProps = {
  stats: GitHubStats;
  theme: ThemeId;
};

export const AnimaGithub: React.FC<AnimaGithubProps> = ({ stats, theme }) => {
  return <GameStage stats={stats} theme={theme} />;
};
