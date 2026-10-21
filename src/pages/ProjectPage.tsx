import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useEntriesFrom, useNow, useProject, useProjects, useRunning, useTasks } from '../lib/hooks';
import { addDays, formatLong, startOfWeek, totalInRange } from '../lib/time';
import { ProjectAvatar } from '../components/ProjectAvatar';
import { TimerPanel } from '../components/Timer';
import { AddTask, TaskRow, sortOpen } from '../components/Tasks';
import { WeekBars } from '../components/WeekBars';
import { EntryRow } from './Hours';
import { useOpenProjectForm } from '../components/ProjectForm';
import { Icon } from '../components/Icon';

export function ProjectPage() {
  const { id } = useParams();
  const project = useProject(id);
  const projects = useProjects(true);
  const tasks = useTasks();
  const running = useRunning();
  const now = useNow(running?.projectId === id ? 1000 : 30_000);
  const weekStart = startOfWeek(now);
  const entries = useEntriesFrom(addDays(weekStart, -28));
  const openForm = useOpenProjectForm();
  const [showDone, setShowDone] = useState(false);
  const sites = useLiveQuery(() => (id ? db.sites.where('projectId').equals(id).toArray() : []), [id]) ?? [];

  if (project === undefined) return <div className="page" />;
  if (project === null) {
    return (
      <div className="page">
        <h1 className="title">Project niet gevonden</h1>
        <p><Link to="/">Terug naar Vandaag</Link></p>
      </div>
    );
  }

  const mine = tasks.filter((t) => t.projectId === project.id);
  const open = sortOpen(mine);
  const done = mine.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const myEntries = entries.filter((e) => e.projectId === project.id);
  const weekTotal = totalInRange(myEntries, weekStart, addDays(weekStart, 7), now);
  const goal = (project.weekGoalMinutes ?? 0) * 60_000;
  const recent = [...myEntries].sort((a, b) => b.start - a.start).slice(0, 12);

  return (
    <div className="page">
      <header className="row wrap" style={{ justifyContent: 'space-between', gap: 16 }}>
        <div className="row" style={{ gap: 14 }}>
          <ProjectAvatar project={project} size={56} />
          <div>
            <h1 className="title">{project.name}</h1>
            <div className="row wrap" style={{ marginTop: 6 }}>
              <span className={`chip ${project.label}`}>{project.label}</span>
              {project.holding && <span className="chip">{project.holding}</span>}
              {!project.active && <span className="chip">Gearchiveerd</span>}
            </div>
          </div>
        </div>
        <button type="button" className="btn" onClick={() => openForm(project.id)}>
          <Icon name="edit" size={16} /> Bewerken
        </button>
      </header>

      <div className="cols">
        <section className="card" aria-labelledby="pt-h">
          <div className="card-head">
            <h2 id="pt-h" className="card-title">Taken</h2>
            <span className="card-sub">{open.length} open</span>
          </div>
          <AddTask projects={projects} fixedProjectId={project.id} />
          {open.length === 0 ? (
            <p className="empty-state">Geen open taken voor {project.name}.</p>
          ) : (
            <ul className="list" style={{ marginTop: 8 }}>
              {open.map((t) => <TaskRow key={t.id} task={t} projects={projects} showProject={false} />)}
            </ul>
          )}
          {done.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn small ghost" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
                <Icon name={showDone ? 'up' : 'down'} size={14} /> Afgerond ({done.length})
              </button>
              {showDone && (
                <ul className="list">
                  {done.slice(0, 20).map((t) => <TaskRow key={t.id} task={t} projects={projects} showProject={false} />)}
                </ul>
              )}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card" aria-labelledby="ptimer-h">
            <div className="card-head">
              <h2 id="ptimer-h" className="card-title">Timer</h2>
            </div>
            <TimerPanel fixedProject={project} />
          </section>

          <section className="card" aria-labelledby="puren-h">
            <div className="card-head">
              <h2 id="puren-h" className="card-title">Uren deze week</h2>
              <span className="card-sub num">{formatLong(weekTotal)}{goal > 0 ? ` van ${formatLong(goal)}` : ''}</span>
            </div>
            {goal > 0 && (
              <div className="progress" style={{ marginBottom: 14 }} role="progressbar" aria-label="Weekdoel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, weekTotal / goal) * 100)}>
                <span style={{ width: `${Math.min(100, (weekTotal / goal) * 100)}%`, background: project.color }} />
              </div>
            )}
            <WeekBars weekStart={weekStart} entries={myEntries} projects={[project]} now={now} height={110} />
            <h3 className="quiet" style={{ margin: '16px 0 4px', fontSize: 13, fontWeight: 600 }}>Laatste blokken</h3>
            {recent.length === 0 ? (
              <p className="empty-state" style={{ paddingTop: 4 }}>Nog geen uren in de afgelopen weken.</p>
            ) : (
              <div>{recent.map((e) => <EntryRow key={e.id} entry={e} projects={projects} now={now} showProject={false} />)}</div>
            )}
          </section>

          <section className="card" aria-labelledby="plocs-h">
            <div className="card-head">
              <h2 id="plocs-h" className="card-title">Locaties</h2>
              <Link to={`/footprint?project=${project.id}`} className="card-sub">Op de kaart</Link>
            </div>
            {sites.length === 0 ? (
              <p className="empty-state" style={{ paddingTop: 0 }}>Nog geen kantoor, magazijn of andere locatie.</p>
            ) : (
              <ul className="list">
                {sites.map((s) => (
                  <li key={s.id} className="task">
                    <span className="title">
                      <span className="row wrap" style={{ gap: 6 }}><strong style={{ fontWeight: 600 }}>{s.name}</strong><span className="kind-chip">{s.kind}</span></span>
                      <span className="quiet" style={{ fontSize: 12 }}>{[s.city, s.country].filter(Boolean).join(', ')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/footprint?project=${project.id}&nieuw=1`} className="btn small" style={{ marginTop: 10 }}><Icon name="plus" size={14} /> Locatie toevoegen</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
