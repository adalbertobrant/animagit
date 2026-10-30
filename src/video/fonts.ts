import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const DISPLAY_SPACE = "'Orbitron', sans-serif";
export const DISPLAY_PIXEL = "'Press Start 2P', monospace";
export const BODY_PIXEL = "'VT323', monospace";

let started = false;

/**
 * Carrega as fontes locais em public/fonts. O loadFont usa delayRender(),
 * então o Remotion só captura o primeiro frame depois que tudo estiver pronto.
 */
export const loadVideoFonts = (): void => {
  if (started) return;
  started = true;

  loadFont({
    family: "Orbitron",
    url: staticFile("fonts/orbitron-700.woff2"),
    weight: "700",
  });
  loadFont({
    family: "Orbitron",
    url: staticFile("fonts/orbitron-900.woff2"),
    weight: "900",
  });
  loadFont({
    family: "Press Start 2P",
    url: staticFile("fonts/press-start-2p-400.woff2"),
    weight: "400",
  });
  loadFont({
    family: "VT323",
    url: staticFile("fonts/vt323-400.woff2"),
    weight: "400",
  });
};
