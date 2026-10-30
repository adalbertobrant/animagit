#!/usr/bin/env node
/**
 * Gera as três trilhas chiptune originais do projeto.
 *
 * Nada é baixado: os WAVs são sintetizados aqui, localmente, nota por nota.
 * Isso evita qualquer problema de licenciamento de áudio e permite rodar offline.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/audio");
const SAMPLE_RATE = 22050;

const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);

const NOTE = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

const n = (name, octave) => 12 * (octave + 1) + NOTE[name];

function makeBuffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
}

function envelope(t, duration, attack = 0.006, release = 0.035, sustain = 0.72) {
  if (t < 0 || t > duration) return 0;
  if (t < attack) return t / attack;
  if (t > duration - release) return Math.max(0, (duration - t) / release);
  return sustain;
}

function square(phase) {
  return Math.sin(phase) >= 0 ? 0.8 : -0.8;
}

function triangle(phase) {
  return (2 / Math.PI) * Math.asin(Math.sin(phase));
}

function addNote(buffer, { start, duration, midi, gain = 0.16, wave = "square", vibrato = 0 }) {
  const freq = midiToFreq(midi);
  const startSample = Math.floor(start * SAMPLE_RATE);
  const endSample = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  let phase = 0;
  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    const f = freq * (1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t));
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    const sample = wave === "triangle" ? triangle(phase) : wave === "sine" ? Math.sin(phase) : square(phase);
    buffer[i] += sample * gain * envelope(t, duration);
  }
}

function addNoise(buffer, { start, duration, gain = 0.08, decay = 0.08, color = 1 }) {
  const startSample = Math.floor(start * SAMPLE_RATE);
  const endSample = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  let seed = 1337 + Math.floor(start * 1000);
  let last = 0;
  for (let i = startSample; i < endSample; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const white = (seed / 0x7fffffff) * 2 - 1;
    last = last + color * (white - last);
    const t = (i - startSample) / SAMPLE_RATE;
    buffer[i] += last * gain * Math.exp(-t / decay);
  }
}

function addKick(buffer, start, gain = 0.28) {
  const startSample = Math.floor(start * SAMPLE_RATE);
  const duration = 0.18;
  const endSample = Math.min(buffer.length, startSample + Math.floor(duration * SAMPLE_RATE));
  let phase = 0;
  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    const freq = 120 * Math.exp(-t * 22) + 42;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    buffer[i] += Math.sin(phase) * gain * Math.exp(-t * 14);
  }
}

function addDelay(buffer, delaySeconds, feedback = 0.28, mix = 0.18) {
  const delay = Math.floor(delaySeconds * SAMPLE_RATE);
  for (let i = delay; i < buffer.length; i++) {
    buffer[i] += buffer[i - delay] * feedback * mix;
  }
}

function normalize(buffer, peak = 0.82) {
  let max = 0;
  for (const sample of buffer) max = Math.max(max, Math.abs(sample));
  if (max === 0) return buffer;
  const scale = peak / max;
  for (let i = 0; i < buffer.length; i++) buffer[i] *= scale;
  // fade curto nas pontas para o loop não estalar
  const fade = Math.floor(SAMPLE_RATE * 0.012);
  for (let i = 0; i < fade; i++) {
    buffer[i] *= i / fade;
    buffer[buffer.length - 1 - i] *= i / fade;
  }
  return buffer;
}

function toWav(buffer) {
  const bytesPerSample = 2;
  const dataSize = buffer.length * bytesPerSample;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  wav.writeUInt16LE(bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < buffer.length; i++) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]));
    wav.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return wav;
}

function sequence({ bpm, bars, chords, bass, lead, drums, arp, pad, delay }) {
  const beat = 60 / bpm;
  const barDuration = beat * 4;
  const loopDuration = barDuration * bars;
  const buffer = makeBuffer(loopDuration + 0.05);

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barDuration;
    const chord = chords[bar % chords.length];
    const chordNotes = chord.map((m) => m + 12);

    if (pad) {
      for (const midi of chord) addNote(buffer, { start: barStart, duration: barDuration * 0.98, midi, gain: 0.045, wave: "triangle" });
    }

    if (arp) {
      const pattern = [...chordNotes, chordNotes[1], chordNotes[2], chordNotes[1]];
      for (let step = 0; step < 8; step++) {
        addNote(buffer, {
          start: barStart + step * (beat / 2),
          duration: beat * 0.42,
          midi: pattern[step % pattern.length] + (step % 4 === 3 ? 12 : 0),
          gain: 0.075,
          wave: "square",
        });
      }
    }

    if (lead) {
      const line = lead[bar % lead.length];
      line.forEach(([offset, midi, length = 1], i) => {
        if (midi === null) return;
        addNote(buffer, {
          start: barStart + offset * beat,
          duration: length * beat * 0.9,
          midi,
          gain: 0.12,
          wave: "square",
          vibrato: i % 2 === 0 ? 0.006 : 0,
        });
      });
    }

    if (bass) {
      const line = bass[bar % bass.length];
      line.forEach(([offset, midi, length = 1]) => {
        addNote(buffer, { start: barStart + offset * beat, duration: length * beat * 0.95, midi, gain: 0.15, wave: "triangle" });
      });
    }

    if (drums) {
      for (let step = 0; step < 8; step++) {
        const t = barStart + step * (beat / 2);
        if (step === 0 || step === 4) addKick(buffer, t, 0.22);
        if (step === 2 || step === 6) addNoise(buffer, { start: t, duration: 0.12, gain: 0.07, decay: 0.055 });
        if (step % 2 === 1) addNoise(buffer, { start: t, duration: 0.05, gain: 0.035, decay: 0.02, color: 0.7 });
      }
    }
  }

  if (delay) addDelay(buffer, delay, 0.3, 0.2);
  return normalize(buffer);
}

const tracks = {};

// ---------------- ESPAÇO ----------------
// Am | F | C | G — arpejo cintilante, baixo profundo, sensação de flutuar.
tracks.space = sequence({
  bpm: 96,
  bars: 8,
  chords: [
    [n("A", 3), n("C", 4), n("E", 4)],
    [n("F", 3), n("A", 3), n("C", 4)],
    [n("C", 3), n("E", 4), n("G", 4)],
    [n("G", 3), n("B", 3), n("D", 4)],
  ],
  bass: [
    [[0, n("A", 2), 2], [2.5, n("A", 2), 1.2]],
    [[0, n("F", 2), 2], [2.5, n("F", 2), 1.2]],
    [[0, n("C", 3), 2], [2.5, n("C", 3), 1.2]],
    [[0, n("G", 2), 2], [2.5, n("G", 2), 1.2]],
  ],
  lead: [
    [[0, n("E", 5), 1.5], [2, n("A", 5), 1.5]],
    [[0, n("C", 5), 1.5], [2, n("F", 5), 1.5]],
    [[0, n("G", 5), 1.5], [2, n("E", 5), 1.5]],
    [[0, n("D", 5), 3]],
  ],
  arp: true,
  pad: true,
  drums: true,
  delay: 0.31,
});

// ---------------- SUPER METROID ----------------
// Dm | Bb | Gm | A — tenso, grave, com hi-hats de 16 avos e lead dissonante.
tracks.metroid = sequence({
  bpm: 132,
  bars: 8,
  chords: [
    [n("D", 3), n("F", 3), n("A", 3)],
    [n("A#", 2), n("D", 3), n("F", 3)],
    [n("G", 2), n("A#", 2), n("D", 3)],
    [n("A", 2), n("C#", 3), n("E", 3)],
  ],
  bass: [
    [[0, n("D", 2), 0.8], [1.5, n("D", 2), 0.8], [3, n("D", 2), 0.8]],
    [[0, n("A#", 1), 0.8], [1.5, n("A#", 1), 0.8], [3, n("A#", 1), 0.8]],
    [[0, n("G", 1), 0.8], [1.5, n("G", 1), 0.8], [3, n("G", 1), 0.8]],
    [[0, n("A", 1), 3]],
  ],
  lead: [
    [[0, n("D", 5), 0.5], [0.75, n("F", 5), 0.5], [2, n("A", 5), 1]],
    [[0, n("F", 5), 0.5], [0.75, n("D", 5), 0.5], [2, n("A#", 4), 1]],
    [[0, n("G", 5), 0.5], [0.75, n("A#", 5), 0.5], [2, n("D", 5), 1]],
    [[0, n("C#", 5), 1], [1.5, n("E", 5), 1], [3, null]],
  ],
  arp: false,
  pad: true,
  drums: true,
});

// ---------------- PITFALL ----------------
// C | F | G | C — saltitante, pentatônica, bateria seca de 8 bits.
tracks.pitfall = sequence({
  bpm: 150,
  bars: 8,
  chords: [
    [n("C", 3), n("E", 3), n("G", 3)],
    [n("F", 2), n("A", 2), n("C", 3)],
    [n("G", 2), n("B", 2), n("D", 3)],
    [n("C", 3), n("E", 3), n("G", 3)],
  ],
  bass: [
    [[0, n("C", 2), 0.6], [1, n("C", 2), 0.6], [2, n("G", 1), 0.6], [3, n("C", 2), 0.6]],
    [[0, n("F", 1), 0.6], [1, n("F", 1), 0.6], [2, n("C", 2), 0.6], [3, n("F", 1), 0.6]],
    [[0, n("G", 1), 0.6], [1, n("G", 1), 0.6], [2, n("D", 2), 0.6], [3, n("G", 1), 0.6]],
    [[0, n("C", 2), 0.6], [1, n("C", 2), 0.6], [2, n("G", 1), 0.6], [3, n("C", 2), 0.6]],
  ],
  lead: [
    [[0, n("E", 5), 0.4], [0.5, n("G", 5), 0.4], [1, n("A", 5), 0.4], [2, n("G", 5), 0.4], [3, n("E", 5), 0.4]],
    [[0, n("F", 5), 0.4], [0.5, n("A", 5), 0.4], [1, n("C", 6), 0.4], [2, n("A", 5), 0.4], [3, n("F", 5), 0.4]],
    [[0, n("G", 5), 0.4], [0.5, n("B", 5), 0.4], [1, n("D", 6), 0.4], [2, n("B", 5), 0.4], [3, n("G", 5), 0.4]],
    [[0, n("C", 6), 0.8], [1.5, n("G", 5), 0.6], [2.5, n("E", 5), 0.6]],
  ],
  arp: false,
  pad: false,
  drums: true,
});

await mkdir(outDir, { recursive: true });
for (const [name, buffer] of Object.entries(tracks)) {
  const file = resolve(outDir, `${name}.wav`);
  await writeFile(file, toWav(buffer));
  const seconds = (buffer.length / SAMPLE_RATE).toFixed(2);
  console.log(`[audio] ${name}.wav — ${seconds}s — ${(buffer.length * 2 / 1024).toFixed(0)} KiB`);
}
console.log("[audio] trilhas originais geradas em public/audio");

// ────────────────────────────────────────────────────────────
// SFX — efeitos sonoros curtos para o GameStage v0.1.1
// Exportados em public/audio/sfx/
// ────────────────────────────────────────────────────────────

const sfxDir = resolve(outDir, "sfx");
await mkdir(sfxDir, { recursive: true });

/**
 * Sintetiza um WAV curto a partir de uma lista de addNote/addNoise calls.
 */
const makeSfx = (durationSec, fillFn, peak = 0.75) => {
  const buf = makeBuffer(durationSec);
  fillFn(buf);
  return normalize(buf, peak);
};

// shoot — disparo rápido (laser descendente)
const sfxShoot = makeSfx(0.14, (b) => {
  addNote(b, { start: 0, duration: 0.12, midi: n("A", 6), gain: 0.2, wave: "square" });
  addNote(b, { start: 0.03, duration: 0.09, midi: n("E", 6), gain: 0.15, wave: "square" });
});
await writeFile(resolve(sfxDir, "shoot.wav"), toWav(sfxShoot));
console.log("[sfx] shoot.wav");

// hit — impacto em meteoro/criatura
const sfxHit = makeSfx(0.18, (b) => {
  addNoise(b, { start: 0, duration: 0.14, gain: 0.18, decay: 0.06, color: 0.6 });
  addNote(b, { start: 0, duration: 0.1, midi: n("C", 3), gain: 0.14, wave: "square" });
});
await writeFile(resolve(sfxDir, "hit.wav"), toWav(sfxHit));
console.log("[sfx] hit.wav");

// coin — coleta de moeda/tesouro (dois tons ascendentes)
const sfxCoin = makeSfx(0.22, (b) => {
  addNote(b, { start: 0, duration: 0.08, midi: n("G", 5), gain: 0.2, wave: "square" });
  addNote(b, { start: 0.09, duration: 0.1, midi: n("C", 6), gain: 0.22, wave: "square" });
});
await writeFile(resolve(sfxDir, "coin.wav"), toWav(sfxCoin));
console.log("[sfx] coin.wav");

// jump — pulo curto (tom ascendente)
const sfxJump = makeSfx(0.18, (b) => {
  addNote(b, { start: 0, duration: 0.16, midi: n("F", 5), gain: 0.18, wave: "triangle", vibrato: 0.01 });
  addNote(b, { start: 0.06, duration: 0.1, midi: n("A", 5), gain: 0.12, wave: "triangle" });
});
await writeFile(resolve(sfxDir, "jump.wav"), toWav(sfxJump));
console.log("[sfx] jump.wav");

// levelup — troca de mês/setor (fanfarra curta de 3 notas)
const sfxLevelup = makeSfx(0.48, (b) => {
  addNote(b, { start: 0, duration: 0.12, midi: n("C", 5), gain: 0.18, wave: "square" });
  addNote(b, { start: 0.14, duration: 0.12, midi: n("E", 5), gain: 0.18, wave: "square" });
  addNote(b, { start: 0.28, duration: 0.18, midi: n("G", 5), gain: 0.2, wave: "square" });
});
await writeFile(resolve(sfxDir, "levelup.wav"), toWav(sfxLevelup));
console.log("[sfx] levelup.wav");

// bonus — PR/issue especial (acorde mais brilhante)
const sfxBonus = makeSfx(0.36, (b) => {
  addNote(b, { start: 0, duration: 0.3, midi: n("E", 6), gain: 0.18, wave: "square" });
  addNote(b, { start: 0.04, duration: 0.28, midi: n("G", 6), gain: 0.14, wave: "square" });
  addNote(b, { start: 0.08, duration: 0.24, midi: n("B", 6), gain: 0.12, wave: "square" });
});
await writeFile(resolve(sfxDir, "bonus.wav"), toWav(sfxBonus));
console.log("[sfx] bonus.wav");

// finish — placar final (arpejo ascendente resoluto)
const sfxFinish = makeSfx(1.1, (b) => {
  const notes = [n("C", 5), n("E", 5), n("G", 5), n("C", 6)];
  notes.forEach((midi, i) => {
    addNote(b, { start: i * 0.18, duration: 0.22, midi, gain: 0.2, wave: "square" });
  });
  addNote(b, { start: 0.8, duration: 0.28, midi: n("C", 6), gain: 0.18, wave: "triangle", vibrato: 0.005 });
});
await writeFile(resolve(sfxDir, "finish.wav"), toWav(sfxFinish));
console.log("[sfx] finish.wav");

console.log("[sfx] efeitos gerados em public/audio/sfx/");
