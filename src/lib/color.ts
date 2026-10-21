/**
 * Projectkleuren. Elke kleur moet uniek zijn, dus we meten hoe ver twee
 * kleuren uit elkaar liggen in OKLab (dat volgt hoe ogen verschil zien).
 */

/** Startpalet: 24 kleuren die goed van elkaar te onderscheiden zijn. */
export const PALETTE = [
  '#2FD083', '#43B9F6', '#FF5C6C', '#FF9F43', '#6E8BFF', '#F5D547',
  '#B98CFF', '#F06BC6', '#14B8A6', '#A3E635', '#C2410C', '#2563EB',
  '#7C3AED', '#EC4899', '#65A30D', '#22D3EE', '#84CC16', '#D946EF',
  '#F97316', '#0891B2', '#9CA3AF', '#BE8A5B', '#5EEAD4', '#FDA4AF',
];

/** Onder deze afstand noemen we twee kleuren "te gelijk". */
export const MIN_DISTANCE = 0.075;

export function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function toLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toOklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = toOklab(a);
  const [l2, a2, b2] = toOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** De kleur in `taken` die het dichtst bij `hex` ligt, of null als niets te dichtbij is. */
export function closestClash(hex: string, taken: string[]): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const t of taken) {
    const d = colorDistance(hex, t);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return bestD < MIN_DISTANCE ? best : null;
}

/** Eerste paletkleur die niet botst met bestaande kleuren. */
export function suggestColor(taken: string[]): string {
  return PALETTE.find((c) => closestClash(c, taken) === null) ?? PALETTE[taken.length % PALETTE.length];
}

/** Zwart of wit, afhankelijk van wat beter leest op deze kleur. */
export function inkOn(hex: string): '#0D0F13' | '#FFFFFF' {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.22 ? '#0D0F13' : '#FFFFFF';
}

/** Twee letters uit een naam: eerste en laatste woord ('Drive-In Lavaggio' → 'DL'), of de eerste twee letters ('maxiscooter.eu' → 'MA'). */
export function monogramFrom(name: string): string {
  const words = name
    .replace(/\.[a-z]{2,}$/i, '')
    .split(/[\s\-_.]+/)
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
}

/** Kleur met doorzichtigheid, voor tinten en randen. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
