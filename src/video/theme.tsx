import React from "react";
import type { ThemeId } from "../shared/types";
import { MetroidBackground } from "./backgrounds/MetroidBackground";
import { PitfallBackground } from "./backgrounds/PitfallBackground";
import { SpaceBackground } from "./backgrounds/SpaceBackground";
import { MetroidIntroArt, PitfallIntroArt, SpaceIntroArt } from "./themes/art";

export type Palette = {
  bg: string;
  bgDeep: string;
  panel: string;
  panelBorder: string;
  fg: string;
  dim: string;
  accent: string;
  accent2: string;
  accent3: string;
  glow: string;
  grid: string;
  cellEmpty: string;
  cells: [string, string, string, string];
  success: string;
  danger: string;
  scanline: string;
};

export type ThemeSpec = {
  id: ThemeId;
  name: string;
  universe: string;
  tagline: string;
  fonts: { display: string; body: string; narrative: string };
  colors: Palette;
  audio: string;
  transition: "fade" | "wipe" | "slide";
  scenePrefix: string;
  cellRadius: number;
  scanlineOpacity: number;
  displayTracking: string;
  Background: React.FC;
  IntroArt: React.FC<{ login: string }>;
};

export const THEMES: Record<ThemeId, ThemeSpec> = {
  space: {
    id: "space",
    name: "ESPAÇO",
    universe: "ÓRBITA 2026",
    tagline: "Uma transmissão do seu ano em código",
    fonts: {
      display: "'Orbitron', 'Arial Black', sans-serif",
      body: "'VT323', 'Courier New', monospace",
      narrative: "'Atkinson Hyperlegible', 'Arial', sans-serif",
    },
    colors: {
      bg: "#03020f",
      bgDeep: "#070a2e",
      panel: "rgba(12, 20, 58, 0.58)",
      panelBorder: "rgba(94, 234, 255, 0.28)",
      fg: "#eef6ff",
      dim: "#8fa6c8",
      accent: "#5eeaff",
      accent2: "#ff5cd6",
      accent3: "#ffd166",
      glow: "rgba(94, 234, 255, 0.55)",
      grid: "rgba(94, 234, 255, 0.12)",
      cellEmpty: "rgba(94, 234, 255, 0.07)",
      cells: ["#14536e", "#1f8ba8", "#38cfe3", "#d8fbff"],
      success: "#6bffb8",
      danger: "#ff6b8b",
      scanline: "rgba(0, 0, 0, 0.16)",
    },
    audio: "audio/space.wav",
    transition: "fade",
    scenePrefix: "TRANSMISSÃO",
    cellRadius: 2,
    scanlineOpacity: 0.33,
    displayTracking: "0.015em",
    Background: SpaceBackground,
    IntroArt: SpaceIntroArt,
  },
  metroid: {
    id: "metroid",
    name: "SUPER METROID",
    universe: "SETOR 2026",
    tagline: "Missão: explorar o seu ano em código",
    fonts: {
      display: "'Press Start 2P', 'Courier New', monospace",
      body: "'VT323', 'Courier New', monospace",
      narrative: "'Atkinson Hyperlegible', 'Arial', sans-serif",
    },
    colors: {
      bg: "#070312",
      bgDeep: "#120726",
      panel: "rgba(26, 10, 48, 0.76)",
      panelBorder: "rgba(192, 77, 240, 0.42)",
      fg: "#eaf6ff",
      dim: "#9a86b8",
      accent: "#35f0c0",
      accent2: "#c04df0",
      accent3: "#ff5c6c",
      glow: "rgba(53, 240, 192, 0.45)",
      grid: "rgba(192, 77, 240, 0.16)",
      cellEmpty: "rgba(192, 77, 240, 0.09)",
      cells: ["#3d1a66", "#6b2fa0", "#c04df0", "#35f0c0"],
      success: "#35f0c0",
      danger: "#ff5c6c",
      scanline: "rgba(0, 0, 0, 0.2)",
    },
    audio: "audio/metroid.wav",
    transition: "wipe",
    scenePrefix: "LOG",
    cellRadius: 0,
    scanlineOpacity: 0.55,
    displayTracking: "0.02em",
    Background: MetroidBackground,
    IntroArt: MetroidIntroArt,
  },
  pitfall: {
    id: "pitfall",
    name: "PITFALL!",
    universe: "EXPEDIÇÃO 2026",
    tagline: "Cada commit é um tesouro na selva",
    fonts: {
      display: "'Press Start 2P', 'Courier New', monospace",
      body: "'VT323', 'Courier New', monospace",
      narrative: "'Atkinson Hyperlegible', 'Arial', sans-serif",
    },
    colors: {
      bg: "#080a05",
      bgDeep: "#0f1709",
      panel: "rgba(30, 24, 10, 0.78)",
      panelBorder: "rgba(255, 210, 63, 0.4)",
      fg: "#f4f0d0",
      dim: "#a89c6a",
      accent: "#ffd23f",
      accent2: "#e8590c",
      accent3: "#7bc950",
      glow: "rgba(255, 210, 63, 0.45)",
      grid: "rgba(255, 210, 63, 0.14)",
      cellEmpty: "rgba(244, 240, 208, 0.06)",
      cells: ["#5b4a1f", "#a8811f", "#ffd23f", "#fff3b0"],
      success: "#7bc950",
      danger: "#e8590c",
      scanline: "rgba(0, 0, 0, 0.18)",
    },
    audio: "audio/pitfall.wav",
    transition: "slide",
    scenePrefix: "FASE",
    cellRadius: 0,
    scanlineOpacity: 0.4,
    displayTracking: "0.02em",
    Background: PitfallBackground,
    IntroArt: PitfallIntroArt,
  },
};
