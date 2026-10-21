import { useState } from 'react';
import type { Project, Task } from '../db/db';
import { addTask, deleteTask, toggleTask, updateTask } from '../db/actions';
import { dayKey, dueLabel } from '../lib/time';
import { useConfirm } from '../lib/hooks';
import { ProjectTag } from './ProjectAvatar';
import { Icon } from './Icon';

export function TaskRow({ task, projects, showProject = true }: { task: Task; projects: Project[]; showProject?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due ?? '');
  const [projectId, setProjectId] = useState(task.projectId ?? '');
  const [armed, confirmDelete] = useConfirm();
  const project = projects.find((p) => p.id === task.projectId);
  const d = task.due ? dueLabel(task.due, Date.now()) : null;

  if (editing) {
    return (
      <li className="task" style={{ flexWrap: 'wrap' }}>
        <form
          className="row wrap"
          style={{ flex: '1 1 auto' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            void updateTask(task.id, { title: title.trim(), due: due || null, projectId: projectId || null }).then(() => setEditing(false));
          }}
        >
          <input className="input" aria-label="Taak" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: '1 1 220px' }} autoFocus />
          <select className="input" aria-label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ flex: '0 1 180px' }}>
            <option value="">Geen project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input" type="date" aria-label="Datum" value={due} onChange={(e) => setDue(e.target.value)} style={{ flex: '0 1 160px' }} />
          <button type="submit" className="btn small accent">Opslaan</button>
          <button type="button" className="btn small" onClick={() => setEditing(false)}>Annuleren</button>
        </form>
      </li>
    );
  }

  return (
    <li className={`task${task.done ? ' done' : ''}`}>
      <input type="checkbox" className="check" checked={task.done} onChange={() => void toggleTask(task.id)} aria-label={task.done ? `${task.title} weer openzetten` : `${task.title} afvinken`} />
      <span className="title">
        <span>{task.title}</span>
        {((showProject && project) || (d && !task.done)) && (
          <span className="meta">
            {showProject && project && <ProjectTag project={project} />}
            {d && !task.done && <span className={`due ${d.tone}`}>{d.text}</span>}
          </span>
        )}
      </span>
      <button type="button" className="icon-btn" aria-label={`${task.title} bewerken`} onClick={() => setEditing(true)}>
        <Icon name="edit" size={16} />
      </button>
      <button type="button" className="icon-btn" aria-label={armed ? 'Klik nog eens om te verwijderen' : `${task.title} verwijderen`} onClick={() => confirmDelete(() => void deleteTask(task.id))} style={armed ? { color: 'var(--bad-ink)', background: 'var(--bad-bg)' } : undefined}>
        <Icon name="trash" size={16} />
      </button>
    </li>
  );
}

export function AddTask({ projects, fixedProjectId, defaultDue = '', placeholder = 'Nieuwe taak…', compact = false }: { projects: Project[]; fixedProjectId?: string; defaultDue?: string; placeholder?: string; compact?: boolean }) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(fixedProjectId ?? '');
  const [due, setDue] = useState(defaultDue);
  const [error, setError] = useState('');

  return (
    <form
      className="row wrap"
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        addTask(title, (fixedProjectId ?? projectId) || null, due || null)
          .then(() => {
            setTitle('');
            setDue(defaultDue);
          })
          .catch((err: Error) => setError(err.message));
      }}
    >
      <input className="input" aria-label="Nieuwe taak" placeholder={placeholder} value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: '1 1 220px' }} />
      {!fixedProjectId && !compact && (
        <select className="input" aria-label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ flex: '0 1 180px' }}>
          <option value="">Geen project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {!compact && <input className="input" type="date" aria-label="Datum" value={due} onChange={(e) => setDue(e.target.value)} style={{ flex: '0 1 160px' }} />}
      <button type="submit" className="btn accent" disabled={!title.trim()}>
        <Icon name="plus" size={16} /> Toevoegen
      </button>
      {error && <span className="error" role="alert">{error}</span>}
    </form>
  );
}

/** Open taken eerst op datum (zonder datum achteraan), dan op volgorde van toevoegen. */
export function sortOpen(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt);
}

export const todayKey = () => dayKey(Date.now());
