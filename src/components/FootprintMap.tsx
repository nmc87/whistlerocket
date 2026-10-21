import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldUrl from 'world-atlas/countries-50m.json?url';
import type { Project, Site } from '../db/db';
import { clusterPoints } from '../lib/cluster';
import { ProjectAvatar } from './ProjectAvatar';
import { Icon } from './Icon';

type Land = Feature<Geometry, { name: string }>;

/** De wereldkaart (Natural Earth, 1:50 miljoen) wordt één keer geladen en daarna bewaard. */
let landCache: Promise<Land[]> | null = null;
function loadLand(): Promise<Land[]> {
  landCache ??= fetch(worldUrl)
    .then((r) => r.json())
    .then((topo: Topology<{ countries: GeometryCollection<{ name: string }> }>) => {
      const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
      return fc.features.filter((f) => f.id !== '010'); // zonder Antarctica
    });
  return landCache;
}

const EUROPE: [number, number][] = [[-10, 36], [28, 60]];

export interface MapSite {
  site: Site;
  project: Project | undefined;
}

interface Props {
  items: MapSite[];
  height: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Kiesmodus: klik op de kaart zet een speld. */
  onPick?: (lon: number, lat: number) => void;
  draft?: { lat: number; lon: number } | null;
  /** Verandert deze waarde, dan zoomt de kaart naar alle getoonde locaties. */
  fitKey?: string;
  /** Verandert deze waarde, dan vliegt de kaart naar de gekozen locatie of de speld. */
  focusKey?: string;
}

export function FootprintMap({ items, height, selectedId, onSelect, onPick, draft, fitKey, focusKey }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [land, setLand] = useState<Land[] | null>(null);
  const [width, setWidth] = useState(0);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const tRef = useRef(t);
  tRef.current = t;
  const [hover, setHover] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    loadLand()
      .then((l) => alive && setLand(l))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const proj: GeoProjection | null = useMemo(() => {
    if (!land || width < 50) return null;
    return geoMercator().fitExtent([[8, 8], [width - 8, height - 8]], { type: 'FeatureCollection', features: land });
  }, [land, width, height]);

  const paths = useMemo(() => {
    if (!proj || !land) return [];
    const gen = geoPath(proj);
    return land.map((f) => ({ id: String(f.id ?? f.properties.name), d: gen(f) ?? '' }));
  }, [proj, land]);

  // Zoomen en schuiven (muis, wiel, touchpad).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !proj) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 600])
      .translateExtent([[0, 0], [width, height]])
      .clickDistance(4)
      .on('zoom', (e) => setT(e.transform));
    const sel = select(svg).call(z);
    if (onPick) sel.on('dblclick.zoom', null);
    zoomRef.current = z;
    return () => {
      sel.on('.zoom', null);
    };
  }, [proj, width, height, onPick]);

  const goTo = useCallback(
    (target: ZoomTransform, animate = true) => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!animate || reduce) {
        select(svg).call(z.transform, target);
        return;
      }
      const from = tRef.current;
      const start = performance.now();
      const dur = 450;
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const e = 1 - (1 - p) ** 3;
        // Schaal logaritmisch, dan voelt in- en uitzoomen even snel.
        const k = Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e);
        const cx = width / 2;
        const cy = height / 2;
        const fromCenter = from.invert([cx, cy]);
        const toCenter = target.invert([cx, cy]);
        const mx = fromCenter[0] + (toCenter[0] - fromCenter[0]) * e;
        const my = fromCenter[1] + (toCenter[1] - fromCenter[1]) * e;
        select(svg).call(z.transform, zoomIdentity.translate(cx - k * mx, cy - k * my).scale(k));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [width, height],
  );

  /** Zoomt zo dat alle punten in beeld zijn. */
  const fitTo = useCallback(
    (lonlats: [number, number][], animate = true) => {
      if (!proj) return;
      const pts = (lonlats.length ? lonlats : EUROPE).map((ll) => proj(ll)).filter((p): p is [number, number] => !!p);
      if (!pts.length) return;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const pad = 70;
      const single = lonlats.length === 1;
      let k = Math.min((width - 2 * pad) / Math.max(x1 - x0, 1e-6), (height - 2 * pad) / Math.max(y1 - y0, 1e-6));
      k = Math.max(1, Math.min(single ? 80 : 160, k));
      if (single) k = Math.max(k, Math.min(80, Math.max(tRef.current.k, 40)));
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      goTo(zoomIdentity.translate(width / 2 - k * cx, height / 2 - k * cy).scale(k), animate);
    },
    [proj, width, height, goTo],
  );

  // Eerste keer, en bij een ander filter: alles in beeld.
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (!proj) return;
    const key = `${fitKey ?? ''}|${width}x${height}`;
    if (fitted.current === key) return;
    const first = fitted.current === null;
    fitted.current = key;
    const pts: [number, number][] = draft ? [[draft.lon, draft.lat]] : items.map((i) => [i.site.lon, i.site.lat]);
    fitTo(pts, !first);
  }, [proj, fitKey, width, height, items, draft, fitTo]);

  // Naar de gekozen locatie vliegen.
  useEffect(() => {
    if (!focusKey || !proj) return;
    const s = items.find((i) => i.site.id === selectedId)?.site;
    if (draft) fitTo([[draft.lon, draft.lat]]);
    else if (s) fitTo([[s.lon, s.lat]]);
    // Bewust alleen bij een nieuwe focusKey, niet bij elke andere wijziging.
  }, [focusKey]);

  const screen = useMemo(() => {
    if (!proj) return [];
    return items
      .map((i) => {
        const p = proj([i.site.lon, i.site.lat]);
        if (!p) return null;
        const [x, y] = t.apply(p);
        return { item: i, x, y };
      })
      .filter((p): p is { item: MapSite; x: number; y: number } => !!p && p.x > -40 && p.x < width + 40 && p.y > -40 && p.y < height + 60);
  }, [items, proj, t, width, height]);

  const clusters = useMemo(() => clusterPoints(screen, 30), [screen]);
  const singles = clusters.filter((c) => c.items.length === 1).length;
  const draftXY = draft && proj ? (() => {
    const p = proj([draft.lon, draft.lat]);
    return p ? t.apply(p) : null;
  })() : null;

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPick || !proj || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const [px, py] = t.invert([e.clientX - r.left, e.clientY - r.top]);
    const ll = proj.invert?.([px, py]);
    if (ll && Number.isFinite(ll[0]) && Number.isFinite(ll[1])) onPick(ll[0], ll[1]);
  }

  const zoomBy = (f: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) z.scaleBy(select(svg), f);
  };

  return (
    <div ref={wrapRef} className="fp-map" style={{ height }}>
      {proj ? (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className={onPick ? 'pick' : ''}
          role="img"
          aria-label={onPick ? 'Kaart: klik om de plek van de locatie te kiezen' : `Kaart met ${items.length} locaties`}
          onClick={onClick}
        >
          <rect width={width} height={height} className="fp-sea" />
          <g transform={t.toString()}>
            {paths.map((p) => (
              <path key={p.id} d={p.d} className="fp-land" vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        </svg>
      ) : (
        <div className="fp-loading quiet">{loadError ? 'De kaart kon niet laden.' : 'Kaart laden…'}</div>
      )}

      {clusters.map((c) => {
        if (c.items.length > 1) {
          return (
            <button
              key={c.items.map((i) => i.site.id).join('-')}
              type="button"
              className="fp-cluster"
              style={{ left: c.x, top: c.y }}
              aria-label={`${c.items.length} locaties hier, inzoomen`}
              onClick={() => fitTo(c.items.map((i) => [i.site.lon, i.site.lat]))}
            >
              {c.items.length}
            </button>
          );
        }
        const { site, project } = c.items[0];
        const on = site.id === selectedId;
        const showLabel = on || hover === site.id || singles <= 12;
        return (
          <div key={site.id} className="fp-pin-wrap" style={{ left: c.x, top: c.y, zIndex: on ? 30 : hover === site.id ? 20 : 10 }}>
            <button
              type="button"
              className={`fp-pin${on ? ' on' : ''}`}
              style={{ ['--ring' as string]: project?.color ?? '#8C92A0' }}
              aria-label={`${site.name}, ${site.kind}${project ? `, ${project.name}` : ''}`}
              aria-pressed={on}
              onClick={() => onSelect?.(site.id)}
              onMouseEnter={() => setHover(site.id)}
              onMouseLeave={() => setHover((h) => (h === site.id ? null : h))}
            >
              <span className="fp-pin-head">{project && <ProjectAvatar project={project} size={22} />}</span>
              <span className="fp-pin-tail" />
            </button>
            {showLabel && (
              <span className="fp-label" aria-hidden="true">
                <strong>{site.name}</strong>
                <span>{site.kind}</span>
              </span>
            )}
          </div>
        );
      })}

      {draftXY && (
        <div className="fp-pin-wrap" style={{ left: draftXY[0], top: draftXY[1], zIndex: 40 }} aria-hidden="true">
          <span className="fp-pin draft">
            <span className="fp-pin-head"><Icon name="pin" size={18} /></span>
            <span className="fp-pin-tail" />
          </span>
        </div>
      )}

      <div className="fp-controls">
        <button type="button" className="icon-btn" aria-label="Inzoomen" onClick={() => zoomBy(2)}><Icon name="plus" size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Uitzoomen" onClick={() => zoomBy(0.5)}><Icon name="minus" size={16} /></button>
        <button
          type="button"
          className="icon-btn"
          aria-label={draft ? 'Naar de speld' : 'Alle locaties in beeld'}
          onClick={() => fitTo(draft ? [[draft.lon, draft.lat]] : items.map((i) => [i.site.lon, i.site.lat]))}
        >
          <Icon name="expand" size={16} />
        </button>
      </div>
      <div className="fp-credit">Kaart: Natural Earth · Adressen: PDOK en © OpenStreetMap-bijdragers</div>
    </div>
  );
}
