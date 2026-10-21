import type { Project, TimeEntry } from '../db/db';
import { addDays, dayKey, dayShort, formatHM, overlap, weekDays } from '../lib/time';

/** Staafjes per dag van de week, opgebouwd uit projectkleuren. */
export function WeekBars({ weekStart, entries, projects, now, height = 120 }: { weekStart: number; entries: TimeEntry[]; projects: Project[]; now: number; height?: number }) {
  const days = weekDays(weekStart);
  const perDay = days.map((d) => {
    const next = addDays(d, 1);
    const parts = projects
      .map((p) => ({ p, ms: entries.filter((e) => e.projectId === p.id).reduce((s, e) => s + overlap(e, d, next, now), 0) }))
      .filter((x) => x.ms > 0);
    return { d, parts, total: parts.reduce((s, x) => s + x.ms, 0) };
  });
  const max = Math.max(4 * 3_600_000, ...perDay.map((x) => x.total));
  const today = dayKey(now);

  return (
    <div className="week-bars" style={{ height }} role="img" aria-label={`Uren per dag: ${perDay.map((x) => `${dayShort(x.d)} ${formatHM(x.total)}`).join(', ')}`}>
      {perDay.map(({ d, parts, total }) => (
        <div className="col" key={d}>
          <span className="quiet num" style={{ fontSize: 11 }}>{total >= 60_000 ? formatHM(total) : ''}</span>
          <div className="stack" style={{ height: `${Math.max(3, (total / max) * (height - 40))}px` }}>
            {parts.map(({ p, ms }) => (
              <span key={p.id} style={{ height: `${(ms / total) * 100}%`, background: p.color }} />
            ))}
          </div>
          <span className={`day${dayKey(d) === today ? ' today' : ''}`}>{dayShort(d)}</span>
        </div>
      ))}
    </div>
  );
}
