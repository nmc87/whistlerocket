import { db, type Project, type Setting, type Site, type Task, type TimeEntry } from './db';
import { dayKey } from '../lib/time';

export interface Backup {
  app: 'whistlerocket';
  /** 1 = tot en met 0.1.1, 2 = met locaties (Footprint). */
  format: 1 | 2;
  exportedAt: string;
  projects: Project[];
  entries: TimeEntry[];
  tasks: Task[];
  settings: Setting[];
  sites?: Site[];
}

export async function exportBackup(): Promise<Backup> {
  return db.transaction('r', [db.projects, db.entries, db.tasks, db.settings, db.sites], async () => ({
    app: 'whistlerocket' as const,
    format: 2 as const,
    exportedAt: new Date().toISOString(),
    projects: await db.projects.toArray(),
    entries: await db.entries.toArray(),
    tasks: await db.tasks.toArray(),
    settings: await db.settings.toArray(),
    sites: await db.sites.toArray(),
  }));
}

export function backupFileName(now = Date.now()): string {
  return `whistlerocket-backup-${dayKey(now)}.json`;
}

/** Controleert een back-upbestand zonder iets te wijzigen. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Dit is geen geldig back-upbestand.');
  }
  const b = data as Partial<Backup>;
  if (b?.app !== 'whistlerocket' || (b.format !== 1 && b.format !== 2)) throw new Error('Dit bestand komt niet uit WhistleRocket.');
  if (b.sites !== undefined && !Array.isArray(b.sites)) throw new Error('Het onderdeel "sites" in de back-up is ongeldig.');
  for (const key of ['projects', 'entries', 'tasks', 'settings'] as const) {
    if (!Array.isArray(b[key])) throw new Error(`Het onderdeel "${key}" ontbreekt in de back-up.`);
  }
  const ids = new Set(b.projects!.map((p) => p.id));
  if (b.projects!.some((p) => typeof p.id !== 'string' || typeof p.name !== 'string')) throw new Error('De back-up bevat een ongeldig project.');
  if (b.entries!.some((e) => !ids.has(e.projectId) || typeof e.start !== 'number')) throw new Error('De back-up bevat uren zonder geldig project.');
  if ((b.sites ?? []).some((s) => !ids.has(s.projectId) || !Number.isFinite(s.lat) || !Number.isFinite(s.lon))) throw new Error('De back-up bevat een locatie zonder geldig project of plek.');
  return b as Backup;
}

/** Vervangt alles door de inhoud van de back-up. */
export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction('rw', [db.projects, db.entries, db.tasks, db.settings, db.sites], async () => {
    await Promise.all([db.projects.clear(), db.entries.clear(), db.tasks.clear(), db.settings.clear(), db.sites.clear()]);
    await db.projects.bulkAdd(b.projects);
    await db.entries.bulkAdd(b.entries);
    await db.tasks.bulkAdd(b.tasks);
    await db.settings.bulkAdd(b.settings);
    await db.sites.bulkAdd(b.sites ?? []);
    await db.settings.put({ key: 'seeded', value: true });
  });
}
