import { describe, expect, it } from 'vitest';
import { closestClash, colorDistance, inkOn, MIN_DISTANCE, monogramFrom, PALETTE, suggestColor } from './color';

describe('projectkleuren', () => {
  it('heeft een palet zonder kleuren die op elkaar lijken', () => {
    for (let i = 0; i < PALETTE.length; i++) {
      for (let j = i + 1; j < PALETTE.length; j++) {
        expect(colorDistance(PALETTE[i], PALETTE[j]), `${PALETTE[i]} en ${PALETTE[j]}`).toBeGreaterThanOrEqual(MIN_DISTANCE);
      }
    }
  });

  it('herkent een kleur die te veel lijkt op een bestaande', () => {
    expect(closestClash('#30D184', ['#2FD083', '#43B9F6'])).toBe('#2FD083');
    expect(closestClash('#6E8BFF', ['#2FD083', '#43B9F6'])).toBeNull();
  });

  it('stelt een vrije kleur voor', () => {
    const taken = PALETTE.slice(0, 5);
    expect(closestClash(suggestColor(taken), taken)).toBeNull();
  });

  it('kiest leesbare tekst', () => {
    expect(inkOn('#F5D547')).toBe('#0D0F13');
    expect(inkOn('#2563EB')).toBe('#FFFFFF');
  });

  it('maakt een monogram', () => {
    expect(monogramFrom('Drive-In Lavaggio')).toBe('DL');
    expect(monogramFrom('maxiscooter.eu')).toBe('MA');
    expect(monogramFrom('Straalhelder')).toBe('ST');
  });
});
