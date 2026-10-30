import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export { formatNumber } from "../../shared/types";

export const useEnter = (delay = 0, stiffness = 90) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.7, stiffness },
  });
};

export const useCountUp = (value: number, delay = 0, duration = 45) => {
  const frame = useCurrentFrame();

  return Math.round(
    interpolate(frame, [delay, delay + duration], [0, value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
};

export const useFade = (delay = 0, duration = 18) => {
  const frame = useCurrentFrame();

  return interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const useStagger = (index: number, baseDelay = 0, step = 4) => useEnter(baseDelay + index * step);

export const pulse = (frame: number, speed = 0.06) => 0.5 + 0.5 * Math.sin(frame * speed);
