import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { DEFAULT_LOGO_STYLE, logoStyleOf, WhistleRocketDB } from './db';

describe('logoweergave', () => {
  it('vult ontbrekende waarden aan en begrenst ze', () => {
    expect(logoStyleOf({})).toEqual(DEFAULT_LOGO_STYLE);
    expect(logoStyleOf({ logoStyle: { zoom: 9, x: -400, y: 12, fit: 'vullend', bg: 'wit' } })).toEqual({ fit: 'vullend', zoom: 3, x: -100, y: 12, bg: 'wit' });
    expect(logoStyleOf({ logoStyle: { zoom: Number.NaN, bg: 'paars' as never } })).toMatchObject({ zoom: 1, bg: 'geen' });
  });

  it('geeft bestaande logo’s bij de update een weergave die er hetzelfde uitziet', async () => {
    const name = 'migratie-test';
    const v1 = new Dexie(name);
    v1.version(1).stores({ projects: 'id, order', entries: 'id, projectId, start', tasks: 'id, projectId, due, createdAt', settings: 'key' });
    await v1.table('projects').add({ id: 'a', name: 'Oud', order: 0, logo: 'data:image/png;base64,AAAA' });
    v1.close();

    const v2 = new WhistleRocketDB(name);
    const p = await v2.projects.get('a');
    expect(p?.logoStyle).toEqual({ ...DEFAULT_LOGO_STYLE, fit: 'vullend' });
    v2.close();
    await Dexie.delete(name);
  });
});
