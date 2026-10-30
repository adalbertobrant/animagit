import { registerRoot } from "remotion";
import { loadVideoFonts } from "./fonts";
import { RemotionRoot } from "./Root";

loadVideoFonts();

registerRoot(RemotionRoot);
