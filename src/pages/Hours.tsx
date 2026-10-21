import { useState } from 'react';
import type { Project, TimeEntry } from '../db/db';
import { addManualEntry, deleteEntry, updateEntry } from '../db/actions';
import { useConfirm, useEntriesFrom, useNow, useProjects, useRunning } from '../lib/hooks';
import { addDays, dayKey, dayShort, formatHM, formatShortDate, formatTimeOfDay, isoWeek, overlap, spanDuration, startOfWeek, weekDays, MINUTE } from '../lib/time';
import { saveTextFile } from '../lib/platform';
import { TimerPanel } from '../components/Timer';
import { ProjectTag } from '../components/ProjectAvatar';
import { Icon } from '../components/Icon';

/** 'YYYY-MM-DD' + 'HH:MM' → tijdstip. */
function toTs(day: string, time: string): number {
  const [y, mo, d] = day.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, m).getTime();
}

export function EntryRow({ entry, projects, now, showProject = true }: { entry: TimeEntry; projects: Project[]; now: number; showProject?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [day, setDay] = useState(dayKey(entry.start));
  const [from, setFrom] = useState(formatTimeOfDay(entry.start));
  const [to, setTo] = useState(entry.end ? formatTimeOfDay(entry.end) : '');
  const [note, setNote] = useState(entry.note);
  const [error, setError] = useState('');
  const [armed, confirmDelete] = useConfirm();
  const project = projects.find((p) => p.id === entry.projectId);
  const running = entry.end === null;

  if (editing) {
    return (
      <form
        className="row wrap"
        style={{ padding: '8px 4px', borderBottom: '1px solid var(--line)' }}
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          const start = toTs(day, from);
          let end = running ? null : toTs(day, to);
          if (end !== null && end <= start) end += 24 * 60 * MINUTE; // over middernacht
          updateEntry(entry.id, { start, end, note: note.trim() })
            .then(() => setEditing(false))
            .catch((err: Error) => setError(err.message));
        }}
      >
        <input className="input" type="date" aria-label="Dag" value={day} onChange={(e) => setDay(e.target.value)} />
        <input className="input" type="time" aria-label="Van" value={from} onChange={(e) => setFrom(e.target.value)} />
        {!running && <input className="input" type="time" aria-label="Tot" value={to} onChange={(e) => setTo(e.target.value)} />}
        <input className="input" aria-label="Notitie" placeholder="Notitie" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: '1 1 160px' }} />
        <button type="submit" className="btn small accent">Opslaan</button>
        <button type="button" className="btn small" onClick={() => setEditing(false)}>Annuleren</button>
        {error && <span className="error" role="alert">{error}</span>}
      </form>
    );
  }

  return (
    <div className="entry">
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {showProject && <ProjectTag project={project} />}
        <span className="muted">
          {dayShort(entry.start)} {formatShortDate(entry.start)}, {formatTimeOfDay(entry.start)}–{entry.end ? formatTimeOfDay(entry.end) : 'nu'}
          {entry.mode === 'countdown' && <span className="quiet"> · afteller</span>}
        </span>
        {entry.note && <span className="quiet" style={{ overflowWrap: 'anywhere' }}>{entry.note}</span>}
      </div>
      <span className="mono" style={{ fontWeight: 600 }}>{formatHM(spanDuration(entry, now))}</span>
      <button type="button" className="icon-btn" aria-label="Blok bewerken" onClick={() => setEditing(true)}>
        <Icon name="edit" size={16} />
      </button>
      <button type="button" className="icon-btn" disabled={running} aria-label={armed ? 'Klik nog eens om te verwijderen' : 'Blok verwijderen'} onClick={() => confirmDelete(() => void deleteEntry(entry.id))} style={armed ? { color: 'var(--bad-ink)', background: 'var(--bad-bg)' } : undefined}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}

function ManualEntry({ projects }: { projects: Project[] }) {
  const [projectId, setProjectId] = useState('');
  const [day, setDay] = useState(dayKey(Date.now()));
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('10:00');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const pid = projectId || projects[0]?.id || '';

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        setSaved(false);
        const start = toTs(day, from);
        let end = toTs(day, to);
        if (end <= start) end += 24 * 60 * MINUTE;
        addManualEntry(pid, start, end, note)
          .then(() => {
            setNote('');
            setSaved(true);
          })
          .catch((err: Error) => setError(err.message));
      }}
    >
      <label className="field">
        <span>Project</span>
        <select className="input" value={pid} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="row wrap">
        <label className="field" style={{ flex: '1 1 140px' }}><span>Dag</span><input className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} required /></label>
        <label className="field" style={{ flex: '1 1 100px' }}><span>Van</span><input className="input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
        <label className="field" style={{ flex: '1 1 100px' }}><span>Tot</span><input className="input" type="time" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
      </div>
      <label className="field"><span>Notitie</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Waar werkte je aan?" /></label>
      <div className="row">
        <button type="submit" className="btn accent" disabled={!pid}><Icon name="plus" size={16} /> Uren toevoegen</button>
        {saved && <span className="muted" role="status">Toegevoegd.</span>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

export function Hours() {
  const projects = useProjects(true);
  const running = useRunning();
  const now = useNow(running ? 1000 : 30_000);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(Date.now()));
  const entries = useEntriesFrom(weekStart);
  const days = weekDays(weekStart);
  const weekEnd = addDays(weekStart, 7);
  const inWeek = entries.filter((e) => overlap(e, weekStart, weekEnd, now) > 0);
  const isThisWeek = weekStart === startOfWeek(now);
  const today = dayKey(now);

  const cell = (p: Project, d: number) => inWeek.filter((e) => e.projectId === p.id).reduce((s, e) => s + overlap(e, d, addDays(d, 1), now), 0);
  const rows = projects
    .map((p) => ({ p, perDay: days.map((d) => cell(p, d)) }))
    .map((r) => ({ ...r, total: r.perDay.reduce((a, b) => a + b, 0) }))
    .filter((r) => r.total > 0);
  const dayTotals = days.map((_, i) => rows.reduce((s, r) => s + r.perDay[i], 0));
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  async function exportCsv() {
    const head = ['Project', ...days.map((d) => dayKey(d)), 'Totaal (uren)'];
    const toH = (ms: number) => (ms / 3_600_000).toFixed(2).replace('.', ',');
    const lines = [head, ...rows.map((r) => [r.p.name, ...r.perDay.map(toH), toH(r.total)]), ['Totaal', ...dayTotals.map(toH), toH(weekTotal)]];
    const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    await saveTextFile(`uren-week-${isoWeek(weekStart)}-${new Date(weekStart).getFullYear()}.csv`, '﻿' + csv, 'text/csv');
  }

  return (
    <div className="page">
      <header className="row wrap" style={{ justifyContent: 'space-between' }}>
        <h1 className="title">Uren</h1>
        <div className="row wrap">
          <button type="button" className="icon-btn" aria-label="Vorige week" onClick={() => setWeekStart((w) => addDays(w, -7))}><Icon name="left" /></button>
          <span className="num" style={{ fontWeight: 600, minWidth: 190, textAlign: 'center' }}>
            Week {isoWeek(weekStart)} · {formatShortDate(weekStart)} – {formatShortDate(addDays(weekStart, 6))}
          </span>
          <button type="button" className="icon-btn" aria-label="Volgende week" onClick={() => setWeekStart((w) => addDays(w, 7))}><Icon name="right" /></button>
          {!isThisWeek && <button type="button" className="btn small" onClick={() => setWeekStart(startOfWeek(Date.now()))}>Deze week</button>}
          <button type="button" className="btn small" onClick={() => void exportCsv()} disabled={rows.length === 0}>
            <Icon name="download" size={14} /> CSV voor boekhouding
          </button>
        </div>
      </header>

      <div className="cols">
        <section className="card" aria-labelledby="timer-h">
          <div className="card-head"><h2 id="timer-h" className="card-title">Timer</h2></div>
          <TimerPanel />
        </section>
        <section className="card" aria-labelledby="manual-h">
          <div className="card-head"><h2 id="manual-h" className="card-title">Uren achteraf toevoegen</h2></div>
          <ManualEntry projects={projects.filter((p) => p.active)} />
        </section>
      </div>

      <section className="card" aria-labelledby="week-tbl-h">
        <div className="card-head">
          <h2 id="week-tbl-h" className="card-title">Per project per dag</h2>
          <span className="card-sub num">Totaal {formatHM(weekTotal)}</span>
        </div>
        {rows.length === 0 ? (
          <p className="empty-state">Nog geen uren in deze week.</p>
        ) : (
          <div className="table-scroll">
            <table className="hours">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  {days.map((d) => <th key={d} scope="col" className={dayKey(d) === today ? 'today' : ''}>{dayShort(d)} {new Date(d).getDate()}</th>)}
                  <th scope="col">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.p.id}>
                    <th scope="row" style={{ fontWeight: 500 }}><ProjectTag project={r.p} /></th>
                    {r.perDay.map((ms, i) => <td key={i} className={`mono${ms === 0 ? ' zero' : ''}`}>{ms === 0 ? '–' : formatHM(ms)}</td>)}
                    <td className="mono" style={{ fontWeight: 700 }}>{formatHM(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Totaal</td>
                  {dayTotals.map((ms, i) => <td key={i} className={`mono${ms === 0 ? ' zero' : ''}`}>{ms === 0 ? '–' : formatHM(ms)}</td>)}
                  <td className="mono">{formatHM(weekTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="blocks-h">
        <div className="card-head">
          <h2 id="blocks-h" className="card-title">Alle blokken deze week</h2>
          <span className="card-sub">{inWeek.length} {inWeek.length === 1 ? 'blok' : 'blokken'}</span>
        </div>
        {inWeek.length === 0 ? (
          <p className="empty-state">Start een timer of voeg uren achteraf toe.</p>
        ) : (
          <div>{[...inWeek].sort((a, b) => b.start - a.start).map((e) => <EntryRow key={e.id} entry={e} projects={projects} now={now} />)}</div>
        )}
      </section>
    </div>
  );
}
