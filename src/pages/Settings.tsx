import { useEffect, useState } from 'react';
import type { Project } from '../db/db';
import { deleteProject, moveProject, setSetting, type Theme } from '../db/actions';
import { backupFileName, exportBackup, parseBackup, restoreBackup } from '../db/backup';
import { useConfirm, useProjects, useSetting } from '../lib/hooks';
import { isDesktop, saveTextFile } from '../lib/platform';
import { ProjectAvatar } from '../components/ProjectAvatar';
import { useOpenProjectForm } from '../components/ProjectForm';
import { Icon } from '../components/Icon';
import pkg from '../../package.json';

function ProjectRow({ project, first, last }: { project: Project; first: boolean; last: boolean }) {
  const openForm = useOpenProjectForm();
  const [armed, confirmDelete] = useConfirm();
  return (
    <li className="task">
      <ProjectAvatar project={project} size={32} />
      <span className="title">
        <strong style={{ fontWeight: 600 }}>{project.name}</strong>
        <span className="quiet"> · {project.label}{project.holding ? ` · ${project.holding}` : ''}{project.quick ? ' · snelkiezer' : ''}</span>
      </span>
      <button type="button" className="icon-btn" aria-label={`${project.name} omhoog`} disabled={first} onClick={() => void moveProject(project.id, -1)}><Icon name="up" size={16} /></button>
      <button type="button" className="icon-btn" aria-label={`${project.name} omlaag`} disabled={last} onClick={() => void moveProject(project.id, 1)}><Icon name="down" size={16} /></button>
      <button type="button" className="icon-btn" aria-label={`${project.name} bewerken`} onClick={() => openForm(project.id)}><Icon name="edit" size={16} /></button>
      <button
        type="button"
        className={armed ? 'btn small danger' : 'icon-btn'}
        aria-label={armed ? `Klik nog eens: ${project.name} met alle taken en uren verwijderen` : `${project.name} verwijderen`}
        onClick={() => confirmDelete(() => void deleteProject(project.id))}
      >
        <Icon name="trash" size={16} />
        {armed && 'Zeker? Alles van dit project gaat weg'}
      </button>
    </li>
  );
}

export function Settings() {
  const projects = useProjects(true);
  const active = projects.filter((p) => p.active);
  const archived = projects.filter((p) => !p.active);
  const theme = useSetting<Theme>('theme', 'donker');
  const savedName = useSetting<string>('userName', '');
  const [name, setName] = useState(savedName);
  const openForm = useOpenProjectForm();
  const [backupMsg, setBackupMsg] = useState('');
  const [restoreMsg, setRestoreMsg] = useState('');
  const [armedRestore, confirmRestore] = useConfirm(8000);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => setName(savedName), [savedName]);

  async function doExport() {
    setBackupMsg('');
    const data = await exportBackup();
    const ok = await saveTextFile(backupFileName(), JSON.stringify(data, null, 2));
    if (ok) {
      await setSetting('lastBackup', Date.now());
      setBackupMsg(`Back-up gemaakt: ${data.projects.length} projecten, ${data.tasks.length} taken, ${data.entries.length} urenblokken.`);
    }
  }

  async function pickRestore(file: File | undefined) {
    setRestoreMsg('');
    if (!file) return;
    try {
      const text = await file.text();
      const b = parseBackup(text);
      setPending(text);
      setRestoreMsg(`Gevonden: ${b.projects.length} projecten, ${b.tasks.length} taken, ${b.entries.length} urenblokken (gemaakt op ${new Date(b.exportedAt).toLocaleString('nl-NL')}). Klik op "Terugzetten" om alles te vervangen.`);
    } catch (e) {
      setPending(null);
      setRestoreMsg((e as Error).message);
    }
  }

  return (
    <div className="page">
      <h1 className="title">Instellingen</h1>

      <div className="cols">
        <section className="card" aria-labelledby="me-h">
          <div className="card-head"><h2 id="me-h" className="card-title">Over jou</h2></div>
          <form className="row wrap" onSubmit={(e) => { e.preventDefault(); void setSetting('userName', name.trim()); }}>
            <label className="field" style={{ flex: '1 1 200px' }}>
              <span>Je voornaam</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Voor de begroeting op Vandaag" />
            </label>
            <button type="submit" className="btn" style={{ alignSelf: 'flex-end' }} disabled={name.trim() === savedName}>Opslaan</button>
          </form>
        </section>

        <section className="card" aria-labelledby="look-h">
          <div className="card-head"><h2 id="look-h" className="card-title">Weergave</h2></div>
          <div className="seg" role="group" aria-label="Thema">
            {([['donker', 'Donker'], ['licht', 'Daglicht'], ['systeem', 'Volg Windows']] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={theme === k} onClick={() => void setSetting('theme', k)}>{label}</button>
            ))}
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="proj-set-h">
        <div className="card-head">
          <h2 id="proj-set-h" className="card-title">Bedrijven en projecten</h2>
          <button type="button" className="btn small accent" onClick={() => openForm()}><Icon name="plus" size={14} /> Nieuw project</button>
        </div>
        <ul className="list">
          {active.map((p, i) => <ProjectRow key={p.id} project={p} first={i === 0} last={i === active.length - 1} />)}
        </ul>
        {archived.length > 0 && (
          <>
            <h3 className="quiet" style={{ margin: '16px 0 4px', fontSize: 13, fontWeight: 600 }}>Archief</h3>
            <ul className="list">
              {archived.map((p) => <ProjectRow key={p.id} project={p} first last />)}
            </ul>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="backup-h">
        <div className="card-head"><h2 id="backup-h" className="card-title">Back-up</h2></div>
        <p className="muted" style={{ marginTop: 0 }}>
          Je gegevens staan alleen op deze computer{isDesktop() ? '' : ', in deze browser'}. Maak af en toe een back-up, bijvoorbeeld naar je OneDrive-map.
        </p>
        <div className="row wrap">
          <button type="button" className="btn accent" onClick={() => void doExport()}><Icon name="download" size={16} /> Back-up maken</button>
          <label className="btn">
            <Icon name="upload" size={16} /> Back-up kiezen…
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void pickRestore(e.target.files?.[0])} />
          </label>
          {pending && (
            <button
              type="button"
              className="btn danger"
              onClick={() =>
                confirmRestore(() => {
                  void restoreBackup(parseBackup(pending)).then(() => {
                    setPending(null);
                    setRestoreMsg('Back-up teruggezet.');
                  });
                })
              }
            >
              {armedRestore ? 'Zeker? Alles wordt vervangen' : 'Terugzetten'}
            </button>
          )}
        </div>
        {backupMsg && <p className="muted" role="status">{backupMsg}</p>}
        {restoreMsg && <p className="muted" role="status">{restoreMsg}</p>}
      </section>

      <p className="quiet" style={{ fontSize: 13 }}>WhistleRocket {pkg.version} · eigen gebruik · {isDesktop() ? 'Windows-programma' : 'webversie'}</p>
    </div>
  );
}
