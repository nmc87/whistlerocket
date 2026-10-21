/**
 * Rekenen met tijd. Alles in lokale tijd; dagen en weken via Date-kalender,
 * zodat zomer- en wintertijd goed gaan (een dag is niet altijd 24 uur).
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime();
}

/** Maandag 00:00 van de week waarin ts valt. */
export function startOfWeek(ts: number): number {
  const day = startOfDay(ts);
  const dow = (new Date(day).getDay() + 6) % 7; // maandag = 0
  return addDays(day, -dow);
}

/** De zeven dagstarts van een week (ma t/m zo). */
export function weekDays(weekStart: number): number[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** 'YYYY-MM-DD' in lokale tijd. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Lokale middernacht van een 'YYYY-MM-DD'. */
export function parseDayKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export interface Span {
  start: number;
  end: number | null;
}

/** Duur van een tijdsblok; een lopend blok telt tot nu. */
export function spanDuration(s: Span, now: number): number {
  return Math.max(0, (s.end ?? now) - s.start);
}

/** Hoeveel van een tijdsblok binnen [from, to) valt. */
export function overlap(s: Span, from: number, to: number, now: number): number {
  const a = Math.max(s.start, from);
  const b = Math.min(s.end ?? now, to);
  return Math.max(0, b - a);
}

/** Totale tijd van alle blokken binnen [from, to). */
export function totalInRange(spans: Span[], from: number, to: number, now: number): number {
  return spans.reduce((sum, s) => sum + overlap(s, from, to, now), 0);
}

/** '2:05' (uren:minuten), afgerond naar beneden op hele minuten. */
export function formatHM(ms: number): string {
  const totalMin = Math.floor(ms / MINUTE);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** '01:23:45' voor een lopende klok. */
export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':');
}

/** '2 u 5 m', '45 m' of '0 m' — leesbaar in zinnen. */
export function formatLong(ms: number): string {
  const totalMin = Math.floor(ms / MINUTE);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} u` : `${h} u ${m} m`;
}

/** 'HH:MM' van een tijdstip. */
export function formatTimeOfDay(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const DAYS_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function dayShort(ts: number): string {
  return DAYS_SHORT[(new Date(ts).getDay() + 6) % 7];
}

/** 'woensdag 21 oktober' */
export function formatLongDate(ts: number): string {
  const d = new Date(ts);
  return `${DAYS_LONG[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** '21 okt' */
export function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** ISO-weeknummer. */
export function isoWeek(ts: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // donderdag van deze week
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * HOUR));
}

/** Begroeting op basis van het uur. */
export function greeting(ts: number): string {
  const h = new Date(ts).getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

/** Relatieve omschrijving van een vervaldatum t.o.v. vandaag. */
export function dueLabel(due: string, today: number): { text: string; tone: 'late' | 'today' | 'soon' | 'later' } {
  const diff = Math.round((parseDayKey(due) - startOfDay(today)) / (24 * HOUR));
  if (diff < 0) return { text: diff === -1 ? 'gisteren' : `${-diff} dagen te laat`, tone: 'late' };
  if (diff === 0) return { text: 'vandaag', tone: 'today' };
  if (diff === 1) return { text: 'morgen', tone: 'soon' };
  if (diff < 7) return { text: DAYS_LONG[(new Date(parseDayKey(due)).getDay() + 6) % 7], tone: 'soon' };
  return { text: formatShortDate(parseDayKey(due)), tone: 'later' };
}
