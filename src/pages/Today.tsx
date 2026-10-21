import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Label, Project } from '../db/db';
import { useEntriesFrom, useNow, useProjects, useRunning, useSetting, useTasks } from '../lib/hooks';
import { addDays, formatLong, formatLongDate, greeting, isoWeek, overlap, startOfWeek, totalInRange } from '../lib/time';
import { ProjectAvatar } from '../components/ProjectAvatar';
import { PlayButton, TimerPanel } from '../components/Timer';
import { AddTask, TaskRow, sortOpen, todayKey } from '../components/Tasks';
import { WeekBars } from '../components/WeekBars';
import { useOpenProjectForm } from '../components/ProjectForm';
import { Icon } from '../components/Icon';

type Filter = 'Alles' | Label;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'Alles', label: 'Alles' },
  { key: 'Bedrijf', label: 'Bedrijven' },
  { key: 'Startup', label: 'Startups' },
  { key: 'Project', label: 'Projecten' },
];

export function Today() {
  const projects = useProjects();
  const tasks = useTasks();
  const running = useRunning();
  const now = useNow(running ? 1000 : 30_000);
  const name = useSetting<string>('userName', '');
  const weekStart = startOfWeek(now);
  const entries = useEntriesFrom(weekStart);
  const openForm = useOpenProjectForm();
  const [filter, setFilter] = useState<Filter>('Alles');
  const [byHolding, setByHolding] = useState(false);

  const today = todayKey();
  const openByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (!t.done && t.projectId) m.set(t.projectId, (m.get(t.projectId) ?? 0) + 1);
    return m;
  }, [tasks]);
  const dueToday = sortOpen(tasks).filter((t) => t.due !== null && t.due <= today);
  const weekEnd = addDays(weekStart, 7);
  const weekTotal = totalInRange(entries, weekStart, weekEnd, now);
  const goal = projects.reduce((s, p) => s + (p.weekGoalMinutes ?? 0), 0) * 60_000;
  const quick = projects.filter((p) => p.quick);
  const shown = projects.filter((p) => filter === 'Alles' || p.label === filter);
  const holdings = [...new Set(projects.map((p) => p.holding).filter((h): h is string => !!h))];
  const projectWeek = (p: Project) => entries.filter((e) => e.projectId === p.id).reduce((s, e) => s + overlap(e, weekStart, weekEnd, now), 0);

  const groups: { title: string | null; items: Project[] }[] = byHolding && holdings.length
    ? [...holdings.map((h) => ({ title: h, items: shown.filter((p) => p.holding === h) })), { title: 'Zonder holding', items: shown.filter((p) => !p.holding) }].filter((g) => g.items.length)
    : [{ title: null, items: shown }];

  return (
    <div className="page">
      <header>
        <div className="quiet" style={{ fontSize: 14, marginBottom: 6 }}>{capitalize(formatLongDate(now))} · week {isoWeek(now)}</div>
        <h1 className="title">{greeting(now)}{name ? `, ${name}` : ''}. Klaar voor lancering?</h1>
      </header>

      {quick.length > 0 && (
        <section aria-labelledby="snel-h">
          <h2 id="snel-h" className="quiet" style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Snel naar</h2>
          <div className="quick-strip">
            {quick.map((p) => {
              const open = openByProject.get(p.id) ?? 0;
              return (
                <Link key={p.id} to={`/project/${p.id}`} className="quick-tile" aria-label={`${p.name}${open ? `, ${open} open taken` : ''}`}>
                  <ProjectAvatar project={p} size={36} />
                  <span className="name">{p.name}</span>
                  <span className={`chip ${p.label}`} style={{ height: 20, fontSize: 11 }}>{p.label}</span>
                  {open > 0 && <span className="count" aria-hidden="true">{open}</span>}
                  <span className="bar" style={{ background: p.color }} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid-3">
        <section className="card" aria-labelledby="vandaag-h">
          <div className="card-head">
            <h2 id="vandaag-h" className="card-title">Vandaag</h2>
            <Link to="/taken" className="card-sub">Alle taken</Link>
          </div>
          {dueToday.length === 0 ? (
            <p className="empty-state" style={{ paddingTop: 0 }}>Niets gepland voor vandaag. Voeg hieronder iets toe.</p>
          ) : (
            <ul className="list">
              {dueToday.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} projects={projects} />)}
            </ul>
          )}
          {dueToday.length > 6 && <p className="quiet" style={{ margin: '8px 0 0', fontSize: 13 }}>en nog {dueToday.length - 6}…</p>}
          <div style={{ marginTop: 12 }}>
            <QuickAdd />
          </div>
        </section>

        <section className="card" aria-labelledby="week-h">
          <div className="card-head">
            <h2 id="week-h" className="card-title">Uren deze week</h2>
            <Link to="/uren" className="card-sub">Naar uren</Link>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 28, fontWeight: 600 }} className="num">{formatLong(weekTotal)}</span>
            {goal > 0 && <span className="quiet">van {formatLong(goal)}</span>}
          </div>
          {goal > 0 && (
            <div className="progress" style={{ marginBottom: 14 }} role="progressbar" aria-label="Weekdoel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, weekTotal / goal) * 100)}>
              <span style={{ width: `${Math.min(100, (weekTotal / goal) * 100)}%` }} />
            </div>
          )}
          <WeekBars weekStart={weekStart} entries={entries} projects={projects} now={now} height={110} />
        </section>

        <section className="card" aria-labelledby="focus-h">
          <div className="card-head">
            <h2 id="focus-h" className="card-title">Focus</h2>
          </div>
          <TimerPanel compact />
        </section>
      </div>

      <section aria-labelledby="proj-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <h2 id="proj-h" className="section">Projecten</h2>
          <div className="row wrap">
            <div className="seg" role="group" aria-label="Filter op soort">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label} <span className="quiet">{f.key === 'Alles' ? projects.length : projects.filter((p) => p.label === f.key).length}</span>
                </button>
              ))}
            </div>
            {holdings.length > 0 && (
              <label className="switch">
                <input type="checkbox" checked={byHolding} onChange={(e) => setByHolding(e.target.checked)} />
                <span className="track" />
                Per holding
              </label>
            )}
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.title ?? 'alles'} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.title && <h3 className="quiet" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{g.title}</h3>}
            <div className="tiles">
              {g.items.map((p) => {
                const open = openByProject.get(p.id) ?? 0;
                return (
                  <article key={p.id} className="tile">
                    <span className="edge" style={{ background: p.color }} />
                    <div className="top">
                      <ProjectAvatar project={p} size={40} />
                      <div style={{ minWidth: 0 }}>
                        <Link to={`/project/${p.id}`} className="name stretched" style={{ color: 'var(--text)', textDecoration: 'none', display: 'block' }}>{p.name}</Link>
                        <span className={`chip ${p.label}`} style={{ height: 20, fontSize: 11 }}>{p.label}</span>
                      </div>
                    </div>
                    <div className="stats">
                      <span>Deze week <strong className="num">{formatLong(projectWeek(p))}</strong></span>
                      <span>Open <strong className="num">{open}</strong></span>
                    </div>
                    <PlayButton project={p} />
                  </article>
                );
              })}
              {g.title === null || g.title === 'Zonder holding' ? (
                <button type="button" className="tile new" onClick={() => openForm()}>
                  <Icon name="plus" /> Nieuw project
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Snel een taak voor vandaag noteren. */
function QuickAdd() {
  const projects = useProjects();
  return <AddTask projects={projects} defaultDue={todayKey()} placeholder="Taak voor vandaag…" compact />;
}
