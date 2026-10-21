import Dexie, { type EntityTable } from 'dexie';

/**
 * Lokale opslag (IndexedDB). Werkt in het Windows-programma en in de browser.
 * Later komt er synchronisatie met de eigen cloud bij; de vorm van de gegevens
 * volgt daarom al het datamodel uit het productplan.
 */

export type Label = 'Project' | 'Startup' | 'Bedrijf';
export const LABELS: Label[] = ['Bedrijf', 'Startup', 'Project'];

export interface Project {
  id: string;
  name: string;
  label: Label;
  /** Herkenningskleur, uniek binnen de werkruimte. */
  color: string;
  monogram: string;
  /** Logo als data-URL (png of svg), of null voor een monogram. */
  logo: string | null;
  holding: string | null;
  /** false = gearchiveerd: verdwijnt van het startscherm, uren blijven bewaard. */
  active: boolean;
  /** Staat in de snelkiezer bovenaan het startscherm. */
  quick: boolean;
  order: number;
  weekGoalMinutes: number | null;
  createdAt: number;
}

export type TimerMode = 'stopwatch' | 'countdown';

export interface TimeEntry {
  id: string;
  projectId: string;
  start: number;
  /** null = loopt nog. */
  end: number | null;
  mode: TimerMode;
  /** Alleen bij de afteller: geplande duur. */
  plannedMinutes: number | null;
  note: string;
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  /** 'YYYY-MM-DD' of null. */
  due: string | null;
  done: boolean;
  doneAt: number | null;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export class WhistleRocketDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  entries!: EntityTable<TimeEntry, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'whistlerocket') {
    super(name);
    this.version(1).stores({
      projects: 'id, order',
      entries: 'id, projectId, start',
      tasks: 'id, projectId, due, createdAt',
      settings: 'key',
    });
  }
}

export const db = new WhistleRocketDB();
