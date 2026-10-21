import { describe, expect, it } from 'vitest';
import { addDays, dayKey, dueLabel, formatClock, formatHM, isoWeek, overlap, startOfWeek, totalInRange, weekDays, HOUR, MINUTE } from './time';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('weken', () => {
  it('begint op maandag', () => {
    expect(dayKey(startOfWeek(at(2026, 10, 21, 15)))).toBe('2026-10-19'); // woensdag → maandag
    expect(dayKey(startOfWeek(at(2026, 10, 25, 23)))).toBe('2026-10-19'); // zondag hoort bij dezelfde week
    expect(dayKey(startOfWeek(at(2026, 10, 26, 0, 1)))).toBe('2026-10-26');
  });

  it('heeft zeven dagen, ook als de wintertijd ingaat', () => {
    const days = weekDays(startOfWeek(at(2026, 10, 25))); // 25 okt 2026: klok gaat een uur terug
    expect(days.map(dayKey)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
    expect(dayKey(addDays(days[6], 1))).toBe('2026-10-26');
  });

  it('kent het ISO-weeknummer', () => {
    expect(isoWeek(at(2026, 10, 21))).toBe(43);
    expect(isoWeek(at(2027, 1, 1))).toBe(53);
  });
});

describe('uren optellen', () => {
  it('telt alleen het deel binnen de periode', () => {
    const from = at(2026, 10, 21);
    const to = addDays(from, 1);
    const block = { start: at(2026, 10, 20, 23), end: at(2026, 10, 21, 1) }; // over middernacht
    expect(overlap(block, from, to, 0)).toBe(1 * HOUR);
  });

  it('laat een lopend blok tot nu meetellen', () => {
    const now = at(2026, 10, 21, 10, 30);
    const spans = [
      { start: at(2026, 10, 21, 9), end: at(2026, 10, 21, 9, 45) },
      { start: at(2026, 10, 21, 10), end: null },
    ];
    expect(totalInRange(spans, at(2026, 10, 21), at(2026, 10, 22), now)).toBe(75 * MINUTE);
  });
});

describe('weergave', () => {
  it('schrijft tijden kort en als klok', () => {
    expect(formatHM(125 * MINUTE + 59_000)).toBe('2:05');
    expect(formatClock(HOUR + 23 * MINUTE + 45_000)).toBe('01:23:45');
  });

  it('beschrijft vervaldatums', () => {
    const today = at(2026, 10, 21, 9);
    expect(dueLabel('2026-10-21', today)).toEqual({ text: 'vandaag', tone: 'today' });
    expect(dueLabel('2026-10-19', today)).toEqual({ text: '2 dagen te laat', tone: 'late' });
    expect(dueLabel('2026-10-22', today).text).toBe('morgen');
  });
});
