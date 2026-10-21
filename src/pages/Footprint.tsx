import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SITE_KINDS, type Site, type SiteKind } from '../db/db';
import { deleteSite } from '../db/actions';
import { useConfirm, useProjects } from '../lib/hooks';
import { mapsLink } from '../lib/geocode';
import { openExternal } from '../lib/platform';
import { FootprintMap, type MapSite } from '../components/FootprintMap';
import { SiteDialog } from '../components/SiteDialog';
import { ProjectAvatar } from '../components/ProjectAvatar';
import { Icon } from '../components/Icon';

const EMPTY: Site[] = [];

export default function Footprint() {
  const projects = useProjects(true);
  const activeProjects = projects.filter((p) => p.active);
  const sites = useLiveQuery(() => db.sites.toArray(), []) ?? EMPTY;
  const [params, setParams] = useSearchParams();
  const projectFilter = params.get('project') ?? '';
  const [kindFilter, setKindFilter] = useState<SiteKind | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  const [dialog, setDialog] = useState<{ site?: Site } | null>(params.get('nieuw') ? {} : null);
  const [armed, confirmDelete] = useConfirm();

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const shown = sites.filter((s) => (!projectFilter || s.projectId === projectFilter) && (!kindFilter || s.kind === kindFilter));
  const items: MapSite[] = shown.map((site) => ({ site, project: byId.get(site.projectId) }));
  const selected = shown.find((s) => s.id === selectedId) ?? null;
  const selectedProject = selected ? byId.get(selected.projectId) : undefined;

  const countries = new Set(shown.map((s) => s.country.trim()).filter(Boolean));
  const companies = new Set(shown.map((s) => s.projectId));
  const kindsInUse = SITE_KINDS.filter((k) => sites.some((s) => s.kind === k));
  const withSites = projects.filter((p) => sites.some((s) => s.projectId === p.id));

  // Lijst per bedrijf, in de volgorde van je projecten.
  const groups = projects
    .map((p) => ({ project: p, sites: shown.filter((s) => s.projectId === p.id).sort((a, b) => a.name.localeCompare(b.name, 'nl')) }))
    .filter((g) => g.sites.length > 0);

  function setProjectFilter(id: string) {
    const next = new URLSearchParams(params);
    if (id) next.set('project', id);
    else next.delete('project');
    next.delete('nieuw');
    setParams(next, { replace: true });
    setSelectedId(null);
  }

  function select(id: string) {
    setSelectedId(id);
    setFocus((n) => n + 1);
  }

  return (
    <div className="page">
      <header className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 className="title">Footprint</h1>
          <span className="muted">Al je kantoren, magazijnen, fabrieken en andere locaties op één kaart.</span>
        </div>
        <button type="button" className="btn accent" onClick={() => setDialog({})} disabled={activeProjects.length === 0}>
          <Icon name="plus" size={16} /> Locatie toevoegen
        </button>
      </header>

      <section className="card" aria-label="Filters" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row wrap" role="group" aria-label="Bedrijf">
          <button type="button" className="btn small" aria-pressed={!projectFilter} style={!projectFilter ? { background: 'var(--active)', borderColor: 'var(--accent)' } : undefined} onClick={() => setProjectFilter('')}>
            Alle bedrijven <span className="quiet">{sites.length}</span>
          </button>
          {withSites.map((p) => {
            const on = projectFilter === p.id;
            return (
              <button key={p.id} type="button" className="btn small" aria-pressed={on} style={on ? { background: 'var(--active)', borderColor: 'var(--accent)' } : undefined} onClick={() => setProjectFilter(on ? '' : p.id)}>
                <ProjectAvatar project={p} size={20} /> {p.name} <span className="quiet">{sites.filter((s) => s.projectId === p.id).length}</span>
              </button>
            );
          })}
        </div>
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <label className="row">
            <span className="muted">Soort</span>
            <select className="input" value={kindFilter} onChange={(e) => setKindFilter(e.target.value as SiteKind | '')} style={{ height: 34 }}>
              <option value="">Alle soorten</option>
              {kindsInUse.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <span className="muted num">
            {shown.length} {shown.length === 1 ? 'locatie' : 'locaties'} · {companies.size} {companies.size === 1 ? 'bedrijf' : 'bedrijven'} · {countries.size} {countries.size === 1 ? 'land' : 'landen'}
          </span>
        </div>
      </section>

      <div className="cols" style={{ alignItems: 'stretch' }}>
        <section className="card" aria-label="Kaart" style={{ flex: '2 1 560px', padding: 10 }}>
          <FootprintMap
            items={items}
            height={600}
            selectedId={selectedId}
            onSelect={select}
            fitKey={`${projectFilter}|${kindFilter}|${shown.length}`}
            focusKey={selectedId ? `${selectedId}-${focus}` : undefined}
          />
        </section>

        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {selected && (
            <section className="card" aria-live="polite" aria-label="Gekozen locatie" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                {selectedProject && <ProjectAvatar project={selectedProject} size={40} />}
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <h2 className="card-title" style={{ fontSize: 18 }}>{selected.name}</h2>
                  <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                    <span className="kind-chip">{selected.kind}</span>
                    {selectedProject && <span className="quiet" style={{ fontSize: 13 }}>{selectedProject.name}</span>}
                  </div>
                </div>
                <button type="button" className="icon-btn" aria-label="Sluiten" onClick={() => setSelectedId(null)}><Icon name="x" size={16} /></button>
              </div>
              {selected.description && <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{selected.description}</p>}
              <div className="muted" style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>{selected.address || 'Geen adres ingevuld'}</span>
                {(selected.city || selected.country) && <span className="quiet">{[selected.city, selected.country].filter(Boolean).join(', ')}</span>}
              </div>
              <div className="row wrap">
                <button type="button" className="btn small" onClick={() => setDialog({ site: selected })}><Icon name="edit" size={14} /> Bewerken</button>
                <button type="button" className="btn small" onClick={() => void openExternal(mapsLink(selected.lat, selected.lon))}><Icon name="external" size={14} /> Google Maps</button>
                <button
                  type="button"
                  className="btn small danger"
                  onClick={() => confirmDelete(() => {
                    void deleteSite(selected.id);
                    setSelectedId(null);
                  })}
                >
                  <Icon name="trash" size={14} /> {armed ? 'Zeker weten?' : 'Verwijderen'}
                </button>
              </div>
            </section>
          )}

          <section className="card" aria-labelledby="sites-h" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: selected ? 420 : 640, overflowY: 'auto' }}>
            <h2 id="sites-h" className="card-title">Locaties</h2>
            {shown.length === 0 && (
              <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                {sites.length === 0 ? 'Nog geen locaties. Voeg je eerste kantoor, magazijn of fabriek toe.' : 'Geen locaties voor dit filter.'}
                {sites.length === 0 && activeProjects.length > 0 && (
                  <button type="button" className="btn accent small" onClick={() => setDialog({})}><Icon name="plus" size={14} /> Locatie toevoegen</button>
                )}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.project.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h3 className="row quiet" style={{ margin: '6px 0 2px', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: g.project.color }} />
                  {g.project.name}
                </h3>
                {g.sites.map((s) => (
                  <button key={s.id} type="button" className="site-item" aria-pressed={s.id === selectedId} onClick={() => select(s.id)}>
                    <ProjectAvatar project={g.project} size={28} />
                    <span className="body">
                      <span className="row wrap" style={{ gap: 6 }}>
                        <span className="name">{s.name}</span>
                        <span className="kind-chip">{s.kind}</span>
                      </span>
                      {s.description && <span className="desc">{s.description}</span>}
                      <span className="quiet" style={{ fontSize: 12 }}>{[s.city, s.country].filter(Boolean).join(', ')}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </section>
        </div>
      </div>

      {dialog && (
        <SiteDialog
          site={dialog.site}
          projects={dialog.site ? projects : activeProjects}
          defaultProjectId={projectFilter || undefined}
          onClose={() => {
            setDialog(null);
            if (params.get('nieuw')) {
              const next = new URLSearchParams(params);
              next.delete('nieuw');
              setParams(next, { replace: true });
            }
          }}
        />
      )}
    </div>
  );
}
