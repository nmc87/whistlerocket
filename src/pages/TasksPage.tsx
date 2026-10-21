import { useState } from 'react';
import type { Task } from '../db/db';
import { useProjects, useTasks } from '../lib/hooks';
import { addDays, dayKey, startOfDay } from '../lib/time';
import { AddTask, TaskRow, sortOpen } from '../components/Tasks';
import { Icon } from '../components/Icon';

export function TasksPage() {
  const projects = useProjects(true);
  const activeProjects = projects.filter((p) => p.active);
  const tasks = useTasks();
  const [projectFilter, setProjectFilter] = useState('');
  const [showDone, setShowDone] = useState(false);

  const now = Date.now();
  const today = dayKey(now);
  const tomorrow = dayKey(addDays(startOfDay(now), 1));
  const weekLimit = dayKey(addDays(startOfDay(now), 7));
  const filtered = tasks.filter((t) => !projectFilter || (projectFilter === 'geen' ? t.projectId === null : t.projectId === projectFilter));
  const open = sortOpen(filtered);

  const groups: { title: string; items: Task[] }[] = [
    { title: 'Te laat', items: open.filter((t) => t.due !== null && t.due < today) },
    { title: 'Vandaag', items: open.filter((t) => t.due === today) },
    { title: 'Komende 7 dagen', items: open.filter((t) => t.due !== null && t.due >= tomorrow && t.due < weekLimit) },
    { title: 'Later', items: open.filter((t) => t.due !== null && t.due >= weekLimit) },
    { title: 'Zonder datum', items: open.filter((t) => t.due === null) },
  ].filter((g) => g.items.length > 0);
  const done = filtered.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  return (
    <div className="page">
      <header className="row wrap" style={{ justifyContent: 'space-between' }}>
        <h1 className="title">Taken</h1>
        <label className="row">
          <span className="muted">Project</span>
          <select className="input" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">Alle projecten</option>
            <option value="geen">Zonder project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </header>

      <section className="card" aria-label="Taak toevoegen">
        <AddTask projects={activeProjects} />
      </section>

      {groups.length === 0 && <p className="empty-state">Geen open taken. Lekker bezig.</p>}

      {groups.map((g) => (
        <section key={g.title} className="card" aria-labelledby={`g-${g.title}`}>
          <div className="card-head">
            <h2 id={`g-${g.title}`} className="card-title" style={g.title === 'Te laat' ? { color: 'var(--bad-ink)' } : undefined}>{g.title}</h2>
            <span className="card-sub">{g.items.length}</span>
          </div>
          <ul className="list">
            {g.items.map((t) => <TaskRow key={t.id} task={t} projects={projects} />)}
          </ul>
        </section>
      ))}

      {done.length > 0 && (
        <section className="card" aria-labelledby="done-h">
          <button type="button" className="btn small ghost" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} id="done-h">
            <Icon name={showDone ? 'up' : 'down'} size={14} /> Afgerond ({done.length})
          </button>
          {showDone && (
            <ul className="list" style={{ marginTop: 8 }}>
              {done.slice(0, 50).map((t) => <TaskRow key={t.id} task={t} projects={projects} />)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
