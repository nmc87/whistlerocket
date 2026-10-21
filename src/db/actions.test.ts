import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addManualEntry, addTask, ColorClashError, createProject, createSite, deleteProject, getRunning, moveProject, settleCountdowns, startTimer, stopRunning, toggleTask } from './actions';
import { ensureSeed } from './seed';
import { exportBackup, parseBackup, restoreBackup } from './backup';
import { MINUTE } from '../lib/time';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('startdata', () => {
  it('zet je vier bedrijven er één keer in', async () => {
    await ensureSeed();
    const names = (await db.projects.orderBy('order').toArray()).map((p) => p.name);
    expect(names).toEqual(['Receeper', 'Straalhelder', 'Drive-In Lavaggio', 'maxiscooter.eu']);
    await db.projects.clear();
    await ensureSeed();
    expect(await db.projects.count()).toBe(0);
  });
});

describe('projecten', () => {
  it('weigert een kleur die al bijna gebruikt wordt', async () => {
    await createProject({ name: 'Een', label: 'Bedrijf', color: '#2FD083' });
    await expect(createProject({ name: 'Twee', label: 'Project', color: '#31D285' })).rejects.toBeInstanceOf(ColorClashError);
  });

  it('verwijdert taken en uren mee', async () => {
    const p = await createProject({ name: 'Weg', label: 'Project', color: '#6E8BFF' });
    await addTask('iets', p.id, null);
    await addManualEntry(p.id, 0, MINUTE);
    await deleteProject(p.id);
    expect(await db.tasks.count()).toBe(0);
    expect(await db.entries.count()).toBe(0);
  });

  it('verschuift de volgorde', async () => {
    const a = await createProject({ name: 'A', label: 'Project', color: '#6E8BFF' });
    await createProject({ name: 'B', label: 'Project', color: '#F5D547' });
    await moveProject(a.id, 1);
    expect((await db.projects.orderBy('order').toArray()).map((p) => p.name)).toEqual(['B', 'A']);
  });
});

describe('timer', () => {
  it('laat maar één timer tegelijk lopen', async () => {
    const a = await createProject({ name: 'A', label: 'Project', color: '#6E8BFF' });
    const b = await createProject({ name: 'B', label: 'Project', color: '#F5D547' });
    await startTimer(a.id, 'stopwatch', null, 1_000);
    await startTimer(b.id, 'stopwatch', null, 61_000);
    const running = await getRunning();
    expect(running?.projectId).toBe(b.id);
    const first = (await db.entries.toArray()).find((e) => e.projectId === a.id);
    expect(first?.end).toBe(61_000);
  });

  it('sluit een afteller af op de geplande tijd, ook als de app dicht was', async () => {
    const a = await createProject({ name: 'A', label: 'Project', color: '#6E8BFF' });
    await startTimer(a.id, 'countdown', 25, 0);
    expect(await settleCountdowns(10 * MINUTE)).toHaveLength(0);
    const done = await settleCountdowns(3 * 60 * MINUTE);
    expect(done).toHaveLength(1);
    expect((await db.entries.get(done[0].id))?.end).toBe(25 * MINUTE);
  });

  it('stopt een afteller niet later dan gepland', async () => {
    const a = await createProject({ name: 'A', label: 'Project', color: '#6E8BFF' });
    await startTimer(a.id, 'countdown', 10, 0);
    await stopRunning(60 * MINUTE);
    expect((await db.entries.toArray())[0].end).toBe(10 * MINUTE);
  });
});

describe('taken en back-up', () => {
  it('vinkt af en weer aan', async () => {
    const t = await addTask('Offerte sturen', null, '2026-10-21');
    await toggleTask(t.id);
    expect((await db.tasks.get(t.id))?.done).toBe(true);
    await toggleTask(t.id);
    expect((await db.tasks.get(t.id))?.done).toBe(false);
  });

  it('zet een back-up volledig terug', async () => {
    await ensureSeed();
    const p = (await db.projects.toArray())[0];
    await addTask('Belangrijk', p.id, null);
    await addManualEntry(p.id, 0, 30 * MINUTE, 'werk');
    const json = JSON.stringify(await exportBackup());
    await db.projects.clear();
    await db.tasks.clear();
    await restoreBackup(parseBackup(json));
    expect(await db.projects.count()).toBe(4);
    expect((await db.tasks.toArray())[0].title).toBe('Belangrijk');
    expect((await db.entries.toArray())[0].note).toBe('werk');
  });

  it('weigert een vreemd bestand', () => {
    expect(() => parseBackup('{"hallo":1}')).toThrow('niet uit WhistleRocket');
    expect(() => parseBackup('geen json')).toThrow('geen geldig');
  });
});

describe('locaties (Footprint)', () => {
  it('vraagt om een plek op de kaart en bewaart nette waarden', async () => {
    const p = await createProject({ name: 'A', label: 'Bedrijf', color: '#6E8BFF' });
    await expect(createSite({ projectId: p.id, name: 'Kantoor', kind: 'Kantoor', lat: null, lon: null })).rejects.toThrow('op de kaart');
    const s = await createSite({ projectId: p.id, name: '  Magazijn Tilburg ', kind: 'Magazijn', description: ' opslag ', lat: 51.555612345, lon: 5.0913, city: 'Tilburg', country: 'Nederland' });
    expect(s).toMatchObject({ name: 'Magazijn Tilburg', description: 'opslag', lat: 51.555612, city: 'Tilburg' });
  });

  it('gaan mee weg met hun bedrijf en mee in de back-up', async () => {
    const p = await createProject({ name: 'A', label: 'Bedrijf', color: '#6E8BFF' });
    await createSite({ projectId: p.id, name: 'Fabriek', kind: 'Fabriek', lat: 52, lon: 5 });
    const json = JSON.stringify(await exportBackup());
    await db.sites.clear();
    await restoreBackup(parseBackup(json));
    expect(await db.sites.count()).toBe(1);
    await deleteProject(p.id);
    expect(await db.sites.count()).toBe(0);
  });

  it('kan een oude back-up zonder locaties terugzetten', async () => {
    const old = { app: 'whistlerocket', format: 1, exportedAt: '2026-10-21T08:00:00Z', projects: [], entries: [], tasks: [], settings: [] };
    await restoreBackup(parseBackup(JSON.stringify(old)));
    expect(await db.sites.count()).toBe(0);
  });
});
