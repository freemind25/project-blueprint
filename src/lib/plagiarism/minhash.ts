const HASH_SEED_A = 2654435761;
const MAX_HASH = 0xFFFFFFFF;
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function generateHashParams(k: number): Array<{ a: number; b: number }> {
  const params: Array<{ a: number; b: number }> = [];
  for (let i = 0; i < k; i++) {
    const seed = (HASH_SEED_A * (i + 1) + 2246822519) >>> 0;
    const a = ((seed * 1103515245 + 12345) >>> 0) || 1;
    const b = ((seed >> 16) * 1103515245 + 12345) >>> 0;
    params.push({ a, b });
  }
  return params;
}
export function computeMinHashSignature(shingles: Set<string> | string[], numHashFunctions: number = 128, cachedParams?: Array<{ a: number; b: number }>): { signature: Uint32Array; params: Array<{ a: number; b: number }> } {
  const params = cachedParams ?? generateHashParams(numHashFunctions);
  const signature = new Uint32Array(params.length);
  signature.fill(MAX_HASH);
  const arr = shingles instanceof Set ? [...shingles] : shingles;
  for (const shingle of arr) {
    const h = hashString(shingle);
    for (let i = 0; i < params.length; i++) {
      const v = (Math.imul(params[i].a, h) + params[i].b) >>> 0;
      if (v < signature[i]) signature[i] = v;
    }
  }
  return { signature, params };
}
export function estimateJaccard(sig1: Uint32Array, sig2: Uint32Array): number {
  if (sig1.length !== sig2.length) throw new Error(`Signature length mismatch: ${sig1.length} !== ${sig2.length}`);
  if (sig1.length === 0) return 0;
  let matches = 0;
  for (let i = 0; i < sig1.length; i++) if (sig1[i] === sig2[i]) matches++;
  return matches / sig1.length;
}
export function exactJaccard(set1: Set<string>, set2: Set<string>): number {
  let intersection = 0;
  for (const item of set1) if (set2.has(item)) intersection++;
  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}