import type { GitHubStats } from "../../shared/types";
import type { ThemeSpec } from "../theme";

export type SceneProps = {
  stats: GitHubStats;
  theme: ThemeSpec;
};
