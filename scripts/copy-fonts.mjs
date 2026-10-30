#!/usr/bin/env node
/**
 * Copia as fontes OFL do node_modules para public/fonts.
 * O vídeo usa staticFile() para carregar as fontes sem nenhuma chamada de rede.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/fonts");

const fonts = [
  ["@fontsource/orbitron/files/orbitron-latin-700-normal.woff2", "orbitron-700.woff2"],
  ["@fontsource/orbitron/files/orbitron-latin-900-normal.woff2", "orbitron-900.woff2"],
  ["@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2", "press-start-2p-400.woff2"],
  ["@fontsource/vt323/files/vt323-latin-400-normal.woff2", "vt323-400.woff2"],
];

await mkdir(outDir, { recursive: true });

let copied = 0;
for (const [from, to] of fonts) {
  const src = resolve(root, "node_modules", from);
  if (!existsSync(src)) {
    console.warn(`[fonts] não encontrado: ${from} (rode npm install)`);
    continue;
  }
  await copyFile(src, resolve(outDir, to));
  copied++;
}

console.log(`[fonts] ${copied}/${fonts.length} fontes copiadas para public/fonts`);
