import Dexie, { type EntityTable } from 'dexie';

/**
 * Lokale opslag (IndexedDB). Werkt in het Windows-programma en in de browser.
 * Later komt er synchronisatie met de eigen cloud bij; de vorm van de gegevens
 * volgt daarom al het datamodel uit het productplan.
 */

export type Label = 'Project' | 'Startup' | 'Bedrijf';
export const LABELS: Label[] = ['Bedrijf', 'Startup', 'Project'];

/** Hoe een logo in zijn vakje staat. */
export type LogoFit = 'passend' | 'vullend';
export type LogoBg = 'geen' | 'wit' | 'donker' | 'kleur';
export interface LogoStyle {
  /** passend = hele logo zichtbaar; vullend = vakje helemaal gevuld, randen vallen weg. */
  fit: LogoFit;
  /** 1 = 100 %. */
  zoom: number;
  /** Verschuiving in procenten van het vakje (-100 tot 100). */
  x: number;
  y: number;
  /** Achtergrond achter het logo; 'kleur' = de projectkleur. */
  bg: LogoBg;
}
export const DEFAULT_LOGO_STYLE: LogoStyle = { fit: 'passend', zoom: 1, x: 0, y: 0, bg: 'geen' };

/** Altijd een complete, begrensde logostijl, ook voor oude gegevens zonder stijl. */
export function logoStyleOf(p: { logoStyle?: Partial<LogoStyle> | null }): LogoStyle {
  const s = { ...DEFAULT_LOGO_STYLE, ...(p.logoStyle ?? {}) };
  const clamp = (v: number, lo: number, hi: number, d: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  return {
    fit: s.fit === 'vullend' ? 'vullend' : 'passend',
    zoom: clamp(s.zoom, 0.5, 3, 1),
    x: clamp(s.x, -100, 100, 0),
    y: clamp(s.y, -100, 100, 0),
    bg: (['geen', 'wit', 'donker', 'kleur'] as const).includes(s.bg) ? s.bg : 'geen',
  };
}

export interface Project {
  id: string;
  name: string;
  label: Label;
  /** Herkenningskleur, uniek binnen de werkruimte. */
  color: string;
  monogram: string;
  /** Logo als data-URL (png of svg), of null voor een monogram. */
  logo: string | null;
  /** Hoe het logo in zijn vakje staat. Ontbreekt bij gegevens van vóór versie 0.1.1. */
  logoStyle?: LogoStyle;
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

/** Soorten locaties in Footprint. */
export const SITE_KINDS = [
  'Hoofdkantoor', 'Kantoor', 'Vestiging', 'Winkel', 'Showroom', 'Wasstraat',
  'Werkplaats', 'Fabriek', 'Magazijn', 'Distributiecentrum', 'Overig',
] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

/** Een fysieke plek van een bedrijf: kantoor, magazijn, fabriek, enzovoort. */
export interface Site {
  id: string;
  projectId: string;
  name: string;
  kind: SiteKind;
  /** Wat het voor locatie is, in eigen woorden. */
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
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
  sites!: EntityTable<Site, 'id'>;

  constructor(name = 'whistlerocket') {
    super(name);
    this.version(1).stores({
      projects: 'id, order',
      entries: 'id, projectId, start',
      tasks: 'id, projectId, due, createdAt',
      settings: 'key',
    });
    // 0.1.1: logo's krijgen een eigen weergave. Bestaande logo's waren vierkant
    // bijgesneden en vullend getoond; dat blijft zo, tot je het zelf aanpast.
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('projects')
          .toCollection()
          .modify((p: Project) => {
            if (!p.logoStyle) p.logoStyle = { ...DEFAULT_LOGO_STYLE, fit: 'vullend' };
          }),
      );
    // 0.2.0: Footprint, de kaart met alle locaties.
    this.version(3).stores({ sites: 'id, projectId' });
  }
}

export const db = new WhistleRocketDB();
