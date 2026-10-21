import { useEffect, useRef, useState } from 'react';
import { SITE_KINDS, type Project, type Site, type SiteKind } from '../db/db';
import { createSite, updateSite } from '../db/actions';
import { geocode, type GeoResult } from '../lib/geocode';
import { FootprintMap } from './FootprintMap';
import { Icon } from './Icon';

interface Draft {
  projectId: string;
  name: string;
  kind: SiteKind;
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number | null;
  lon: number | null;
}

/** Locatie toevoegen of bewerken: adres zoeken of zelf op de kaart klikken. */
export function SiteDialog({ site, projects, defaultProjectId, onClose }: { site?: Site; projects: Project[]; defaultProjectId?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Draft>(() =>
    site
      ? { projectId: site.projectId, name: site.name, kind: site.kind, description: site.description, address: site.address, city: site.city, country: site.country, lat: site.lat, lon: site.lon }
      : { projectId: defaultProjectId ?? projects[0]?.id ?? '', name: '', kind: 'Kantoor', description: '', address: '', city: '', country: '', lat: null, lon: null },
  );
  const [query, setQuery] = useState(site?.address ?? '');
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [error, setError] = useState('');
  const [focus, setFocus] = useState(0);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function search() {
    setSearching(true);
    setSearchError('');
    setResults(null);
    try {
      const r = await geocode(query);
      setResults(r);
      if (r.length === 0) setSearchError('Niets gevonden. Probeer een ander adres, of klik op de kaart.');
    } catch (e) {
      setSearchError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  function choose(r: GeoResult) {
    setD((x) => ({ ...x, address: r.address, city: r.city, country: r.country, lat: r.lat, lon: r.lon, name: x.name || (r.city ? `${x.kind} ${r.city}` : x.name) }));
    setResults(null);
    setFocus((n) => n + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (site) await updateSite(site.id, d);
      else await createSite(d);
      ref.current?.close();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const project = projects.find((p) => p.id === d.projectId);
  const draft = d.lat !== null && d.lon !== null ? { lat: d.lat, lon: d.lon } : null;

  return (
    <dialog ref={ref} className="modal" style={{ width: 'min(760px, calc(100vw - 32px))' }} onClose={onClose} aria-labelledby="site-title">
      <form onSubmit={submit}>
        <div className="modal-head">
          <h2 id="site-title" className="card-title" style={{ fontSize: 18 }}>{site ? 'Locatie bewerken' : 'Locatie toevoegen'}</h2>
          <button type="button" className="icon-btn" aria-label="Sluiten" onClick={() => ref.current?.close()}><Icon name="x" /></button>
        </div>
        <div className="modal-body">
          <div className="row wrap" style={{ alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 200px' }}>
              <span>Bedrijf</span>
              <select className="input" value={d.projectId} onChange={(e) => set('projectId', e.target.value)} required>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: '1 1 180px' }}>
              <span>Soort locatie</span>
              <select className="input" value={d.kind} onChange={(e) => set('kind', e.target.value as SiteKind)}>
                {SITE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Naam</span>
            <input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder={`Bijvoorbeeld ${d.kind} ${project ? project.name : ''}`.trim()} required />
          </label>
          <label className="field">
            <span>Omschrijving</span>
            <textarea className="input" value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="Wat is dit voor locatie? Bijvoorbeeld: opslag van onderdelen, 400 m², 3 medewerkers." />
          </label>

          <div className="field">
            <span id="site-addr">Adres</span>
            <div className="row">
              <input
                className="input"
                aria-labelledby="site-addr"
                style={{ flex: '1 1 auto' }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void search();
                  }
                }}
                placeholder="Straat en plaats, postcode of plaatsnaam"
              />
              <button type="button" className="btn" onClick={() => void search()} disabled={searching || query.trim().length < 3}>
                <Icon name="search" size={16} /> {searching ? 'Zoeken…' : 'Zoeken'}
              </button>
            </div>
            {results && results.length > 0 && (
              <div className="geo-results" role="listbox" aria-label="Gevonden adressen">
                {results.map((r, i) => (
                  <button key={i} type="button" role="option" aria-selected={false} onClick={() => choose(r)}>
                    <span>{r.label}</span>
                    <span className="quiet" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.source}</span>
                  </button>
                ))}
              </div>
            )}
            {searchError && <small className="error">{searchError}</small>}
          </div>

          <FootprintMap
            items={[]}
            height={260}
            draft={draft}
            focusKey={String(focus)}
            fitKey={site ? `edit-${site.id}` : 'nieuw'}
            onPick={(lon, lat) => setD((x) => ({ ...x, lat, lon }))}
          />
          <small className="quiet" style={{ marginTop: -6 }}>
            {draft ? `Gekozen plek: ${draft.lat.toFixed(5)}, ${draft.lon.toFixed(5)}. Klik op de kaart om hem te verplaatsen.` : 'Zoek het adres, of zoom in en klik op de kaart om de plek te kiezen.'}
          </small>

          <div className="row wrap">
            <label className="field" style={{ flex: '1 1 260px' }}><span>Adresregel</span><input className="input" value={d.address} onChange={(e) => set('address', e.target.value)} /></label>
            <label className="field" style={{ flex: '1 1 140px' }}><span>Plaats</span><input className="input" value={d.city} onChange={(e) => set('city', e.target.value)} /></label>
            <label className="field" style={{ flex: '1 1 140px' }}><span>Land</span><input className="input" value={d.country} onChange={(e) => set('country', e.target.value)} /></label>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={() => ref.current?.close()}>Annuleren</button>
          <button type="submit" className="btn accent" disabled={!draft || !d.name.trim() || !d.projectId}>{site ? 'Opslaan' : 'Locatie toevoegen'}</button>
        </div>
      </form>
    </dialog>
  );
}
