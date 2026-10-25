/**
 * Dessins des lunettes et des chapeaux : les versions choisies par David sur la planche
 * (`scripts/mathoux-planches/chapeaux-lunettes.test.ts`, 2026-10-25), figées par un instantané —
 * un dessin qui change doit être revu, puis l'instantané mis à jour (`-u`).
 */

import { describe, it, expect } from 'vitest';
import {
	glassesDrawing,
	glassesPlacement,
	hatDrawing,
	hatPlacement
} from '../mathou-chapeaux-lunettes';
import { pearGeometry } from '../mathou-dessin';
import { MATHOU_STAGES } from '../mathou-races';
import { MATHOU_GLASSES_IDS, MATHOU_HAT_IDS } from '$lib/mathoux/decorations';

describe('mathou-chapeaux-lunettes', () => {
	it('les dix dessins retenus, à l’échelle du matou', () => {
		const drawings = Object.fromEntries([
			...MATHOU_GLASSES_IDS.map((id) => [id, glassesDrawing(id, 1)]),
			...MATHOU_HAT_IDS.map((id) => [id, hatDrawing(id, 1)])
		]);
		expect(drawings).toMatchSnapshot();
	});

	it('les traits sont divisés par l’échelle (même épaisseur à l’écran)', () => {
		const [at1] = hatDrawing('bowler', 1);
		const [at2] = hatDrawing('bowler', 2);
		expect(at1.width).toBe(2.4);
		expect(at2.width).toBe(1.2);
	});

	it('pose : lunettes entre les yeux, chapeau au sommet à une échelle bornée', () => {
		for (const stage of MATHOU_STAGES) {
			const geo = pearGeometry(stage);
			expect(glassesPlacement(geo)).toEqual({
				x: geo.hx,
				y: geo.hy,
				s: Math.round((geo.stage.hw / 26) * 100) / 100
			});
			const hat = hatPlacement(geo);
			expect([hat.x, hat.y]).toEqual([geo.hx, geo.stage.top]);
			expect(hat.s).toBeGreaterThanOrEqual(0.92);
			expect(hat.s).toBeLessThanOrEqual(1.35);
		}
	});
});
