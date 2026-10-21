import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project, type Task, type TimeEntry } from '../db/db';
import { HOUR } from './time';

const EMPTY: never[] = [];

/** Projecten in de ingestelde volgorde; standaard zonder het archief. */
export function useProjects(includeArchived = false): Project[] {
  return (
    useLiveQuery(async () => {
      const all = await db.projects.orderBy('order').toArray();
      return includeArchived ? all : all.filter((p) => p.active);
    }, [includeArchived]) ?? EMPTY
  );
}

export function useProject(id: string | undefined): Project | undefined | null {
  // undefined = nog aan het laden, null = bestaat niet
  return useLiveQuery(async () => (id ? (await db.projects.get(id)) ?? null : null), [id]);
}

export function useRunning(): TimeEntry | undefined {
  return useLiveQuery(() => db.entries.filter((e) => e.end === null).first(), []);
}

/** Uren die (ook gedeeltelijk) na `from` vallen. Blokken langer dan een week zijn uitzonderlijk. */
export function useEntriesFrom(from: number): TimeEntry[] {
  return useLiveQuery(() => db.entries.where('start').aboveOrEqual(from - 7 * 24 * HOUR).toArray(), [from]) ?? EMPTY;
}

export function useTasks(): Task[] {
  return useLiveQuery(() => db.tasks.orderBy('createdAt').toArray(), []) ?? EMPTY;
}

export function useSetting<T>(key: string, fallback: T): T {
  const s = useLiveQuery(() => db.settings.get(key), [key]);
  return (s?.value as T | undefined) ?? fallback;
}

/** Huidige tijd, elke `interval` ms opnieuw (alleen als `enabled`). */
export function useNow(interval = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval, enabled]);
  return now;
}

/** Klikt eerst "zeker weten?", pas de tweede klik voert het uit. */
export function useConfirm(timeout = 4000): [boolean, (action: () => void) => void] {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), timeout);
    return () => clearTimeout(t);
  }, [armed, timeout]);
  return [
    armed,
    (action) => {
      if (armed) {
        setArmed(false);
        action();
      } else setArmed(true);
    },
  ];
}
