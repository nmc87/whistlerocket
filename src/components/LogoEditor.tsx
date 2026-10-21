import { useEffect, useRef } from 'react';
import { DEFAULT_LOGO_STYLE, logoStyleOf, type LogoBg, type LogoFit, type LogoStyle } from '../db/db';
import { ProjectAvatar, type AvatarProject } from './ProjectAvatar';

const FITS: { key: LogoFit; label: string; hint: string }[] = [
  { key: 'passend', label: 'Passend', hint: 'Het hele logo is zichtbaar' },
  { key: 'vullend', label: 'Vullend', hint: 'Het vakje is helemaal gevuld; randen kunnen wegvallen' },
];

const BGS: { key: LogoBg; label: string }[] = [
  { key: 'geen', label: 'Geen' },
  { key: 'wit', label: 'Wit' },
  { key: 'donker', label: 'Donker' },
  { key: 'kleur', label: 'Projectkleur' },
];

/**
 * Logo zelf in het vakje zetten: passend of vullend, inzoomen, verschuiven
 * (slepen of pijltjestoetsen) en een achtergrond. Met voorbeelden op ware grootte.
 */
export function LogoEditor({ project, value, onChange }: { project: AvatarProject; value: LogoStyle; onChange: (s: LogoStyle) => void }) {
  const s = logoStyleOf({ logoStyle: value });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageSize = 128;
  const set = (patch: Partial<LogoStyle>) => onChange(logoStyleOf({ logoStyle: { ...s, ...patch } }));

  // Scrollen boven het logo zoomt, zonder dat het venster meescrolt (daarvoor is een niet-passieve listener nodig).
  const latest = useRef({ s, onChange });
  latest.current = { s, onChange };
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { s: cur, onChange: change } = latest.current;
      change(logoStyleOf({ logoStyle: { ...cur, zoom: Math.round((cur.zoom - Math.sign(e.deltaY) * 0.05) * 100) / 100 } }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="logo-editor">
      <div
        ref={stageRef}
        className={`logo-stage logo-bg-${s.bg}${s.bg === 'geen' ? ' checker' : ''}`}
        style={{ background: s.bg === 'kleur' ? project.color : undefined }}
        tabIndex={0}
        role="group"
        aria-label="Logo verschuiven: sleep met de muis of gebruik de pijltjestoetsen"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, x: s.x, y: s.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const d = drag.current;
          set({ x: Math.round(d.x + ((e.clientX - d.px) / stageSize) * 100), y: Math.round(d.y + ((e.clientY - d.py) / stageSize) * 100) });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          const moves: Record<string, Partial<LogoStyle>> = {
            ArrowLeft: { x: s.x - step },
            ArrowRight: { x: s.x + step },
            ArrowUp: { y: s.y - step },
            ArrowDown: { y: s.y + step },
            '+': { zoom: Math.round((s.zoom + 0.05) * 100) / 100 },
            '-': { zoom: Math.round((s.zoom - 0.05) * 100) / 100 },
          };
          if (moves[e.key]) {
            e.preventDefault();
            set(moves[e.key]);
          }
        }}
      >
        {project.logo && (
          <img src={project.logo} alt="" draggable={false} style={{ objectFit: s.fit === 'vullend' ? 'cover' : 'contain', transform: `translate(${s.x}%, ${s.y}%) scale(${s.zoom})` }} />
        )}
      </div>

      <div className="logo-controls">
        <div className="seg" role="group" aria-label="Hoe past het logo">
          {FITS.map((f) => (
            <button key={f.key} type="button" title={f.hint} aria-pressed={s.fit === f.key} onClick={() => set({ fit: f.key })}>
              {f.label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Zoom <span className="quiet num">{Math.round(s.zoom * 100)}%</span></span>
          <input type="range" min={50} max={300} step={5} value={Math.round(s.zoom * 100)} onChange={(e) => set({ zoom: Number(e.target.value) / 100 })} />
        </label>

        <div className="field">
          <span id="logo-bg-label">Achtergrond</span>
          <div className="seg" role="group" aria-labelledby="logo-bg-label" style={{ flexWrap: 'wrap' }}>
            {BGS.map((b) => (
              <button key={b.key} type="button" aria-pressed={s.bg === b.key} onClick={() => set({ bg: b.key })}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div className="logo-sizes" aria-label="Voorbeeld op ware grootte">
            {[24, 36, 56].map((n) => (
              <ProjectAvatar key={n} project={{ ...project, logoStyle: s }} size={n} />
            ))}
          </div>
          <button type="button" className="btn small" onClick={() => onChange({ ...DEFAULT_LOGO_STYLE, bg: s.bg, fit: s.fit })} disabled={s.zoom === 1 && s.x === 0 && s.y === 0}>
            Zoom en positie herstellen
          </button>
        </div>
        <small className="quiet">Sleep het logo om het te verschuiven. Scrollen of + en − zoomt.</small>
      </div>
    </div>
  );
}
