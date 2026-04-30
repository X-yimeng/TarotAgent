export function hashStringToUint32(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Mulberry32 PRNG: small, fast, deterministic (not cryptographically secure)
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeedString(): string {
  // URL-safe-ish seed: timestamp + random chunk
  const now = Date.now().toString(36);
  const rnd = Math.floor(Math.random() * 2 ** 32)
    .toString(36)
    .slice(0, 8);
  return `${now}-${rnd}`;
}

