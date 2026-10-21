import { db, DEFAULT_LOGO_STYLE, type Project } from './db';
import { uid } from '../lib/id';
import receeperLogo from '../assets/logos/receeper.svg?raw';
import lavaggioLogo from '../assets/logos/drive-in-lavaggio.svg?raw';
import maxiscooterLogo from '../assets/logos/maxiscooter.svg?raw';

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Je eigen bedrijven als startpunt. Labels en kleuren pas je aan in Instellingen. */
export function seedProjects(now = Date.now()): Project[] {
  const base = { holding: null, active: true, quick: true, weekGoalMinutes: null, createdAt: now, logoStyle: { ...DEFAULT_LOGO_STYLE, fit: 'vullend' as const } };
  return [
    { ...base, id: uid(), order: 0, name: 'Receeper', label: 'Startup', color: '#2FD083', monogram: 'RC', logo: svgToDataUrl(receeperLogo) },
    { ...base, id: uid(), order: 1, name: 'Straalhelder', label: 'Bedrijf', color: '#43B9F6', monogram: 'SH', logo: null },
    { ...base, id: uid(), order: 2, name: 'Drive-In Lavaggio', label: 'Startup', color: '#FF5C6C', monogram: 'DL', logo: svgToDataUrl(lavaggioLogo) },
    { ...base, id: uid(), order: 3, name: 'maxiscooter.eu', label: 'Bedrijf', color: '#FF9F43', monogram: 'MX', logo: svgToDataUrl(maxiscooterLogo) },
  ];
}

/** Vult een lege database één keer met je bedrijven. Daarna nooit meer, ook niet als je alles verwijdert. */
export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', db.projects, db.settings, async () => {
    const seeded = await db.settings.get('seeded');
    if (seeded) return;
    if ((await db.projects.count()) === 0) await db.projects.bulkAdd(seedProjects());
    await db.settings.put({ key: 'seeded', value: true });
  });
}
