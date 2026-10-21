import { db, type Project, type Setting, type Task, type TimeEntry } from './db';
import { dayKey } from '../lib/time';

export interface Backup {
  app: 'whistlerocket';
  format: 1;
  exportedAt: string;
  projects: Project[];
  entries: TimeEntry[];
  tasks: Task[];
  settings: Setting[];
}

export async function exportBackup(): Promise<Backup> {
  return db.transaction('r', db.projects, db.entries, db.tasks, db.settings, async () => ({
    app: 'whistlerocket' as const,
    format: 1 as const,
    exportedAt: new Date().toISOString(),
    projects: await db.projects.toArray(),
    entries: await db.entries.toArray(),
    tasks: await db.tasks.toArray(),
    settings: await db.settings.toArray(),
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
  if (b?.app !== 'whistlerocket' || b.format !== 1) throw new Error('Dit bestand komt niet uit WhistleRocket.');
  for (const key of ['projects', 'entries', 'tasks', 'settings'] as const) {
    if (!Array.isArray(b[key])) throw new Error(`Het onderdeel "${key}" ontbreekt in de back-up.`);
  }
  const ids = new Set(b.projects!.map((p) => p.id));
  if (b.projects!.some((p) => typeof p.id !== 'string' || typeof p.name !== 'string')) throw new Error('De back-up bevat een ongeldig project.');
  if (b.entries!.some((e) => !ids.has(e.projectId) || typeof e.start !== 'number')) throw new Error('De back-up bevat uren zonder geldig project.');
  return b as Backup;
}

/** Vervangt alles door de inhoud van de back-up. */
export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction('rw', db.projects, db.entries, db.tasks, db.settings, async () => {
    await Promise.all([db.projects.clear(), db.entries.clear(), db.tasks.clear(), db.settings.clear()]);
    await db.projects.bulkAdd(b.projects);
    await db.entries.bulkAdd(b.entries);
    await db.tasks.bulkAdd(b.tasks);
    await db.settings.bulkAdd(b.settings);
    await db.settings.put({ key: 'seeded', value: true });
  });
}
