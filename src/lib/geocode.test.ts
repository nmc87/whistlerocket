import { describe, expect, it } from 'vitest';
import { geocode, parseNominatim, parsePdok, parseWktPoint } from './geocode';
import { clusterPoints } from './cluster';

const pdokJson = {
  response: {
    docs: [
      { weergavenaam: 'Stationsplein 1, 3511ED Utrecht', woonplaatsnaam: 'Utrecht', centroide_ll: 'POINT(5.11063 52.08955)' },
      { weergavenaam: 'zonder punt' },
    ],
  },
};
const osmJson = [
  { display_name: 'Via Roma 1, Milano, Italia', lat: '45.4654', lon: '9.1866', address: { city: 'Milano', country: 'Italië' } },
  { display_name: 'kapot', lat: 'x', lon: '1' },
];

function fakeFetch(map: Record<string, unknown | Error>): typeof fetch {
  return (async (url: string) => {
    const key = Object.keys(map).find((k) => String(url).includes(k))!;
    const v = map[key];
    if (v instanceof Error) throw v;
    return { ok: true, json: async () => v } as Response;
  }) as typeof fetch;
}

describe('adres zoeken', () => {
  it('leest een WKT-punt als lengte, breedte', () => {
    expect(parseWktPoint('POINT(5.13287587 52.08884161)')).toEqual([5.13287587, 52.08884161]);
    expect(parseWktPoint('onzin')).toBeNull();
  });

  it('leest PDOK en Nominatim en slaat kapotte resultaten over', () => {
    expect(parsePdok(pdokJson)).toEqual([{ label: 'Stationsplein 1, 3511ED Utrecht', address: 'Stationsplein 1, 3511ED Utrecht', city: 'Utrecht', country: 'Nederland', lat: 52.08955, lon: 5.11063, source: 'PDOK' }]);
    const osm = parseNominatim(osmJson);
    expect(osm).toHaveLength(1);
    expect(osm[0]).toMatchObject({ city: 'Milano', country: 'Italië', lat: 45.4654, lon: 9.1866 });
  });

  it('gebruikt de bron die werkt als de andere faalt', async () => {
    const res = await geocode('Via Roma 1 Milano', fakeFetch({ 'api.pdok.nl': new Error('offline'), nominatim: osmJson }));
    expect(res.map((r) => r.source)).toEqual(['OpenStreetMap']);
  });

  it('legt uit wat je kunt doen als zoeken helemaal niet lukt', async () => {
    await expect(geocode('Utrecht centrum', fakeFetch({ 'api.pdok.nl': new Error('x'), nominatim: new Error('y') }))).rejects.toThrow('Klik op de kaart');
  });
});

describe('bolletjes samenvoegen', () => {
  it('voegt punten die dicht bij elkaar liggen samen', () => {
    const c = clusterPoints([
      { item: 'a', x: 100, y: 100 },
      { item: 'b', x: 110, y: 104 },
      { item: 'c', x: 300, y: 300 },
    ]);
    expect(c.map((x) => x.items)).toEqual([['a', 'b'], ['c']]);
    expect(c[0].x).toBe(105);
  });
});
