import { db, logoStyleOf, SITE_KINDS, type Label, type LogoStyle, type Project, type Site, type SiteKind, type Task, type TimeEntry, type TimerMode } from './db';
import { uid } from '../lib/id';
import { MINUTE } from '../lib/time';
import { closestClash, isHex, monogramFrom } from '../lib/color';

// ---------- Projecten ----------

export interface ProjectInput {
  name: string;
  label: Label;
  color: string;
  monogram?: string;
  logo?: string | null;
  logoStyle?: Partial<LogoStyle>;
  holding?: string | null;
  quick?: boolean;
  active?: boolean;
  weekGoalMinutes?: number | null;
}

export class ColorClashError extends Error {
  constructor(public clashWith: string) {
    super(`Deze kleur lijkt te veel op die van ${clashWith}.`);
  }
}

async function assertUniqueColor(color: string, exceptId?: string): Promise<void> {
  if (!isHex(color)) throw new Error('Kies een geldige kleur.');
  const others = (await db.projects.toArray()).filter((p) => p.id !== exceptId);
  const clash = closestClash(color, others.map((p) => p.color));
  if (clash) {
    const owner = others.find((p) => p.color === clash);
    throw new ColorClashError(owner?.name ?? clash);
  }
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const name = input.name.trim();
  if (!name) throw new Error('Geef het project een naam.');
  await assertUniqueColor(input.color);
  const last = await db.projects.orderBy('order').last();
  const project: Project = {
    id: uid(),
    name,
    label: input.label,
    color: input.color.toUpperCase(),
    monogram: (input.monogram?.trim() || monogramFrom(name)).slice(0, 3).toUpperCase(),
    logo: input.logo ?? null,
    logoStyle: logoStyleOf({ logoStyle: input.logoStyle }),
    holding: input.holding?.trim() || null,
    active: input.active ?? true,
    quick: input.quick ?? input.label !== 'Project',
    order: (last?.order ?? -1) + 1,
    weekGoalMinutes: input.weekGoalMinutes ?? null,
    createdAt: Date.now(),
  };
  await db.projects.add(project);
  return project;
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error('Geef het project een naam.');
  await assertUniqueColor(input.color, id);
  await db.projects.update(id, {
    name,
    label: input.label,
    color: input.color.toUpperCase(),
    monogram: (input.monogram?.trim() || monogramFrom(name)).slice(0, 3).toUpperCase(),
    logo: input.logo ?? null,
    logoStyle: logoStyleOf({ logoStyle: input.logoStyle }),
    holding: input.holding?.trim() || null,
    quick: input.quick ?? true,
    active: input.active ?? true,
    weekGoalMinutes: input.weekGoalMinutes ?? null,
  });
}

/** Verwijdert het project met zijn taken, uren en locaties. */
export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', [db.projects, db.entries, db.tasks, db.sites], async () => {
    await db.entries.where('projectId').equals(id).delete();
    await db.tasks.where('projectId').equals(id).delete();
    await db.sites.where('projectId').equals(id).delete();
    await db.projects.delete(id);
  });
}

/** Een plek omhoog (-1) of omlaag (+1) in de volgorde. */
export async function moveProject(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.projects, async () => {
    const all = await db.projects.orderBy('order').toArray();
    const i = all.findIndex((p) => p.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    await Promise.all(all.map((p, order) => db.projects.update(p.id, { order })));
  });
}

// ---------- Timer en uren ----------

export async function getRunning(): Promise<TimeEntry | undefined> {
  return db.entries.filter((e) => e.end === null).first();
}

function endFor(e: TimeEntry, now: number): number {
  if (e.mode === 'countdown' && e.plannedMinutes) return Math.min(now, e.start + e.plannedMinutes * MINUTE);
  return now;
}

/** Stopt wat er loopt. Er loopt altijd hooguit één timer. */
export async function stopRunning(now = Date.now()): Promise<TimeEntry[]> {
  return db.transaction('rw', db.entries, async () => {
    const running = await db.entries.filter((e) => e.end === null).toArray();
    for (const e of running) await db.entries.update(e.id, { end: Math.max(e.start, endFor(e, now)) });
    return running;
  });
}

export async function startTimer(projectId: string, mode: TimerMode = 'stopwatch', plannedMinutes: number | null = null, now = Date.now()): Promise<TimeEntry> {
  if (mode === 'countdown' && (!plannedMinutes || plannedMinutes <= 0)) throw new Error('Geef de afteller een duur.');
  return db.transaction('rw', db.entries, async () => {
    await stopRunning(now);
    const entry: TimeEntry = {
      id: uid(),
      projectId,
      start: now,
      end: null,
      mode,
      plannedMinutes: mode === 'countdown' ? plannedMinutes : null,
      note: '',
    };
    await db.entries.add(entry);
    return entry;
  });
}

/**
 * Sluit aftellers af waarvan de tijd om is, ook als de app dicht was.
 * Geeft de afgesloten blokken terug, zodat de app er een melding van kan geven.
 */
export async function settleCountdowns(now = Date.now()): Promise<TimeEntry[]> {
  return db.transaction('rw', db.entries, async () => {
    const due = await db.entries
      .filter((e) => e.end === null && e.mode === 'countdown' && !!e.plannedMinutes && e.start + e.plannedMinutes * MINUTE <= now)
      .toArray();
    for (const e of due) await db.entries.update(e.id, { end: e.start + (e.plannedMinutes ?? 0) * MINUTE });
    return due;
  });
}

export async function addManualEntry(projectId: string, start: number, end: number, note = ''): Promise<TimeEntry> {
  if (!(end > start)) throw new Error('De eindtijd moet na de begintijd liggen.');
  const entry: TimeEntry = { id: uid(), projectId, start, end, mode: 'stopwatch', plannedMinutes: null, note: note.trim() };
  await db.entries.add(entry);
  return entry;
}

export async function updateEntry(id: string, patch: Partial<Pick<TimeEntry, 'projectId' | 'start' | 'end' | 'note'>>): Promise<void> {
  const current = await db.entries.get(id);
  if (!current) return;
  const next = { ...current, ...patch };
  if (next.end !== null && !(next.end > next.start)) throw new Error('De eindtijd moet na de begintijd liggen.');
  await db.entries.update(id, patch);
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
}

// ---------- Taken ----------

export async function addTask(title: string, projectId: string | null, due: string | null): Promise<Task> {
  const clean = title.trim();
  if (!clean) throw new Error('Typ eerst een taak.');
  const task: Task = { id: uid(), projectId, title: clean, due, done: false, doneAt: null, createdAt: Date.now() };
  await db.tasks.add(task);
  return task;
}

export async function toggleTask(id: string): Promise<void> {
  const t = await db.tasks.get(id);
  if (!t) return;
  await db.tasks.update(id, { done: !t.done, doneAt: t.done ? null : Date.now() });
}

export async function updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'projectId' | 'due'>>): Promise<void> {
  await db.tasks.update(id, patch);
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

// ---------- Locaties (Footprint) ----------

export interface SiteInput {
  projectId: string;
  name: string;
  kind: SiteKind;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  lat: number | null;
  lon: number | null;
}

function cleanSite(input: SiteInput): Omit<Site, 'id' | 'createdAt'> {
  if (!input.projectId) throw new Error('Kies het bedrijf waar deze locatie bij hoort.');
  const name = input.name.trim();
  if (!name) throw new Error('Geef de locatie een naam.');
  if (!SITE_KINDS.includes(input.kind)) throw new Error('Kies een soort locatie.');
  const { lat, lon } = input;
  if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error('Zet de locatie op de kaart: zoek het adres of klik op de kaart.');
  }
  return {
    projectId: input.projectId,
    name,
    kind: input.kind,
    description: (input.description ?? '').trim(),
    address: (input.address ?? '').trim(),
    city: (input.city ?? '').trim(),
    country: (input.country ?? '').trim(),
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
  };
}

export async function createSite(input: SiteInput): Promise<Site> {
  const site: Site = { id: uid(), createdAt: Date.now(), ...cleanSite(input) };
  await db.sites.add(site);
  return site;
}

export async function updateSite(id: string, input: SiteInput): Promise<void> {
  await db.sites.update(id, cleanSite(input));
}

export async function deleteSite(id: string): Promise<void> {
  await db.sites.delete(id);
}

// ---------- Instellingen ----------

export type Theme = 'donker' | 'licht' | 'systeem';

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key);
  return (s?.value as T | undefined) ?? fallback;
}
