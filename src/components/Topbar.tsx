import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { ProjectAvatar, ProjectTag } from './ProjectAvatar';
import { timerReading } from './Timer';
import { stopRunning } from '../db/actions';
import { useNow, useProjects, useRunning, useTasks } from '../lib/hooks';
import { formatClock } from '../lib/time';

type Hit = { kind: 'project'; id: string; label: string } | { kind: 'task'; id: string; label: string; projectId: string | null };

function SearchBox() {
  const projects = useProjects();
  const tasks = useTasks();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);

  // Ctrl+K (of Cmd+K) springt naar het zoekveld, zoals in de ontwerpen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const ps: Hit[] = projects
      .filter((p) => `${p.name} ${p.holding ?? ''} ${p.label}`.toLowerCase().includes(term))
      .slice(0, 6)
      .map((p) => ({ kind: 'project', id: p.id, label: p.name }));
    const ts: Hit[] = tasks
      .filter((t) => !t.done && t.title.toLowerCase().includes(term))
      .slice(0, 8)
      .map((t) => ({ kind: 'task', id: t.id, label: t.title, projectId: t.projectId }));
    return [...ps, ...ts];
  }, [q, projects, tasks]);

  function go(h: Hit) {
    setOpen(false);
    setQ('');
    if (h.kind === 'project') navigate(`/project/${h.id}`);
    else navigate(h.projectId ? `/project/${h.projectId}` : '/taken');
  }

  return (
    <div className="search" role="search">
      <span className="icon"><Icon name="search" size={18} /></span>
      <label htmlFor="global-search" className="sr-only">Zoeken in je projecten en taken</label>
      <input
        id="global-search"
        ref={inputRef}
        value={q}
        placeholder="Zoek in je projecten en taken…"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && q.trim().length > 0}
        aria-controls="search-results"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHl(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHl((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHl((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && hits[hl]) {
            go(hits[hl]);
          } else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
      />
      <kbd aria-hidden="true">Ctrl K</kbd>
      {open && q.trim() && (
        <div className="search-results" id="search-results" role="listbox">
          {hits.length === 0 && <div className="empty">Niets gevonden voor "{q.trim()}".</div>}
          {hits.some((h) => h.kind === 'project') && <div className="group">Projecten</div>}
          {hits.map((h, i) =>
            h.kind === 'project' ? (
              <button key={h.id} type="button" role="option" aria-selected={i === hl} className={i === hl ? 'hl' : ''} onMouseDown={() => go(h)}>
                {(() => {
                  const p = projects.find((x) => x.id === h.id);
                  return p ? <ProjectAvatar project={p} size={24} /> : null;
                })()}
                <span>{h.label}</span>
              </button>
            ) : null,
          )}
          {hits.some((h) => h.kind === 'task') && <div className="group">Taken</div>}
          {hits.map((h, i) =>
            h.kind === 'task' ? (
              <button key={h.id} type="button" role="option" aria-selected={i === hl} className={i === hl ? 'hl' : ''} onMouseDown={() => go(h)}>
                <Icon name="check" size={16} />
                <span style={{ flex: '1 1 auto' }}>{h.label}</span>
                <ProjectTag project={projects.find((p) => p.id === h.projectId)} />
              </button>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

function TimerPill() {
  const running = useRunning();
  const projects = useProjects(true);
  const now = useNow(1000, !!running);
  const navigate = useNavigate();
  if (!running) {
    return (
      <button type="button" className="btn" onClick={() => navigate('/uren')}>
        <Icon name="timer" size={16} /> Timer starten
      </button>
    );
  }
  const p = projects.find((x) => x.id === running.projectId);
  const r = timerReading(running, now);
  return (
    <div className="timer-pill" aria-label="Lopende timer">
      <span className="pulse" aria-hidden="true" />
      <span className="who">{p?.name ?? 'Timer'}</span>
      <span className="clock">{formatClock(r.ms)}</span>
      <button type="button" className="icon-btn round" aria-label="Timer stoppen" onClick={() => void stopRunning()} style={{ background: 'var(--text)', color: 'var(--bg)' }}>
        <Icon name="stop" size={12} />
      </button>
    </div>
  );
}

export function Topbar() {
  return (
    <header className="topbar">
      <SearchBox />
      <div style={{ flex: '1 1 auto' }} />
      <TimerPill />
    </header>
  );
}
