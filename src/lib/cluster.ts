/**
 * Locaties die op het scherm te dicht bij elkaar liggen, worden één bolletje
 * met een aantal. Werkt op schermcoördinaten, dus na elke zoom opnieuw.
 */

export interface ScreenPoint<T> {
  item: T;
  x: number;
  y: number;
}

export interface Cluster<T> {
  x: number;
  y: number;
  items: T[];
}

export function clusterPoints<T>(points: ScreenPoint<T>[], radius = 28): Cluster<T>[] {
  const clusters: (Cluster<T> & { sx: number; sy: number })[] = [];
  for (const p of points) {
    const hit = clusters.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < radius);
    if (hit) {
      hit.items.push(p.item);
      hit.sx += p.x;
      hit.sy += p.y;
      hit.x = hit.sx / hit.items.length;
      hit.y = hit.sy / hit.items.length;
    } else {
      clusters.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, items: [p.item] });
    }
  }
  return clusters.map(({ x, y, items }) => ({ x, y, items }));
}
