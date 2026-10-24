/**
 * Les cartes de la vitrine `/demo/cartes` : une par rareté, chacune avec une
 * image présente dans `static/` (la page ne lit ni la base ni le stockage).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { DEMO_CARDS } from '../cartes';

describe('DEMO_CARDS', () => {
	it('compte une carte par rareté', () => {
		expect(DEMO_CARDS.map((c) => c.rarity).sort()).toEqual(['common', 'epic', 'legendary', 'rare']);
	});

	it('pointe vers des images présentes dans static/', () => {
		for (const card of DEMO_CARDS) {
			expect(card.imagePath).toMatch(/^\/images\/demo-cartes\//);
			expect(existsSync(join(process.cwd(), 'static', card.imagePath ?? '')), card.name).toBe(true);
		}
	});
});
