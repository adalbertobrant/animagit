import React from "react";
import { Composition } from "remotion";
import demoStats from "../../data/cache/adalbertobrant-2026.json";
import type { GitHubStats } from "../shared/types";
import { AnimaGithub } from "./AnimaGithub";
import { TOTAL_FRAMES, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "./constants";

const stats = demoStats as unknown as GitHubStats;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AnimaGithub"
    component={AnimaGithub}
    durationInFrames={TOTAL_FRAMES}
    fps={VIDEO_FPS}
    width={VIDEO_WIDTH}
    height={VIDEO_HEIGHT}
    defaultProps={{ stats, theme: "space" as const }}
  />
);
