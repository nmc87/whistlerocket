/**
 * Adres → plek op de kaart.
 * - Nederland: PDOK Locatieserver (overheid, gratis, zonder sleutel).
 * - Buitenland: Nominatim van OpenStreetMap. Regels: hooguit 1 verzoek per seconde,
 *   niet zoeken terwijl je typt. Daarom zoeken we alleen na een klik op Zoeken,
 *   en bewaren we de gevonden plek bij de locatie (dus nooit twee keer opvragen).
 */

export interface GeoResult {
  label: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  source: 'PDOK' | 'OpenStreetMap';
}

const PDOK_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** 'POINT(5.13287587 52.08884161)' → [lon, lat] */
export function parseWktPoint(wkt: string): [number, number] | null {
  const m = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(wkt);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

interface PdokDoc {
  weergavenaam?: string;
  woonplaatsnaam?: string;
  centroide_ll?: string;
}

export function parsePdok(json: unknown): GeoResult[] {
  const docs = (json as { response?: { docs?: PdokDoc[] } })?.response?.docs ?? [];
  const out: GeoResult[] = [];
  for (const d of docs) {
    const pt = d.centroide_ll ? parseWktPoint(d.centroide_ll) : null;
    if (!pt || !d.weergavenaam) continue;
    out.push({ label: d.weergavenaam, address: d.weergavenaam, city: d.woonplaatsnaam ?? '', country: 'Nederland', lon: pt[0], lat: pt[1], source: 'PDOK' });
  }
  return out;
}

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
}

export function parseNominatim(json: unknown): GeoResult[] {
  if (!Array.isArray(json)) return [];
  const out: GeoResult[] = [];
  for (const it of json as NominatimItem[]) {
    const lat = Number(it.lat);
    const lon = Number(it.lon);
    if (!it.display_name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const a = it.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '';
    out.push({ label: it.display_name, address: it.display_name, city, country: a.country ?? '', lat, lon, source: 'OpenStreetMap' });
  }
  return out;
}

/** Twee resultaten op minder dan ~100 m van elkaar zijn hetzelfde. */
function dedupe(results: GeoResult[]): GeoResult[] {
  const out: GeoResult[] = [];
  for (const r of results) {
    if (!out.some((o) => Math.abs(o.lat - r.lat) < 0.001 && Math.abs(o.lon - r.lon) < 0.001)) out.push(r);
  }
  return out;
}

/**
 * Zoekt in beide bronnen tegelijk. Lukt één bron niet, dan tellen de resultaten
 * van de andere. Lukt geen van beide, dan volgt een fout met een duidelijke uitleg.
 */
export async function geocode(query: string, fetcher: typeof fetch = fetch): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) throw new Error('Typ minstens drie tekens.');
  const pdok = fetcher(`${PDOK_URL}?q=${encodeURIComponent(q)}&rows=5&fl=weergavenaam,woonplaatsnaam,centroide_ll`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(parsePdok);
  const osm = fetcher(`${NOMINATIM_URL}?format=jsonv2&addressdetails=1&limit=5&accept-language=nl&q=${encodeURIComponent(q)}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(parseNominatim);
  const [a, b] = await Promise.allSettled([pdok, osm]);
  if (a.status === 'rejected' && b.status === 'rejected') {
    throw new Error('Zoeken lukt nu niet (geen internet?). Klik op de kaart om de plek zelf te kiezen.');
  }
  return dedupe([...(a.status === 'fulfilled' ? a.value : []), ...(b.status === 'fulfilled' ? b.value : [])]).slice(0, 8);
}

/** Link om de plek te openen in Google Maps (straatniveau, route). */
export function mapsLink(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}
