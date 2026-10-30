import { Config } from "@remotion/cli/config";

// Renderização local, sem Lambda e sem serviços externos.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);
Config.setChromiumOpenGlRenderer("swangle");
Config.setOverwriteOutput(true);
// Deixe o Remotion escolher a concorrência ideal se não estiver definida.
if (!process.env.REMOTION_CONCURRENCY) {
  Config.setConcurrency(4);
}
