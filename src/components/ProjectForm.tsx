import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { db, LABELS, type Label, type Project } from '../db/db';
import { createProject, updateProject } from '../db/actions';
import { closestClash, isHex, monogramFrom, PALETTE, suggestColor } from '../lib/color';
import { useProjects } from '../lib/hooks';
import { ProjectAvatar } from './ProjectAvatar';
import { Icon } from './Icon';

/** Het projectformulier kan overal geopend worden: startscherm, projectpagina, instellingen. */
const Ctx = createContext<(projectId?: string) => void>(() => {});
export const useOpenProjectForm = () => useContext(Ctx);

export function ProjectFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; id?: string; key: number }>({ open: false, key: 0 });
  const open = useCallback((id?: string) => setState((s) => ({ open: true, id, key: s.key + 1 })), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {state.open && <ProjectDialog key={state.key} projectId={state.id} onClose={() => setState((s) => ({ ...s, open: false }))} />}
    </Ctx.Provider>
  );
}

interface Draft {
  name: string;
  label: Label;
  color: string;
  monogram: string;
  logo: string | null;
  holding: string;
  quick: boolean;
  active: boolean;
  weekGoalHours: string;
}

/** Afbeelding verkleinen tot een logo van 128 px; svg blijft svg. */
async function fileToLogo(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Dit bestand is groter dan 5 MB.');
  if (file.type === 'image/svg+xml') {
    const text = await file.text();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Kon het logo niet verwerken.');
    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ProjectDialog({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const all = useProjects(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isNew = !projectId;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Formulier vullen zodra de projecten geladen zijn.
  useEffect(() => {
    if (draft) return;
    if (projectId) {
      void db.projects.get(projectId).then((p?: Project) => {
        if (!p) return;
        setDraft({
          name: p.name, label: p.label, color: p.color, monogram: p.monogram, logo: p.logo,
          holding: p.holding ?? '', quick: p.quick, active: p.active,
          weekGoalHours: p.weekGoalMinutes ? String(p.weekGoalMinutes / 60) : '',
        });
      });
    } else {
      void db.projects.toArray().then((ps) =>
        setDraft({ name: '', label: 'Bedrijf', color: suggestColor(ps.map((p) => p.color)), monogram: '', logo: null, holding: '', quick: true, active: true, weekGoalHours: '' }),
      );
    }
  }, [projectId, draft]);

  const others = useMemo(() => all.filter((p) => p.id !== projectId), [all, projectId]);
  const takenColors = others.map((p) => p.color);
  const holdings = [...new Set(all.map((p) => p.holding).filter((h): h is string => !!h))];
  const clash = draft && isHex(draft.color) ? closestClash(draft.color, takenColors) : null;
  const clashOwner = clash ? others.find((p) => p.color === clash)?.name : null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function onLogo(file: File | undefined) {
    if (!file) return;
    try {
      set('logo', await fileToLogo(file));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    const hours = parseFloat(draft.weekGoalHours.replace(',', '.'));
    const input = {
      name: draft.name,
      label: draft.label,
      color: draft.color,
      monogram: draft.monogram,
      logo: draft.logo,
      holding: draft.holding,
      quick: draft.quick,
      active: draft.active,
      weekGoalMinutes: Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null,
    };
    try {
      if (projectId) await updateProject(projectId, input);
      else await createProject(input);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const preview = draft ? { name: draft.name || 'Nieuw project', color: isHex(draft.color) ? draft.color : '#8C92A0', monogram: draft.monogram || monogramFrom(draft.name || '?'), logo: draft.logo } : null;

  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="pf-title">
      <form onSubmit={submit}>
        <div className="modal-head">
          <h2 id="pf-title" className="card-title" style={{ fontSize: 18 }}>{isNew ? 'Nieuw project' : 'Project bewerken'}</h2>
          <button type="button" className="icon-btn" aria-label="Sluiten" onClick={() => ref.current?.close()}>
            <Icon name="x" />
          </button>
        </div>
        {draft && preview && (
          <div className="modal-body">
            <div className="preview-tile">
              <ProjectAvatar project={preview} size={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{preview.name}</div>
                <span className={`chip ${draft.label}`}>{draft.label}</span>
              </div>
            </div>

            <label className="field">
              <span>Naam</span>
              <input className="input" value={draft.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
            </label>

            <div className="field">
              <span id="pf-label">Soort</span>
              <div className="seg" role="group" aria-labelledby="pf-label">
                {LABELS.map((l) => (
                  <button key={l} type="button" aria-pressed={draft.label === l} onClick={() => set('label', l)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <span id="pf-color">Kleur</span>
              <div className="swatches" role="group" aria-labelledby="pf-color">
                {PALETTE.map((c) => {
                  const taken = closestClash(c, takenColors) !== null;
                  return (
                    <button
                      key={c}
                      type="button"
                      className="swatch"
                      style={{ background: c }}
                      aria-pressed={draft.color.toUpperCase() === c}
                      aria-label={taken ? `${c}, al in gebruik` : c}
                      disabled={taken}
                      onClick={() => set('color', c)}
                    />
                  );
                })}
              </div>
              <div className="row">
                <input type="color" aria-label="Eigen kleur kiezen" value={isHex(draft.color) ? draft.color : '#000000'} onChange={(e) => set('color', e.target.value.toUpperCase())} style={{ width: 44, height: 36, border: 0, background: 'transparent', padding: 0 }} />
                <input className="input mono" aria-label="Kleurcode" value={draft.color} onChange={(e) => set('color', e.target.value)} style={{ width: 120 }} />
                {clashOwner && <span className="error">Lijkt te veel op {clashOwner}.</span>}
              </div>
            </div>

            <div className="row wrap" style={{ alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: '1 1 160px' }}>
                <span>Holding</span>
                <input className="input" list="pf-holdings" value={draft.holding} onChange={(e) => set('holding', e.target.value)} placeholder="Geen" />
                <datalist id="pf-holdings">{holdings.map((h) => <option key={h} value={h} />)}</datalist>
              </label>
              <label className="field" style={{ flex: '0 1 110px' }}>
                <span>Monogram</span>
                <input className="input" value={draft.monogram} maxLength={3} onChange={(e) => set('monogram', e.target.value.toUpperCase())} placeholder={monogramFrom(draft.name || '?')} />
              </label>
              <label className="field" style={{ flex: '0 1 140px' }}>
                <span>Weekdoel (uren)</span>
                <input className="input" inputMode="decimal" value={draft.weekGoalHours} onChange={(e) => set('weekGoalHours', e.target.value)} placeholder="Geen" />
              </label>
            </div>

            <div className="field">
              <span>Logo</span>
              <div className="row wrap">
                <label className="btn small">
                  <Icon name="upload" size={16} /> Logo kiezen
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => void onLogo(e.target.files?.[0])} />
                </label>
                {draft.logo && <button type="button" className="btn small ghost" onClick={() => set('logo', null)}>Logo weghalen</button>}
                <small>Zonder logo toont WhistleRocket het monogram.</small>
              </div>
            </div>

            <label className="switch">
              <input type="checkbox" checked={draft.quick} onChange={(e) => set('quick', e.target.checked)} />
              <span className="track" />
              In de snelkiezer op het startscherm
            </label>
            {!isNew && (
              <label className="switch">
                <input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} />
                <span className="track" />
                Actief (uit = archief; uren en taken blijven bewaard)
              </label>
            )}
            {error && <p className="error" role="alert">{error}</p>}
          </div>
        )}
        <div className="modal-foot">
          <button type="button" className="btn" onClick={() => ref.current?.close()}>Annuleren</button>
          <button type="submit" className="btn accent" disabled={!draft || saving || !!clashOwner}>{isNew ? 'Project toevoegen' : 'Opslaan'}</button>
        </div>
      </form>
    </dialog>
  );
}
