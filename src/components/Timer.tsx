import { useEffect, useRef, useState } from 'react';
import type { Project, TimeEntry, TimerMode } from '../db/db';
import { settleCountdowns, startTimer, stopRunning } from '../db/actions';
import { useNow, useProjects, useRunning } from '../lib/hooks';
import { formatClock, MINUTE } from '../lib/time';
import { notify, whistle } from '../lib/platform';
import { ProjectAvatar } from './ProjectAvatar';
import { Icon } from './Icon';

export const PRESETS = [15, 25, 50, 90];

/** Hoeveel tijd er verstreken is, of bij een afteller hoeveel er nog over is. */
export function timerReading(e: TimeEntry, now: number): { label: string; ms: number; progress: number | null } {
  const elapsed = Math.max(0, now - e.start);
  if (e.mode === 'countdown' && e.plannedMinutes) {
    const total = e.plannedMinutes * MINUTE;
    return { label: 'nog', ms: Math.max(0, total - elapsed), progress: Math.min(1, elapsed / total) };
  }
  return { label: 'bezig', ms: elapsed, progress: null };
}

/**
 * Houdt de lopende timer in de gaten: sluit aftellers af als de tijd om is
 * (met een fluittoon en een melding) en zet de klok in de venstertitel.
 */
export function TimerController() {
  const running = useRunning();
  const now = useNow(1000, !!running);
  const projects = useProjects(true);
  const busy = useRef(false);

  // Bij het opstarten: aftellers afsluiten die afliepen terwijl de app dicht was.
  useEffect(() => {
    void settleCountdowns();
  }, []);

  useEffect(() => {
    if (!running || running.mode !== 'countdown' || !running.plannedMinutes || busy.current) return;
    if (now < running.start + running.plannedMinutes * MINUTE) return;
    busy.current = true;
    void settleCountdowns(now)
      .then((done) => {
        if (done.length === 0) return;
        const p = projects.find((x) => x.id === running.projectId);
        whistle();
        void notify('Tijd is om', `${running.plannedMinutes} minuten ${p ? `voor ${p.name} ` : ''}zitten erop.`);
      })
      .finally(() => {
        busy.current = false;
      });
  }, [now, running, projects]);

  useEffect(() => {
    if (!running) {
      document.title = 'WhistleRocket';
      return;
    }
    const p = projects.find((x) => x.id === running.projectId);
    document.title = `${formatClock(timerReading(running, now).ms)} · ${p?.name ?? 'Timer'} — WhistleRocket`;
  }, [running, now, projects]);

  return null;
}

/** Project kiezen, stopwatch of afteller, en starten. Toont de klok als er iets loopt. */
export function TimerPanel({ fixedProject, compact = false }: { fixedProject?: Project; compact?: boolean }) {
  const projects = useProjects();
  const running = useRunning();
  const now = useNow(1000, !!running);
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [minutes, setMinutes] = useState(25);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fixedProject) setProjectId(fixedProject.id);
    else if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [fixedProject, projects, projectId]);

  const runningProject = running ? projects.find((p) => p.id === running.projectId) ?? null : null;
  const showRunning = running && (!fixedProject || running.projectId === fixedProject.id);

  if (showRunning && running) {
    const r = timerReading(running, now);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row">
          {runningProject && <ProjectAvatar project={runningProject} size={compact ? 32 : 40} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{runningProject?.name ?? 'Onbekend project'}</div>
            <div className="quiet" style={{ fontSize: 13 }}>
              {running.mode === 'countdown' ? `Afteller van ${running.plannedMinutes} minuten` : 'Stopwatch'}
            </div>
          </div>
        </div>
        <div>
          <div className="quiet" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{r.label}</div>
          <div className="big-clock" style={compact ? { fontSize: 40 } : undefined} role="timer" aria-live="off">{formatClock(r.ms)}</div>
        </div>
        {r.progress !== null && (
          <div className="progress" role="progressbar" aria-label="Voortgang afteller" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.progress * 100)}>
            <span style={{ width: `${r.progress * 100}%` }} />
          </div>
        )}
        <div className="row">
          <button type="button" className="btn primary" onClick={() => void stopRunning()}>
            <Icon name="stop" size={14} /> Stoppen
          </button>
        </div>
      </div>
    );
  }

  async function start() {
    setError('');
    if (!projectId) {
      setError('Kies eerst een project.');
      return;
    }
    try {
      await startTimer(projectId, mode, mode === 'countdown' ? minutes : null);
      // Toestemming voor meldingen alvast vragen, zodat de afteller later kan melden.
      if (mode === 'countdown' && typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {running && fixedProject && (
        <p className="notice" style={{ margin: 0 }}>Er loopt al een timer voor een ander project. Starten stopt die eerst.</p>
      )}
      {!fixedProject && (
        <label className="field">
          <span>Project</span>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      )}
      <div className="seg" role="group" aria-label="Soort timer">
        <button type="button" aria-pressed={mode === 'stopwatch'} onClick={() => setMode('stopwatch')}>Stopwatch</button>
        <button type="button" aria-pressed={mode === 'countdown'} onClick={() => setMode('countdown')}>Afteller</button>
      </div>
      {mode === 'countdown' && (
        <div className="row wrap">
          {PRESETS.map((m) => (
            <button key={m} type="button" className="btn small" aria-pressed={minutes === m} style={minutes === m ? { background: 'var(--active)' } : undefined} onClick={() => setMinutes(m)}>
              {m} min
            </button>
          ))}
          <label className="row" style={{ gap: 6 }}>
            <span className="sr-only">Eigen duur in minuten</span>
            <input className="input" type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80, height: 32 }} />
            <span className="quiet">min</span>
          </label>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn accent" onClick={() => void start()} disabled={!projects.length}>
          <Icon name="play" size={14} /> Start {mode === 'countdown' ? `afteller (${minutes} min)` : 'stopwatch'}
        </button>
      </div>
      {!projects.length && <p className="quiet" style={{ margin: 0 }}>Voeg eerst een project toe.</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

/** Kleine knop op een tegel: start een stopwatch, of stopt als dit project loopt. */
export function PlayButton({ project }: { project: Project }) {
  const running = useRunning();
  const isRunning = running?.projectId === project.id;
  return (
    <button
      type="button"
      className="icon-btn round play"
      aria-label={isRunning ? `Timer voor ${project.name} stoppen` : `Timer voor ${project.name} starten`}
      onClick={(e) => {
        e.preventDefault();
        void (isRunning ? stopRunning() : startTimer(project.id));
      }}
      style={isRunning ? { background: 'var(--text)', color: 'var(--bg)' } : undefined}
    >
      <Icon name={isRunning ? 'stop' : 'play'} size={14} />
    </button>
  );
}

