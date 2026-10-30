/**
 * PRNG determinístico para toda a animação.
 * O mesmo login/ano/tema sempre produz os mesmos eventos.
 */
export type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (items) => items[Math.floor(next() * items.length)] ?? items[0],
  };
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
